type Subscriber<T> = {
  next: (nextVal: T) => void;
  error: (err: Error) => void;
  complete: () => void;
};

type FunctionalSubscriber<T> = (nextVal: T) => void;
type PartialSubscriber<T> = {
  next: (nextVal: T) => void;
  error?: (err: Error) => void;
  complete?: () => void;
};

type ObservableBehavior<T> = (subscriber: Subscriber<T>) => void;

export class Observable<T> {
  #behavior: ObservableBehavior<T>;

  constructor(behavior: ObservableBehavior<T>) {
    this.#behavior = behavior;
  }

  subscribe(subscriber: FunctionalSubscriber<T> | PartialSubscriber<T>) {
    if (typeof subscriber === "function") {
      this.#behavior({ next: subscriber, error: () => void 0, complete: () => void 0 });
    } else {
      this.#behavior({ error: () => void 0, complete: () => void 0, ...subscriber });
    }
  }
}

export const single = <T>(val: T): Observable<T> => {
  return new Observable(subscriber => {
    subscriber.next(val)
    subscriber.complete()
  })
}