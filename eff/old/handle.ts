import {
  AnyEffect,
  Effect,
  rewrapTypedEffect,
  TypedYieldedEffect,
  YieldedEffect,
} from "./Effect";
import { Handler, PartiallyHandledInstance, ResumeFunction } from "./Handler";
import {
  AsyncTask,
  AsyncTaskInstance,
  CloneableTask,
  CloneableTaskInstance,
  CloneableTaskInstanceV2,
  CloneableTaskInstanceWithContinuations,
  HandlerEffectTypes,
  InstanceEffectTypes,
  InstanceTaskReturn,
  Task,
  TaskInstance,
  TaskInstanceWithContinuations,
} from "./Task";
import { isYieldedEffect } from "./isYieldedEffect";
import { isHandledEffect } from "./isHandledEffect";
import { isTypedYieldedEffect } from "./isTypedYieldedEffect";
import { Continuation } from "./Continuation";
import { resume } from "./resume";
import {
  ForkableGenerator,
  isForkableGenerator,
  SymbolForNextCache,
} from "./ForkableGenerator";
import {
  EffectfulObservable,
  makeEffectfulObservable,
  makeObservable,
  Observable,
} from "./Observable";

type KVPair<K, V> = { key: K; value: V };
type Keys<T> = keyof T;
type Values<T> = T[keyof T];
type KVPairs<T> = Values<{
  [K in keyof T]: KVPair<K, T[K]>;
}>;

type HandlerFunction<TEffect, TResume> = (
  resume: ResumeFunction<TResume>,
  final: ResumeFunction<TResume>,
  value: TEffect
) => void;
type InferHandlerEffectsFromKVPairs<
  T extends KVPair<any, HandlerFunction<any, any>>
> = T extends KVPair<
  infer K,
  HandlerFunction<infer EffectValue, infer EffectResume>
>
  ? Effect<K, EffectValue, EffectResume>
  : never;
export type HandlerKVPairs<THandler extends Handler<any>> = Values<{
  [K in keyof THandler]: KVPair<K, THandler[K]>;
}>;

export type InferHandlerEffects<T extends Handler<any>> =
  InferHandlerEffectsFromKVPairs<HandlerKVPairs<T>>;

// export type ContinuationHandlerKVPairs<THandler extends ContinuationHandler<any>> = Values<{[K in keyof THandler]: KVPair<
//   K,
//   THandler[K]
//   >}>;

// type ContinuationHandlerFunction<TEffectValue> = (continuation: Continuation<any>, value: TEffectValue) => void

// type InferContinuationHandlerEffectsFromKVPairs<T extends KVPair<any, ContinuationHandlerFunction<any>>> = T extends KVPair<infer K, HandlerFunction<infer EffectValue, infer EffectResume>> ? Effect<K, EffectValue, EffectResume> : never
// export type InferContinuationHandlerEffects<T extends ContinuationHandler<any>> = InferContinuationHandlerEffectsFromKVPairs<ContinuationHandlerKVPairs<T>>

// export const handle = <
//   THandledEffects extends AnyEffect,
//   TFallThroughEffects extends AnyEffect,
//   TSubtaskReturn,
//   TReturn
// >(
//   task: TaskInstanceWithSubtasks<
//     THandledEffects | TFallThroughEffects,
//     TSubtaskReturn,
//     TReturn
//   >,
//   handler: Handler<THandledEffects>
// ): PartiallyHandledInstance<TFallThroughEffects, TReturn> => {
//   const wrapper = async function* () {
//     type TEffects = TFallThroughEffects | TFallThroughEffects;
//     type ResumeType = THandledEffects['resumeValue'];
//     const instance = task;
//     let previousValue = null;
//     let stop = false;

//     while (!stop) {
//       const yieldedValue = instance.next(previousValue);
//       if (yieldedValue.done) {
//         // const returnValue = value as TReturn;
//         return yieldedValue.value;
//       }

//       const value = yieldedValue.value;
//       if (isYieldedEffect<TEffects>(value)) {
//         if (isHandledEffect(handler, value)) {
//           //handle effect
//           const { effectName, effectValue } = value;
//           let resolveHandlerPromise = null;

