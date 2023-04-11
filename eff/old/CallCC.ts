import {
  ForkableGenerator,
  ForkableGeneratorFunction,
} from "./ForkableGenerator";

// type Continuation<TResume, TReturn> = (resumeVal: TResume) => TReturn
// type ShiftFunction<TReset, TResume, TReturn> = (k: Continuation<TResume, TReturn>) => TReset
// const callWithContinuation = <TReset, TShift, TReturn>(task: Generator<Generator<TShift, TReset, Continuation<>>, TReturn, TReset>): TReturn => {
//     //First yield represents reset

//     //It passes a callback generator that can then yield to get a continuation

//     // let isDone = false
//     // let nextIteratorValue: any;
//     // while (!isDone) {
//     //     const { value, done } = task.next(nextIteratorValue)
//     //     if (done) {
//     //         return value
//     //     } else {
//     //         const continuationInstanceCreator = task.continuation()
//     //         const continuation = (resumeValue: TResumeValue): TReturn | undefined => {
//     //             const continuationInstance = continuationInstanceCreator()
//     //             continuationInstance.next(resumeValue)
//     //             return callWithContinuation(continuationInstance)
//     //         }
//     //         nextIteratorValue = continuation
//     //         isDone = done ?? true
//     //     }
//     // }
//     // return undefined
// }

type Continuation<TReset, TReturn> = (resumeVal: TReset) => TReturn;
type ShiftFunction<TReset, TReturn> = (
  k: Continuation<TReset, TReturn>
) => TReturn;
const reset = <TReset, TReturn>(
  task: ForkableGeneratorFunction<
    ShiftFunction<TReset, TReturn>,
    TReturn,
    TReset
  >
): TReturn => {
  const instance = task();

  let isDone = false;
  let nextIteratorValue: any;
  while (!isDone) {
    const { value, done } = instance.next(nextIteratorValue);
    // console.log({value})
    if (done) {
      return value;
    } else {
      const continuationInstanceCreator = instance.continuation();
      // const continuation = (resumeValue: TResumeValue): TReturn | undefined => {
      //     const continuationInstance = continuationInstanceCreator()
      //     continuationInstance.next(resumeValue)
      //     return callWithContinuation(continuationInstance)
      // }
      // nextIteratorValue = continuation
      // const continu
      const continuation: Continuation<TReset, TReturn> = (resumeValue) => {
        // console.log({resumeValue})
        const continuationInstance = continuationInstanceCreator();
        // console.log({continuationInstance})
        // const ignoredResult = continuationInstance.next()
        const result = continuationInstance.next(resumeValue);
        // console.log({result})
        const returnValue = result.value as TReturn;
        // console.log({returnValue})
        return returnValue;
      };

      // console.log({value})
      const shiftResult = value(continuation);
      // console.log({shiftResult})
      // return shiftResult
      nextIteratorValue = shiftResult;
      isDone = done ?? true;
    }
  }
  return undefined as any as TReturn;
};

const stubFunction = (...args: any[]): any => undefined;
const Identity = <T>(arg: T): T => {
  // console.log({arg})
  return arg;
};
// const reset = Identity
const shift = <T>(arg: T): T => {
  // console.log("shift")
  // console.log({arg})
  return arg;
};
// const [shift, reset] = [stubFunction, stubFunction]

// const octuple = (n: number) => {
//     return reset(() => {
//         const continueWith = shift(cont => {
//           const doubled = cont(n);
//           const quadrupled = cont(doubled);
//           return cont(quadrupled);
//         });
//         return continueWith * 2;
//     });
// }

export const sextupleTask = (n: number): number => {
  // console.log({n})
  const task = ForkableGeneratorFunction<
    ShiftFunction<number, number>,
    number,
    number
  >(function* () {
    // console.log("test")
    const continueWith = yield shift((k: Continuation<number, number>) => {
      // console.log({k})
      const doubled = k(n);
      console.log({ doubled });
      const quadrupled = k(doubled);
      console.log({ quadrupled });
      const octupled = k(quadrupled);
      console.log({ octupled });
      return octupled;
    }) as ShiftFunction<number, number>;
    // console.log("continued")
    // console.log({continueWith})
    return continueWith * 2;
  });
  return reset<number, number>(task);
};
