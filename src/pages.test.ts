import { assertEquals, assertRejects } from "@std/assert";

import Pages from "./pages.ts";

const makeMockContext = (pathname: string) => {
  return {
    request: {
      method: "GET",
      url: new URL(`http://localhost${pathname}`),
    },
    response: {
      status: 200,
      headers: new Headers(),
      body: null as unknown,
    },
  };
}

Deno.test("pages throws server error when path not configured", async () => {
  const pages = new Pages();
  const context = makeMockContext("/");
  const next = () => Promise.resolve();

  await assertRejects(
    () => pages.handler(context as never, next),
    Error,
    "path",
  );
});

Deno.test("pages initialises with default extensions", () => {
  const pages = new Pages();

  const opts = (pages as unknown as { options: { extensions: string[] } }).options;

  assertEquals(opts.extensions, ["mdx"]);
});

Deno.test("pages allows registration of remark plugin", () => {
  const pages = new Pages();
  const plugin = () => (tree: unknown) => tree;

  const returned = pages.registerRemarkPlugin(plugin);

  // Fluent interface returns same instance
  assertEquals(returned, pages);

  const opts = (pages as unknown as { options: { remarkPlugins: unknown[] } }).options;
  assertEquals(opts.remarkPlugins?.length, 1);
});

Deno.test("pages allows registration of rehype plugin", () => {
  const pages = new Pages();
  const plugin = () => (tree: unknown) => tree;

  const returned = pages.registerRehypePlugin(plugin);

  assertEquals(returned, pages);

  const opts = (pages as unknown as { options: { rehypePlugins: unknown[] } }).options;
  assertEquals(opts.rehypePlugins?.length, 1);
});

Deno.test("pages remark registration method is chainable", () => {
  const pages = new Pages();
  const pluginA = () => (tree: unknown) => tree;
  const pluginB = () => (tree: unknown) => tree;

  pages.registerRemarkPlugin(pluginA).registerRemarkPlugin(pluginB);

  const opts = (pages as unknown as { options: { remarkPlugins: unknown[] } }).options;
  assertEquals(opts.remarkPlugins?.length, 2);
});

Deno.test("pages rehype registration method is chainable", () => {
  const pages = new Pages();
  const pluginA = () => (tree: unknown) => tree;
  const pluginB = () => (tree: unknown) => tree;

  pages.registerRehypePlugin(pluginA).registerRehypePlugin(pluginB);

  const opts = (pages as unknown as { options: { rehypePlugins: unknown[] } }).options;
  assertEquals(opts.rehypePlugins?.length, 2);
});

Deno.test("pages converts index filename to root", () => {
  const dir = "/pages";
  const pages = new Pages({ path: dir, extensions: ["mdx"] });

  const fn = (pages as unknown as { filenameToRoutePathname(f: string): string }).filenameToRoutePathname.bind(pages);

  assertEquals(fn(`${dir}/index.mdx`), "/");
});

Deno.test("pages converts nested index", () => {
  const dir = "/pages";
  const pages = new Pages({ path: dir, extensions: ["mdx"] });

  const fn = (pages as unknown as { filenameToRoutePathname(f: string): string }).filenameToRoutePathname.bind(pages);

  assertEquals(fn(`${dir}/docs/index.mdx`), "/docs");
});

Deno.test("pages strips extension", () => {
  const dir = "/pages";
  const pages = new Pages({ path: dir, extensions: ["mdx"] });

  const fn = (pages as unknown as { filenameToRoutePathname(f: string): string }).filenameToRoutePathname.bind(pages);

  assertEquals(fn(`${dir}/about.mdx`), "/about");
});

Deno.test("pages handle property returns a middleware function", () => {
  const pages = new Pages();

  assertEquals(typeof pages.handle, "function");
});

Deno.test("pages merges options with defaults", () => {
  const pages = new Pages({
    path: "/custom",
    extensions: ["md", "mdx"],
  });

  const opts = (pages as unknown as { options: { path: string; extensions: string[] } }).options;

  assertEquals(opts.path, "/custom");
  assertEquals(opts.extensions, ["md", "mdx"]);
});
