import type { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

export interface Config {
  /**
   * The directory to serve pages from.
   */
  pageDirectory?: string;

  /**
   * What extensions should the locator find.
   */
  extensions?: string[];

  /**
   * The directory of the template files.
   */
  templateDirectory?: string;

  /**
   * Optional list of compiler plugins.
   */
  plugins?: CompilerPlugin[];

  /**
   * The directory to store the search index file.
   */
  searchIndexDirectory?: string;

  /**
   * Optional metadata to pass through the compiler.
   */
  metadata?: Record<string, any>;
}
