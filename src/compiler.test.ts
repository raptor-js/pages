import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";

import Compiler from "./compiler.ts";

Deno.test("compiler compiles basic MDX content", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "# Hello World\n\nThis is a paragraph.");

  try {
    const result = await compiler.compile(tmpFile);

    assertEquals(typeof result.html, "string");
    assertStringIncludes(result.html, "Hello World");
    assertStringIncludes(result.html, "This is a paragraph");
    assertEquals(result.filename, tmpFile);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler extracts frontmatter", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(
    tmpFile,
    `---
title: My Page
template: docs
description: A test page
---

# Content
`,
  );

  try {
    const result = await compiler.compile(tmpFile);

    assertEquals(result.frontmatter.title, "My Page");
    assertEquals(result.frontmatter.template, "docs");
    assertEquals(result.frontmatter.description, "A test page");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler returns empty frontmatter when none present", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "Just some content with no frontmatter.");

  try {
    const result = await compiler.compile(tmpFile);

    assertEquals(typeof result.frontmatter, "object");
    assertEquals(Object.keys(result.frontmatter).length, 0);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler renders GFM tables by default", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(
    tmpFile,
    `| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
`,
  );

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.html, "<table");
    assertStringIncludes(result.html, "Column A");
    assertStringIncludes(result.html, "Cell 1");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler renders GFM strikethrough by default", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "~~strikethrough text~~");

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.html, "<del>");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler accepts custom remark plugins", async () => {
  const noopPlugin = () => (tree: unknown) => tree;

  const compiler = new Compiler({
    remarkPlugins: [noopPlugin],
  });

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "Hello from custom plugin test.");

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.html, "Hello from custom plugin test");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler throws on missing file", async () => {
  const compiler = new Compiler();

  await assertRejects(
    () => compiler.compile("/nonexistent/path/file.mdx"),
    Error,
  );
});

Deno.test("compiler returns filename in result", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "Content.");

  try {
    const result = await compiler.compile(tmpFile);

    assertEquals(result.filename, tmpFile);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler handles UTF-8 characters", async () => {
  const compiler = new Compiler();

  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "# こんにちは\n\nCafé résumé naïve.");

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.html, "こんにちは");
    assertStringIncludes(result.html, "Café");
  } finally {
    await Deno.remove(tmpFile);
  }
});
