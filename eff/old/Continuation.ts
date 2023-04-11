import {
  CloneableTaskInstance,
  CloneableTaskInstanceV2,
  EffectTypes,
} from "./Task";

export type ExtractEffectsFromCloneableTaskInstance<
  TCloneableTask extends CloneableTaskInstance<any, any>
> = TCloneableTask extends CloneableTaskInstance<
  infer TaskEffects,
  infer TaskReturn
>
  ? TaskEffects
  : never;
export type ExtractReturnFromCloneableTaskInstance<
  TCloneableTask extends CloneableTaskInstance<any, any>
> = TCloneableTask extends CloneableTaskInstance<
  infer TaskEffects,
  infer TaskReturn
>
  ? TaskReturn
  : never;

// type ExtractEffectsFromCloneableTaskInstance<TCloneableTask extends CloneableTaskInstance<any, any>> = EffectTypes<ExtractTaskFromCloneableTaskInstance<TCloneableTask>>

export type ExtractEffectsFromCloneableTaskInstanceV2<
  TCloneableTask extends CloneableTaskInstanceV2<any, any>
> = TCloneableTask extends CloneableTaskInstanceV2<
  infer TaskEffects,
  infer TaskReturn
>
  ? TaskEffects
  : never;
export type Continuation<
  TCloneableTask extends CloneableTaskInstanceV2<any, any>
> = {
  resumeCache: ExtractEffectsFromCloneableTaskInstanceV2<TCloneableTask>["resumeValue"][];
  task: TCloneableTask;
};

export type ContinuationTask<TContinuation extends Continuation<any>> =
  TContinuation extends Continuation<infer CloneTask> ? CloneTask : never;
export type ContinuationResumeValue<TContinuation extends Continuation<any>> =
  ExtractEffectsFromCloneableTaskInstance<
    ContinuationTask<TContinuation>
  >["resumeValue"];
