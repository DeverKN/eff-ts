export type GeneratorCreator<TArgs extends unknown[], T, TReturn, TNext> = (...args: TArgs) => Generator<T, TReturn, TNext>;

export const wrapGeneratorForkable = <TArgs extends unknown[], T, TReturn, TNext>(
  base: GeneratorCreator<TArgs, T, TReturn, TNext>
) => {
  return (...args: TArgs) => {
    return new ForkableGeneratorInstance(base, args);
  };
};

export class ForkableGeneratorInstance<TArgs extends unknown[], T, TReturn, TNext> {
  private base: GeneratorCreator<TArgs, T, TReturn, TNext>;
  private args: TArgs;
  private cache: TNext[] = [];
  private instance: Generator<T, TReturn, TNext>;

  constructor(base: GeneratorCreator<TArgs, T, TReturn, TNext>, args: TArgs, cache: TNext[] = []) {
    this.base = base;
    this.args = args;
    this.instance = base(...args);
    cache.forEach((cacheVal) => this.next(cacheVal));
  }

  next(nextVal: TNext): IteratorResult<T, TReturn> {
    this.cache.push(nextVal);
    return this.instance.next(nextVal);
  }

  fork() {
    const savedCache = [...this.cache]
    return () => {
      return new ForkableGeneratorInstance(this.base, this.args, savedCache);
    }
  }

  [Symbol.iterator](): Iterator<T, TReturn, TNext> {
    return this
  }
}
