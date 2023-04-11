export const SymbolForNextCache = Symbol("NextCache");

type Continuation<T, TReturn, TNext> = {
  (): ForkableGenerator<T, TReturn, TNext>;
  cache: TNext[];
};
export interface ForkableGenerator<T, TReturn, TNext>
  extends Generator<T, TReturn, TNext> {
  clone(): ForkableGenerator<T, TReturn, TNext>;
  fork(): ForkableGenerator<T, TReturn, TNext>;
  continuation(): Continuation<T, TReturn, TNext>;
  [SymbolForNextCache]: TNext[];
}

export type ForkableGeneratorFunction<T, TReturn, TNext> = (
  ...args: any[]
) => ForkableGenerator<T, TReturn, TNext>;

type GeneratorFunction<T, TReturn, TNext> = (
  ...args: any[]
) => Generator<T, TReturn, TNext>;
const fork = <T, TReturn, TNext>(
  generator: ForkableGenerator<T, TReturn, TNext>,
  cachedNextValues: TNext[]
): ForkableGenerator<T, TReturn, TNext> => {
  const instance = generator;
  // console.log("forking generator...")
  instance.next();
  cachedNextValues.forEach((cachedNextValue) => instance.next(cachedNextValue));
  // while (cachedNextValues.length > 0) {
  //     instance.next(cachedNextValues.shift()!)
  // }
  // console.log({newCache: instance[SymbolForNextCache]})
  // console.log("generator forked!")
  // instance.next(nextValue)
  return instance;
};

const forkWithArgs = <T, TReturn, TNext>(
  generatorCreator: ForkableGeneratorFunction<T, TReturn, TNext>,
  args: any[],
  cachedNextValues: TNext[]
): ForkableGenerator<T, TReturn, TNext> => {
  const instance = generatorCreator(...args);
  // console.log("forking generator...")
  instance.next();
  while (cachedNextValues.length > 0) {
    instance.next(cachedNextValues.shift()!);
  }
  // console.log({newCache: instance[SymbolForNextCache]})
  // console.log("generator forked!")
  // instance.next(nextValue)
  return instance;
};

// const cloneFork = <T, TReturn, TNext>(generatorInstance: ForkableGenerator<T, TReturn, TNext>, cachedNextValues: TNext[]): ForkableGenerator<T, TReturn, TNext> => {
//     const instance = structuredClone(generatorInstance)
//     console.log({generatorInstance, instance})
//     while (cachedNextValues.length > 0) {
//         instance.next(cachedNextValues.shift())
//     }
//     // instance.next(nextValue)
//     return instance
// }

export const ForkableGeneratorFunction = <T, TReturn, TNext>(
  generatorCreator: GeneratorFunction<T, TReturn, TNext>
): ForkableGeneratorFunction<T, TReturn, TNext> => {
  const wrappedGenerator = (...args: any[]) => {
    // let cachedNextValues: TNext[] = []
    // const generatorInstance = generatorCreator(...args)
    // const wrappedInstance = (function*() {
    //     let wrappedPreviousValue: [TNext] | [] = []
    //     // let hasPreviousValue = false;
    //     while (true) {
    //         const result = generatorInstance.next(...wrappedPreviousValue)
    //         const { done, value } = result
    //         if (done) {
    //             return value
    //         } else {
    //             const nextValue = yield value
    //             console.log({nextValue})
    //             cachedNextValues.push(nextValue)
    //             wrappedPreviousValue = [nextValue]
    //             // hasPreviousValue = true
    //         }
    //         // isDone = done ?? true
    //         // previousValue = value
    //     }
    //     // return previousValue
    // } as GeneratorFunction<T, TReturn, TNext>)() as unknown as ForkableGenerator<T, TReturn, TNext>
    // wrappedInstance.fork = () => forkWithArgs(wrappedGenerator, args, cachedNextValues)
    // wrappedInstance.continuation = () => {
    //     const savedCachedNextValues = [...cachedNextValues]
    //     return Object.assign(() => {
    //         console.log(`forking continuation with cache ${JSON.stringify(savedCachedNextValues)}`)
    //         debugger;
    //         return forkWithArgs(wrappedGenerator, args, savedCachedNextValues)
    //     }, { cache: savedCachedNextValues }) as Continuation<T, TReturn, TNext>
    // }
    // wrappedInstance[SymbolForNextCache] = cachedNextValues
    // return wrappedInstance
    const createGenerator = () => generatorCreator(...args);
    const instance = new ForkableGenerator(createGenerator);
    return instance;
  };
  return wrappedGenerator;
};

