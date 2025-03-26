import { useQuery } from "@tanstack/react-query";
import { useActor } from "../actor";
import { opt } from "@charm/utils/idl";
import {
  Account,
  GetTransactionsArgs,
  GetTransactionsResult,
} from "@ic/backend/backend.did";

export type UseQueryGetTransactionProps = {
  offset: number;
  limit: number;
  account?: Account;
  token?: bigint;
};
export const useQueryGetTransactions = ({
  offset,
  limit,
  account,
  token,
}: UseQueryGetTransactionProps) => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["getTransactions", { offset, limit, account, token }],
    queryFn: async () => {
      const result = ((await actor?.get_transactions({
        offset: BigInt(offset),
        limit: BigInt(limit),
        account: opt(account),
        token: opt(token),
      } satisfies GetTransactionsArgs)) ?? []) as GetTransactionsResult;

      console.log({ result, offset, limit, account, token });

      return result;
    },
    throwOnError: true,
    enabled: !!actor,
  });
};
