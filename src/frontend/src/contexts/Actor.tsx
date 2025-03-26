import { useAuth } from "@charm/hooks/auth";
import type { ActorSubclass } from "@dfinity/agent";
import { Actor } from "@dfinity/agent";
import { createContext, useEffect, useState } from "react";

import { _SERVICE, idlFactory } from "@ic/backend/backend.did.js";

export type ActorContextValue = {
  actor: ActorSubclass<_SERVICE> | null;
};

export const DEFAULT_ACTOR_CONTEXT_VALUE: ActorContextValue = {
  actor: null,
};

export const ActorContext = createContext<ActorContextValue>(
  DEFAULT_ACTOR_CONTEXT_VALUE,
);

export const ActorProvider = ({ children }: { children: React.ReactNode }) => {
  const authContext = useAuth();
  const [actor, setActor] = useState<ActorSubclass<_SERVICE> | null>(null);

  if (!authContext) {
    throw new Error("Auth context is not available");
  }

  const { identity, agent } = authContext;

  useEffect(() => {
    if (!identity || !agent) {
      setActor(null);
      return;
    }

    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: process.env.VITE_CANISTER_ID_BACKEND!,
    }) as ActorSubclass<_SERVICE>;

    setActor(actor);
  }, [agent, identity]);

  return (
    <ActorContext.Provider
      value={{
        actor,
      }}
    >
      {children}
    </ActorContext.Provider>
  );
};
