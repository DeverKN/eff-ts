import { AnyEffect, YieldedEffect } from "./Effect";
import { EffectHandler, Handler } from "./Handler";

export type UnsubscribeFunction = () => void;
export type SubscriptionFunction<T> = (val: T) => void;

export type Observable<T> = {
  subscribe(subscription: SubscriptionFunction<T>): UnsubscribeFunction;
};

export type ObservablePushFunction<T> = (val: T) => void;
export type ObservableEffectFunction<TEffect extends AnyEffect> = (
  effect: YieldedEffect<TEffect>
) => Handler<TEffect>[TEffect["effectName"]];

// export type EffectFunction<TEffect extends AnyEffect> = (effect: YieldedEffect<TEffect>) => Promise<TEffect["resumeValue"]>

export type EffectfulObservable<TEffects extends AnyEffect, T> = {
  subscribe(
    subscription: SubscriptionFunction<T>,
    effectHandler: Handler<TEffects>
  ): UnsubscribeFunction;
};

export const makeObservable = <T>(): [
  Observable<T>,
  ObservablePushFunction<T>
] => {
  let subscriptions: SubscriptionFunction<T>[] = [];
  let initialized = false;
  let lastVal: T | null = null;
  const observable: Observable<T> = {
    subscribe: (subscription) => {
      subscriptions.push(subscription);
      if (initialized) subscription(lastVal as T);
      const unsubscribe = () => {};
      return unsubscribe;
    },
  };
  const push: ObservablePushFunction<T> = (newVal: T) => {
    lastVal = newVal;
    subscriptions.forEach((sub) => sub(newVal));
  };
  return [observable, push];
};

export const makeEffectfulObservable = <TEffects extends AnyEffect, T>(): [
  EffectfulObservable<TEffects, T>,
  ObservablePushFunction<T>,
  ObservableEffectFunction<TEffects>
] => {
  let subscriptions: SubscriptionFunction<T>[] = [];
  let initialized = false;
  let lastVal: T | null = null;
  let effectHandler: Handler<TEffects>;
  const observable: EffectfulObservable<TEffects, T> = {
    subscribe: (subscription, handler) => {
      subscriptions.push(subscription);
      if (initialized) subscription(lastVal as T);
      effectHandler = handler;
      const unsubscribe = () => {};
      return unsubscribe;
    },
  };
  const push: ObservablePushFunction<T> = (newVal: T) => {
    lastVal = newVal;
    subscriptions.forEach((sub) => sub(newVal));
  };
  //: ObservableEffectFunction<TEffects>
  const effect: ObservableEffectFunction<TEffects> = (
    effect: YieldedEffect<TEffects>
  ) => {
    const { effectName, effectValue } = effect;
    const handler = effectHandler[effectName]; //(effectValue)
    return handler;
    //return await result
  };
  // type Return = ReturnType<typeof effect>

  return [observable, push, effect];
};
