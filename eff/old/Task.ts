import { AnyEffect, TypedYieldedEffect, YieldedEffect } from "./Effect";
import {
  ForkableGenerator,
  ForkableGeneratorFunction,
} from "./ForkableGenerator";
import { Handler, PartiallyHandledInstance } from "./Handler";
import { EffectfulObservable } from "./Observable";

// export type TaskInstanceCreator<TArgs, TEffects extends AnyEffect, TReturn> = (
//   args: TArgs
// ) => TaskInstance<TEffects, TReturn>;

// export type TaskWithSubtasks<
//   TEffects extends AnyEffect,
//   TSubtaskReturns,
//   TReturn
// > = () => TaskInstanceWithSubtasks<TEffects, TSubtaskReturns, TReturn>;

// export type TaskInstanceWithSubtasks<
//   TEffects extends AnyEffect,
//   TSubtaskReturns,
//   TReturn
// > = Generator<
//   | YieldedEffect<TEffects>
//   | TaskInstanceWithSubtasks<TEffects, any, TSubtaskReturns>
//   | PartiallyHandledInstance<TEffects, TReturn>,
//   TReturn,
//   TEffects['resumeValue'] | TSubtaskReturns
// >;

// export type TaskWithSubtasksV2<
//   TEffects extends AnyEffect,
//   TReturn
// > = () => TaskInstance<TEffects, TReturn>;

// export type TaskInstanceWithSubtasksV2<
//   TEffects extends AnyEffect,
//   TReturn
// > = Generator<
//   TypedYieldedEffect<TEffects> | TaskInstance<TEffects, any>,
//   TReturn,
//   TEffects['resumeValue']
// >;

// export type NullaryTaskWithSubtasksCreator<
//   TEffects extends AnyEffect,
//   TSubtaskReturns,
//   TReturn
// > = () => TaskInstanceWithSubtasks<TEffects, TSubtaskReturns, TReturn>;

export type Task<TEffects extends AnyEffect, TReturn> = (
  ...args: any[]
) => TaskInstance<TEffects, TReturn>;

export type TypedTask<
  TArgs extends any[],
  TEffects extends AnyEffect,
  TReturn
> = (...args: TArgs) => TaskInstance<TEffects, TReturn>;

export type TaskInstance<TEffects extends AnyEffect, TReturn> = Generator<
  | YieldedEffect<TEffects>
  | TaskInstance<TEffects, any>
  | Promise<TEffects["resumeValue"]>,
  TReturn,
  TEffects["resumeValue"]
>;

export type AsyncTask<TEffects extends AnyEffect, TReturn> = (
  ...args: any[]
) => AsyncTaskInstance<TEffects, TReturn>;

export type AsyncTaskInstance<
  TEffects extends AnyEffect,
  TReturn
> = AsyncGenerator<
  YieldedEffect<TEffects> | TaskInstance<TEffects, any>,
  TReturn,
  TEffects["resumeValue"]
>;

export type YieldType<
  T extends Generator<any, any, any> | AsyncGenerator<any, any, any>
> = T extends Generator<infer YieldType, any, any>
  ? YieldType
  : T extends AsyncGenerator<infer YieldType, any, any>
  ? YieldType
  : never;
export type EffectTypesHelper<T> = T extends YieldedEffect<infer EffectType>
  ? EffectType
  : T extends TaskInstance<infer EffectType, any>
  ? EffectType
  : never;
// type InferReturn<T> = T extends (...args: any[]) => infer ReturnType ? ReturnType : number

export type InstanceTaskReturn<
  T extends Generator<any, any, any> | AsyncGenerator<any, any, any>
> = T extends Generator<any, infer TReturn, any>
  ? TReturn
  : T extends AsyncGenerator<any, infer TReturn, any>
  ? TReturn
  : never;
// export type InstanceEffectTypesHelper<T extends Generator<any, any, any> | AsyncGenerator<any,any,any>> = T extends Generator<infer YieldedEffects, any, any> ? YieldedEffects : T extends AsyncGenerator<infer YieldedEffects, any, any> ? YieldedEffects : never
export type InstanceEffectTypes<
  T extends Generator<any, any, any> | AsyncGenerator<any, any, any>
> = EffectTypesHelper<YieldType<T>>;

// export type InstanceEffectTypesV2<T extends Generator<any, any, any> | AsyncGenerator<any,any,any>> = T extends Generator<infer YieldedEffects, any, any> ? EffectTypesHelper<YieldedEffects> : T extends AsyncGenerator<infer YieldedEffects, any, any> ? EffectTypesHelper<YieldedEffects> : never

export type TaskReturnType<T extends Task<any, any> | AsyncTask<any, any>> =
  InstanceTaskReturn<ReturnType<T>>;
export type EffectTypes<T extends Task<any, any> | AsyncTask<any, any>> =
  InstanceEffectTypes<ReturnType<T>>;

export type HandlerEffectTypes<T extends Handler<any>> = T extends Handler<
  infer HandlerTypes extends AnyEffect
>
  ? HandlerTypes
  : never;
export type NonAnyHandlerEffectTypes<T extends Handler<any>> = Exclude<
  HandlerEffectTypes<T>,
  Handler<any>
>;

export type CloneableTaskInstance<
  TEffects extends AnyEffect,
  TReturn
> = () => TaskInstance<TEffects, TReturn>;
export type CloneableTask<TEffects extends AnyEffect, TReturn> = (
  ...args: any[]
) => () => TaskInstance<TEffects, TReturn>;

// export type CloneableTaskInstanceV2<TEffects extends AnyEffect, TReturn> = ForkableGeneratorFunction<
export type CloneableTaskInstanceV2<
  TEffects extends AnyEffect,
  TReturn
> = ForkableGenerator<
  | YieldedEffect<TEffects>
  | TaskInstance<TEffects, any>
  | Promise<TEffects["resumeValue"]>,
  TReturn,
  TEffects["resumeValue"]
>;

export type CloneableTaskInstanceWithContinuations<
  TEffects extends AnyEffect,
  TReturn
> = ForkableGenerator<
  | YieldedEffect<TEffects>
  | EffectfulObservable<TEffects, any>
  | Promise<TEffects["resumeValue"]>,
  TReturn,
  TEffects["resumeValue"]
>;

export type TaskInstanceWithContinuations<
  TEffects extends AnyEffect,
  TReturn
> = Generator<
  | YieldedEffect<TEffects>
  | EffectfulObservable<TEffects, any>
  | Promise<TEffects["resumeValue"]>,
  TReturn,
  TEffects["resumeValue"]
>;

export type CloneableTaskInstanceEffectTypes<
  TCloneableTask extends CloneableTaskInstanceV2<any, any>
> = TCloneableTask extends CloneableTaskInstanceV2<
  infer EffectTypes,
  infer ReturnType
>
  ? EffectTypes
  : never;
export type CloneableTaskInstanceReturnType<
  TCloneableTask extends CloneableTaskInstanceV2<any, any>
> = TCloneableTask extends CloneableTaskInstanceV2<
  infer EffectTypes,
  infer ReturnType
>
  ? ReturnType
  : never;

// export const Task = <TArgs extends any[], TEffects extends AnyEffect, TReturn>(task: TypedTask<TArgs, TEffects, TReturn>): CloneableTask<TEffects, TReturn> => {
//   return (...args: TArgs) => {
//     const instanceCreator: CloneableTaskInstance<TEffects, TReturn> = () => {
//       return task(...args)
//     }
//     return instanceCreator
//   }
// }
