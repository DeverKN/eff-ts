import { eff, Effect, EffectHelper } from "../effect";
import { wrapGeneratorImmmutable } from "../generator/ImmutableGenerator";
import { delegate } from "../handler";
import { Observable, toArray } from "../Observable";
import { run } from "../run";
import { task } from "../task";

type LogEffect = Effect<"log", [msg: any], void>;
const log = eff<LogEffect>("log");

type RepeatEffect = Effect<"repeat", [numRepeats: number], number>;
const repeat = eff<RepeatEffect>("repeat");

type KillEffect = Effect<"kill", [], void>;
const kill = eff<KillEffect>("kill");

// type AmbEffect<T> = EffectHelper<"amb", (choices: T[]) => T>;
// const amb = <T>(...choices: T[]) => eff<AmbEffect<T>>("amb")(choices);

const amb = <T>(...choices: T[]) => choose(choices);

type BackTrackEffect = EffectHelper<"backtrack", () => void>;
const backTrack = eff<BackTrackEffect>("backtrack");

type LoopEffect<T> = EffectHelper<"loop", (startingVal: T) => T>;
const loop = <T>(startingVal: T) => eff<LoopEffect<T>>("loop")(startingVal);

type ContinueEffect<T> = EffectHelper<"continue", (nextVal: T) => void>;
const cont = <T>(nextVal: T) => eff<ContinueEffect<T>>("continue")(nextVal);

type WriteEffect<T> = EffectHelper<"write", (newVal: T) => void>;
const write = <T>(newVal: T) => eff<WriteEffect<T>>("write")(newVal);

type ReadEffect<T> = EffectHelper<"read", () => T>;
const read = <T>() => eff<ReadEffect<T>>("read")();

type EachEffect<T> = EffectHelper<"each", (list: T[]) => T>;
const each = <T>(list: T[]) => eff<EachEffect<T>>("each")(list);

type CollectEffect<T> = EffectHelper<"collect", (el: T) => T[]>;
const collect = <T>(el: T) => eff<CollectEffect<T>>("collect")(el);

type CollectDeepEffect<T> = EffectHelper<"collectDeep", (el: T) => T[]>;
const collectDeep = <T>(el: T) => eff<CollectDeepEffect<T>>("collectDeep")(el);

type ChooseEffect<T> = EffectHelper<"choose", (choices: T[]) => T>;
const choose = <T>(choices: T[]) => eff<ChooseEffect<T>>("choose")(choices);

test(
  "tautology holds",
  async () => {
    const assert = task(function* (cond) {
      if (!cond) yield* kill();
    });

    const testTask = task(function* () {
      const iteration = yield* repeat(10);
      yield* assert(iteration % 2 === 0);
      return iteration;
    });

    expect(
      await toArray(
        run(
          testTask(),
          {
            repeat: (_, numRepeats) =>
              new Observable((sub) => {
                new Array(numRepeats)
                  .fill(0)
                  .map((_, index) => index)
                  .forEach((val) => {
                    sub.next([val]);
                  });
                sub.complete();
              }),
            kill: () => new Observable((sub) => sub.complete()),
          },
          {}
        )
      )
    ).toEqual([0, 2, 4, 6, 8]);
  },
  100 * 1000
);

test("non-determinism", async () => {
  const assert = task(function* (cond) {
    if (!cond) {
      yield* amb();
    }
  });

  const lastLetter = (word: string) => word.charAt(word.length - 1);

  const firstLetter = (word: string) => word.charAt(0);

  const match = (wordOne: string, wordTwo: string) => lastLetter(wordOne) === firstLetter(wordTwo);

  const testTask = task(function* () {
    const firstWord = yield* amb("the", "that", "a");
    const secondWord = yield* amb("frog", "elephant", "thing");
    yield* assert(match(firstWord, secondWord));
    const thirdWord = yield* amb("walked", "threaded", "grows");
    yield* assert(match(secondWord, thirdWord));
    const fourthWord = yield* amb("slowly", "quickly");
    yield* assert(match(thirdWord, fourthWord));
    return [firstWord, secondWord, thirdWord, fourthWord].join(" ");
  });

  expect(
    await toArray(
      run(
        testTask(),
        {
          choose: (_, choices) =>
            new Observable((sub) => {
              choices.forEach((choice) => sub.next([choice]));
              sub.complete();
            }),

          // kill: () => new Observable((sub) => sub.complete()),
        },
        {}
      )
    )
  ).toEqual(["that thing grows slowly"]);
});