//           const handlerPromise = new Promise((res, rej) => {
//             resolveHandlerPromise = res;
//           });

//           let resumed = false;
//           const resume: ResumeFunction<ResumeType> = (resumeValue) => {
//             if (resumed) {
//               console.error(
//                 'Resume can only be called once in a given handler'
//               );
//             } else {
//               resumed = true;
//               resolveHandlerPromise(resumeValue);
//             }
//           };

//           const effectHandler = handler[effectName];
//           effectHandler(resume, effectValue);

//           previousValue = await handlerPromise;
//         } else {
//           // console.log('yield');
//           // console.log({ unHandledEffect: value });
//           const unHandledEffectResult = yield value;
//           // console.log('yielded');
//           previousValue = unHandledEffectResult;
//           // console.log({ unHandledEffectResult });
//         }
//       } else {
//         const subTask = value as TaskInstance<TEffects, TSubtaskReturn>;
//         previousValue = yield* handle(subTask, handler);
//       }
//     }
//   };

//   const instance = wrapper();
//   return instance;
// };

export type PromiseResolveFunc<T> = (val: T | PromiseLike<T>) => void;

export const handleToTask = <
  TTaskEffects extends AnyEffect,
  THandlerEffects extends AnyEffect,
  TReturn
>(
  instance:
    | TaskInstance<TTaskEffects | THandlerEffects, TReturn>
    | AsyncTaskInstance<TTaskEffects | THandlerEffects, TReturn>,
  handler: Handler<THandlerEffects>
): AsyncTaskInstance<Exclude<TTaskEffects, THandlerEffects>, TReturn> => {
  const anonymousTask: AsyncTask<
    Exclude<TTaskEffects, THandlerEffects>,
    TReturn
  > = async function* () {
    type FallThroughEffects = Exclude<TTaskEffects, THandlerEffects>;
    type ResumeType = THandlerEffects["resumeValue"];
    let previousValue: ResumeType | null = null;
    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = await yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const effectInstance = yieldedValue;
          if (isHandledEffect(handler, effectInstance)) {
            //handle
            const handledEffect =
              yieldedValue as YieldedEffect<THandlerEffects>;
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
          } else {
            /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
              yieldedValue.next(value)
            })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
            const fallThroughEffect =
              effectInstance as YieldedEffect<FallThroughEffects>;
            yield fallThroughEffect;
          }
        }
      }
    }
  };
  return anonymousTask();
};

export const handleToTaskV2 = <
  TTaskEffects extends AnyEffect,
  THandlerEffects extends AnyEffect,
  TReturn
>(
  instance:
    | TaskInstance<TTaskEffects | THandlerEffects, TReturn>
    | AsyncTaskInstance<TTaskEffects | THandlerEffects, TReturn>,
  handler: Handler<THandlerEffects>
): AsyncTaskInstance<Exclude<TTaskEffects, THandlerEffects>, TReturn> => {
  const anonymousTask: AsyncTask<
    Exclude<TTaskEffects, THandlerEffects>,
    TReturn
  > = async function* () {
    type FallThroughEffects = Exclude<TTaskEffects, THandlerEffects>;
    type ResumeType = THandlerEffects["resumeValue"];
    let previousValue: ResumeType | null = null;
    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = await yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const effectInstance = yieldedValue;
          if (isHandledEffect(handler, effectInstance)) {
            //handle
            const handledEffect =
              yieldedValue as YieldedEffect<THandlerEffects>;
            const { effectName, effectValue } = handledEffect;
            const handle = handler[effectName];

            let resolveHandlerPromise: ResumeType = null;

            const handlerPromise = new Promise<ResumeType>((res, rej) => {
              resolveHandlerPromise = res;
            });

            const resume: ResumeFunction<ResumeType> = (resumeValue) => {
              resolveHandlerPromise(resumeValue);
            };

            handle(resume, effectValue);

            previousValue = await handlerPromise;
          } else {
            /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
              yieldedValue.next(value)
            })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
            const fallThroughEffect =
              effectInstance as YieldedEffect<FallThroughEffects>;
            yield fallThroughEffect;
          }
        }
      }
    }
  };
  return anonymousTask();
};

