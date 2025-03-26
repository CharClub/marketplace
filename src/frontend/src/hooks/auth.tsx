import { AuthContext } from "@charm/contexts/Auth";
import { useContext } from "react";

export const useAuth = () => useContext(AuthContext);