test("non-deterministic search", async () => {
  const assert = task(function* (cond) {
    if (!cond) {
      yield* backTrack();
    }
  });

  const lastLetter = (word: string) => word.charAt(word.length - 1);

  const firstLetter = (word: string) => word.charAt(0);

  const match = (wordOne: string, wordTwo: string) => {
    const isMatch = lastLetter(wordOne) === firstLetter(wordTwo);
    return isMatch;
  };

  const testTask = task(function* () {
    const firstWord = yield* amb("the", "that", "a");
    const secondWord = yield* amb("frog", "elephant", "thing");
    yield* assert(match(firstWord, secondWord));
    const thirdWord = yield* amb("walked", "threaded", "grows");
    yield* assert(match(secondWord, thirdWord));
    const fourthWord = yield* amb("slowly", "quickly", "speedily");
    yield* assert(match(thirdWord, fourthWord));
    return [firstWord, secondWord, thirdWord, fourthWord].join(" ");
  });

  expect(
    await toArray(
      run(
        testTask(),
        {
          choose: (world, choices) => {
            return new Observable((sub) => {
              const next = (world: { choiceIndex: number }) => {
                const choiceIndex = world.choiceIndex + 1;
                if (choiceIndex < choices.length) {
                  const lastChoice = choiceIndex === choices.length - 1;
                  const choice = choices[choiceIndex];
                  if (lastChoice) {
                    sub.next([choice]);
                  } else {
                    sub.next([choice, { next, choiceIndex }]);
                  }
                }
              };
              next({ choiceIndex: -1 });
              sub.complete();
            });
          },
          backtrack: delegate<"next", BackTrackEffect>("next"),
        },
        { next: (world: any) => void 0 as void, choiceIndex: -1 }
      )
    )
  ).toEqual(["that thing grows slowly"]);
});

const handleChoose = <World extends { choiceIndex: number, next: (newWorld: World, backtrack?: boolean, cont?: PassedContinuation<unknown, World>) => void }, T>(world: World, choices: T[]) => {
  return new Observable<[T, Partial<World>]>((sub) => {
    const next = (newWorld: { choiceIndex: number } & Partial<World>, backtrack = false) => {
      const choiceIndex = newWorld.choiceIndex + 1;
      if (choiceIndex < choices.length) {
        const lastChoice = choiceIndex === choices.length - 1;
        const choice = choices[choiceIndex];
        if (lastChoice) {
          sub.next([choice, backtrack ? world : newWorld]);
        } else {
          sub.next([choice, { ...newWorld, next, choiceIndex }]);
        }
      }
    };
    next({ ...world, choiceIndex: -1 });
    sub.complete();
  });
};

const handleBacktrack = <World extends { choiceIndex: number, next: (newWorld: World, backtrack?: boolean) => void }, T>(world: World) => {
  return new Observable<[void, Partial<World>]>((sub) => {
    world.next(world, true)
    sub.complete();
  });
};

