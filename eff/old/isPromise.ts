export const isPromise = <T>(maybePromise: Promise<T> | any) => {
  return typeof maybePromise["then"] === "function";
};
