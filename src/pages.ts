import { sep } from "node:path";
import type { PluggableList } from "unified";
import { Router, Route, HttpMethod } from "@raptor/router";
import { type Context, type Middleware, ServerError } from "@raptor/framework";

import Locator from "./locator.ts";
import Renderer from "./renderer.ts";

export interface PagesOptions {
  path?: string;
  extensions?: string[];
  templateDirectory?: string;
  rehypePlugins?: PluggableList;
  remarkPlugins?: PluggableList;
}

export default class Pages {
  private router: Router;
  private locator: Locator;
  private renderer: Renderer;
  private options: PagesOptions;

  /**
   * Initialize the pages middleware.
   *
   * @param options Optional configuration options.
   */
  constructor(options?: PagesOptions) {
    this.options = {
      ...this.initialiseOptions(),
      ...options,
    };

    this.router = new Router();
    this.renderer = new Renderer(this.options);
    this.locator = new Locator(this.options);
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
  public async handler(context: Context, next: CallableFunction): Promise<unknown> {
    if (!this.options.path) {
      throw new ServerError("Please provide a path options configuration.");
    }

    const files = await this.locator.find(this.options.path);

    for (const filename of files) {
      const pathname = this.filenameToRoutePathname(filename);

      this.router.add(new Route({
        method: HttpMethod.GET,
        pathname,
        handler: () => this.renderer.render(filename, pathname),
      }));
    }

    return this.router.handle(context, next);
  }

  /**
   * Register a custom remark plugin.
   *
   * @param plugin The remark plugin to register.
   *
   * @returns The current pages instance.
   */
  public registerRemarkPlugin(plugin: PluggableList[number]): this {
    this.options.remarkPlugins = [...(this.options.remarkPlugins ?? []), plugin];

    return this;
  }

  /**
   * Register a custom rehype plugin.
   *
   * @param plugin The rehype plugin to register.
   *
   * @returns The current pages instance.
   */
  public registerRehypePlugin(plugin: PluggableList[number]): this {
    this.options.rehypePlugins = [...(this.options.rehypePlugins ?? []), plugin];

    return this;
  }

  /**
   * Convert filename to a route pathname.
   *  
   * @param filename The filename to convert to valid pathname.
   *
   * @returns A valid pathname for route object.
   */
  private filenameToRoutePathname(filename: string): string {
    if (!this.options.path) {
      throw new ServerError("Please provide a path options configuration.");
    }

    let route = filename.replace(this.options.path, "");

    if (!this.options.extensions) {
      throw new ServerError("Please provide extensions options configuration.");
    }

    for (const ext of this.options.extensions) {
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
   * Initialise the middleware options.
   *
   * @returns An initialise set of options.
   */
  private initialiseOptions(): PagesOptions {
    return {
      extensions: ["mdx"]
    }
  }
}
