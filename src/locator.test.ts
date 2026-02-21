import { assertEquals, assertRejects } from "@std/assert";

import Locator from "./locator.ts";

async function makeTempDir(): Promise<string> {
  return await Deno.makeTempDir();
}

Deno.test("locator finds files with matching extension", async () => {
  const dir = await makeTempDir();

  await Deno.writeTextFile(`${dir}/page.mdx`, "content");
  await Deno.writeTextFile(`${dir}/other.txt`, "content");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 1);
    assertEquals(files[0].endsWith("page.mdx"), true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator finds files recursively in nested directories", async () => {
  const dir = await makeTempDir();
  const subDir = `${dir}/nested`;

  await Deno.mkdir(subDir);
  await Deno.writeTextFile(`${dir}/root.mdx`, "root");
  await Deno.writeTextFile(`${subDir}/child.mdx`, "child");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator returns empty array when no matching files", async () => {
  const dir = await makeTempDir();

  await Deno.writeTextFile(`${dir}/file.txt`, "content");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator returns empty array for empty directory", async () => {
  const dir = await makeTempDir();

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator supports multiple extensions", async () => {
  const dir = await makeTempDir();

  await Deno.writeTextFile(`${dir}/page.mdx`, "content");
  await Deno.writeTextFile(`${dir}/page.md`, "content");
  await Deno.writeTextFile(`${dir}/ignored.txt`, "content");

  const locator = new Locator({ extensions: ["mdx", "md"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator throws server error when extensions not configured", async () => {
  const dir = await makeTempDir();

  const locator = new Locator({});

  try {
    await assertRejects(
      () => locator.find(dir),
      Error,
      "extensions",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("locator deeply nested files are found", async () => {
  const dir = await makeTempDir();

  await Deno.mkdir(`${dir}/a/b/c`, { recursive: true });
  await Deno.writeTextFile(`${dir}/a/b/c/deep.mdx`, "deep");

  const locator = new Locator({ extensions: ["mdx"] });

  try {
    const files = await locator.find(dir);

    assertEquals(files.length, 1);
    assertEquals(files[0].endsWith("deep.mdx"), true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
