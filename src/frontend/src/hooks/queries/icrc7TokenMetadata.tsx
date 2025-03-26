import type { BTreeMap, Opt, Vec } from "@charm/types/idl";
import type { Icrc7TokenMetadata } from "@charm/types/token";
import { btreeMapToObject } from "@charm/utils/idl";
import { useQuery } from "@tanstack/react-query";

import { useActor } from "../actor";

type UseQueryIcrc7TokenMetadataProps = {
  tokenIds: bigint[];
};

export type Icrc7TokenMetadataResult = {
  characterId: string;
  tokenDescription: string;
  tokenName: string;
  tokenImage: string;
  tokenId: bigint;
  tags?: string[];
};

export const useQueryIcrc7TokenMetadata = ({
  tokenIds,
}: UseQueryIcrc7TokenMetadataProps) => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["icrc7TokenMetadata", tokenIds],
    queryFn: async () => {
      const result =
        ((await actor?.icrc7_token_metadata(tokenIds)) as Vec<BTreeMap>) ||
        [];

      return result.map((metadata) => {
        if (metadata) {
          const result = btreeMapToObject(
            metadata,
          ) as Icrc7TokenMetadataResult;

          return {
            characterId: result.characterId,
            tokenId: result.tokenId,
            tokenName: result.tokenName,
            tokenImage: result.tokenImage,
            tokenDescription: result.tokenDescription,
            tags: result.tags ?? [],
          } satisfies Icrc7TokenMetadata;
        }

        return null;
      });
    },
    throwOnError: true,
    enabled: !!actor && tokenIds.length > 0,
  });
};
