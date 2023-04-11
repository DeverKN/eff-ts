type Sign = "+" | "-";
export type Num<Negative extends Sign, Magnitude extends unknown[]> = {
  sign: Sign;
  magnitude: Magnitude;
};

export type Push<Arr extends unknown[], El> = [...Arr, El];
export type Pop<Arr extends unknown[]> = Arr extends [...infer Rest, unknown] ? Rest : [];

type AnyNat = unknown[];

type IncNat<Num extends AnyNat> = Push<Num, Num["length"]>;
type DecNat<Num extends AnyNat> = Pop<Num>;

type Nat<Base extends number, Magnitude extends unknown[] = []> = Base extends Magnitude["length"]
  ? Magnitude
  : Nat<Base, IncNat<Magnitude>>;

type NatEquals<NumOne extends AnyNat, NumTwo extends AnyNat> = NumOne extends NumTwo ? true : false;

type AddNat<NumOne extends AnyNat, NumTwo extends AnyNat> = NatEquals<NumTwo, Nat<0>> extends true
  ? NumOne
  : AddNat<IncNat<NumOne>, DecNat<NumTwo>>;
type SubNat<NumOne extends AnyNat, NumTwo extends AnyNat> = NatEquals<NumTwo, Nat<0>> extends true
  ? NumOne
  : SubNat<DecNat<NumOne>, DecNat<NumTwo>>;

type Seven = SubNat<Nat<9>, Nat<2>>;

type NumHelper<Base extends number> = `${Base}` extends `-${infer Magnitude extends number}`
  ? {
      sign: "-";
      magnitude: Nat<Magnitude>;
    }
  : `${Base}` extends `${infer Magnitude extends number}`
  ? {
      sign: "+";
      magnitude: Nat<Magnitude>;
    }
  : never;

type Equals<NumOne extends Num<any, any>, NumTwo extends Num<any, any>> = NumOne["sign"] extends NumTwo["sign"]
  ? NumOne["magnitude"] extends NumTwo["magnitude"]
    ? true
    : false
  : false;

type Add<NumOne extends Num<any, any>, NumTwo extends Num<any, any>> = NumOne["sign"] extends "+"
  ? NumTwo["sign"] extends "+"
    ? Num<"+", AddNat<NumOne["magnitude"], NumTwo["magnitude"]>>
    : Num<"-", SubNat<NumOne["magnitude"], NumTwo["magnitude"]>>
  : Num<"-", SubNat<NumTwo["magnitude"], NumOne["magnitude"]>>;

type One = NumHelper<1>;
type Two = NumHelper<2>;
type Three = NumHelper<3>;

type NegativeOne = NumHelper<-1>;

type NegativeFive = Add<NumHelper<4>, NumHelper<-9>>

type True = Equals<One, One>;

type False = Equals<One, NegativeOne>;
type AlsoFalse = Equals<One, Three>;

// export const hole = <THave extends T | unknown, T, IsCorrect = THave extends T ? "Correct" : "Incorrect">(arg?: THave): T => void 0 as T;

// const add = (x: number, y: number) => x + y;

// const number = add(5, hole("5" + "2"))
