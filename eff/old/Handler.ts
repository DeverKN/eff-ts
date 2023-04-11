import { AnyEffect, Effect, TypedYieldedEffect } from "./Effect";
import { TaskInstance } from "./Task";
import { isPromise } from "./isPromise";
// import { isPromise } from "../isPromise";

export type ResumeFunction<TValue> = (resumeValue: TValue) => void;

export type EffectHandler<TEffect extends AnyEffect> = (
  resume: ResumeFunction<TEffect["resumeValue"]>,
  final: ResumeFunction<TEffect["resumeValue"]>,
  value?: TEffect["effectValue"]
) => void;

export type FallthroughEffectHandler<
  TEffect extends AnyEffect,
  TThrownEffects extends AnyEffect
> = (
  resume: ResumeFunction<TEffect["resumeValue"]>,
  final: ResumeFunction<TEffect["resumeValue"]>,
  value?: TEffect["effectValue"]
) => TaskInstance<TThrownEffects, null>;

export type Handler<TTEffects extends AnyEffect> = {
  [EffectName in TTEffects["effectName"]]: EffectHandler<
    Extract<TTEffects, Effect<EffectName, any, any>>
  >;
};

// export type ContinuationEffectHandler<TEffect extends AnyEffect> = (
//   continuation: Continuation<any>,
//   value?: TEffect['effectValue']
// ) => void;

// export type ContinuationHandler<TTEffects extends AnyEffect> = {
//   [EffectName in TTEffects['effectName']]: ContinuationEffectHandler<
//     Extract<TTEffects, Effect<EffectName, any, any>>
//   >;
// };

export type FallthroughHandler<
  TTEffects extends AnyEffect,
  TFallthroughEffects extends AnyEffect
> = {
  [EffectName in TTEffects["effectName"]]: FallthroughEffectHandler<
    Extract<TTEffects, Effect<EffectName, any, any>>,
    TFallthroughEffects
  >;
};

export type SingleEffectHandle<TEffect extends AnyEffect> = (
  value: TEffect["effectValue"]
) => TEffect["resumeValue"] | Promise<TEffect["resumeValue"]>;

export type PartiallyHandledInstance<
  TFallThroughEffects extends AnyEffect,
  TReturn
> = AsyncGenerator<
  TypedYieldedEffect<TFallThroughEffects>,
  TReturn,
  TFallThroughEffects["resumeValue"]
>;

export const singleHandle = <TEffect extends AnyEffect>(
  handler: SingleEffectHandle<TEffect>
): EffectHandler<TEffect> => {
  return async (resume, final, value) => {
    const result = handler(value);
    if (isPromise(result)) {
      const resolvedResult = await result;
      resume(resolvedResult);
    } else {
      resume(result);
    }
  };
};

export type MultiEffectHandle<TEffect extends AnyEffect> = (
  value: TEffect["effectValue"],
  resume: ResumeFunction<TEffect["resumeValue"]>
) => TEffect["resumeValue"] | Promise<TEffect["resumeValue"]>;

export const multiHandle = <TEffect extends AnyEffect>(
  handler: MultiEffectHandle<TEffect>
): EffectHandler<TEffect> => {
  return async (resume, final, value) => {
    const result = handler(value, final);
    if (isPromise(result)) {
      const resolvedResult = await result;
      resume(resolvedResult);
    } else {
      resume(result);
    }
  };
};
