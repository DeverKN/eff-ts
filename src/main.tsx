import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// console.log(sextupleTask(2))

// const singleExampleTask = ForkableGeneratorFunction(function* () {
//   const name = yield* doInput("What is your name?")
//   yield* doLog(`Hello ${name}`)
//   const repeatNum = 1
//   yield* doLog(`Hello ${name} (this will print once) (repeatNum = ${repeatNum})`)
//   return
// })

// handleOnce(singleExampleTask(), exampleHandler)

// const forkable = ForkableGeneratorFunction(function* () {
//   const next1: string = yield 1
//   console.log({next1})
//   const next2: string  = yield 2
//   console.log({next2})
//   const next3: string  = yield 3
//   console.log({next3})
//   const next4: string  = yield 4
//   console.log({next4})
//   return 5
// })

// const instance = forkable()
// instance.next("a")
// instance.next("b")
// instance.next("c")
// const continuation = instance.continuation()
// const continuationInstance = continuation()
// continuationInstance.next("d")
// const continuationInstance2 = continuation()
// continuationInstance2.next("x")
// console.log({og: instance[SymbolForNextCache], continuation: continuationInstance[SymbolForNextCache]})
// const continuation2 = continuationInstance.continuation()
// const continuation2Instance = continuation2()
// continuation2Instance.next("e")
// console.log({og: instance[SymbolForNextCache], continuation: continuationInstance[SymbolForNextCache], continuation2: continuation2Instance[SymbolForNextCache]})
// console.log(instance.next("a"))
// console.log(instance.next("b"))
// console.log(instance.next("c"))
// console.log("make continuation")
// const continuation3 = instance.continuation()
// console.log(instance.next("d"))
// console.log(instance.next("e"))
// console.log(instance.next("f"))
// console.log("fork continuation")
// const continuation3Instance = continuation()
// console.log("resume continuation")
// console.log(continuationInstance.next("x"))
// console.log(continuationInstance.next("y"))
// console.log(continuationInstance.next("z"))