export const handleToTaskV3 = <
  TTask extends TaskInstance<any, any>,
  THandler extends Handler<any>
>(
  instance: TTask,
  handler: THandler
): TaskInstance<
  Exclude<InstanceEffectTypes<TTask>, InferHandlerEffects<THandler>>,
  InstanceTaskReturn<TTask>
> => {
  const anonymousTask: Task<
    Exclude<InstanceEffectTypes<TTask>, InferHandlerEffects<THandler>>,
    InstanceTaskReturn<TTask>
  > = function* () {
    type FallThroughEffects = Exclude<
      InstanceEffectTypes<TTask>,
      InferHandlerEffects<THandler>
    >;
    type ResumeType = InferHandlerEffects<THandler>["resumeValue"];
    let previousValue: ResumeType | null = null;
    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const effectInstance = yieldedValue;
          if (isHandledEffect(handler, effectInstance)) {
            //handle
            const handledEffect = yieldedValue as YieldedEffect<
              InferHandlerEffects<THandler>
            >;
            const { effectName, effectValue } = handledEffect;
            const handle = handler[effectName];

            let resolveHandlerPromise: PromiseResolveFunc<ResumeType>;

            const handlerPromise = new Promise<ResumeType>((res, rej) => {
              resolveHandlerPromise = res;
            });

            const final = () => {};

            const resume: ResumeFunction<ResumeType> = (resumeValue) => {
              resolveHandlerPromise(resumeValue);
            };

            handle(resume, final, effectValue);

            previousValue = yield handlerPromise;
          } else {
            /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
              yieldedValue.next(value)
            })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
            const fallThroughEffect =
              effectInstance as YieldedEffect<FallThroughEffects>;
            yield fallThroughEffect;
          }
        }
      }
    }
  };
  return anonymousTask();
};

// type CloneableTaskEffectTypes<TTask extends CloneableTaskInstance<any, any>> = InstanceEffectTypes<ReturnType<TTask>>
// type CloneableTaskReturnType<TTask extends CloneableTaskInstance<any, any>> = InstanceTaskReturn<ReturnType<TTask>>

export type FallThroughTaskHelper<
  TEffects extends AnyEffect,
  THandler extends Handler<any>
> = Exclude<TEffects, InferHandlerEffects<THandler>>;

// type InstanceCreator<TCloneableTask extends CloneableTaskInstance<any>, TResumeValue> = (resume: TResumeValue) => TCloneableTask

// type TestTask = Task<LogEffect, string>
// type CloneableTestTask = CloneableTask<LogEffect, string>
// type InstanceCloneableTestTask = ReturnType<CloneableTestTask>

type Unarray<TArray extends any[]> = TArray extends (infer T)[] ? T : never;
export const handleToTaskWithContinuations = <
  TEffects extends AnyEffect,
  TReturn,
  THandler extends Handler<any>
>(
  task:
    | CloneableTaskInstanceV2<TEffects, TReturn>
    | TaskInstance<TEffects, TReturn>,
  handler: THandler
): CloneableTaskInstanceV2<
  FallThroughTaskHelper<TEffects, THandler>,
  TReturn