test("$non-deterministic search", async () => {
  const assert = task(function* (cond) {
    if (!cond) {
      yield* backTrack();
    }
  });

  const lastLetter = (word: string) => word.charAt(word.length - 1);

  const firstLetter = (word: string) => word.charAt(0);

  const match = (wordOne: string, wordTwo: string) => {
    const isMatch = lastLetter(wordOne) === firstLetter(wordTwo);
    return isMatch;
  };

  const testTask = task(function* () {
    const firstWord = yield* amb("the", "that", "a");
    const secondWord = yield* amb("frog", "elephant", "thing");
    yield* assert(match(firstWord, secondWord));
    const thirdWord = yield* amb("walked", "threaded", "grows");
    yield* assert(match(secondWord, thirdWord));
    const fourthWord = yield* amb("slowly", "quickly", "speedily");
    yield* assert(match(thirdWord, fourthWord));
    return [firstWord, secondWord, thirdWord, fourthWord].join(" ");
  });

  expect(
    await toArray(
      run(
        testTask(),
        {
          choose: handleChoose,
          backtrack: handleBacktrack,
        },
        { next: (world: any) => void 0 as void, choiceIndex: -1 }
      )
    )
  ).toEqual(["that thing grows slowly"]);
});

/*

Linear Effects:
  Two Parts:
    Splitter and Combiner

  Enhanced Continuation:
    Takes an input and a world and spits out a continueVal and a (potentially modified) world

  
*/

test("loop", async () => {
  const loopTask = task(function* () {
    const index = yield* loop(0);
    yield* write<number[]>([...(yield* read<number[]>()), index]);
    if (index < 10) yield* cont(index + 1);
    return yield* read<number[]>();
  });

  expect(
    await toArray(
      run(
        loopTask(),
        {
          read: ({ state }) => {
            return new Observable((sub) => {
              sub.next([state]);
              sub.complete();
            });
          },
          write: (_, newVal) => {
            return new Observable((sub) => {
              sub.next([void 0, { state: newVal }]);
              sub.complete();
            });
          },
          continue: delegate<"recur", ContinueEffect<number>>("recur"),
          loop: (world, startingVal) => {
            type T = typeof startingVal;
            return new Observable((sub) => {
              const recur = (newWorld: any, _: any, val: T) => {
                sub.next([val, { ...newWorld, recur }]);
              };

              recur(world, () => void 0, startingVal);
              sub.complete();
            });
          },
        },
        { state: [] as number[], recur: (world: any, _: any, val: number) => void 0 }
      )
    )
  ).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]);
});

const handleCollect = <World extends { choiceIndex: number, next: (newWorld: World, backtrack?: boolean) => void }, T>(world: World) => {
  return new Observable<[void, Partial<World>]>((sub) => {
    world.next(world, true)
    sub.complete();
  });
};

test("map", async () => {
  const mapTask = task(function* () {
    const list = [1, 2, 3, 4, 5];
    const num = yield* choose(list);
    const doubled = num * 2;
    const doubleList = yield* collect(doubled);
    return doubleList;
  });

  expect(
    await toArray(
      run(
        mapTask(),
        {
          choose: handleChoose,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          collect: void 0 as any
          // each: (_, list) => {
          //   return new Observable((sub) => {
          //     const next = ({ collected, index }: { collected: number[]; index: number }) => {
          //       const done = index === list.length - 1;
          //       sub.next([list[index], { collected, next, done, index }]);
          //     };
          //     next({ collected: [], index: 0 });
          //     sub.complete();
          //   });
          // },
          // collect: ({ done, collected, next, index }, el) => {
          //   return new Observable((sub) => {
          //     const newCollected = [...collected, el];
          //     if (done) {
          //       sub.next([newCollected]);
          //     } else {
          //       next({ collected: newCollected, index: index + 1 });
          //     }
          //     sub.complete();
          //   });
          // },
        },
        { next: (world: any) => void 0 as void, done: false, collected: [] as number[], choiceIndex: 0 }
      )
    )
  ).toEqual([[2, 4, 6, 8, 10]]);
});

const enumerate = <T>(list: T[]): [T, number][] => {
  return list.map((el, index) => [el, index]);
};

