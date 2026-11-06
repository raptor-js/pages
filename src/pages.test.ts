import assert from "node:assert/strict";
import { test } from "node:test";

import Pages from "./pages.ts";
import { CompilerPlugin } from "./interfaces/compiler-plugin.ts";

const makeMockContext = (pathname: string) => ({
  request: {
    method: "GET",
    url: new URL(`http://localhost${pathname}`),
  },
  response: {
    status: 200,
    headers: new Headers(),
    body: null as unknown,
  },
});

class StubPlugin extends CompilerPlugin<{ called: boolean }> {
  key = "stub";
  private _called = false;

  constructor() {
    super();
    this.registerRemark(() => (tree: unknown) => tree);
    this.registerRehype(() => (tree: unknown) => tree);
  }

  getData() {
    return { called: this._called };
  }
  reset() {
    this._called = false;
  }
}

test("pages initialises with default extensions", () => {
  const pages = new Pages();
  const config = (pages as unknown as { config: { extensions: string[] } })
    .config;

  assert.deepStrictEqual(config.extensions, ["mdx"]);
});

test("pages merges options with defaults", () => {
  const pages = new Pages({
    pageDirectory: "/custom",
    extensions: ["md", "mdx"],
  });
  const config = (
    pages as unknown as {
      config: { pageDirectory: string; extensions: string[] };
    }
  ).config;

  assert.deepStrictEqual(config.pageDirectory, "/custom");
  assert.deepStrictEqual(config.extensions, ["md", "mdx"]);
});

test("pages handle property returns a middleware function", () => {
  const pages = new Pages();

  assert.deepStrictEqual(typeof pages.handle, "function");
});

test("pages throws server error when path not configured", async () => {
  const pages = new Pages();
  const context = makeMockContext("/");
  const next = () => Promise.resolve();

  await assert.rejects(
    () => pages.handler(context as never, next),
    (error) => error instanceof Error && error.message.includes("path"),
  );
});

test("pages converts index filename to root route", () => {
  const pages = new Pages({ pageDirectory: "/pages", extensions: ["mdx"] });
  const fn = (
    pages as unknown as { filenameToRoutePathname(f: string): string }
  ).filenameToRoutePathname.bind(pages);

  assert.deepStrictEqual(fn("/pages/index.mdx"), "/");
});

test("pages converts nested index to directory route", () => {
  const pages = new Pages({ pageDirectory: "/pages", extensions: ["mdx"] });
  const fn = (
    pages as unknown as { filenameToRoutePathname(f: string): string }
  ).filenameToRoutePathname.bind(pages);

  assert.deepStrictEqual(fn("/pages/docs/index.mdx"), "/docs");
});

test("pages strips extension from route", () => {
  const pages = new Pages({ pageDirectory: "/pages", extensions: ["mdx"] });
  const fn = (
    pages as unknown as { filenameToRoutePathname(f: string): string }
  ).filenameToRoutePathname.bind(pages);

  assert.deepStrictEqual(fn("/pages/about.mdx"), "/about");
});

test("pages converts dynamic segment to route parameter", () => {
  const pages = new Pages({ pageDirectory: "/pages", extensions: ["mdx"] });
  const fn = (
    pages as unknown as { filenameToRoutePathname(f: string): string }
  ).filenameToRoutePathname.bind(pages);

  assert.deepStrictEqual(fn("/pages/docs/[slug].mdx"), "/docs/:slug");
});

test("pages accepts compiler plugins via constructor", () => {
  const plugin = new StubPlugin();
  const pages = new Pages({ plugins: [plugin] });
  const config = (pages as unknown as { config: { plugins: unknown[] } })
    .config;

  assert.deepStrictEqual(config.plugins?.length, 1);
});

test("compiler plugin exposes remark plugins", () => {
  const plugin = new StubPlugin();

  assert.deepStrictEqual(plugin.remark.length, 1);
});

test("compiler plugin exposes rehype plugins", () => {
  const plugin = new StubPlugin();

  assert.deepStrictEqual(plugin.rehype.length, 1);
});

test("compiler plugin reset clears state", () => {
  const plugin = new StubPlugin();
  plugin.reset();

  assert.deepStrictEqual(plugin.getData(), { called: false });
});

test("compiler plugin key is accessible", () => {
  const plugin = new StubPlugin();

  assert.deepStrictEqual(plugin.key, "stub");
});

test("pages preserves plugins in options", () => {
  const pluginA = new StubPlugin();
  const pluginB = new StubPlugin();
  const pages = new Pages({ plugins: [pluginA, pluginB] });
  const config = (pages as unknown as { config: { plugins: unknown[] } })
    .config;

  assert.deepStrictEqual(config.plugins?.length, 2);
});
