import { ForkableGeneratorInstance, GeneratorCreator } from "./ForkableGenerator";

export const SymbolForImmutableGeneratorBrand = Symbol("immutableGenerator");
export type SymbolForImmutableGeneratorBrand = typeof SymbolForImmutableGeneratorBrand;
type ImmutableGeneratorBrand = { [SymbolForImmutableGeneratorBrand]: true };

export interface ImmutableIterator<TYield, TReturn, TNext> {
  next: (nextVal: TNext) => ImmutableIteratorResult<TYield, TReturn, TNext>;
  [Symbol.iterator]: () => Iterator<TYield, TReturn, TNext>;
}

type ImmutableIteratorResult<TYield, TReturn, TNext> =
  | {
      value: TYield;
      iterator: ImmutableIterator<TYield, TReturn, TNext>;
      done: false;
    }
  | {
      value: TReturn;
      done: true;
    };

type ImmutableGeneratorResult<TYield, TReturn, TNext> =
  | {
      value: TYield;
      iterator: ImmutableGeneratorInstance<any, TYield, TReturn, TNext>;
      done: false;
    }
  | {
      value: TReturn;
      done: true;
    };

export const wrapGeneratorImmmutable = <TArgs extends unknown[], T, TReturn, TNext>(
  base: GeneratorCreator<TArgs, T, TReturn, TNext>
) => {
  return (...args: TArgs) => {
    return new ImmutableGeneratorInstance(new ForkableGeneratorInstance(base, args));
  };
};

export class ImmutableGeneratorInstance<TArgs extends unknown[], T, TReturn, TNext> {
  #base: ForkableGeneratorInstance<TArgs, T, TReturn, TNext>;
  #shouldClone = false;
  #fork: () => ForkableGeneratorInstance<TArgs, T, TReturn, TNext>;

  [SymbolForImmutableGeneratorBrand] = true

  constructor(base: ForkableGeneratorInstance<TArgs, T, TReturn, TNext>) {
    this.#base = base;
    this.#fork = this.#base.fork();
  }

  next(nextVal: TNext): ImmutableGeneratorResult<T, TReturn, TNext> {
    const res = this.#base.next(nextVal);
    if (res.done) {
      return { ...res };
    } else {
      const iterator = this.#shouldClone
        ? new ImmutableGeneratorInstance(this.#fork())
        : new ImmutableGeneratorInstance(this.#base);
      this.#shouldClone = true;
      return { done: false, value: res.value, iterator };
    }
  }

  [Symbol.iterator]() {
    return this.#fork();
  }
}
