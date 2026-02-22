import { join } from "node:path";
import { ServerError } from "@raptor/framework";

import type { Config } from "./config.ts";

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export default class Locator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Find files within a directory.
   *
   * @param path The path to search for files.
   *
   * @returns A list of found files.
   */
  public async find(path: string): Promise<string[]> {
    if (!this.config.extensions) {
      throw new ServerError("Please provide extensions configuration.");
    }

    const files: string[] = [];

    await this.walk(path, (filePath) => {
      const valid = this.config.extensions?.some(
        (ext) => filePath.endsWith(ext),
      );

      if (!valid) {
        return;
      }

      files.push(filePath);
    });

    return files;
  }

  /**
   * Walk a directory to find files.
   *
   * @param path The path to walk.
   *
   * @param callback A callback function when a file is found.
   */
  private async walk(
    path: string,
    callback: (path: string) => void,
  ): Promise<void> {
    for await (const entry of await this.readDirectory(path)) {
      const fullPath = join(path, entry.name);

      if (entry.isDirectory) {
        await this.walk(fullPath, callback);

        continue;
      }

      if (entry.isFile) {
        callback(fullPath);
      }
    }
  }

  /**
   * Read a directory regardless of runtime.
   *
   * @param path The path to read files.
   *
   * @returns A list of directory entries.
   */
  private async readDirectory(path: string): Promise<DirectoryEntry[]> {
    // deno-lint-ignore no-explicit-any
    if (typeof (globalThis as any).Deno !== "undefined") {
      const entries: DirectoryEntry[] = [];

      // deno-lint-ignore no-explicit-any
      for await (const entry of (globalThis as any).Deno.readDir(path)) {
        entries.push(entry);
      }

      return entries;
    }

    const { readdir, stat } = await import("node:fs/promises");

    const names = await readdir(path);

    return Promise.all(
      names.map(async (name) => {
        const info = await stat(join(path, name));

        return {
          name,
          isDirectory: info.isDirectory(),
          isFile: info.isFile(),
        };
      }),
    );
  }
}
