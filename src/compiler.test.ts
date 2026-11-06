import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Compiler from "./compiler.ts";
import { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

/**
 * Create an empty temporary file with the given suffix.
 */
async function makeTempFile(suffix: string): Promise<string> {
  const file = join(tmpdir(), `${randomUUID()}${suffix}`);

  await writeFile(file, "");

  return file;
}

class StubRemarkPlugin extends CompilerPlugin<never> {
  key = "stub-remark";

  constructor() {
    super();
    this.registerRemark(() => (tree: unknown) => tree);
  }

  getData = () => undefined as never;
  reset = () => {};
}

test("compiler compiles basic MDX content", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");

  await writeFile(tmpFile, "# Hello World\n\nThis is a paragraph.");

  try {
    const result = await compiler.compile(tmpFile);

    assert.deepStrictEqual(typeof result.content, "string");
    assert.ok(result.content.includes("Hello World"));
    assert.ok(result.content.includes("This is a paragraph"));
    assert.deepStrictEqual(result.filename, tmpFile);
  } finally {
    await rm(tmpFile);
  }
});

test("compiler extracts frontmatter", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");
  await writeFile(
    tmpFile,
    `---\ntitle: My Page\ntemplate: docs\ndescription: A test page\n---\n\n# Content\n`,
  );

  try {
    const result = await compiler.compile(tmpFile);

    assert.deepStrictEqual(result.frontmatter.title, "My Page");
    assert.deepStrictEqual(result.frontmatter.template, "docs");
    assert.deepStrictEqual(result.frontmatter.description, "A test page");
  } finally {
    await rm(tmpFile);
  }
});

test("compiler returns empty frontmatter when none present", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");

  await writeFile(tmpFile, "Just some content with no frontmatter.");

  try {
    const result = await compiler.compile(tmpFile);

    assert.deepStrictEqual(typeof result.frontmatter, "object");
    assert.deepStrictEqual(Object.keys(result.frontmatter).length, 0);
  } finally {
    await rm(tmpFile);
  }
});

test("compiler renders GFM tables by default", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");
  await writeFile(
    tmpFile,
    `| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |\n`,
  );

  try {
    const result = await compiler.compile(tmpFile);

    assert.ok(result.content.includes("<table"));
    assert.ok(result.content.includes("Column A"));
    assert.ok(result.content.includes("Cell 1"));
  } finally {
    await rm(tmpFile);
  }
});

test("compiler renders GFM strikethrough by default", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");
  await writeFile(tmpFile, "~~strikethrough text~~");

  try {
    const result = await compiler.compile(tmpFile);

    assert.ok(result.content.includes("<del>"));
  } finally {
    await rm(tmpFile);
  }
});

test("compiler accepts compiler plugins", async () => {
  const compiler = new Compiler({ plugins: [new StubRemarkPlugin()] });
  const tmpFile = await makeTempFile(".mdx");
  await writeFile(tmpFile, "Hello from custom plugin test.");

  try {
    const result = await compiler.compile(tmpFile);

    assert.ok(result.content.includes("Hello from custom plugin test"));
  } finally {
    await rm(tmpFile);
  }
});

test("compiler throws on missing file", async () => {
  const compiler = new Compiler();

  await assert.rejects(
    () => compiler.compile("/nonexistent/path/file.mdx"),
    Error,
  );
});

test("compiler returns filename in result", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");
  await writeFile(tmpFile, "Content.");

  try {
    const result = await compiler.compile(tmpFile);

    assert.deepStrictEqual(result.filename, tmpFile);
  } finally {
    await rm(tmpFile);
  }
});

test("compiler handles UTF-8 characters", async () => {
  const compiler = new Compiler();
  const tmpFile = await makeTempFile(".mdx");

  await writeFile(tmpFile, "# こんにちは\n\nCafé résumé naïve.");

  try {
    const result = await compiler.compile(tmpFile);

    assert.ok(result.content.includes("こんにちは"));
    assert.ok(result.content.includes("Café"));
  } finally {
    await rm(tmpFile);
  }
});