> => {
  // let returnVals: TReturn[] = []
  type FallThroughEffectTypes = FallThroughTaskHelper<TEffects, THandler>;
  // type TaskReturnType = InstanceTaskReturn<ReturnType<TTask>>
  type TaskCreatorType = CloneableTaskInstanceV2<TEffects, TReturn>;
  const anonymousTask = (function* () {
    // type TaskEffectTypes = EffectTypes<TTask>
    // type TaskReturnType = ReturnType<CloneableTaskInstance<TTask>>
    // type CloneableTaskReturnType = ReturnType<TTask>
    type HandledEffects = InferHandlerEffects<THandler>;
    type FallThroughEffects = Exclude<TEffects, HandledEffects>;
    type ResumeType = InferHandlerEffects<THandler>["resumeValue"];

    let previousValue: ResumeType | null = null;
    let resumeCache: ResumeType[] = [];

    const instance: CloneableTaskInstanceV2<TEffects, TReturn> =
      isForkableGenerator(task) ? task : new ForkableGenerator(task);

    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = yielded;
      if (done) {
        return yieldedValue;
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const effectInstance = yieldedValue;
          if (isHandledEffect(handler, effectInstance)) {
            //handle
            const handledEffect = yieldedValue;
            const { effectName, effectValue } = handledEffect;
            const handle = handler[effectName];

            let resolveHandlerPromise: PromiseResolveFunc<ResumeType>;

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
              const forkedInstance = resume(continuation, resumeValue);
              const forkedInstanceReturnVal = handleToTaskWithContinuations(
                forkedInstance,
                handler
              );
            };

            const final: ResumeFunction<ResumeType> = (
              resumeValue: ResumeType
            ) => {
              resolveHandlerPromise(resumeValue);
            };

            handle(wrappedResume, final, effectValue);

            previousValue = yield handlerPromise;
          } else {
            /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
              yieldedValue.next(value)
            })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
            const fallThroughEffect =
              effectInstance as YieldedEffect<FallThroughEffects>;
            previousValue = yield fallThroughEffect;
          }
          resumeCache = [...resumeCache, previousValue];
        }
      }
    }
  })();
  const forkableAnonymousTask: CloneableTaskInstanceV2<
    FallThroughEffectTypes,
    TReturn
  > = new ForkableGenerator(anonymousTask);
  return forkableAnonymousTask; //anonymousTask()
};

// export const handleToTaskV3 = <TTask extends TaskInstance<any, any>, THandler extends Handler<any>>(
//   instance: TTask,
//   handler: THandler
// ): TaskInstance<Exclude<InstanceEffectTypes<TTask>, InferHandlerEffects<THandler>>, InstanceTaskReturn<TTask>> => {

type TaskInstanceEffectsHelper<
  TTask extends TaskInstance<any, any> | CloneableTaskInstanceV2<any, any>
> = TTask extends TaskInstance<infer TaskEffects, any>
  ? TaskEffects
  : TTask extends CloneableTaskInstanceV2<infer TaskEffects, any>
  ? TaskEffects
  : never;
type TaskInstanceReturnHelper<
  TTask extends TaskInstance<any, any> | CloneableTaskInstanceV2<any, any>
> = TTask extends TaskInstance<any, infer ReturnType>
  ? ReturnType
  : TTask extends CloneableTaskInstanceV2<any, infer ReturnType>
  ? ReturnType
  : never;

export type FallThroughTaskHelperV2<
  TTask extends TaskInstance<any, any> | CloneableTaskInstanceV2<any, any>,
  THandler extends Handler<any>
> = Exclude<TaskInstanceEffectsHelper<TTask>, InferHandlerEffects<THandler>>;
export const handleToTaskWithContinuationsV2 = <
  TTask extends TaskInstance<any, any> | CloneableTaskInstanceV2<any, any>,
  THandler extends Handler<any>
