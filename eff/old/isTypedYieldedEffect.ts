import { AnyEffect, TypedYieldedEffect } from "./Effect";

export const isTypedYieldedEffect = <TEffect extends AnyEffect>(
  maybeEffect: any | TypedYieldedEffect<TEffect>
): maybeEffect is TypedYieldedEffect<TEffect> => {
  return typeof maybeEffect["effectName"] === "function";
};
