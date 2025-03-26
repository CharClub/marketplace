import { Account, Transaction } from "@ic/backend/backend.did";
import { unwrap } from "./idl";

export const getTxFrom = (tx: Transaction) => {
  const unwrappedTx = unwrap(tx[tx.kind]) as Record<string, unknown>;

  if ("from" in unwrappedTx) {
    return unwrappedTx.from as Account;
  }

  return null;
};

export const getTxTo = (tx: Transaction) => {
  const unwrappedTx = unwrap(tx[tx.kind]) as Record<string, unknown>;

  if ("to" in unwrappedTx) {
    return unwrappedTx.to as Account;
  }

  return null;
};
