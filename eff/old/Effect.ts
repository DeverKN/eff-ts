export type Effect<SName, TValue, TResume> = {
  effectName: SName;
  effectValue: TValue;
  resumeValue: TResume;
};

export type AnyEffect = Effect<any, any, any>;

export type YieldedEffect<TEffect extends AnyEffect> = {
  effectName: TEffect["effectName"];
  effectValue: TEffect["effectValue"];
  resumeValue: TEffect["resumeValue"];
};

export type EffectCreator<TEffect extends AnyEffect> = (
  effectValue: TEffect["effectValue"]
) => YieldedEffect<TEffect>;

export type TypedYieldedEffect<TEffect extends AnyEffect> = Generator<
  YieldedEffect<TEffect>,
  TEffect["resumeValue"],
  TEffect["resumeValue"]
>;

export type TypedEffectCreator<TEffect extends AnyEffect> = (
  effectValue: TEffect["effectValue"]
) => TypedYieldedEffect<TEffect>;

function* unwrap<TEffect extends AnyEffect>(
  effect: YieldedEffect<TEffect>
): TypedYieldedEffect<TEffect> {
  const unwrapped = yield effect;
  // console.log({effect, unwrapped})
  return unwrapped;
}

export const effect = <TEffect extends AnyEffect>(
  effectName: TEffect["effectName"]
): EffectCreator<TEffect> => {
  return (effectValue: TEffect["effectValue"]) => {
    return {
      effectName,
      effectValue,
      resumeValue: null,
    };
  };
};

export const typedEffect = <TEffect extends AnyEffect>(
  effectName: TEffect["effectName"]
): TypedEffectCreator<TEffect> => {
  return (effectValue: TEffect["effectValue"]) => {
    const untypedEffect: YieldedEffect<TEffect> = {
      effectName,
      effectValue,
      resumeValue: null,
    };
    return unwrap<TEffect>(untypedEffect);
  };
};

export const unwrapTypedEffect = <TEffect extends AnyEffect>(
  effect: TypedYieldedEffect<TEffect>
): YieldedEffect<TEffect> => {
  return effect.next().value;
};

export const rewrapTypedEffect = <TEffect extends AnyEffect>(
  effect: YieldedEffect<TEffect>,
  callback: (unwrappedValue: TEffect["resumeValue"]) => void
): TypedYieldedEffect<TEffect> => {
  return (function* () {
    const unwrapped = yield effect;
    callback(unwrapped);
  })();
};

// export const parameterizedEffect = <TEffect extends AnyEffect>(effectName: TEffect['effectName']) => {
//   return <TEffectValue>(effectValue: TEffectValue) => {
//     type SyntheticType = Effect<TEffect['effectName'], TEffectValue, TEffect['resumeValue']>
//     const untypedEffect: YieldedEffect<SyntheticType> = {
//       effectName,
//       effectValue,
//       resumeValue: null,
//     };
//     return unwrap<SyntheticType>(untypedEffect);
//   };
// }

export { unwrap, unwrap as perform };
