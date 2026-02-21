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
    }

    this.compiler = new Compiler();
  }

  /**
   * Render a page's contents.
   * 
   * @param filename The filename to compile contents.
   * @param pathname The converted pathname of the file.
   *
   * @returns An HTML representation of the page.
   */
  public async render(filename: string, pathname: string) {
    const { html, frontmatter } = await this.compiler.compile(filename);

    const htmlString = await this.view(
      `${frontmatter.template ?? "docs"}.vto`,
      {
        content: html,
        pathname,
        ...frontmatter,
      },
    );

    return htmlString;
  }

  async view(file: string, data?: Record<string, unknown>): Promise<string> {
    const env = vento({
      includes: this.options?.templateDirectory
    });

    await env.cache.clear();

    const view = await env.run(file, data);

    return view.content;
  }

  private initialiseOptions(): PagesOptions {
    return {
      templateDirectory: Deno.cwd() + "/templates"
    }
  }
}
