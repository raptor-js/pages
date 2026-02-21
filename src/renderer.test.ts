import { assertRejects, assertStringIncludes } from "@std/assert";

import Renderer from "./renderer.ts";
import { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

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

class StubPlugin extends CompilerPlugin<never> {
  key = "stub";
  getData = () => undefined as never;
  reset = () => {};
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
    `---\ntemplate: custom\n---\n\nCustom template content.`,
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
  const templateDir = await Deno.makeTempDir();

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
  const templateDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    `${templateDir}/docs.vto`,
    `<html><head><title>{{ frontmatter.title }}</title></head><body>{{ content }}</body></html>`,
  );

  const mdxFile = await makeMdxFile(
    `---\ntitle: My Doc Title\n---\n\nPage body.`,
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
  const templateDir = await Deno.makeTempDir();
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

Deno.test("renderer accepts compiler plugins via options", async () => {
  const templateDir = await makeTemplateDir("docs");
  const mdxFile = await makeMdxFile("Plugin test.");

  const renderer = new Renderer({
    templateDirectory: templateDir,
    plugins: [new StubPlugin()],
  });

  try {
    const html = await renderer.render(mdxFile, "/plugins");

    assertStringIncludes(html, "Plugin test");
  } finally {
    await Deno.remove(templateDir, { recursive: true });
    await Deno.remove(mdxFile);
  }
});
