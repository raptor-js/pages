import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Locator from "./locator.ts";

async function makeTempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "pages-"));
}

test("locator finds files with matching extension", async () => {
  const dir = await makeTempDir();

  await writeFile(`${dir}/page.mdx`, "content");
  await writeFile(`${dir}/other.txt`, "content");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 1);
    assert.deepStrictEqual(files[0].endsWith("page.mdx"), true);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator finds files recursively in nested directories", async () => {
  const dir = await makeTempDir();
  const subDir = `${dir}/nested`;

  await mkdir(subDir);
  await writeFile(`${dir}/root.mdx`, "root");
  await writeFile(`${subDir}/child.mdx`, "child");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 2);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator returns empty array when no matching files", async () => {
  const dir = await makeTempDir();

  await writeFile(`${dir}/file.txt`, "content");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 0);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator returns empty array for empty directory", async () => {
  const dir = await makeTempDir();

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 0);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator supports multiple extensions", async () => {
  const dir = await makeTempDir();

  await writeFile(`${dir}/page.mdx`, "content");
  await writeFile(`${dir}/page.md`, "content");
  await writeFile(`${dir}/ignored.txt`, "content");

  const locator = new Locator({ extensions: ["mdx", "md"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 2);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator throws server error when extensions not configured", async () => {
  const dir = await makeTempDir();

  const locator = new Locator({});

  try {
    await assert.rejects(
      () => locator.find(dir),
      (error) => error instanceof Error && error.message.includes("extensions"),
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("locator deeply nested files are found", async () => {
  const dir = await makeTempDir();

  await mkdir(`${dir}/a/b/c`, { recursive: true });
  await writeFile(`${dir}/a/b/c/deep.mdx`, "deep");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assert.deepStrictEqual(files.length, 1);
    assert.deepStrictEqual(files[0].endsWith("deep.mdx"), true);
  } finally {
    await rm(dir, { recursive: true });
  }
});
