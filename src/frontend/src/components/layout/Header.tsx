import { useAuth } from "@charm/hooks/auth";
import CharMarketLogo from "@charm/static/icons/logo.svg?react";
import LogoutIcon from "@charm/static/icons/logout.svg?react";
import MagnifyingGlassIcon from "@charm/static/icons/magnifying-glass.svg?react";
import ProfileIcon from "@charm/static/icons/profile.svg?react";
import WalletIcon from "@charm/static/icons/wallet.svg?react";
import { getShortenAddress } from "@charm/utils/crypto";
import { CloseButton, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar";
import { Button } from "../ui/Button";
import { useQueryBalance } from "@charm/hooks/queries/accountBalance";
import { e8sToIcp } from "@charm/utils/icp";
import { Copy } from "../icons/Copy";
import toast from "react-hot-toast";
import { SettingSolid } from "../icons/Settings";

const Header = () => {
  const { login, isAuthenticated, defaultAccountId } = useAuth();

  const handleLogin = () => {
    login();
  };
  return (
    <header
      id="header"
      className="fixed right-0 top-0 z-30 flex h-20 w-full justify-center border-b border-other-divider bg-other-bg-0 duration-300 ease-in-out"
    >
      <div className="flex w-full justify-center">
        <div className="flex w-full items-center justify-between gap-8 px-4 sm:px-8 lg:px-12 2xl:max-w-[1440px]">
          <div className="flex items-center gap-12">
            <Link to="/">
              <CharMarketLogo />
              <h1 className="sr-only">CharMarket</h1>
            </Link>
            <div className="hidden h-12 w-[350px] justify gap-3 rounded-xl border border-opacityColor-10 stroke-opacityColor-70 p-3 px-4 py-2.5 outline-none sm:flex sm:flex-1">
              <div className="flex gap-3 items-center fill-transparent stroke-opacityColor-70">
                <MagnifyingGlassIcon aria-hidden="true" />
                <label htmlFor="Search" className="sr-only">Search</label>
                <input
                  type="text"
                  id="Search"
                  placeholder="Search"
                  className="w-full bg-transparent text-base font-normal leading-6 text-white outline-none placeholder:text-opacityColor-70"
                  aria-label="Search"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const target = e.target as HTMLInputElement;
                      const query = target.value.trim();
                      if (query.length > 0) {
                        window.location.href = `/search?q=${encodeURIComponent(query)}`;
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {isAuthenticated !== undefined && (
            <>
              {defaultAccountId ? (
                <Popover>
                  <PopoverButton as="div">
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2 px-4 font-semibold"
                      onClick={() => {
                        // TODO:
                      }}
                    >
                      <Avatar
                        src="/images/default-avatar.png"
                        alt="user avatar"
                        size={32}
                      />
                      {getShortenAddress(defaultAccountId)}
                    </Button>
                  </PopoverButton>
                  <PopoverPanel
                    transition
                    anchor={{ to: "bottom", gap: 8 }}
                    className="top-2 z-50 w-[var(--button-width)] rounded-2xl transition duration-200 ease-in-out data-[closed]:-translate-y-1 data-[closed]:opacity-0"
                  >
                    <ProfilePanel />
                  </PopoverPanel>
                </Popover>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="gap-2 px-4 font-semibold"
                  onClick={handleLogin}
                >
                  <WalletIcon /> Connect your wallet
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const ProfilePanel = () => {
  const { logout, defaultAccountId, principalId } = useAuth();

  const { data: balance, isLoading: isLoadingBalance } = useQueryBalance({});

  const handleLogout = () => {
    logout();
  };

  const handleCopy = (content: string) => {
    if (!content) return;

    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const renderAccountInfo = (label: string, value: string) => (
    <div className="flex w-full items-center gap-4 px-4 py-3">
      <div className="font-medium text-sm text-white flex items-center justify-between w-full">
        <div>
          <p className="text-gray-500">{label}</p>
          {getShortenAddress(value)}
        </div>
        <button onClick={() => handleCopy(value)}>
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-background-1 p-2">
      <div className="divide-y divide-divider overflow-hidden rounded-lg bg-secondary">
        {!!defaultAccountId && renderAccountInfo("Account ID", defaultAccountId)}
        {!!principalId && renderAccountInfo("Principal ID", principalId)}
        <div className="flex w-full items-center gap-4 px-4 py-3">
          <div>
            <p className="text-gray-500">Balance</p>
            <p className="font-medium text-white text-sm">
              {isLoadingBalance ? "-" : e8sToIcp(balance ?? 0).toFixed(3)} ICP
            </p>
          </div>
        </div>

        <CloseButton as={Link}
          className="flex w-full gap-4 px-4 py-3 transition hover:bg-white/5"
          to={`/users/${defaultAccountId}`}
        >
          <ProfileIcon />
          <p className="font-medium text-white">Profile</p>
        </CloseButton>

        <CloseButton
          as={Link}
          className="flex w-full gap-4 px-4 py-3 transition hover:bg-white/5"
          to={`/settings`}
        >
          <SettingSolid fillOpacity={0.7} />
          <p className="font-medium text-white">Setting</p>
        </CloseButton>

        <CloseButton
          as='button'
          className="flex w-full gap-4 px-4 py-3 transition hover:bg-white/5"
          onClick={handleLogout}
        >
          <LogoutIcon />
          <p className="font-medium text-white">Logout</p>
        </CloseButton>
      </div>
    </div>
  );
};

export default Header;
