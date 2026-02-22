// Copyright 2026, Raptor. All rights reserved. MIT license.

import helper from "./src/helper.ts";

export type { Config } from "./src/config.ts";
export { default as Pages } from "./src/pages.ts";

export { CompilerPlugin } from "./src/interfaces/compiler-plugin.ts";

export { default as Indexer, type IndexDocument } from "./src/indexer.ts";

export default helper;
