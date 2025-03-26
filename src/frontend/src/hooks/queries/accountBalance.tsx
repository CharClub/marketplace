import { accountBalance } from "@charm/libs/icp-ledger";
import { AccountIdentifierString } from "@charm/types/account";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";

export const useQueryBalance = ({
  icpAccountIdentifier,
  certified,
}: {
  icpAccountIdentifier?: AccountIdentifierString;
  certified?: boolean;
}) => {
  const { agent, defaultAccountId, isAuthenticated } = useAuth();

  console.log({
    agent,
    isAuthenticated,
  });

  const queryId = icpAccountIdentifier ?? defaultAccountId ?? "";

  return useQuery({
    queryKey: ["accountBalance", queryId],
    queryFn: async () => {
      const result = await accountBalance({
        icpAccountIdentifier: queryId!,
        agent: agent!,
        certified: !!certified,
      });

      console.log({
        queryId,
        result,
      });

      return result;
    },
    enabled: !!agent && !!queryId && !!isAuthenticated,
    refetchOnWindowFocus: true,
  });
};
