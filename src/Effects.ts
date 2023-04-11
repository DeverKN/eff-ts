import { typedEffect, Effect } from "../eff/Effect";

type InputEffect = Effect<"input", string, string>;
type LogEffect = Effect<"log", string, void>;
type ForkEffect = Effect<"fork", void, boolean>;
type RepeatEffect = Effect<"repeat", number, number>;
type ForEachEffect<T> = Effect<"foreach", T[], T>;

export const doInput = typedEffect<InputEffect>("input");
export const doLog = typedEffect<LogEffect>("log");
export const doFork = typedEffect<ForkEffect>("fork");
export const doRepeat = typedEffect<RepeatEffect>("repeat");
export const doForEach = <T>(arg: T[]) => {
  return typedEffect<ForEachEffect<T>>("foreach")(arg);
};

// export const doForEach = parameterizedEffect<ForEachEffect<any>>("foreach")
// const effect = doForEach(10)
