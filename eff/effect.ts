export type Effect<Name extends string, TArg extends unknown[], TResume> = {
  name: Name;
  args: TArg;
  __unsafe_do_not_use__resumeType: TResume;
};

export type UnknownEffect = Effect<string, unknown[], unknown>;

export type ResumeType<TEffect extends UnknownEffect> = TEffect["__unsafe_do_not_use__resumeType"];

// export type YieldedEffect<TEffect extends Effect<string, unknown, unknown>> = {
//   name: TEffect["name"],
//   arg: TEffect["arg"],
// }
