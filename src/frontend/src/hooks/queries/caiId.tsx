import { useQuery } from "@tanstack/react-query";
import { useActor } from "../actor";
import { CaiId } from "@ic/backend/backend.did";
import { Opt } from "@charm/types/idl";
import { unwrap } from "@charm/utils/idl";

export const useQueryCaiId = () => {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["caiId"],
    queryFn: async () => {
      const result = (await actor?.getCaiId()) as Opt<CaiId>;

      return unwrap<CaiId>(result);
    },
    refetchOnWindowFocus: true,
    enabled: !!actor,
  });
};
