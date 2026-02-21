import { assertEquals, assertRejects } from "@std/assert";

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

Deno.test("pages initialises with default extensions", () => {
  const pages = new Pages();
  const opts =
    (pages as unknown as { options: { extensions: string[] } }).options;

  assertEquals(opts.extensions, ["mdx"]);
});

Deno.test("pages merges options with defaults", () => {
  const pages = new Pages({ path: "/custom", extensions: ["md", "mdx"] });
  const opts =
    (pages as unknown as { options: { path: string; extensions: string[] } })
      .options;

  assertEquals(opts.path, "/custom");
  assertEquals(opts.extensions, ["md", "mdx"]);
});

Deno.test("pages handle property returns a middleware function", () => {
  const pages = new Pages();

  assertEquals(typeof pages.handle, "function");
});

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

Deno.test("pages converts index filename to root route", () => {
  const pages = new Pages({ path: "/pages", extensions: ["mdx"] });
  const fn =
    (pages as unknown as { filenameToRoutePathname(f: string): string })
      .filenameToRoutePathname.bind(pages);

  assertEquals(fn("/pages/index.mdx"), "/");
});

Deno.test("pages converts nested index to directory route", () => {
  const pages = new Pages({ path: "/pages", extensions: ["mdx"] });
  const fn =
    (pages as unknown as { filenameToRoutePathname(f: string): string })
      .filenameToRoutePathname.bind(pages);

  assertEquals(fn("/pages/docs/index.mdx"), "/docs");
});

Deno.test("pages strips extension from route", () => {
  const pages = new Pages({ path: "/pages", extensions: ["mdx"] });
  const fn =
    (pages as unknown as { filenameToRoutePathname(f: string): string })
      .filenameToRoutePathname.bind(pages);

  assertEquals(fn("/pages/about.mdx"), "/about");
});

Deno.test("pages converts dynamic segment to route parameter", () => {
  const pages = new Pages({ path: "/pages", extensions: ["mdx"] });
  const fn =
    (pages as unknown as { filenameToRoutePathname(f: string): string })
      .filenameToRoutePathname.bind(pages);

  assertEquals(fn("/pages/docs/[slug].mdx"), "/docs/:slug");
});

Deno.test("pages accepts compiler plugins via constructor", () => {
  const plugin = new StubPlugin();
  const pages = new Pages({ plugins: [plugin] });
  const opts =
    (pages as unknown as { options: { plugins: unknown[] } }).options;

  assertEquals(opts.plugins?.length, 1);
});

Deno.test("compiler plugin exposes remark plugins", () => {
  const plugin = new StubPlugin();

  assertEquals(plugin.remark.length, 1);
});

Deno.test("compiler plugin exposes rehype plugins", () => {
  const plugin = new StubPlugin();

  assertEquals(plugin.rehype.length, 1);
});

Deno.test("compiler plugin reset clears state", () => {
  const plugin = new StubPlugin();
  plugin.reset();

  assertEquals(plugin.getData(), { called: false });
});

Deno.test("compiler plugin key is accessible", () => {
  const plugin = new StubPlugin();

  assertEquals(plugin.key, "stub");
});

Deno.test("pages preserves plugins in options", () => {
  const pluginA = new StubPlugin();
  const pluginB = new StubPlugin();
  const pages = new Pages({ plugins: [pluginA, pluginB] });
  const opts =
    (pages as unknown as { options: { plugins: unknown[] } }).options;

  assertEquals(opts.plugins?.length, 2);
});
