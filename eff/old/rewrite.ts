import { AnyEffect, Effect, YieldedEffect } from "./Effect";
import { ForkableGenerator } from "./ForkableGenerator";
import { isYieldedEffect } from "./isYieldedEffect";
import { makeObservable, Observable } from "./Observable";

type ResumeFunction<TValue> = (resumeValue: TValue) => void;

type EffectHandler<TEffect extends AnyEffect> = (
  resume: ResumeFunction<TEffect["resumeValue"]>,
  value: TEffect["effectValue"]
) => void;

type Handler<TTEffects extends AnyEffect> = {
  [EffectName in TTEffects["effectName"]]: EffectHandler<
    Extract<TTEffects, Effect<EffectName, any, any>>
  >;
};

type CloneableTaskInstance<
  TEffects extends AnyEffect,
  TReturn
> = ForkableGenerator<
  YieldedEffect<TEffects> | CloneableTaskInstance<TEffects, any>,
  TReturn,
  TEffects["resumeValue"]
>;

type TaskInstanceEffectsHelper<TTask extends CloneableTaskInstance<any, any>> =
  TTask extends CloneableTaskInstance<infer TaskEffects, any>
    ? TaskEffects
    : never;
type TaskInstanceReturnHelper<TTask extends CloneableTaskInstance<any, any>> =
  TTask extends CloneableTaskInstance<any, infer ReturnType>
    ? ReturnType
    : never;

//first time the continuation is called, keep going
//every other time fork the task and pipe the output to the observable
const SymbolForMissingArg = Symbol("missingArg");
export const handle = <TTask extends CloneableTaskInstance<any, any>>(
  instance: TTask,
  handler: Handler<TaskInstanceEffectsHelper<TTask>>,
  startingNextValue:
    | TaskInstanceEffectsHelper<TTask>["resumeValue"]
    | typeof SymbolForMissingArg = SymbolForMissingArg
): Observable<TaskInstanceReturnHelper<TTask>> => {
  // let isMain = !nextValue
  //let hasNextValue = false
  type EffectTypes = TaskInstanceEffectsHelper<TTask>;
  type ReturnType = TaskInstanceReturnHelper<TTask>;
  type ResumeTypes = EffectTypes["resumeValue"];
  const [outputObservable, pushOutputObservable] = makeObservable<ReturnType>();
  //takes in a task that returns T
  //outputs an observable that returns T
  let wrappedNextValue: [ResumeTypes] | [] =
    startingNextValue === SymbolForMissingArg ? [] : [startingNextValue];
  const eventLoop = async () => {
    let isDone = false;
    // let nextValue: ResumeTypes | undefined;
    while (!isDone) {
      // console.log({nextValue})
      // const wrappedNextValue: [ResumeTypes] | [] = (nextValue !== undefined) ? [nextValue] : []
      // console.log({wrappedNextValue})
      const { value, done } = instance.next(...wrappedNextValue);
      if (done) {
        //Push return value
        pushOutputObservable(value);
        isDone = true;
      } else {
        let resolveHandlerPromise: (
          value: ResumeTypes | PromiseLike<ResumeTypes>
        ) => void;
        let resolveForkLock: (value: void | PromiseLike<void>) => void;

        const forkLock = new Promise<void>((res) => {
          resolveForkLock = res;
        });

        const handlerPromise = new Promise<ResumeTypes>((res) => {
          resolveHandlerPromise = res;
        });

        const continuation = instance.continuation();

        let firstResume = true;

        const resume = async (resumeValue: ResumeTypes) => {
          // console.log({resumeValue})
          if (firstResume) {
            //continue suspended exection
            firstResume = false;
            resolveHandlerPromise(resumeValue);
          } else {
            //fork
            const forkedTask = continuation();
            //ensure that the forked ones don't run until the main one has
            await forkLock;
            handle(forkedTask, handler, resumeValue).subscribe((val) => {
              //forward the output of the forked task to this task
              pushOutputObservable(val);
            });
          }
        };

        if (isYieldedEffect(value)) {
          //Handle effect
          console.log({ effectToHandle: value });
          const { effectName, effectValue } =
            value as YieldedEffect<EffectTypes>;
          // const effectNameString = effectName as EffectTypes["effectName"]
          const effectHandle = handler[effectName];

          effectHandle(resume, effectValue);
        } else {
          //handle subtask
          handle(
            value as CloneableTaskInstance<EffectTypes, any>,
            handler
          ).subscribe((val) => {
            pushOutputObservable(val);
          });
        }

        wrappedNextValue = [await handlerPromise];
        //allow forked tasks to start running
        resolveForkLock();
      }
    }
  };
  eventLoop();
  return outputObservable;
};

export const handleOnce = <TTask extends CloneableTaskInstance<any, any>>(
  instance: TTask,
  handler: Handler<TaskInstanceEffectsHelper<TTask>>,
  startingNextValue:
    | TaskInstanceEffectsHelper<TTask>["resumeValue"]
    | typeof SymbolForMissingArg = SymbolForMissingArg
): Promise<TaskInstanceReturnHelper<TTask>> => {
  type EffectTypes = TaskInstanceEffectsHelper<TTask>;
  // type ReturnType = TaskInstanceReturnHelper<TTask>
  type ResumeTypes = EffectTypes["resumeValue"];
  //takes in a task that returns T
  //outputs an observable that returns T
  let wrappedNextValue: [ResumeTypes] | [] =
    startingNextValue === SymbolForMissingArg ? [] : [startingNextValue];
  const eventLoop = async () => {
    while (true) {
      const { value, done } = instance.next(...wrappedNextValue);
      if (done) {
        //Push return value
        return value;
      } else {
        let resolveHandlerPromise: (
          value: ResumeTypes | PromiseLike<ResumeTypes>
        ) => void;
        const handlerPromise = new Promise<ResumeTypes>((res) => {
          resolveHandlerPromise = (value) => {
            console.log(`promise resolved with value ${value}`);
            res(value);
          };
        });

        const resume = (resumeValue: ResumeTypes) => {
          resolveHandlerPromise(resumeValue);
        };

        if (isYieldedEffect(value)) {
          //Handle effect
          const { effectName, effectValue } =
            value as YieldedEffect<EffectTypes>;
          const effectHandle = handler[effectName];
          effectHandle(resume, effectValue);
        } else {
          //handle subtask
          resume(
            await handleOnce(value as CloneableTaskInstance<any, any>, handler)
          );
        }

        wrappedNextValue = [await handlerPromise];
      }
    }
  };
  return eventLoop();
};
