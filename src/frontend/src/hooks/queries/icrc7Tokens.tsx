import { btreeMapToObject, opt } from "@charm/utils/idl";
import { useQuery } from "@tanstack/react-query";

import { useActor } from "../actor";
import { BTreeMap } from "@charm/types/idl";
import { unsafeCast } from "@charm/utils";
import { Icrc7TokenMetadata } from "@charm/types/token";
import { Account, AccountIdentifierString } from "@charm/types/account";

export type UseQueryIcrc7TokensProps = {
  prev?: number;
  limit?: number;
  owner?: AccountIdentifierString;
  tag?: string;
};

export type Icrc7ListTokenResult = {
  tokenId: bigint;
  owner: Account;
  metadata: BTreeMap;
}[];

export const useQueryIcrc7Tokens = ({
  prev,
  limit,
  owner,
  tag,
}: UseQueryIcrc7TokensProps) => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["icrc7Tokens", { prev, limit, tag }, actor],
    queryFn: async () => {
      const result = ((await actor?.listTokens(opt(prev), opt(limit), opt(owner), opt(tag))) ??
        []) as Icrc7ListTokenResult;

      const tokenMetadatas = unsafeCast<Icrc7TokenMetadata[]>(
        result.map((r) => ({
          ...r,
          ...btreeMapToObject(r.metadata),
        })),
      );

      return tokenMetadatas;
    },
    throwOnError: true,
    enabled: !!actor,
  });
};
