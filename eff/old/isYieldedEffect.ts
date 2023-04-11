import { AnyEffect, YieldedEffect } from "./Effect";

export const isYieldedEffect = <TEffect extends AnyEffect>(
  maybeEffect: any | YieldedEffect<TEffect>
): maybeEffect is YieldedEffect<TEffect> => {
  return maybeEffect.hasOwnProperty("effectName");
};
