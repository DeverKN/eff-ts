export type Effect<Name extends string | symbol, TArg extends unknown[], TResume> = {
  name: Name;
  args: TArg;
  __unsafe_do_not_use__resumeType: TResume;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EffectHelper<Name extends string | symbol, Signature extends (...args: any[]) => any> = Effect<Name, Parameters<Signature>, ReturnType<Signature>>

export type UnknownEffect = Effect<string | symbol, unknown[], unknown>;

export type ResumeType<TEffect extends UnknownEffect> = TEffect["__unsafe_do_not_use__resumeType"];

// export type YieldedEffect<TEffect extends Effect<string, unknown, unknown>> = {
//   name: TEffect["name"],
//   arg: TEffect["arg"],
// }

type TypedYield<TYield, TNext> = Generator<TYield, TNext, TNext>;

export const eff = <TEffect extends UnknownEffect>(
  name: TEffect["name"]
): ((...args: TEffect["args"]) => TypedYield<TEffect, ResumeType<TEffect>>) => {
  return function* (...args: TEffect["args"]) {
    const instance = { name, args, __unsafe_do_not_use__resumeType: void 0 } as TEffect;
    const effectResult = yield instance;
    return effectResult;
  };
};