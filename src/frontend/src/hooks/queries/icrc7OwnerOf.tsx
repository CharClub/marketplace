import { useQuery } from "@tanstack/react-query";
import { useActor } from "../actor";
import { Account, OwnerResult } from "@ic/backend/backend.did";
import { unwrap } from "@charm/utils/idl";

type UseQueryIcrc7OwnerOfProps = {
  tokenId: bigint;
};

export const useQueryIcrc7OwnerOf = ({
  tokenId,
}: UseQueryIcrc7OwnerOfProps) => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["icrc7OwnerOf", tokenId],
    queryFn: async () => {
      const result =
        ((await actor?.icrc7_owner_of(tokenId)) as OwnerResult) || [];

      return unwrap<Account>(result);
    },
    enabled: !!actor,
  });
};