>(
  task: TTask,
  handler: THandler
) => {
  // let returnVals: TReturn[] = []
  type TaskEffectTypes = TaskInstanceEffectsHelper<TTask>;
  type TaskReturnType = TaskInstanceReturnHelper<TTask>;
  type FallThroughEffectTypes = FallThroughTaskHelperV2<TTask, THandler>;
  // type TaskReturnType = InstanceTaskReturn<ReturnType<TTask>>
  type TaskCreatorType = CloneableTaskInstanceV2<
    TaskEffectTypes,
    TaskReturnType
  >;
  const anonymousTask = (function* () {
    // type CloneableTaskReturnType = ReturnType<TTask>
    type HandledEffects = InferHandlerEffects<THandler>;
    type FallThroughEffects = Exclude<TaskEffectTypes, HandledEffects>;
    type ResumeType = InferHandlerEffects<THandler>["resumeValue"];

    let previousValue: ResumeType | null = null;
    let returnValues: TaskReturnType[] = [];
    // let resumeCache: ResumeType[] = []

    const instance: CloneableTaskInstanceV2<TaskEffectTypes, TaskReturnType> =
      isForkableGenerator(task) ? task : new ForkableGenerator(task);

    while (true) {
      const yielded = instance.next(previousValue);
      const { value: yieldedValue, done } = yielded;
      if (done) {
        return returnValues.concat(yieldedValue);
      } else {
        if (isYieldedEffect(yieldedValue)) {
          const effectInstance = yieldedValue;
          if (isHandledEffect(handler, effectInstance)) {
            //handle
            const handledEffect = yieldedValue;
            const { effectName, effectValue } = handledEffect;
            const handle = handler[effectName];

            let resolveHandlerPromise: PromiseResolveFunc<ResumeType>;

            const handlerPromise = new Promise<ResumeType>((res, rej) => {
              resolveHandlerPromise = res;
            });

            // const continuation: Continuation<TaskCreatorType> = {
            //   resumeCache: instance[SymbolForNextCache],
            //   task: instance
            // }

            const continuation = instance.continuation();

            const wrappedResume: ResumeFunction<ResumeType> = (
              resumeValue: ResumeType
            ) => {
              const forkedInstance = continuation(); //resume(continuation, resumeValue)
              forkedInstance.next(resumeValue);
              handleToTaskWithContinuations(forkedInstance, handler).next(
                (res) => returnValues.push(res)
              );
            };

            const final: ResumeFunction<ResumeType> = (
              resumeValue: ResumeType
            ) => {
              resolveHandlerPromise(resumeValue);
            };

            handle(wrappedResume, final, effectValue);

            previousValue = yield handlerPromise;
          } else {
            /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
              yieldedValue.next(value)
            })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
            const fallThroughEffect =
              effectInstance as YieldedEffect<FallThroughEffects>;
            previousValue = yield fallThroughEffect;
          }
          // resumeCache = [...resumeCache, previousValue]
        }
      }
    }
  })();
  const forkableAnonymousTask: CloneableTaskInstanceV2<
    FallThroughEffectTypes,
    TaskReturnType[]
  > = new ForkableGenerator(anonymousTask);
  return forkableAnonymousTask; //anonymousTask()
};

export const handleToTaskWithContinuationsV3 = <
  TTask extends TaskInstance<any, any> | CloneableTaskInstanceV2<any, any>,
  THandler extends Handler<any>
