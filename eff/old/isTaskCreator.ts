import { AnyEffect } from "../Eff-ts/Effect";
// import {
//   NullaryTaskWithSubtasksCreator,
//   TaskInstanceWithSubtasks,
// } from '../Eff-ts/Task';

// const GeneratorFunction = function* () {}.constructor;

// export const isTaskCreator = <
//   TEffects extends AnyEffect,
//   TSubtaskReturn,
//   TReturn
// >(
//   possibleTaskCreator:
//     | NullaryTaskWithSubtasksCreator<TEffects, TSubtaskReturn, TReturn>
//     | TaskInstanceWithSubtasks<TEffects, TSubtaskReturn, TReturn>
// ): possibleTaskCreator is NullaryTaskWithSubtasksCreator<
//   TEffects,
//   TSubtaskReturn,
//   TReturn
// > => {
//   return possibleTaskCreator instanceof GeneratorFunction;
// };
