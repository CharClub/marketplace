import { useQueryTokenPricing } from "@charm/hooks/queries/tokenPricing";
import TagIcon from "@charm/static/icons/tag.svg?react";
import { e8sToIcp } from "@charm/utils/icp";
import { Link } from "react-router-dom";

interface NftCardProps {
  tokenId: bigint;
  tokenImage: string;
  characterId: string;
  tokenName: string;
  tokenDescription: string;
}

const NftCard = ({
  tokenId,
  tokenImage,
  tokenName,
  tokenDescription,
}: NftCardProps) => {
  const { data: tokenPricing } = useQueryTokenPricing({
    tokenId: BigInt(tokenId),
  });

  return (
    <Link
      className="relative flex min-h-[116px] w-full cursor-pointer flex-col rounded-2xl bg-other-bg-1"
      to={`/characters/${tokenId}`}
    >
      {!!tokenPricing && (
        <div className="absolute left-2 top-2 flex items-center justify-center gap-1 rounded-full bg-other-bgTag fill-white px-2 py-1.5 text-sm font-medium leading-5">
          <TagIcon />
          {e8sToIcp(tokenPricing.price?.e8s).toString() || "-"} ICP
        </div>
      )}
      <div>
        <img
          src={tokenImage}
          alt={`Image of ${tokenName}`}
          className="aspect-square size-full rounded-xl object-cover"
          width={256}
          height={256}
        />
      </div>
      <div className="flex flex-col justify-between gap-2 p-4">
        <h4 className="line-clamp-1 text-sm font-semibold leading-5">
          {tokenName}
        </h4>
        <h5 className="line-clamp-2 text-left text-xs font-normal leading-4 text-other-bodyText">
          {tokenDescription}
        </h5>
      </div>
    </Link>
  );
};

export default NftCard;