>(
  task: TTask,
  handler: THandler
) => {
  // let returnVals: TReturn[] = []
  type TaskEffectTypes = TaskInstanceEffectsHelper<TTask>;
  type TaskReturnType = TaskInstanceReturnHelper<TTask>;
  type FallThroughEffectTypes = FallThroughTaskHelperV2<TTask, THandler>;
  // type TaskReturnType = InstanceTaskReturn<ReturnType<TTask>>
  type TaskCreatorType = CloneableTaskInstanceV2<
    TaskEffectTypes,
    TaskReturnType
  >;
  const anonymousTask = (function* () {
    // type CloneableTaskReturnType = ReturnType<TTask>
    type HandledEffects = InferHandlerEffects<THandler>;
    type FallThroughEffects = Exclude<TaskEffectTypes, HandledEffects>;
    type ResumeType = InferHandlerEffects<THandler>["resumeValue"];

    let previousValue: ResumeType | null = null;
    let returnValues: TaskReturnType[] = [];
    let numLiveContinuations = 1;
    // let resumeCache: ResumeType[] = []

    const baseInstance: CloneableTaskInstanceV2<
      TaskEffectTypes,
      TaskReturnType
    > = isForkableGenerator(task) ? task : new ForkableGenerator(task);
    let instances: CloneableTaskInstanceV2<TaskEffectTypes, TaskReturnType>[] =
      [baseInstance];
    do {
      let isDone = false;
      while (!isDone) {
        if (instances.length > 0) {
          const instance = instances.shift()!;
          const yielded = instance.next(previousValue);
          const { value: yieldedValue, done } = yielded;
          isDone = done ?? false;
          if (done) {
            let returnValue = returnValues.concat(yieldedValue);
          } else {
            if (isYieldedEffect(yieldedValue)) {
              const effectInstance = yieldedValue;
              if (isHandledEffect(handler, effectInstance)) {
                //handle
                const handledEffect = yieldedValue;
                const { effectName, effectValue } = handledEffect;
                const handle = handler[effectName];

                let resolveHandlerPromise: PromiseResolveFunc<ResumeType>;

                const handlerPromise = new Promise<ResumeType>((res, rej) => {
                  resolveHandlerPromise = res;
                });

                // const continuation: Continuation<TaskCreatorType> = {
                //   resumeCache: instance[SymbolForNextCache],
                //   task: instance
                // }

                const continuation = instance.continuation();

                numLiveContinuations++;
                let finalized = false;
                const wrappedResume: ResumeFunction<ResumeType> = (
                  resumeValue: ResumeType
                ) => {
                  const forkedInstance = continuation(); //resume(continuation, resumeValue)
                  forkedInstance.next(resumeValue);
                  instances.push(
                    handleToTaskWithContinuations(forkedInstance, handler)
                  );
                };

                const final: ResumeFunction<ResumeType> = (
                  resumeValue: ResumeType
                ) => {
                  if (!finalized) {
                    resolveHandlerPromise(resumeValue);
                    numLiveContinuations--;
                    finalized = true;
                  }
                };

                handle(wrappedResume, final, effectValue);

                previousValue = yield handlerPromise;
              } else {
                /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
                  yieldedValue.next(value)
                })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
                const fallThroughEffect =
                  effectInstance as YieldedEffect<FallThroughEffects>;
                previousValue = yield fallThroughEffect;
              }
              // resumeCache = [...resumeCache, previousValue]
            }
          }
        } else {
          yield Promise.resolve();
        }
      }
    } while (numLiveContinuations > 0 || instances.length > 0);
    return returnValues;
  })();
  const forkableAnonymousTask: CloneableTaskInstanceV2<
    FallThroughEffectTypes,
    TaskReturnType[]
  > = new ForkableGenerator(anonymousTask);
  return forkableAnonymousTask; //anonymousTask()
};

type TaskInstanceWithContinuationsEffectsHelper<
  TTask extends
    | TaskInstanceWithContinuations<any, any>
    | CloneableTaskInstanceWithContinuations<any, any>
> = TTask extends TaskInstanceWithContinuations<infer TaskEffects, any>
  ? TaskEffects
  : TTask extends CloneableTaskInstanceWithContinuations<infer TaskEffects, any>
  ? TaskEffects
  : never;
type TaskInstanceWithContinuationsReturnHelper<
  TTask extends
    | TaskInstanceWithContinuations<any, any>
    | CloneableTaskInstanceWithContinuations<any, any>
> = TTask extends TaskInstanceWithContinuations<any, infer ReturnType>
  ? ReturnType
  : TTask extends CloneableTaskInstanceWithContinuations<any, infer ReturnType>
  ? ReturnType
  : never;

export type FallThroughTaskHelperV3<
  TTask extends
    | TaskInstanceWithContinuations<any, any>
    | CloneableTaskInstanceWithContinuations<any, any>,
  THandler extends Handler<any>
> = Exclude<
  TaskInstanceWithContinuationsEffectsHelper<TTask>,
  InferHandlerEffects<THandler>
>;
export const handleToTaskWithContinuationsAndObservable = <
  TTask extends
    | TaskInstanceWithContinuations<any, any>
    | CloneableTaskInstanceWithContinuations<any, any>,
  THandler extends Handler<any>
>(
  task: TTask,
  handler: THandler
): EffectfulObservable<
  FallThroughTaskHelperV3<TTask, THandler>,
  TaskInstanceWithContinuationsReturnHelper<TTask>
