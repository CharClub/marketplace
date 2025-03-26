import type { Identity } from "@dfinity/agent";
import { IdbStorage } from "@dfinity/auth-client";
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@dfinity/identity";
import Big from "big.js";

export async function getIdentity() {
  const storage = new IdbStorage();

  const identityKey: string | null = await storage.get("identity");
  const delegationChain: string | null = await storage.get("delegation");

  if (!identityKey || !delegationChain) {
    return null;
  }

  const chain = DelegationChain.fromJSON(delegationChain);
  const key = Ed25519KeyIdentity.fromJSON(identityKey);

  const identity: Identity = DelegationIdentity.fromDelegation(key, chain);

  return identity;
}

export function e8sToIcp(e8s: bigint | string | number) {
  return Big(BigInt(e8s).toString()).div(100000000);
}

export function icpToE8s(icp: bigint | string | number) {
  return Big(BigInt(icp).toString()).times(100000000);
}
