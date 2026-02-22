import type { PluggableList } from "unified";

export abstract class CompilerPlugin<T = unknown> {
  abstract key: string;

  private _remark: PluggableList | null = null;
  private _rehype: PluggableList | null = null;

  get remark(): PluggableList {
    return this._remark ?? [];
  }

  get rehype(): PluggableList {
    return this._rehype ?? [];
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

  abstract getData(): T;
  abstract reset(): void;
}