> => {
  // let returnVals: TReturn[] = []
  type TaskEffectTypes = TaskInstanceWithContinuationsEffectsHelper<TTask>;
  type TaskReturnType = TaskInstanceWithContinuationsReturnHelper<TTask>;
  type FallThroughEffectTypes = FallThroughTaskHelperV3<TTask, THandler>;
  // type TaskReturnType = InstanceTaskReturn<ReturnType<TTask>>
  const [taskObservable, pushTaskObservable, pushEffect] =
    makeEffectfulObservable<FallThroughEffectTypes, TaskReturnType>();
  const anonymousTask = async () => {
    // type CloneableTaskReturnType = ReturnType<TTask>
    type HandledEffects = InferHandlerEffects<THandler>;
    type FallThroughEffects = Exclude<TaskEffectTypes, HandledEffects>;
    type ResumeType = InferHandlerEffects<THandler>["resumeValue"];

    let previousValue: ResumeType | null = null;
    // let returnValues: TaskReturnType[] = []
    let numLiveContinuations = 1;
    // let resumeCache: ResumeType[] = []

    const baseInstance: CloneableTaskInstanceWithContinuations<
      TaskEffectTypes,
      TaskReturnType
    > = isForkableGenerator(task) ? task : new ForkableGenerator(task);
    let instances: CloneableTaskInstanceWithContinuations<
      TaskEffectTypes,
      TaskReturnType
    >[] = [baseInstance];
    do {
      let isDone = false;
      while (!isDone) {
        if (instances.length > 0) {
          const instance = instances.shift()!;
          const yielded = instance.next(previousValue);
          const { value: yieldedValue, done } = yielded;
          isDone = done ?? false;
          if (done) {
            pushTaskObservable(yieldedValue);
            // let returnValue = returnValues.concat(yieldedValue)
          } else {
            if (isYieldedEffect(yieldedValue)) {
              const effectInstance = yieldedValue;

              const getHandleForEffect = (
                effectInstance: YieldedEffect<TaskEffectTypes>
              ) => {
                if (isHandledEffect(handler, effectInstance)) {
                  //handle
                  const handledEffect = yieldedValue;
                  const { effectName, effectValue } = handledEffect;
                  return handler[effectName];
                } else {
                  /*const fallThroughEffect = rewrapTypedEffect(effectInstance as YieldedEffect<TFallThroughEffects>, (value) => {
                    yieldedValue.next(value)
                  })*/ //yieldedValue as TypedYieldedEffect<TFallThroughEffects>
                  const fallThroughEffect =
                    effectInstance as YieldedEffect<FallThroughEffects>;
                  return pushEffect(fallThroughEffect);
                }
              };

              const handle = getHandleForEffect(effectInstance);

              const { effectName, effectValue } = effectInstance;

              let resolveHandlerPromise: PromiseResolveFunc<ResumeType>;

              const handlerPromise = new Promise<ResumeType>((res, rej) => {
                resolveHandlerPromise = res;
              });

              // const continuation: Continuation<TaskCreatorType> = {
              //   resumeCache: instance[SymbolForNextCache],
              //   task: instance
              // }

              const continuation = instance.continuation();

              numLiveContinuations++;
              let finalized = false;
              const wrappedResume: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                const forkedInstance = continuation(); //resume(continuation, resumeValue)
                forkedInstance.next(resumeValue);
                const observable = handleToTaskWithContinuationsAndObservable(
                  forkedInstance,
                  handler
                );
                observable.subscribe(
                  (resumeValue) => {},
                  (effect: any) => {
                    return getHandleForEffect(effect);
                  }
                );
                // instances.push(result)
              };

              const final: ResumeFunction<ResumeType> = (
                resumeValue: ResumeType
              ) => {
                if (!finalized) {
                  resolveHandlerPromise(resumeValue);
                  numLiveContinuations--;
                  finalized = true;
                }
              };

              handle(wrappedResume, final, effectValue);

              previousValue = await handlerPromise;
              // resumeCache = [...resumeCache, previousValue]
            }
          }
        } else {
          await Promise.resolve();
        }
      }
    } while (numLiveContinuations > 0 || instances.length > 0);
  };
  anonymousTask();
  // const forkableAnonymousTask: CloneableTaskInstanceV2<FallThroughEffectTypes, Observable<TReturn>> = new ForkableGenerator(anonymousTask)
  return taskObservable; //anonymousTask()
};

export const end = async <TReturn>(
  handledTask: TaskInstance<never, TReturn> | AsyncTaskInstance<never, TReturn>
): Promise<TReturn> => {
  return (await handledTask.next()).value as TReturn;
};
