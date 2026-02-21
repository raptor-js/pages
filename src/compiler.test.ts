import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";

import Compiler from "./compiler.ts";
import { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

class StubRemarkPlugin extends CompilerPlugin<never> {
  key = "stub-remark";

  constructor() {
    super();
    this.registerRemark(() => (tree: unknown) => tree);
  }

  getData = () => undefined as never;
  reset = () => {};
}

Deno.test("compiler compiles basic MDX content", async () => {
  const compiler = new Compiler();
  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });

  await Deno.writeTextFile(tmpFile, "# Hello World\n\nThis is a paragraph.");

  try {
    const result = await compiler.compile(tmpFile);

    assertEquals(typeof result.content, "string");
    assertStringIncludes(result.content, "Hello World");
    assertStringIncludes(result.content, "This is a paragraph");
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
    `---\ntitle: My Page\ntemplate: docs\ndescription: A test page\n---\n\n# Content\n`,
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
    `| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |\n`,
  );

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.content, "<table");
    assertStringIncludes(result.content, "Column A");
    assertStringIncludes(result.content, "Cell 1");
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

    assertStringIncludes(result.content, "<del>");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("compiler accepts compiler plugins", async () => {
  const compiler = new Compiler({ plugins: [new StubRemarkPlugin()] });
  const tmpFile = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(tmpFile, "Hello from custom plugin test.");

  try {
    const result = await compiler.compile(tmpFile);

    assertStringIncludes(result.content, "Hello from custom plugin test");
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

    assertStringIncludes(result.content, "こんにちは");
    assertStringIncludes(result.content, "Café");
  } finally {
    await Deno.remove(tmpFile);
  }
});
