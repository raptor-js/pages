import vento from "ventojs";

import Compiler from "./compiler.ts";
import type { PagesOptions } from "./pages.ts";

export default class Renderer {
  private options?: PagesOptions;
  private compiler: Compiler;

  constructor(options?: PagesOptions) {
    this.options = {
      ...this.initialiseOptions(),
      ...options,
    };

    this.compiler = new Compiler(this.options);
  }

  /**
   * Render a page's contents.
   *
   * @param filename The filename to compile contents.
   * @param pathname The converted pathname of the file.
   *
   * @returns An HTML string representation of the page.
   */
  public async render(filename: string, pathname: string): Promise<string> {
    const data = await this.compiler.compile(filename);

    return this.view(
      `${data.frontmatter.template ?? "docs"}.vto`,
      {
        pathname,
        ...data,
      },
    );
  }

  private async view(
    file: string,
    data?: Record<string, unknown>,
  ): Promise<string> {
    const env = vento({
      includes: this.options?.templateDirectory,
    });

    env.cache.clear();

    const view = await env.run(file, data);

    return view.content;
  }

  private initialiseOptions(): PagesOptions {
    return {
      templateDirectory: "./templates",
    };
  }
}
