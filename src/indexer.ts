import matter from "gray-matter";

import Locator from "./locator.ts";
import type { PagesOptions } from "./pages.ts";

export interface IndexDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  headings: string[];
}

export interface IndexerOptions {
  output: string;
  pagesOptions: PagesOptions;
}

export default class Indexer {
  private locator: Locator;
  private options: IndexerOptions;

  constructor(options: IndexerOptions) {
    this.options = options;
    this.locator = new Locator(options.pagesOptions);
  }

  /**
   * Build a JSON search index from all pages and write it to the configured output path.
   *
   * @returns The list of indexed documents.
   */
  public async build(): Promise<IndexDocument[]> {
    if (!this.options.pagesOptions.path) {
      throw new Error("Please provide a path in pagesOptions.");
    }

    const files = await this.locator.find(this.options.pagesOptions.path);

    const documents: IndexDocument[] = [];

    for (const file of files) {
      const doc = await this.indexFile(file);

      documents.push(doc);
    }

    await this.write(documents);

    return documents;
  }

  /**
   * Parse a single file and return its index document.
   */
  private async indexFile(file: string): Promise<IndexDocument> {
    const raw = await this.readFile(file);

    const { data: frontmatter, content } = matter(raw);

    const url = this.fileToPathname(file);

    return {
      id: url,
      url,
      title: frontmatter.title ?? url,
      description: frontmatter.description ?? "",
      content: this.extractText(content),
      headings: this.extractHeadings(content),
    };
  }

  /**
   * Strip MDX/markdown syntax and return plain text suitable for indexing.
   */
  private extractText(content: string): string {
    return content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  /**
   * Extract heading text from MDX content.
   */
  private extractHeadings(content: string): string[] {
    return Array.from(content.matchAll(/^#{1,6}\s+(.+)$/gm)).map((m) => m[1]);
  }

  /**
   * Write the index documents to the configured output path as JSON.
   */
  private async write(documents: IndexDocument[]): Promise<void> {
    // deno-lint-ignore no-explicit-any
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      await Deno.writeTextFile(
        this.options.output,
        JSON.stringify(documents, null, 2),
      );
      return;
    }

    const { writeFile } = await import("node:fs/promises");

    await writeFile(
      this.options.output,
      JSON.stringify(documents, null, 2),
      "utf-8",
    );
  }

  private fileToPathname(filename: string): string {
    const basePath = this.options.pagesOptions.path!;
    const extensions = this.options.pagesOptions.extensions ?? ["mdx"];

    let route = filename.replace(basePath, "");

    for (const ext of extensions) {
      if (route.endsWith(ext)) {
        route = route.slice(0, -ext.length);

        break;
      }
    }

    if (route.endsWith("/index") || route === "/index") {
      route = route.replace(/\/index$/, "") || "/";
    }

    if (!route.startsWith("/")) {
      route = "/" + route;
    }

    return route;
  }

  private async readFile(filePath: string): Promise<string> {
    // deno-lint-ignore no-explicit-any
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      return await Deno.readTextFile(filePath);
    }

    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(filePath);
    return buffer.toString("utf-8");
  }
}
