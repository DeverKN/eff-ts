import { ContinuationTuple } from "./continuation";
import { Effect, ResumeType, UnknownEffect } from "./effect";
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

type PassedContinuation<T, World> = (val: T, world: World) => void;
type DelegatedHandler<TEffect extends UnknownEffect, World> = (world: World, continuation: PassedContinuation<ResumeType<TEffect>, World>, ...args: TEffect["args"]) => void//ContinuationTuple<ResumeType<TEffect>, World>

export const delegate = <DelegatedHandlerName extends string, DelegatedEffect extends UnknownEffect>(delegatedName: DelegatedHandlerName) => {
  const handle = <TWorld extends Record<DelegatedHandlerName, DelegatedHandler<DelegatedEffect, TWorld>>>(world: TWorld, ...args: DelegatedEffect["args"]) => {
    return new Observable<[ResumeType<DelegatedEffect>, TWorld]>((sub) => {
      const continuation = (val: ResumeType<DelegatedEffect>, world: TWorld) => {
        sub.next([val, world])
      }
      world[delegatedName](world, continuation, ...args)
      sub.complete()
    })
  }
  return handle
}

// const linearHandler = <TSplitEffect extends UnknownEffect, TCombineEffect extends UnknownEffect>() => {
//   return void 0
// }