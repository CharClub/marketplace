import type { BTreeMap, JSValue, Opt, Value } from "@charm/types/idl";

export const opt = <T>(x: T): T extends NonNullable<T> ? [T] : [] =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  x === null || x === undefined ? ([] as []) : ([x] as any);

export const unwrap = <T>(x: unknown): T | null => {
  if (Array.isArray(x)) {
    return (x[0] as T) ?? null;
  } else if (typeof x === "object" && x !== null) {
    if ("Ok" in x) return x.Ok as T;
    if ("Err" in x) throw x.Err;
  }

  return x as T | null;
};

export function btreeMapToObject(btreeMap: BTreeMap): Record<string, JSValue> {
  const result: Record<string, JSValue> = {};

  for (const [key, value] of btreeMap) {
    result[key] = valueToJS(value);
  }

  return result;
}

function valueToJS(value: Value): JSValue {
  if ("Blob" in value) {
    return value.Blob;
  }

  if ("Text" in value) {
    return value.Text;
  }

  if ("Nat" in value) {
    return value.Nat;
  }

  if ("Int" in value) {
    return value.Int;
  }

  if ("Array" in value) {
    return value.Array.map(valueToJS);
  }

  if ("Map" in value) {
    return btreeMapToObject(value.Map);
  }

  throw new Error(`Unknown value type: ${JSON.stringify(value)}`);
}

export function objectToBTreeMap(obj: Record<string, JSValue>): BTreeMap {
  const result: BTreeMap = [];

  for (const [key, value] of Object.entries(obj)) {
    result.push([key, jsToValue(value)]);
  }

  return result;
}

function jsToValue(value: JSValue): Value {
  if (value instanceof Uint8Array) {
    return { Blob: value };
  }

  if (typeof value === "string") {
    return { Text: value };
  }

  if (typeof value === "bigint") {
    return { Nat: value };
  }

  if (typeof value === "number") {
    return value >= 0
      ? { Nat: BigInt(Math.floor(value)) }
      : { Int: BigInt(Math.floor(value)) };
  }

  if (Array.isArray(value)) {
    return { Array: value.map(jsToValue) };
  }
  if (value && typeof value === "object") {
    return { Map: objectToBTreeMap(value as Record<string, JSValue>) };
  }
  throw new Error(`Unsupported value type: ${typeof value}`);
}
