import { assertStringIncludes, assertRejects } from "@std/assert";

import Renderer from "./renderer.ts";

async function makeTemplateDir(templateName = "docs"): Promise<string> {
  const dir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    `${dir}/${templateName}.vto`,
    `<!DOCTYPE html><html><body>{{ content }}</body></html>`,
  );

  return dir;
}

async function makeMdxFile(content: string): Promise<string> {
  const file = await Deno.makeTempFile({ suffix: ".mdx" });
  await Deno.writeTextFile(file, content);
  return file;
}

Deno.test("renderer renders MDX content into template", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("# Hello Renderer\n\nSome content.");

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/hello");

    assertStringIncludes(html, "Hello Renderer");
    assertStringIncludes(html, "Some content");
    assertStringIncludes(html, "<!DOCTYPE html>");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer uses frontmatter template field when present", async () => {
  const templateDir = await makeTemplateDir("custom");
  const mdxFile = await makeMdxFile(
    `---
template: custom
---

Custom template content.`,
  );

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/custom");

    assertStringIncludes(html, "Custom template content");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer defaults to docs template when no template in frontmatter", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("No frontmatter here.");

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/no-template");

    assertStringIncludes(html, "<!DOCTYPE html>");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer passes pathname to template context", async () => {
  const templateDir = await makeTemplateDir();

  await Deno.writeTextFile(
    `${templateDir}/docs.vto`,
    `<html><body>{{ pathname }}{{ content }}</body></html>`,
  );

  const mdxFile = await makeMdxFile("Content.");

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/my-path");

    assertStringIncludes(html, "/my-path");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer passes frontmatter fields to template context", async () => {
  const templateDir = await makeTemplateDir();

  await Deno.writeTextFile(
    `${templateDir}/docs.vto`,
    `<html><head><title>{{ title }}</title></head><body>{{ content }}</body></html>`,
  );

  const mdxFile = await makeMdxFile(
    `---
title: My Doc Title
---

Page body.`,
  );

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const html = await renderer.render(mdxFile, "/docs");

    assertStringIncludes(html, "My Doc Title");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer throws when template file is missing", async () => {
  const templateDir = await Deno.makeTempDir(); // no template files
  const mdxFile = await makeMdxFile("Content.");

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    await assertRejects(
      () => renderer.render(mdxFile, "/missing-template"),
      Error,
    );
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});

Deno.test("renderer view method returns rendered string", async () => {
  const templateDir = await makeTemplateDir();

  await Deno.writeTextFile(
    `${templateDir}/docs.vto`,
    `<p>{{ message }}</p>`,
  );

  const renderer = new Renderer({ templateDirectory: templateDir });

  try {
    const result = await renderer.view("docs.vto", { message: "Hello from view" });

    assertStringIncludes(result, "Hello from view");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
  }
});
