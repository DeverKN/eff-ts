import { Continuation } from "./Continuation";
import { AnyEffect } from "./Effect";
import {
  CloneableTaskInstance,
  CloneableTaskInstanceV2,
  EffectTypesHelper,
  InstanceEffectTypes,
  InstanceTaskReturn,
  Task,
  TaskInstance,
  YieldType,
} from "./Task";

type AnyContinuation = Continuation<CloneableTaskInstanceV2<AnyEffect, any>>;
type AnyTask = Task<AnyEffect, any>;
export const resume = <TEffects extends AnyEffect, TReturn, TResumeValue>(
  continuation: Continuation<CloneableTaskInstanceV2<TEffects, TReturn>>,
  resumeValue: TResumeValue
): CloneableTaskInstanceV2<TEffects, TReturn> => {
  // type TaskInstanceType = TaskInstance<EffectTypesHelper<YieldType<ReturnType<TTask>>>, InstanceTaskReturn<ReturnType<TTask>>>
  const { resumeCache, task } = continuation;
  const instance = task.clone();
  while (resumeCache.length > 0) {
    const nextResumeValue = resumeCache.shift();
    instance.next(nextResumeValue);
  }
  instance.next(resumeValue);
  return instance;
};
