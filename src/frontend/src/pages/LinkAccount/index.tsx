import { useActor } from "@charm/hooks/actor";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

export const LinkAccountPage = () => {
  // TODO: connect with the backend to verify
  const { actor } = useActor();
  const [search] = useSearchParams();

  useEffect(() => {
    const code = search.get("code");
    if (!code) return;
    if (!actor) return;

    actor
      ?.linkCaiAccount(code)
      .then(() => {
        toast.success("Successfully linked CAI account. Closing window...", {
          id: "link-cai-account-success",
        });
        setTimeout(() => {
          window.close();
        }, 1000);
      })
      .catch((e) => {
        console.log({ e });
        toast.error("Failed to link CAI account", {
          id: "link-cai-account-error",
        });
      });
  }, [actor, search]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg text-gray-700">Verifying account connection...</p>
    </div>
  );
};
