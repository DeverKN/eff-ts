import { isYieldedEffect } from "./isYieldedEffect";
import { Handler, ResumeFunction } from "./Handler";
// import { isTaskCreator } from '../Eff-ts/isTaskCreator';
import {
  AsyncTaskInstance,
  CloneableTaskInstance,
  CloneableTaskInstanceV2,
  InstanceEffectTypes,
  InstanceTaskReturn,
  TaskInstance,
} from "./Task";
import { AnyEffect, YieldedEffect } from "./Effect";
import {
  FallThroughTaskHelper,
  InferHandlerEffects,
  PromiseResolveFunc,
} from "./handle";
import { Continuation } from "./Continuation";
import { isHandledEffect } from "./isHandledEffect";
import { resume } from "./resume";
import { ForkableGenerator, isForkableGenerator } from "./ForkableGenerator";
import { makeObservable, Observable } from "./Observable";

// export const run = async <TEffects extends AnyEffect, TSubtaskReturn, TReturn>(
//   task: TaskInstanceWithSubtasks<TEffects, TSubtaskReturn, TReturn>,
//   handler: Handler<TEffects>
// ): Promise<TReturn> => {
//   type ResumeType = TEffects['resumeValue'];
//   const instance = task;
//   let previousValue = null;

//   while (true) {
//     const yieldedValue = instance.next(previousValue);
//     if (yieldedValue.done) {
//       // const returnValue = value as TReturn;
//       return yieldedValue.value;
//     }

//     const value = yieldedValue.value;
//     if (isYieldedEffect<TEffects>(value)) {
//       //handle effect
//       const { effectName, effectValue } = value;
//       let resolveHandlerPromise = null;

//       const handlerPromise = new Promise((res, rej) => {
//         resolveHandlerPromise = res;
//       });

//       let resumed = false;
//       const resume: ResumeFunction<ResumeType> = (resumeValue) => {
//         if (resumed) {
//           console.error('Resume can only be called once in a given handler');
//         } else {
//           resumed = true;
//           resolveHandlerPromise(resumeValue);
//         }
//       };

//       const effectHandler = handler[effectName];
//       effectHandler(resume, effectValue);

//       previousValue = await handlerPromise;
//     } else {
//       const subTask = value as TaskInstance<TEffects, TSubtaskReturn>;
//       previousValue = await run(subTask, handler);
//     }
//   }
// };

// export const handleAll = async <
//   TEffects extends AnyEffect,
//   TSubtaskReturn,
//   TReturn
// >(
//   taskOrCreator:
//     | TaskInstanceWithSubtasks<TEffects, TSubtaskReturn, TReturn>
//     | NullaryTaskWithSubtasksCreator<TEffects, TSubtaskReturn, TReturn>,
//   handler: Handler<TEffects>
// ): Promise<TReturn> => {
//   type ResumeType = TEffects['resumeValue'];
//   const instance = isTaskCreator<TEffects, TSubtaskReturn, TReturn>(
//     taskOrCreator
//   )
//     ? taskOrCreator()
//     : taskOrCreator;
//   let previousValue = null;

//   while (true) {
//     // console.log('to yield');
//     const yieldedValue = instance.next(previousValue);

//     // console.log({ yielded: JSON.stringify(yieldedValue.value) });
//     if (yieldedValue.done) {
//       // const returnValue = value as TReturn;
//       return yieldedValue.value;
//     }

//     const value = yieldedValue.value;
//     if (isYieldedEffect<TEffects>(value)) {
//       //handle effect
//       const { effectName, effectValue } = value;
//       let resolveHandlerPromise = null;

//       const handlerPromise = new Promise((res, rej) => {
//         resolveHandlerPromise = res;
//       });

//       let resumed = false;
//       const resume: ResumeFunction<ResumeType> = (resumeValue) => {
//         if (resumed) {
//           console.error('Resume can only be called once in a given handler');
//         } else {
//           resumed = true;
//           resolveHandlerPromise(resumeValue);
//         }
//       };

//       const effectHandler = handler[effectName];
//       effectHandler(resume, effectValue);

//       previousValue = await handlerPromise;
//     } else {
//       const subTask = value as TaskInstance<TEffects, TSubtaskReturn>;
//       previousValue = await run(subTask, handler);
//     }
//   }
// };

export const handleAllV2 = async <TEffects extends AnyEffect, TReturn>(
  instance:
    | TaskInstance<TEffects, TReturn>
    | AsyncTaskInstance<TEffects, TReturn>,
  handler: Handler<TEffects>
): Promise<TReturn> => {
  const anonymousTask = async () => {
    type ResumeType = TEffects["resumeValue"];
    let previousValue: ResumeType | null = null;
    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = await yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const handledEffect = yieldedValue;
          const { effectName, effectValue } = handledEffect;
          const handle = handler[effectName];

          let resolveHandlerPromise: PromiseResolveFunc<ResumeType> | null =
            null;

          const handlerPromise = new Promise<ResumeType>((res, rej) => {
            resolveHandlerPromise = res;
          });

          const resume: ResumeFunction<ResumeType> = (resumeValue) => {
            resolveHandlerPromise!(resumeValue);
          };

          handle(resume, effectValue);

          previousValue = await handlerPromise;
        }
      }
    }
  };
  return anonymousTask();
};

