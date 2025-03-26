import { useQuery } from "@tanstack/react-query";
import { useActor } from "../actor";
import { GetTokenPricingResult, Listing } from "@ic/backend/backend.did";
import { unwrap } from "@charm/utils/idl";

type UseTokenPricingProps = {
  tokenId: bigint;
};

export const useQueryTokenPricing = ({ tokenId }: UseTokenPricingProps) => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["tokenPricing", tokenId],
    queryFn: async () => {
      console.log('fetch price')
      const result =
        ((await actor?.getTokenPricing(tokenId)) as GetTokenPricingResult) ||
        [];

      console.log("result", result);

      try {
        const listing = unwrap<Listing>(result);

        return listing;
      } catch (e) {
        if (typeof e === "object" && e !== null) {
          if ("NotListed" in e) {
            return null;
          }
        }
        console.log(e);
      }
    },
    throwOnError: false,
    enabled: !!actor,
  });
};
