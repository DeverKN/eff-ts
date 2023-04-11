import { AnyEffect } from "./Effect";
import { Handler } from "./Handler";

export const isHandledEffect = <
  THandledEffects extends AnyEffect,
  TFallThroughEffects extends AnyEffect
>(
  handler: Handler<THandledEffects>,
  possiblyHandledEffect: THandledEffects | TFallThroughEffects
): possiblyHandledEffect is THandledEffects => {
  //@ts-ignore
  return typeof handler[possiblyHandledEffect.effectName] === "function";
};
