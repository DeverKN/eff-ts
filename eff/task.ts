import { ContinuationTuple } from "./continuation";
import { eff, Effect, ResumeType, UnknownEffect } from "./effect";
import { GeneratorCreator } from "./generator/ForkableGenerator";
import { ImmutableGeneratorInstance, wrapGeneratorImmmutable } from "./generator/ImmutableGenerator";
import { Observable, single } from "./Observable";
import { run } from "./run";

export const SymbolForTaskBrand = Symbol("taskBrand");
export type SymbolForTaskBrand = typeof SymbolForTaskBrand;
// type TaskBrand = { [SymbolForTaskBrand]: true };

export type Task<TEffects extends UnknownEffect, TReturn, TArgs extends unknown[] = any> = ImmutableGeneratorInstance<
  TArgs,
  TEffects,
  TReturn,
  ResumeType<TEffects>
>;

export const task = <TArgs extends unknown[], TReturn, TEffects extends UnknownEffect>(
  gen: GeneratorCreator<TArgs, TEffects, TReturn, ResumeType<TEffects>>
): ((...args: TArgs) => Task<TEffects, TReturn, TArgs>) => {
  const wrappedGen = wrapGeneratorImmmutable(gen);
  return (...args: TArgs) => {
    const instance = wrappedGen(...args);
    return Object.assign(instance, { [SymbolForTaskBrand]: true as const });
  };
};

// const genericEffect = <TEffect extends UnknownEffect>(
//   name: TEffect["name"]
// ): (<TArgs extends TEffect["args"]>(...args: TArgs) => TypedYield<Effect<TEffect["name"], TArgs, ResumeType<TEffect>>, ResumeType<TEffect>>) => {
//   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//   return function* (...args: TEffect["args"]) {
//     const instance = { name, args, __unsafe_do_not_use__resumeType: void 0 } as TEffect;
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//     const effectResult = yield instance;
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//     return effectResult;
//   } as any;
// };

// type InputEffect = Effect<"input", [prompt: string], string>;
// const input = eff<InputEffect>("input");

// type LogEffect = Effect<"log", [msg: any], void>;
// const log = eff<LogEffect>("log");

// type ChooseEffect<T> = Effect<"choose", [list: T[]], T>;
// const choose = <T>(list: T[]) => eff<ChooseEffect<T>>("choose")(list);

// type AmbEffect<T> = Effect<"amb", [list: T[]], T>;
// const amb = <T>(list: T[]) => eff<AmbEffect<T>>("amb")(list);

// type BackTrackEffect = Effect<"backtrack", [], void>;
// const backtrack = eff<BackTrackEffect>("backtrack");

// type WriteEffect<T> = Effect<"write", [newVal: T], void>;
// const write = <T>(newVal: T) => eff<WriteEffect<T>>("write")(newVal);

// type ReadEffect<T> = Effect<"read", [], T>;
// const read = <T>() => eff<ReadEffect<T>>("read")();

// type SubscribeEffect<T> = Effect<"subscribe", [observable: Observable<T>], T>;
// const subscribe = <T>(observable: Observable<T>) => eff<SubscribeEffect<T>>("subscribe")(observable);

// // const choose$ = genericEffect<ChooseEffect<unknown>>("choose");

// const inputTask = task(function* (msg?: string) {
//   const name = yield* input(msg ?? "What is your name?");
//   return name;
// });

// // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// const nums: Observable<number> = void 0 as any;

// const testTask = task(function* () {
//   const name = yield* inputTask();
//   yield* log(`Hello ${name}`);
//   const num = yield* amb([1, 2, 3, 4]);
//   yield* write(num);
//   if (num < 2) yield* backtrack();
//   yield* log(yield* read());
// });

// const handleLog = <TWorld>(_: TWorld, msg: any) => {
//   return new Observable<[undefined]>((sub) => {
//     console.log(msg);
//     sub.next([void 0]);
//     sub.complete();
//   });
// };

// const handleInput = <TWorld>(_: TWorld, msg: string) => {
//   return single<[string]>([prompt(msg) ?? "__fallback__"]);
// };

// const handleSubscribe = <TWorld, T>(_: TWorld, observable: Observable<T>) => {
//   return new Observable<ContinuationTuple<T, TWorld>>((sub) => {
//     observable.subscribe({
//       next: (nextVal) => {
//         sub.next([nextVal]);
//       },
//     });
//   });
// };

// const handleAmb = <TWorld extends { backtrack: () => void }, T>(_: TWorld, list: T[]) => {
//   return new Observable<[T]>((sub) => {
//     list.forEach((el) => sub.next([el]));
//     sub.complete();
//   });
// };

// const handleBacktrack = <TWorld extends { backtrack: () => void }>(world: TWorld) => {
//   return new Observable<[void]>((sub) => {
//     world.backtrack();
//     sub.complete();
//   });
// };

// const handleRead = <T>(world: { state: T }) => {
//   return new Observable<[T]>((sub) => {
//     sub.next([world.state]);
//     sub.complete();
//   });
// };

// const handleWrite = <TWorld extends { state: T }, T>(world: TWorld, newVal: T) => {
//   return new Observable<[undefined, TWorld]>((sub) => {
//     sub.next([void 0, { ...world, state: newVal }]);
//     sub.complete();
//   });
// };

// const handleWrite$ = <TWorld extends { state: T }, T>(world: TWorld, newVal: T) => {
//   return new Observable<[undefined, TWorld]>((sub) => {
//     sub.next([void 0, { ...world, state: newVal }]);
//     sub.complete();
//   });
// };

// run(
//   testTask(),
//   {
//     log: handleLog,
//     input: handleInput,
//     // subscribe: handleSubscribe,
//     write: handleWrite,
//     read: handleRead,
//     amb: handleAmb,
//     backtrack: handleBacktrack,
//   },
//   { backtrack: () => void 0, state: 0 }
// );
