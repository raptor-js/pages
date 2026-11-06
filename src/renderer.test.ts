import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Renderer from "./renderer.ts";
import { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

/**
 * Create an empty temporary file with the given suffix.
 */
async function makeTempFile(suffix: string): Promise<string> {
  const file = join(tmpdir(), `${randomUUID()}${suffix}`);

  await writeFile(file, "");

  return file;
}

async function makeTemplateDir(templateName = "docs"): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pages-"));

  await writeFile(
    `${dir}/${templateName}.vto`,
    `<!DOCTYPE html><html><body>{{ content }}</body></html>`,
  );

  return dir;
}

async function makeMdxFile(content: string): Promise<string> {
  const file = await makeTempFile(".mdx");
  await writeFile(file, content);
  return file;
}

class StubPlugin extends CompilerPlugin<never> {
  key = "stub";
  getData = () => undefined as never;
  reset = () => {};
}

test("renderer renders MDX content into template", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("# Hello Renderer\n\nSome content.");
  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/hello");

    assert.ok(html.includes("Hello Renderer"));
    assert.ok(html.includes("Some content"));
    assert.ok(html.includes("<!DOCTYPE html>"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer uses frontmatter template field when present", async () => {
  const templateDir = await makeTemplateDir("custom");
  const mdxFile = await makeMdxFile(
    `---\ntemplate: custom\n---\n\nCustom template content.`,
  );
  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/custom");

    assert.ok(html.includes("Custom template content"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer defaults to docs template when no template in frontmatter", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("No frontmatter here.");
  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/no-template");

    assert.ok(html.includes("<!DOCTYPE html>"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer passes pathname to template context", async () => {
  const templateDir = await mkdtemp(join(tmpdir(), "pages-"));

  await writeFile(
    `${templateDir}/docs.vto`,
    `<html><body>{{ pathname }}{{ content }}</body></html>`,
  );

  const mdxFile = await makeMdxFile("Content.");
  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/my-path");

    assert.ok(html.includes("/my-path"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer passes frontmatter fields to template context", async () => {
  const templateDir = await mkdtemp(join(tmpdir(), "pages-"));

  await writeFile(
    `${templateDir}/docs.vto`,
    `<html><head><title>{{ frontmatter.title }}</title></head><body>{{ content }}</body></html>`,
  );

  const mdxFile = await makeMdxFile(
    `---\ntitle: My Doc Title\n---\n\nPage body.`,
  );
  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/docs");

    assert.ok(html.includes("My Doc Title"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer throws when template file is missing", async () => {
  const templateDir = await mkdtemp(join(tmpdir(), "pages-"));
  const mdxFile = await makeMdxFile("Content.");

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    await assert.rejects(
      () => renderer.render(mdxFile, "/missing-template"),
      Error,
    );
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});

test("renderer accepts compiler plugins via options", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("Plugin test.");

  const renderer = new Renderer({
    templateDirectory: templateDir,
    plugins: [new StubPlugin()],
  });

  try {
    const html = await renderer.render(mdxFile, "/plugins");

    assert.ok(html.includes("Plugin test"));
  } finally {
    await rm(templateDir, { recursive: true });
    await rm(mdxFile);
  }
});