type PassedContinuation<T, World> = (val: T, world: World) => void;
test("nested map", async () => {
  const mapTask = task(function* () {
    const list = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    const [nums, index] = yield* each(enumerate(list));
    const num = yield* each(nums);
    const mappedNum = num * (index + 1);
    const mappedNums = yield* collect(mappedNum);
    const mappedList = yield* collect(mappedNums);
    return mappedList;
  });

  expect(
    await toArray(
      run(
        mapTask(),
        {
          each: (world, list) => {
            return new Observable((sub) => {
              const next = (collected: any[], index: number, continuation: PassedContinuation<any, any>) => {
                const done = index === list.length;
                if (done) {
                  continuation(collected, world);
                } else {
                  sub.next([list[index], { collected, next, index }]);
                }
              };
              next([], 0, () => void 0);
              sub.complete();
            });
          },
          collect: ({ collected, next, index }, el) => {
            return new Observable((sub) => {
              const continuation = (nextVal: any, nextWorld: any) => {
                sub.next([nextVal, nextWorld]);
              };
              next([...collected, el], index + 1, continuation);
              sub.complete();
            });
          },
        },
        {
          next: (collected: any, index: number, continuation: PassedContinuation<any, any>) => void 0 as void,
          collected: [] as (number | number[])[],
          index: 0,
        }
      )
    )
  ).toEqual([
    [
      [1, 2],
      [6, 8],
      [15, 18],
    ],
  ]);
});

const range = (start: number, end: number): number[] => new Array(end - start + 1).fill(0).map((_, index) => start + index);
test("nested map delegated", async () => {
  const mapTask = task(function* () {
    const list = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    const [nums, index] = yield* each(enumerate(list));
    const num = yield* each(nums);
    const mappedNum = num * (index + 1);
    const mappedNums = yield* collect(mappedNum);
    const mappedList = yield* collect(mappedNums);
    return mappedList;
  });

  expect(
    await toArray(
      run(
        mapTask(),
        {
          each: (world, list) => {
            return new Observable((sub) => {
              const collect = (
                { index, collected }: { index: number; collected: any[] },
                continuation: PassedContinuation<any, any>,
                el: any
              ) => {
                const newIndex = index + 1;
                const done = newIndex === list.length;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const newCollected = [...collected, el];
                if (done) {
                  continuation(newCollected, world);
                } else {
                  sub.next([list[newIndex], { collected: newCollected, collect, index: newIndex }]);
                }
              };
              sub.next([list[0], { collected: [], collect, index: 0 }]);
              sub.complete();
            });
          },
          collect: delegate<"collect", CollectEffect<any>>("collect"),
        },
        {
          collect: (world: any, cont: any, el: unknown) => void 0 as void,
          collected: [] as (number | number[])[],
          index: 0,
        }
      )
    )
  ).toEqual([
    [
      [1, 2],
      [6, 8],
      [15, 18],
    ],
  ]);
});

type ArrayWithLength<T, Length extends number> = T[] & { length: Length };
type SudokuLine = ArrayWithLength<number, 9>;
type SudokuBoard = ArrayWithLength<SudokuLine, 9>;

type SudokuPosition = [row: number, column: number];
type SudokuMove = { position: SudokuPosition; number: number };

const isValid = (board: SudokuBoard): boolean => {
  return false;
};

const isComplete = (board: SudokuBoard): boolean => {
  return false;
};

const sudokuNums = range(1, 9);
const getMissingNumbers = (nums: number[]): number[] => {
  return sudokuNums.filter((testNum) => nums.includes(testNum));
};

// type TrieMapHelper<K extends unknown[], V> = K extends [infer Only]
//   ? Map<K, V>
//   : K extends [infer First, ...infer Rest]
//   ? Map<First, Rest>
//   : never;

// type RecursiveMap<K, V> = Map<K, RecursiveMap<K, V> | V>

// class TrieMap<K, V> {

//   #base: RecursiveMap<K, V> = new Map()
//   constructor() {}

//   get(key: K[]): V | undefined {

//   }

//   set(key: K[], val: V): void {}

//   has(key: K[]): boolean {}
// }

