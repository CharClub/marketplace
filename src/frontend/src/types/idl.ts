export type Vec<T> = Array<T>;
export type Opt<T> = [] | [T];
export type Rec<T> = T;
export type Variant<T> = T;

export type Value =
  | { Blob: Uint8Array }
  | { Text: string }
  | { Nat: bigint }
  | { Int: bigint }
  | { Array: Value[] }
  | { Map: BTreeMap };

export type BTreeMap = Array<[string, Value]>;

export type JSValue =
  | Uint8Array
  | string
  | bigint
  | number
  | JSValue[]
  | { [key: string]: JSValue };
