import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

import { CompilerPlugin } from "../interfaces/compiler-plugin.ts";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export class HeadingsPlugin extends CompilerPlugin<Heading[]> {
  key = "headings";
  private headings: Heading[] = [];

  constructor() {
    super();

    this.registerRemark(
      () => (tree: any) => {
        visit(tree, "heading", (node: any) => {
          const text = toString(node);
          const id = slugify(text);

          this.headings.push({ id, text, level: node.depth });

          node.data = node.data || {};
          node.data.hProperties = node.data.hProperties || {};
          node.data.hProperties.id = id;
        });
      }
    );
  }

  getData() {
    return this.headings;
  }

  reset() {
    this.headings = [];
  }
}
