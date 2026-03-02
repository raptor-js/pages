// deno-lint-ignore-file no-explicit-any

import { join } from "node:path";

import Locator from "./locator.ts";
import Renderer from "./renderer.ts";
import type { Config } from "./config.ts";

interface CompiledPage {
  html: string;
  pathname: string;
  filename: string;
}

/**
 * Builds statically generated pages from MDX.
 */
export default class Builder {
  /**
   * The locator service to find page files.
   */
  private locator: Locator;

  /**
   * The renderer to render the final output of a page.
   */
  private renderer: Renderer;

  /**
   * Configuration for the package.
   */
  private config: Config;

  /**
   * @constructor
   *
   * @param config The configuration options.
   */
  constructor(config: Config) {
    this.config = config;
    this.locator = new Locator(config);
    this.renderer = new Renderer(config);
  }

  /**
   * Build all pages and write them to the static output directory.
   *
   * @returns The list of compiled pages.
   */
  public async build(): Promise<CompiledPage[]> {
    if (!this.config.pageDirectory) {
      throw new Error("Please provide a `pageDirectory` in config.");
    }

    if (!this.config.static?.enabled) {
      throw new Error("Static build is not enabled in config.");
    }

    const files = await this.locator.find(this.config.pageDirectory);

    const compiledPages: CompiledPage[] = [];

    console.log(`Building ${files.length} pages...`);

    for (const filename of files) {
      const pathname = this.filenameToPathname(filename);

      const html = await this.renderer.render(filename, pathname);

      compiledPages.push({ pathname, html, filename });

      console.log(`✓ Built: ${pathname}`);
    }

    await this.write(compiledPages);

    console.log(`\nBuild complete! ${compiledPages.length} pages compiled.`);

    return compiledPages;
  }

  /**
   * Write compiled pages to the configured storage.
   *
   * @param pages Compiled pages to write to storage.
   *
   * @returns void
   */
  private async write(pages: CompiledPage[]): Promise<void> {
    if (this.config.static?.outputDirectory) {
      await this.writeToDisk(pages);

      return;
    }

    throw new Error(
      "Please provide `outputDirectory` in static config.",
    );
  }

  /**
   * Write compiled pages to disk.
   *
   * @param pages Compiled pages to write to disk.
   *
   * @returns void
   */
  private async writeToDisk(pages: CompiledPage[]): Promise<void> {
    const outputDir = this.config.static!.outputDirectory;

    await this.ensureDirectory(outputDir);

    for (const page of pages) {
      const filePath = page.pathname === "/"
        ? "index.html"
        : `${page.pathname.slice(1)}.html`;

      const fullPath = join(outputDir, filePath);

      const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));

      if (parentDir && parentDir !== outputDir) {
        await this.ensureDirectory(parentDir);
      }

      await this.writeFile(fullPath, page.html);
    }

    console.log(`\nPages written to: ${outputDir}`);
  }

  /**
   * Convert filename to pathname.
   *
   * @param filename The filename to convert to a valid pathname.
   *
   * @returns The converted pathname.
   */
  private filenameToPathname(filename: string): string {
    if (!this.config.pageDirectory) {
      throw new Error("Please provide a `pageDirectory` in config.");
    }

    let route = filename.replace(this.config.pageDirectory, "");

    if (!this.config.extensions) {
      throw new Error("Please provide `extensions` configuration.");
    }

    for (const ext of this.config.extensions) {
      if (route.endsWith(ext)) {
        route = route.slice(0, -`.${ext}`.length);

        break;
      }
    }

    if (route.endsWith("/index") || route === "/index") {
      route = route.replace(/\/index$/, "") || "/";
    }

    route = route.replace(/\[([^\]]+)\]/g, ":$1");

    route = route.split("\\").join("/");

    if (!route.startsWith("/")) {
      route = "/" + route;
    }

    return route;
  }

  /**
   * Ensure a directory exists (cross-runtime).
   *
   * @param path The path to check.
   *
   * @returns void
   */
  private async ensureDirectory(path: string): Promise<void> {
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      try {
        await Deno.mkdir(path, { recursive: true });
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
          throw error;
        }
      }

      return;
    }

    const { mkdir } = await import("node:fs/promises");

    await mkdir(path, { recursive: true });
  }

  /**
   * Write a file (cross-runtime).
   *
   * @param path The path to write to.
   * @param content The contents of the file to write to disk.
   *
   * @returns void
   */
  private async writeFile(path: string, content: string): Promise<void> {
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      await Deno.writeTextFile(path, content);

      return;
    }

    const { writeFile } = await import("node:fs/promises");

    await writeFile(path, content, "utf-8");
  }
}
