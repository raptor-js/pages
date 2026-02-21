// deno-lint-ignore-file no-explicit-any

import matter from "gray-matter";
import { Fragment, h } from "preact";
import { compile } from "@mdx-js/mdx";
import { renderToString } from "preact-render-to-string";

import type { PagesOptions } from "./pages.ts";
import { HeadingsPlugin } from "./plugins/headings.ts";
import { RemarkGfmPlugin } from "./plugins/remark-gfm.ts";

export default class Compiler {
  private options?: PagesOptions;

  constructor(options?: PagesOptions) {
    const defaults = this.initialiseOptions();

    this.options = {
      ...defaults,
      ...options,
      plugins: [
        ...(defaults.plugins ?? []),
        ...(options?.plugins ?? []),
      ],
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
    const plugins = this.options?.plugins ?? [];

    plugins.forEach((p) => p.reset());

    const fileContent = await this.readFile(filename);

    const { data: frontmatter, content } = matter(fileContent);

    const compiled = await compile(content, {
      outputFormat: "function-body",
      jsxImportSource: "preact",
      development: false,
      remarkPlugins: plugins.flatMap((p) => p.remark),
      rehypePlugins: plugins.flatMap((p) => p.rehype),
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

    const pluginData = Object.fromEntries(
      plugins.map((p) => [p.key, p.getData()]),
    );

    return {
      content: html,
      config: this.options?.config,
      frontmatter,
      filename,
      ...pluginData,
    };
  }

  private initialiseOptions(): PagesOptions {
    return {
      plugins: [
        new RemarkGfmPlugin(),
        new HeadingsPlugin(),
      ],
    };
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
