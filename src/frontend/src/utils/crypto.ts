import { toHexString } from "@dfinity/candid/lib/cjs/utils/buffer";
import { Principal } from "@dfinity/principal";
import { getCrc32 } from "@dfinity/principal/lib/cjs/utils/getCrc";
import { sha224 } from "@dfinity/principal/lib/cjs/utils/sha224";
import { Account, Subaccount } from "@ic/backend/backend.did";
import { unwrap } from "./idl";
import { AccountIdentifier } from "@dfinity/ledger-icp";

export type TokenProps = {
  index: number;
  canisterId: string;
};

export const asciiStringToByteArray = (text: string) => {
  return Array.from(text).map((c) => c.charCodeAt(0));
};

export const numberFrom32bits = (array: number[] | Uint8Array) => {
  return Array.from(array).reduce((acc, byte) => (acc << 8) | byte, 0);
};

export const numberTo32bits = (num: number) => {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
};

export const getSubAccount = (index: number): number[] => {
  return Array(28).fill(0).concat(numberTo32bits(index));
};

export const principalToAccountIdentifier = (
  principal: string | Principal,
  subAccount: number,
) => {
  const checkedPrincipal =
    typeof principal === "string" ? Principal.fromText(principal) : principal;
  const padding = Buffer.from("\x0Aaccount-id");
  const array = new Uint8Array([
    ...padding,
    ...checkedPrincipal.toUint8Array(),
    ...getSubAccount(subAccount),
  ]);
  const hash = sha224(array);
  const checksum = numberTo32bits(getCrc32(hash));

  return toHexString(new Uint8Array([...checksum, ...hash]));
};

export const principalToDefaultAccountIdentifier = (principal: string) => {
  return principalToAccountIdentifier(principal, 0);
};

export const accountToIdentifier = (
  account: Account | null | undefined,
  opts?: {
    fallback?: string;
    truncate?: boolean;
  },
) => {
  if (!account?.owner) {
    return opts?.fallback ?? "";
  }

  const subaccount = unwrap<Subaccount>(account.subaccount);
  const identifier = principalToAccountIdentifier(
    account.owner,
    subaccount ? numberFrom32bits(subaccount) : 0,
  );
  if (opts?.truncate) {
    return getShortenAddress(identifier);
  }

  return identifier;
};

const checkIfTextIsPrincipal = (text: string): boolean => {
  try {
    Principal.fromText(text);
    return true;
  } catch (e) {
    return false;
  }
};

export const decodeTokenId = (tid: string | undefined): TokenProps => {
  if (!tid || !checkIfTextIsPrincipal(tid)) {
    return { index: 0, canisterId: "" };
  }

  const array = [...Principal.fromText(tid).toUint8Array()];
  const padding = new Uint8Array(array.splice(0, 4));
  if (toHexString(padding) !== toHexString(Buffer.from("\x0Atid"))) {
    return { index: 0, canisterId: tid };
  } else {
    const index = numberFrom32bits(array.splice(-4));
    const canisterId = Principal.fromUint8Array(new Uint8Array(array)).toText();
    return { index, canisterId };
  }
};

export const getShortenAddress = (address: string) => {
  if (address.length < 10) return address;
  return address.slice(0, 5) + "..." + address.slice(-5);
};

export function isValidAddress(address: string) {
  if (address.length !== 64) {
    return false;
  }

  // TODO: add more checks

  return true;
}
