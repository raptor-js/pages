// deno-lint-ignore-file no-explicit-any

import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import { Fragment, h } from "preact";
import { compile } from "@mdx-js/mdx";
import { renderToString } from "preact-render-to-string";

import type { PagesOptions } from "./pages.ts";

export default class Compiler {
  private options?: PagesOptions;

  constructor(options?: PagesOptions) {
    this.options = {
      ...this.initialiseOptions(),
      ...options,
    };
  }

  /**
   * Compile the contents of a file.
   *
   * @param filename The filename to compile contents.
   *
   * @returns A compiled representation of the file.
   */
  public async compile(filename: string) {
    const fileContent = await this.readFile(filename);

    const { data: frontmatter, content } = matter(fileContent);

    const compiled = await compile(content, {
      outputFormat: "function-body",
      jsxImportSource: "preact",
      development: false,
      remarkPlugins: this.options?.remarkPlugins,
      rehypePlugins: this.options?.rehypePlugins,
    });

    const runtime = {
      Fragment: Fragment,
      jsx: h,
      jsxs: h,
    };

    const fn = new Function(String(compiled));
    const module = fn(runtime);
    const mdxContent = module.default;

    const html = renderToString(mdxContent());

    return {
      html,
      frontmatter,
      filename,
    };
  }

  private initialiseOptions(): PagesOptions {
    return {
      remarkPlugins: [
        remarkGfm
      ]
    }
  }

  private async readFile(filePath: string): Promise<string> {
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      return await Deno.readTextFile(filePath, { encoding: "utf-8" });
    }

    const { readFile } = await import("node:fs/promises");

    const buffer = await readFile(filePath);

    return buffer.toString("utf-8");
  }
}