// const memoize = <T extends (...args: unknown[]) => unknown>(func: T): T => {
//   return (...args) => {};
// };

const getNumsInSquare = (board: SudokuBoard, rowMin: number, colMin: number) => {
  return range(rowMin, rowMin + 2).flatMap((row) => {
    return range(colMin, colMin + 2).flatMap((col) => {
      return board[row][col];
    });
  });
};

const getSquare = (row: number, col: number) => {
  const rowMin = Math.floor(row / 3);
  const colMin = Math.floor(col / 3);
  return [rowMin, colMin];
};

const getNumsInSquare$ = task(function* (board: SudokuBoard, position: SudokuPosition) {
  const [row, col] = position;
  const rowMin = Math.floor(row / 3);
  const colMin = Math.floor(col / 3);
  const rowIndex = yield* each(range(rowMin, rowMin + 2));
  const colIndex = yield* each(range(colMin, colMin + 2));
  const el = board[rowIndex][colIndex];
  return (yield* collect(yield* collect(el))).flat();
});

const getRow = (board: SudokuBoard, row: number) => board[row];

const getCol = task(function* (board: SudokuBoard, col: number) {
  const row = yield* each(range(1, 9));
  const colNums = yield* collect(board[row][col]);
  return colNums;
});

const intersection = <T>(...lists: T[][]): T[] => {
  return lists[0].filter((el) => lists.every((otherList) => otherList.includes(el)));
};

const assert = task(function* (cond) {
  if (!cond) {
    yield* backTrack();
  }
});

const intersection$ = task(function* <T>(...lists: T[][]) {
  const el = yield* each(lists[0]);
  yield* assert(lists.every((otherList) => otherList.includes(el)));
  const nums = yield* collect(el);
  return nums;
});

const intersection$$ = task(function* <T>(...lists: T[][]) {
  const el = yield* each(lists[0]);
  const otherList = yield* each(lists);
  yield* assert(otherList.includes(el));
  return yield* collectDeep(el);
});

test("intersection", () => {
  expect(intersection(["A", 1, "B", "2"], ["A", 1, "C", 32], ["A", "2", "#test", 1])).toEqual(["A", 1]);

  // expect(run(intersection$(["A", 1, "B", "2"], ["A", 1, "C", 32], ["A", "2", "#test", 1]), {}, {})).toEqual(["A", 1]);
});

const getMoves = task(function* (board: SudokuBoard) {
  const row = yield* each(range(1, 9));
  const col = yield* each(range(1, 9));
  const rowOptions = getMissingNumbers(getRow(board, row));
  const colOptions = getMissingNumbers(yield* getCol(board, col));
  const squareOptions = getMissingNumbers(yield* getNumsInSquare$(board, [row, col]));
  const validNums = intersection(rowOptions, colOptions, squareOptions);
  const moves = (yield* collect(yield* collect(validNums))).flat();
  return moves;
});

const makeMove = (board: SudokuBoard, move: SudokuMove): SudokuBoard => {
  return [] as SudokuBoard;
};

// const choose = task(function* <T>(options: T[]) {
//   if (options.length === 0) yield* backTrack();
//   return yield* amb(...options);
// });

// const solve = task(function* (startingBoard: SudokuBoard) {
//   const currentBoard = yield* loop(startingBoard);
//   if (isComplete(currentBoard)) return currentBoard;
//   const moves = yield* getMoves(currentBoard);
//   const move = yield* choose(moves);
//   const newBoard = makeMove(currentBoard, move);
//   yield* cont(newBoard);
// });

test("immutable generator", () => {
  const immutagen = wrapGeneratorImmmutable(function* () {
    const input: number = yield 1;
    yield 2;
    yield 3;
    return 4;
  });

  const instance = immutagen();
  const res1 = instance.next(1);
  const res2 = instance.next(1);
  const res3 = instance.next(1);
  expect(res1.value).toBe(res2.value);
  expect(res2.value).toBe(res3.value);
});
