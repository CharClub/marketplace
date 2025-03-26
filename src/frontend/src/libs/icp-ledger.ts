import { AccountIdentifierString, SubAccountArray } from "@charm/types/account";
import { Agent, Identity } from "@dfinity/agent";
import { AccountIdentifier, LedgerCanister } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { createAgent, nowInBigIntNanoSeconds } from "@dfinity/utils";

const isDev = process.env.VITE_DFX_NETWORK !== "ic";
const AGENT_HOST = isDev ? "http://localhost:4943" : "https://icp0.io";

export const sendICP = async ({
  agent,
  to,
  amount,
  fromSubAccount,
  memo,
  createdAt,
  fee,
}: {
  agent: Agent;
  to: string;
  amount: bigint;
  fromSubAccount?: SubAccountArray | undefined;
  memo?: bigint;
  createdAt?: bigint;
  fee: bigint;
}) => {
  const { canister } = await getLedgerCanister({
    agent,
  });

  const result = await canister.transfer({
    to: AccountIdentifier.fromHex(to),
    amount,
    fromSubAccount,
    memo,
    createdAt: createdAt ?? nowInBigIntNanoSeconds(),
    fee,
  });

  return result;
};

export const transactionFee = async ({
  agent,
}: {
  agent: Agent;
}): Promise<bigint> => {
  const { canister } = await getLedgerCanister({ agent });
  const fee = await canister.transactionFee();

  return fee;
};

export const getLedgerCanister = async ({
  agent,
}: {
  agent: Agent;
}): Promise<{
  canister: LedgerCanister;
  agent: Agent;
}> => {
  const canister = LedgerCanister.create({
    agent,
    canisterId: Principal.fromText(process.env.VITE_CANISTER_ID_LEDGER!),
  });

  return {
    canister,
    agent,
  };
};

export const accountBalance = async ({
  icpAccountIdentifier,
  agent,
  certified,
}: {
  certified: boolean;
  agent: Agent;
  icpAccountIdentifier: AccountIdentifierString;
}) => {
  const { canister } = await getLedgerCanister({ agent });

  const e8sBalance = await canister.accountBalance({
    accountIdentifier: AccountIdentifier.fromHex(icpAccountIdentifier),
    certified,
  });

  return e8sBalance;
};
