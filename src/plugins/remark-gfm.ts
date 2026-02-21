import remarkGfm from "remark-gfm";

import { CompilerPlugin } from "../interfaces/compiler-plugin.ts";

export class RemarkGfmPlugin extends CompilerPlugin<never> {
  key = "remarkGfm";

  constructor() {
    super();
    this.registerRemark(remarkGfm);
  }

  getData = () => undefined as never;

  reset = () => {};
}
