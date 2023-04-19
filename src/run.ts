import { ResumeType, UnknownEffect } from "./effect";
import { GeneratorCreator } from "./generator/ForkableGenerator";
import { Handlers } from "./handler";
import { Observable } from "./Observable";
import { SymbolForTaskBrand, task, Task } from "./task";
import { EmptyObject, merge, UnknownObject } from "./utils/merge";

// type ExcessHandlers<TEffects extends UnknownEffect, TWorld> = {
//   [effectName: string]: Extract<TEffects, Effect<typeof effectName, unknown[], unknown>> extends UnknownEffect
//     ? Handler<Extract<TEffects, Effect<typeof effectName, unknown[], unknown>>, TWorld>
//     : unknown;
// };

const isTask = <TEffects extends UnknownEffect, TReturn>(
  maybeTask: Task<TEffects, TReturn> | unknown
): maybeTask is Task<TEffects, TReturn> => {
  return typeof maybeTask === "object" && maybeTask !== null && Object.hasOwn(maybeTask, SymbolForTaskBrand);
};

export const run = <TEffects extends UnknownEffect, TReturn, TWorld extends UnknownObject = EmptyObject>(
  taskBase: Task<TEffects, TReturn> | GeneratorCreator<[], TEffects, TReturn, ResumeType<TEffects>>,
  handlers: Handlers<TEffects, TWorld>,
  world: TWorld,
  next: ResumeType<TEffects> = undefined
): Observable<TReturn> => {
  const computedTask = isTask(taskBase) ? taskBase : task(taskBase)();
  return runInternal(computedTask, handlers, world, next);
};

export const runInternal = <TEffects extends UnknownEffect, TReturn, TWorld extends UnknownObject = EmptyObject>(
  task: Task<TEffects, TReturn>,
  handlers: Handlers<TEffects, TWorld>,
  world: TWorld,
  next: ResumeType<TEffects>
): Observable<TReturn> => {
  return new Observable((subscriber) => {
    const res = task.next(next);

    let numLiveSubtasks = 0;
    let numLiveContinuations = 0;

    const checkComplete = () => {
      if (numLiveContinuations === 0 && numLiveSubtasks === 0) {
        subscriber.complete();
      }
    };

    if (res.done) {
      subscriber.next(res.value);
      checkComplete();
    } else {
      const { value, iterator } = res;
      const { name, args } = value;
      const handler = handlers[name as TEffects["name"]];
      numLiveContinuations++;
      handlers;
      handler(world, ...args).subscribe({
        next: ([continueVal, newWorld]) => {
          const computedWorld = merge(world, newWorld ?? {});
          numLiveSubtasks++;
          runInternal(iterator, handlers, computedWorld, continueVal).subscribe({
            next: (nextVal) => {
              subscriber.next(nextVal);
            },
            complete: () => {
              numLiveSubtasks--;
              checkComplete();
            },
          });
        },

        complete: () => {
          numLiveContinuations--;
          checkComplete();
        },
      });
    }
  });
};
