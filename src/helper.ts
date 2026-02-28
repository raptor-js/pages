import type { Middleware } from "@raptor/kernel";

import Pages from "./pages.ts";
import type { Config } from "./config.ts";

export default function pages(config?: Config): Middleware {
  const instance = new Pages(config);

  return instance.handle;
}
