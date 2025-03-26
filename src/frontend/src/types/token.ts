import { Account } from "./account";

export type Icrc7TokenMetadata = {
  tokenId: bigint;
  tokenName: string;
  tokenImage: string;
  tokenDescription: string;
  characterId: string;
  tags?: string[];
  owner?: Account;
};
