// deno-lint-ignore-file no-explicit-any

import type { PluggableList } from "unified";
import type { ComponentType } from "preact";

export interface IslandComponents {
  /** Server-side component used during SSR — replaces the real component with a placeholder */
  server: ComponentType<any>;
  /** Client-side component registered for hydration */
  client: ComponentType<any>;
}

export abstract class CompilerPlugin<T = unknown> {
  abstract key: string;

  private _remark: PluggableList | null = null;
  private _rehype: PluggableList | null = null;
  private _components: Record<string, IslandComponents> = {};

  get remark(): PluggableList {
    return this._remark ?? [];
  }

  get rehype(): PluggableList {
    return this._rehype ?? [];
  }

  get components(): Record<string, IslandComponents> {
    return this._components;
  }

  protected registerRemark(...plugins: PluggableList): this {
    if (!this._remark) this._remark = [];
    this._remark.push(...plugins);
    return this;
  }

  protected registerRehype(...plugins: PluggableList): this {
    if (!this._rehype) this._rehype = [];
    this._rehype.push(...plugins);
    return this;
  }

  protected registerComponent(name: string, island: IslandComponents): this {
    this._components[name] = island;
    return this;
  }

  abstract getData(): T;
  abstract reset(): void;
}
