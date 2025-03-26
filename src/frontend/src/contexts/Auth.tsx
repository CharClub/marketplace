import { principalToDefaultAccountIdentifier } from "@charm/utils/crypto";
import type { HttpAgent, Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createAgent } from "@dfinity/utils";
import { createContext, useCallback, useEffect, useState } from "react";

type AuthContextValue = {
  authClient: AuthClient | undefined;
  identity: Identity | undefined;
  principalId: string | undefined;
  defaultAccountId: string | undefined;
  agent: HttpAgent | undefined;
  isAuthenticated: boolean | undefined;
  hasLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

const DEFAULT_AUTH_CONTEXT_VALUE = {
  authClient: undefined,
  identity: undefined,
  agent: undefined,
  isAuthenticated: false,
  hasLoggedIn: false,
  principalId: undefined,
  defaultAccountId: undefined,
  login: () => {},
  logout: () => {},
};

const isDev = process.env.VITE_DFX_NETWORK !== "ic";

const AGENT_HOST = isDev ? "http://localhost:4943" : "https://icp0.io";

export const AuthContext = createContext<AuthContextValue>(
  DEFAULT_AUTH_CONTEXT_VALUE,
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authClient, setAuthClient] = useState<AuthClient | undefined>();
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [agent, setAgent] = useState<HttpAgent | undefined>(undefined);
  const [principalId, setPrincipalId] = useState<string | undefined>(undefined);
  const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>(
    undefined,
  );

  console.log('principalId', principalId);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(
    undefined,
  );
  const [hasLoggedIn, setHasLoggedIn] = useState<boolean>(false);

  const updateClient = async (client: AuthClient) => {
    const isAuthenticated = await client.isAuthenticated();
    console.log("update  client", isAuthenticated);
    setIsAuthenticated(isAuthenticated);

    const identity = client.getIdentity();

    if (isAuthenticated) {
      const principalId = identity.getPrincipal().toText();
      setPrincipalId(principalId);

      const defaultAccountId = principalToDefaultAccountIdentifier(principalId);
      setDefaultAccountId(defaultAccountId);
    }

    const agent = await createAgent({
      identity,
      host: AGENT_HOST,
    });

    if (isDev) await agent.fetchRootKey();

    setAgent(agent);
    setIdentity(identity);
    setAuthClient(client);
    setIsAuthenticated(isAuthenticated);
  };
  useEffect(() => {
    AuthClient.create({
      idleOptions: {
        disableDefaultIdleCallback: true,
        disableIdle: true,
      },
    }).then(updateClient);
  }, []);

  const login = useCallback(() => {
    if (!authClient) return;
    authClient.login({
      maxTimeToLive: BigInt(24 * 60 * 60 * 1000 * 1000 * 1000), // 1 days
      identityProvider: process.env.VITE_II_URL,
      onSuccess: async () => {
        updateClient(authClient);
      },
    });
  }, [authClient]);

  const logout = useCallback(async () => {
    console.log({ authClient });
    if (!authClient) return;
    await authClient.logout();
    // updateClient(authClient);
    setIsAuthenticated(false);
    setIdentity(undefined);
    setPrincipalId(undefined);
    setDefaultAccountId(undefined);
    window.indexedDB.deleteDatabase('auth-client-db');
    window.location.href = '/';

  }, [authClient]);

  return (
    <AuthContext.Provider
      value={{
        authClient,
        identity,
        agent,
        isAuthenticated,
        hasLoggedIn,
        principalId,
        defaultAccountId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