// export const SymbolForNextCache = Symbol("NextCache")
export const SymbolForBaseGenerator = Symbol("BaseGenerator");
export const SymbolForCloneGenerator = Symbol("GeneratorCreator");
export const SymbolForNextValue = Symbol("NextValue");
export class ForkableGenerator<T, TReturn, TNext>
  implements Generator<T, TReturn, TNext>
{
  [SymbolForNextCache]: TNext[];
  [SymbolForBaseGenerator]: Generator<T, TReturn, TNext>;
  [SymbolForNextValue]: TNext | undefined = undefined;
  [SymbolForCloneGenerator]: () => Generator<T, TReturn, TNext>;

  constructor(creator: () => Generator<T, TReturn, TNext>) {
    this[SymbolForNextCache] = [];
    this[SymbolForCloneGenerator] = creator;
    this[SymbolForBaseGenerator] = this.clone();
  }

  next(...args: [TNext] | []) {
    this[SymbolForNextCache].push(...args);
    const nextValue = this[SymbolForBaseGenerator].next(...args);
    return nextValue;
  }

  return(value: TReturn) {
    const returnValue = this[SymbolForBaseGenerator].return(value);
    return returnValue;
  }

  throw(value: TReturn) {
    const throwValue = this[SymbolForBaseGenerator].throw(value);
    return throwValue;
  }

  [Symbol.iterator]() {
    return this[SymbolForBaseGenerator][Symbol.iterator]();
  }

  fork() {
    const forkedGenerator = fork(
      new ForkableGenerator(this[SymbolForCloneGenerator]),
      this[SymbolForNextCache]
    ) as ForkableGenerator<T, TReturn, TNext>;
    return forkedGenerator;
  }

  clone() {
    return this[SymbolForCloneGenerator]();
  }

  continuation() {
    const storedNextCache = [...this[SymbolForNextCache]];
    const continuationCacheString = JSON.stringify(storedNextCache);
    // console.log(`generating continuation with cache ${continuationCacheString}`)
    return () => {
      // console.log(`forking continuation with cache ${JSON.stringify(storedNextCache)} (compare with ${continuationCacheString})`)
      const forkedGenerator = fork(
        new ForkableGenerator(this[SymbolForCloneGenerator]),
        storedNextCache
      ) as ForkableGenerator<T, TReturn, TNext>;
      return forkedGenerator as ForkableGenerator<T, TReturn, TNext>;
    };
  }
}

// export const wrapForkableGenerator = <T, TReturn, TNext>(generatorInstance: Generator<T, TReturn, TNext>): ForkableGenerator<T, TReturn, TNext> => {
//     let cachedNextValues: TNext[] = []
//     const wrappedGenerator = (function*() {
//         let isDone = false
//         let previousValue;
//         while (!isDone) {
//             const nextValue = yield previousValue
//             cachedNextValues.push(nextValue)
//             const { done, value } = generatorInstance.next(nextValue)
//             isDone = done ?? true
//             previousValue = value
//         }
//         return previousValue
//     })() as ForkableGenerator<T, TReturn, TNext>
//     wrappedGenerator.fork = () => cloneFork(wrappedGenerator, cachedNextValues)
//     return wrappedGenerator
// }

export const isForkableGenerator = <T, TNext, TReturn>(
  possiblyForkableGenerator: ForkableGenerator<T, TNext, TReturn> | any
): possiblyForkableGenerator is ForkableGenerator<T, TNext, TReturn> => {
  return typeof possiblyForkableGenerator["fork"] === "function";
};
