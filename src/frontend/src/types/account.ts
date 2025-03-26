import { Principal } from "@dfinity/principal";

export type Account = {
  owner: Principal;
  subaccount: Uint8Array;
};

export type SubAccountArray = Array<number>;

export type AccountIdentifierString = string;
