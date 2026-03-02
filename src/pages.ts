import { sep } from "node:path";
import { Route, Router } from "@raptor/router";

import {
  type Context,
  HttpMethod,
  type Middleware,
  ServerError,
} from "@raptor/kernel";

import Locator from "./locator.ts";
import Renderer from "./renderer.ts";
import type { Config } from "./config.ts";

/**
 * The primary middleware component of Pages.
 */
export default class Pages {
  /**
   * The router instance.
   */
  private router: Router;

  /**
   * The locator service.
   */
  private locator: Locator;

  /**
   * The renderer service.
   */
  private renderer: Renderer;

  /**
   * The configuration provided.
   */
  private config: Config;

  /**
   * An internal static cache of route resolutions.
   */
  private staticCache: Map<string, string> | null = null;

  /**
   * A boolean indicating whether the routes have been initialized and cached.
   */
  private routesInitialized = false;

  /**
   * Initialize the pages middleware.
   *
   * @param config Optional configuration.
   */
  constructor(config?: Config) {
    this.config = {
      ...this.initialiseDefaultConfig(),
      ...config,
    };

    this.router = new Router();
    this.renderer = new Renderer(this.config);
    this.locator = new Locator(this.config);

    if (this.config.static?.enabled) {
      this.staticCache = new Map();
    }
  }

  /**
   * Initialize routes at startup (called once).
   *
   * @returns void
   */
  public async initialize(): Promise<void> {
    if (this.routesInitialized) return;

    if (!this.config.pageDirectory) {
      throw new ServerError("Please provide a path configuration.");
    }

    const files = await this.locator.find(this.config.pageDirectory);

    for (const filename of files) {
      const pathname = this.filenameToRoutePathname(filename);

      const handler = this.config.static?.enabled
        ? () => this.serveStaticPage(pathname, filename)
        : () => this.renderer.render(filename, pathname);

      this.router.add(
        new Route({
          method: HttpMethod.GET,
          pathname,
          handler,
        }),
      );
    }

    this.routesInitialized = true;
  }

  /**
   * Wrapper to pre-bind this to the validation handler method.
   *
   * @returns A middleware response.
   */
  public get handle(): Middleware {
    return (context: Context, next: CallableFunction) => {
      return this.handler(context, next);
    };
  }

  /**
   * The middleware handler method for pages.
   *
   * @param context The request context.
   * @param next The next middleware function.
   *
   * @returns The success routing of the request to render.
   */
  public async handler(
    context: Context,
    next: CallableFunction,
  ): Promise<unknown> {
    await this.initialize();

    return this.router.handle(context, next);
  }

  /**
   * Serve a pre-compiled static page from cache or KV store.
   *
   * @param pathname The route pathname.
   * @param filename The original filename (fallback for re-compilation).
   *
   * @returns The HTML content.
   */
  private async serveStaticPage(
    pathname: string,
    filename: string,
  ): Promise<string> {
    if (this.staticCache?.has(pathname)) {
      return this.staticCache.get(pathname)!;
    }

    if (this.config.static?.outputDirectory) {
      const html = await this.getFromDisk(pathname);

      if (html) {
        this.staticCache?.set(pathname, html);

        return html;
      }
    }

    console.warn(
      `Static page not found for ${pathname}, compiling on-demand`,
    );

    return this.renderer.render(filename, pathname);
  }

  /**
   * Get pre-compiled page from disk.
   *
   * @param pathname The pathname of the file on disk.
   *
   * @returns A promise resolving the page contents.
   */
  private async getFromDisk(pathname: string): Promise<string | null> {
    const outputDir = this.config.static!.outputDirectory;

    const filePath = pathname === "/"
      ? `${outputDir}/index.html`
      : `${outputDir}${pathname}.html`;

    try {
      // deno-lint-ignore no-explicit-any
      const Deno = (globalThis as any).Deno;

      if (typeof Deno !== "undefined") {
        return await Deno.readTextFile(filePath);
      }

      const { readFile } = await import("node:fs/promises");

      const buffer = await readFile(filePath);

      return buffer.toString("utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Convert filename to a route pathname.
   *
   * @param filename The filename to convert to valid pathname.
   *
   * @returns A valid pathname for route object.
   */
  private filenameToRoutePathname(filename: string): string {
    if (!this.config.pageDirectory) {
      throw new ServerError("Please provide a page directory configuration.");
    }

    let route = filename.replace(this.config.pageDirectory, "");

    if (!this.config.extensions) {
      throw new ServerError("Please provide extensions configuration.");
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

    route = route.split(sep).join("/");

    if (!route.startsWith("/")) {
      route = "/" + route;
    }

    return route;
  }

  /**
   * Initialise the middleware config.
   *
   * @returns An initialise set of config.
   */
  private initialiseDefaultConfig(): Config {
    return {
      extensions: ["mdx"],
    };
  }
}
