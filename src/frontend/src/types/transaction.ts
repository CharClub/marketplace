import { Account } from "./account";

export type Transaction = {
  id: bigint;
  ts: number;
  op: "7mint" | "7burn" | "7xfer" | "7update" | "37approve";
  token_id: bigint;
  from: Account;
  to: Account;
  token: unknown;
  memo: Uint8Array;
  spender: Account;
};
