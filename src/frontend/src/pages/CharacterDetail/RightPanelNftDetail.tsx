import { useQueryGetTransactions } from "@charm/hooks/queries/getTransaction";
import { useQueryIcrc7TokenMetadata } from "@charm/hooks/queries/icrc7TokenMetadata";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { getTxFrom, getTxTo } from "@charm/utils/transaction";
import { accountToIdentifier, getShortenAddress } from "@charm/utils/crypto";
import { ArrowRight } from "@charm/components/icons/ArrowRight";
import { useQueryIcrc7OwnerOf } from "@charm/hooks/queries/icrc7OwnerOf";
import { motion } from "framer-motion";
import { getCharacterUrl, titleCase } from "@charm/utils";

export type RightPanelNftDetailProps = {
  tokenId: string | number;
};

const txKindActionText = {
  mint: "Mint",
  icrc7_transfer: "Transfer",
  icrc7_approve: "Approve",
};

const RightPanelNftDetail = ({ tokenId }: RightPanelNftDetailProps) => {
  const { data: tokenMetadatas, isLoading: isLoadingTokenMetadata } =
    useQueryIcrc7TokenMetadata({
      tokenIds: [BigInt(tokenId)],
    });
  const { data: transactions } = useQueryGetTransactions({
    limit: 20,
    offset: 0,
    token: BigInt(tokenId),
  });

  const tokenMetadata = tokenMetadatas?.[0];

  return (
    <motion.div
      className="flex flex-col gap-2"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <section className="flex flex-col gap-6 rounded-3xl bg-other-bgSection p-6">
        <div className="flex flex-col gap-2">
          <h2 className="leading-h5 text-h5 font-bold">
            {tokenMetadata?.tokenName}
          </h2>
          <div className="flex gap-1">
            {tokenMetadata?.tags?.map((tag) => (
              <div
                className="rounded-lg bg-other-bg-1 px-3 py-1.5 text-sm font-medium leading-5"
              >
                {titleCase(tag)}
              </div>
            ))}
          </div>
        </div>
        {tokenMetadata?.tokenDescription && (
          <div className="flex flex-col gap-2">
            <h3 className="leading-6 text-base font-semibold">Description</h3>
            <p className="text-base font-normal leading-6 text-other-bodyText">
              {tokenMetadata?.tokenDescription}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="leading-6 text-base font-semibold">
            CharClub AI Character
          </h3>
          <p className="text-base font-normal leading-6 text-other-bodyText">
            <a
              target="_blank"
              href={getCharacterUrl(tokenMetadata?.characterId)}
              className="text-blue-700 flex gap-2 items-center"
            >
              {tokenMetadata?.characterId}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </p>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-3xl bg-other-bgSection p-6">
        <h3 className="leading-6 text-base font-semibold">Transactions</h3>
        {
          // TODO: paginate
        }
        {transactions?.transactions?.map((tx) => {
          const from = accountToIdentifier(getTxFrom(tx), { fallback: "NULL" });
          const fromTruncated = getShortenAddress(from);
          const to = accountToIdentifier(getTxTo(tx), { fallback: "NULL" });
          const toTruncated = getShortenAddress(to);

          return (
            <motion.div
              className="flex items-center gap-4"
              key={tx.timestamp}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <img
                  src="/images/default-avatar.png"
                  alt="Image of Character"
                  className="aspect-square rounded-full object-cover"
                  width={32}
                  height={32}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-800 px-3 py-1 text-sm font-medium text-blue-100 uppercase">
                  {txKindActionText[tx.kind] ?? ""}
                </span>
                <p className="truncate text-base font-medium leading-6">
                  <Link to={`/users/${from}`}>{fromTruncated}</Link>
                </p>
                <ArrowRight className="size-6 text-other-bodyText" />
                <p className="truncate text-base font-medium leading-6">
                  <Link to={`/users/${to}`}>{toTruncated}</Link>
                </p>
                <p className="truncate text-sm font-normal leading-5 text-other-bodyText">
                  {format(
                    new Date(Number(tx.timestamp / 1000000n)),
                    "MMM dd, yyyy - hh:mm a OOOO",
                  )}
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>
    </motion.div>
  );
};
export default RightPanelNftDetail;
