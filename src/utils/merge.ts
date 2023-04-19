export type UnknownObject = Record<PropertyKey, unknown>;
export type EmptyObject = Record<PropertyKey, never>;

export const merge = <TBase extends UnknownObject, TMergeProps extends Partial<TBase>>(
  base: TBase,
  mergeProps: TMergeProps
): TBase => {
  const merged = { ...base, ...mergeProps };
  return merged;
};
