import { useNavigate } from "react-router-dom";
import { getShortenAddress } from "@charm/utils/crypto";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Copy } from "@charm/components/icons/Copy";
import { useAuth } from "@charm/hooks/auth";
import { useQueryCaiId } from "@charm/hooks/queries/caiId";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { data: connectedCaiId } = useQueryCaiId();

  const { principalId } = useAuth();

  const handleCopyPrincipal = () => {
    if (!principalId) return;
    navigator.clipboard.writeText(principalId);
    toast.success("Principal ID copied to clipboard!");
  };

  const handleConnectCharclubAI = () => {
    toast.success("Redirecting to CharclubAI connection...");
    const search = new URLSearchParams();
    search.set("redirect", `${window.location.origin}/connect/callback`);
    search.set("client", "charm");
    // search.set("state", "csrf") // TODO:

    window
      .open(
        `${import.meta.env.VITE_CHARCLUB_AI_URL}/connect?${search.toString()}`,
        "_blank",
      )
      ?.focus();
  };

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-12 py-14">
      <h1 className="text-4xl font-bold">Settings</h1>

      <div className="bg-other-bg-2 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="flex items-center justify-between bg-other-bg-0 p-4 rounded-lg">
            {principalId && (
              <div>
                <p className="text-sm text-opacityColor-70">Principal ID</p>
                <p className="font-mono">{getShortenAddress(principalId)}</p>
              </div>
            )}
            <button
              onClick={handleCopyPrincipal}
              className="flex items-center gap-2 hover:bg-opacity-20 p-2 rounded"
            >
              <Copy className="w-5 h-5" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-opacity-10">
          <h2 className="text-xl font-semibold mb-4">Connections</h2>
          <div className="flex items-center justify-between bg-other-bg-0 p-4 rounded-lg">
            <div>
              <p className="font-medium mb-1">CharClub AI</p>
              <p className="text-sm text-opacityColor-70">
                {connectedCaiId
                  ? `Connected to CharClub AI (ID: ${connectedCaiId})`
                  : "Connect your account to access CharClub AI features"}
              </p>
            </div>
            {!connectedCaiId && (
              <button
                onClick={handleConnectCharclubAI}
                className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