export const handleAllV3 = async <
  TTask extends TaskInstance<any, any> | AsyncTaskInstance<any, any>
>(
  instance: TTask,
  handler: Handler<InstanceEffectTypes<TTask>>
): Promise<InstanceTaskReturn<TTask>> => {
  const anonymousTask = async () => {
    type YieldedEffectTypes = InstanceEffectTypes<TTask>;
    type ResumeType = YieldedEffectTypes["resumeValue"];
    let previousValue: ResumeType | null = null;
    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = await yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const handledEffect =
            yieldedValue as YieldedEffect<YieldedEffectTypes>;
          const { effectName, effectValue } = handledEffect;
          const handle = handler[effectName];

          let resolveHandlerPromise: PromiseResolveFunc<ResumeType> | null =
            null;

          const handlerPromise = new Promise<ResumeType>((res, rej) => {
            resolveHandlerPromise = res;
          });

          const resume: ResumeFunction<ResumeType> = (resumeValue) => {
            resolveHandlerPromise!(resumeValue);
          };

          handle(resume, effectValue);

          previousValue = await handlerPromise;
        }
      }
    }
  };
  return anonymousTask();
};

export const handleAllWithContinuations = async <
  TEffects extends AnyEffect,
  TReturn
>(
  task: CloneableTaskInstanceV2<TEffects, TReturn>,
  handler: Handler<TEffects>
): Promise<TReturn[]> => {
  type TaskCreatorType = CloneableTaskInstanceV2<TEffects, TReturn>;

  let returnValues: TReturn[] = [];
  const anonymousTask = async () => {
    type ResumeType = TEffects["resumeValue"];

    let previousValue: ResumeType | null = null;
    let resumeCache: ResumeType[] = [];

    const instance: CloneableTaskInstanceV2<TEffects, TReturn> = task; //isForkableGenerator(task) ? task : new ForkableGenerator(task)

    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          //handle
          const handledEffect = yieldedValue;
          const { effectName, effectValue } = handledEffect;
          const handle = handler[effectName];

          let resolveHandlerPromise: PromiseResolveFunc<ResumeType> | null =
            null;

          const handlerPromise = new Promise<ResumeType>((res, rej) => {
            resolveHandlerPromise = res;
          });

          const continuation: Continuation<TaskCreatorType> = {
            resumeCache,
            task: instance,
          };

          const wrappedResume: ResumeFunction<ResumeType> = (
            resumeValue: ResumeType
          ) => {
            const newInstance = resume(continuation, resumeValue);
            handleAllV3(newInstance, handler).then((res) =>
              returnValues.push(res)
            );
          };

          const wrappedFinal: ResumeFunction<ResumeType> = (
            resumeValue: ResumeType
          ) => {
            resolveHandlerPromise!(resumeValue);
          };

          handle(wrappedResume, wrappedFinal, effectValue);

          previousValue = await handlerPromise;

          resumeCache = [...resumeCache, previousValue];
        }
      }
    }
  };

  returnValues.push(await anonymousTask());
  return returnValues; //anonymousTask()
};

export const handleAllWithContinuationsV2 = async <
  TEffects extends AnyEffect,
  TReturn
