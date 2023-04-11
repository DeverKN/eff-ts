import { ContinuationTuple } from "./continuation";
import { Effect, ResumeType, UnknownEffect } from "./Effect";
import { Observable } from "./Observable";

export type Handler<TEffect extends UnknownEffect, TWorld> = (
  world: TWorld,
  ...args: TEffect["args"]
) => Observable<ContinuationTuple<ResumeType<TEffect>, TWorld>>;

type SingleHandle<TEffect extends UnknownEffect, TWorld> = (
  world: TWorld,
  ...args: TEffect["args"]
) => ContinuationTuple<ResumeType<TEffect>, TWorld>;

export const single = <TEffect extends UnknownEffect, TWorld>(handle: SingleHandle<TEffect, TWorld>) => {
  const wrappedHandle: Handler<TEffect, TWorld> = (world, ...args) => {
    return new Observable((subscriber) => {
      subscriber.next(handle(world, ...args));
      subscriber.complete();
    });
  };
  return wrappedHandle;
};

export type Handlers<TEffects extends UnknownEffect, World = void> = {
  [EffectName in TEffects["name"]]: Handler<Extract<TEffects, Effect<EffectName, unknown[], unknown>>, World>;
};
