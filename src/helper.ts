// deno-lint-ignore-file no-explicit-any

import type { Middleware } from "@raptor/framework";

import Pages from "./pages.ts";

const instance = new Pages();

/**
 * Prepare a new object which provides a great developer experience when
 * registering the pages middleware.
 */
const pages = new Proxy(instance.handle, {
  get(target, prop, receiver) {
    if (prop in instance) {
      const value = (instance as any)[prop];

      return typeof value === "function" ? value.bind(instance) : value;
    }

    return Reflect.get(target, prop, receiver);
  },

  set(_target, prop, value) {
    (instance as any)[prop] = value;

    return true;
  },
}) as Middleware & Pages;

export default pages;
