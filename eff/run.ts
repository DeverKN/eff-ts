import { Effect, ResumeType, UnknownEffect } from "./Effect";
import { GeneratorCreator } from "./generator/ForkableGenerator";
import { Handler, Handlers } from "./handler";
import { Observable } from "./Observable";
import { SymbolForTaskBrand, task, Task } from "./task";

// type ExcessHandlers<TEffects extends UnknownEffect, TWorld> = {
//   [effectName: string]: Extract<TEffects, Effect<typeof effectName, unknown[], unknown>> extends UnknownEffect
//     ? Handler<Extract<TEffects, Effect<typeof effectName, unknown[], unknown>>, TWorld>
//     : unknown;
// };

const isTask = <TEffects extends UnknownEffect, TReturn>(maybeTask: Task<TEffects, TReturn> | any): maybeTask is Task<TEffects, TReturn> => {
  return (typeof maybeTask === "object") && Object.hasOwn(maybeTask as object, SymbolForTaskBrand)
}

export const run = <TEffects extends UnknownEffect, TReturn, TWorld = undefined>(
  taskBase: Task<TEffects, TReturn> | GeneratorCreator<[], TEffects, TReturn, ResumeType<TEffects>>,
  handlers: Handlers<TEffects, TWorld>,
  world: TWorld,
  next: ResumeType<TEffects> = undefined
): Observable<TReturn> => {
  const computedTask = isTask(taskBase) ? taskBase : task(taskBase)()
  return runInternal(computedTask, handlers, world, next);
};

export const runInternal = <TEffects extends UnknownEffect, TReturn, TWorld = undefined>(
  task: Task<TEffects, TReturn>,
  handlers: Handlers<TEffects, TWorld>,
  world: TWorld,
  next: ResumeType<TEffects> = undefined
): Observable<TReturn> => {
  return new Observable((subscriber) => {
    const res = task.next(next);
    if (res.done) {
      subscriber.next(res.value);
    } else {
      const { value, iterator } = res;
      const { name, args } = value;
      const handler = handlers[name as TEffects["name"]];
      handler(world, ...args).subscribe({
        next: ([continueVal, newWorld]) => {
          run(iterator, handlers, newWorld ?? world, continueVal).subscribe({
            next: (nextVal) => {
              subscriber.next(nextVal);
            },
          });
        },
      });
    }
  });
};
