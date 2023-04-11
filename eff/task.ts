import { doLog } from "../src/Effects";
import { ContinuationTuple } from "./continuation";
import { Effect, ResumeType, UnknownEffect } from "./Effect";
import { ForkableGeneratorInstance, GeneratorCreator, wrapGeneratorForkable } from "./generator/ForkableGenerator";
import { ImmutableGeneratorInstance, ImmutableIterator, wrapGeneratorImmmutable } from "./generator/ImmutableGenerator";
import { Observable, single } from "./Observable";
import { run } from "./run";
import { hole } from "./sort";

export const SymbolForTaskBrand = Symbol("taskBrand");
export type SymbolForTaskBrand = typeof SymbolForTaskBrand;
type TaskBrand = { [SymbolForTaskBrand]: true };

export type Task<TEffects extends UnknownEffect, TReturn, TArgs extends unknown[] = any> = ImmutableGeneratorInstance<
  TArgs,
  TEffects,
  TReturn,
  ResumeType<TEffects>
>;

type TypedYield<TYield, TNext> = Generator<TYield, TNext, TNext>;

export const task = <TArgs extends unknown[], TReturn, TEffects extends UnknownEffect>(
  gen: GeneratorCreator<TArgs, TEffects, TReturn, ResumeType<TEffects>>
): ((...args: TArgs) => Task<TEffects, TReturn, TArgs>) => {
  const wrappedGen = wrapGeneratorImmmutable(gen);
  return (...args: TArgs) => {
    const instance = wrappedGen(...args);
    return Object.assign(instance, { [SymbolForTaskBrand]: true as const });
  };
};

const eff = <TEffect extends UnknownEffect>(
  name: TEffect["name"]
): ((...args: TEffect["args"]) => TypedYield<TEffect, ResumeType<TEffect>>) => {
  return function* (...args: TEffect["args"]) {
    const instance = { name, args, __unsafe_do_not_use__resumeType: void 0 } as TEffect;
    const effectResult = yield instance;
    return effectResult;
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

type InputEffect = Effect<"input", [prompt: string], string>;
const input = eff<InputEffect>("input");

type LogEffect = Effect<"log", [msg: any], void>;
const log = eff<LogEffect>("log");

type ChooseEffect<T> = Effect<"choose", [list: T[]], T>;
const choose = <T>(list: T[]) => eff<ChooseEffect<T>>("choose")(list);

type SubscribeEffect<T> = Effect<"subscribe", [observable: Observable<T>], T>;
const subscribe = <T>(observable: Observable<T>) => eff<SubscribeEffect<T>>("subscribe")(observable);

// const choose$ = genericEffect<ChooseEffect<unknown>>("choose");

const inputTask = task(function* (msg?: string) {
  const name = yield* input(msg ?? "What is your name?");
  return name;
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const nums: Observable<number> = void 0 as any;

const testTask = task(function* () {
  const name = yield* inputTask();
  yield* log(`Hello ${name}`);
  const num = yield* subscribe(nums);
});

const handleLog = <TWorld>(_: TWorld, msg: any) => {
  return new Observable<[undefined]>((sub) => {
    console.log(msg);
    sub.next([void 0]);
    sub.complete();
  });
};

const handleInput = <TWorld>(_: TWorld, msg: string) => {
  return single<[string]>([prompt(msg) ?? "__fallback__"]);
};

const handleSubscribe = <TWorld, T>(_: TWorld, observable: Observable<T>) => {
  return new Observable<ContinuationTuple<T, TWorld>>((sub) => {
    observable.subscribe({
      next: (nextVal) => {
        sub.next([nextVal]);
      },
    });
  });
};

run(
  testTask(),
  {
    log: handleLog,
    input: handleInput,
    subscribe: (arg1, observable) => hole(new Observable((sub) => observable.subscribe((nextVal) => sub.next([nextVal])))),
  },
  {}
);
