import vento from "ventojs";

import Compiler from "./compiler.ts";
import type { Config } from "./config.ts";

export default class Renderer {
  private config?: Config;
  private compiler: Compiler;

  constructor(config?: Config) {
    this.config = {
      ...this.initialiseDefaultConfig(),
      ...config,
    };

    this.compiler = new Compiler(this.config);
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
      includes: this.config?.templateDirectory,
    });

    env.cache.clear();

    const view = await env.run(file, data);

    return view.content;
  }

  private initialiseDefaultConfig(): Config {
    return {
      templateDirectory: "./templates",
    };
  }
}
