import { ActorContext } from "@charm/contexts/Actor";
import { useContext } from "react";

export const useActor = () => {
  const actor = useContext(ActorContext);

  return actor;
};
