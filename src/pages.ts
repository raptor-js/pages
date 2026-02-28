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

export default class Pages {
  private router: Router;
  private locator: Locator;
  private renderer: Renderer;
  private config: Config;

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
  }

  /**
   * Wrapper to pre-bind this to the validation handler method.
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
    if (!this.config.pageDirectory) {
      throw new ServerError("Please provide a path configuration.");
    }

    const files = await this.locator.find(this.config.pageDirectory);

    for (const filename of files) {
      const pathname = this.filenameToRoutePathname(filename);

      this.router.add(
        new Route({
          method: HttpMethod.GET,
          pathname,
          handler: () => this.renderer.render(filename, pathname),
        }),
      );
    }

    return this.router.handle(context, next);
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