>(
  task: CloneableTaskInstanceV2<TEffects, TReturn>,
  handler: Handler<TEffects>
): Promise<TReturn[]> => {
  type TaskCreatorType = CloneableTaskInstanceV2<TEffects, TReturn>;

  let returnValues: TReturn[] = [];
  const anonymousTask = async () => {
    type ResumeType = TEffects["resumeValue"];

    let resumeCache: ResumeType[] = [];

    const baseInstance: CloneableTaskInstanceV2<TEffects, TReturn> = task;
    const instances: CloneableTaskInstanceV2<TEffects, TReturn>[] = [
      baseInstance,
    ];
    let numLiveContinuations = 0;
    do {
      if (instances.length > 0) {
        let isDone = false;
        const instance: CloneableTaskInstanceV2<TEffects, TReturn> =
          instances.shift()!;
        let previousValue: ResumeType | null = null;
        while (!isDone) {
          const yielded = instance.next(previousValue);
          const { value: yieldedValue, done } = yielded;
          isDone = done ?? false;
          if (done) {
            returnValues = returnValues.concat(yieldedValue);
          } else {
            if (isYieldedEffect(yieldedValue)) {
              //handle
              const handledEffect = yieldedValue;
              const { effectName, effectValue } = handledEffect;
              const handle = handler[effectName];

              let resolveHandlerPromise: PromiseResolveFunc<ResumeType> | null =
                null;

              const handlerPromise = new Promise<ResumeType>((res, rej) => {
                resolveHandlerPromise = res;
              });

              const continuation: Continuation<TaskCreatorType> = {
                resumeCache,
                task: instance,
              };

              let isFirstContinue = true;
              const handleContinue = (resumeValue: ResumeType) => {
                if (isFirstContinue) {
                  resolveHandlerPromise!(resumeValue);
                  isFirstContinue = false;
                } else {
                  const newInstance = resume(continuation, resumeValue);
                  instances.push(newInstance);
                }
              };
              let isLive = true;
              numLiveContinuations++;

              const wrappedResume: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                if (isLive) {
                  handleContinue(resumeValue);
                  // handleAllV3(newInstance, handler).then((res) => returnValues.push(res))
                } else {
                  throw Error(
                    "Cannot call 'resume' after you have called 'final'"
                  );
                }
              };

              const wrappedFinal: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                if (isLive) {
                  handleContinue(resumeValue);
                  numLiveContinuations--;
                  isLive = false;
                } else {
                  throw Error("Cannot call 'final' more than once");
                }
              };

              handle(wrappedResume, wrappedFinal, effectValue);

              previousValue = await handlerPromise;

              resumeCache = [...resumeCache, previousValue];
            }
          }
        }
      } else {
        //Yield to the microtask queue
        await Promise.resolve();
      }
    } while (numLiveContinuations > 0 || instances.length > 0);
  };

  await anonymousTask();
  // returnValues.push(await anonymousTask())
  return returnValues; //anonymousTask()
};

export const handleAllWithContinuationsToObservable = <
  TEffects extends AnyEffect,
  TReturn
>(
  task: CloneableTaskInstanceV2<TEffects, TReturn>,
  handler: Handler<TEffects>
): Observable<TReturn> => {
  type TaskCreatorType = CloneableTaskInstanceV2<TEffects, TReturn>;

  const [taskObservable, pushTaskObservable] = makeObservable<TReturn>();
  // let returnValues: TReturn[] = []
  const anonymousTask = async () => {
    type ResumeType = TEffects["resumeValue"];

    let resumeCache: ResumeType[] = [];

    const baseInstance: CloneableTaskInstanceV2<TEffects, TReturn> = task;
    const instances: CloneableTaskInstanceV2<TEffects, TReturn>[] = [
      baseInstance,
    ];
    let numLiveContinuations = 0;
    do {
      if (instances.length > 0) {
        let isDone = false;
        const instance: CloneableTaskInstanceV2<TEffects, TReturn> =
          instances.shift()!;
        let previousValue: ResumeType | null = null;
        while (!isDone) {
          const yielded = instance.next(previousValue);
          const { value: yieldedValue, done } = yielded;
          isDone = done ?? false;
          if (done) {
            pushTaskObservable(yieldedValue);
          } else {
            if (isYieldedEffect(yieldedValue)) {
              //handle
              const handledEffect = yieldedValue;
              const { effectName, effectValue } = handledEffect;
              const handle = handler[effectName];

              let resolveHandlerPromise: PromiseResolveFunc<ResumeType> | null =
                null;

              const handlerPromise = new Promise<ResumeType>((res, rej) => {
                resolveHandlerPromise = res;
              });

              const continuation: Continuation<TaskCreatorType> = {
                resumeCache,
                task: instance,
              };

              let isFirstContinue = true;
              const handleContinue = (resumeValue: ResumeType) => {
                if (isFirstContinue) {
                  resolveHandlerPromise!(resumeValue);
                  isFirstContinue = false;
                } else {
                  const newInstance = resume(continuation, resumeValue);
                  instances.push(newInstance);
                }
              };
              let isLive = true;
              numLiveContinuations++;

              const wrappedResume: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                if (isLive) {
                  handleContinue(resumeValue);
                  // handleAllV3(newInstance, handler).then((res) => returnValues.push(res))
                } else {
                  throw Error(
                    "Cannot call 'resume' after you have called 'final'"
                  );
                }
              };

              const wrappedFinal: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                if (isLive) {
                  handleContinue(resumeValue);
                  numLiveContinuations--;
                  isLive = false;
                } else {
                  throw Error("Cannot call 'final' more than once");
                }
              };

              handle(wrappedResume, wrappedFinal, effectValue);

              previousValue = await handlerPromise;

              resumeCache = [...resumeCache, previousValue];
            }
          }
        }
      } else {
        //Yield to the microtask queue
        await Promise.resolve();
      }
    } while (numLiveContinuations > 0 || instances.length > 0);
  };

  anonymousTask();
  // returnValues.push(await anonymousTask())
  return taskObservable; //returnValues//anonymousTask()
};
