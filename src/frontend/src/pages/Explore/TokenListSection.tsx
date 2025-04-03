import NftCard from "@charm/components/ui/NftCard";
import ButtonSlider from "@charm/components/ui/Slide";
import { useQueryIcrc7Tokens } from "@charm/hooks/queries/icrc7Tokens";

import { useState } from "react";

const TokenListSection = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { data: tokenMetadatas, isLoading: isLoadingTokenMetadatas } =
    useQueryIcrc7Tokens({
      limit: 40,
      tag: selectedTag ?? undefined,
    });
  // TODO: add pagination support

  return (
    <section className="mx-auto max-w-[1440px] p-12">
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:gap-12">
        <div className="w-full">
          <ButtonSlider
            onItemSelected={(id: string) =>
              id === "all" ? setSelectedTag(null) : setSelectedTag(id)
            }
            items={[
              {
                id: "all",
                title: "All",
              },
              { id: "animal-object", title: "Animal & Object" },
              { id: "anime", title: "Anime" },
              { id: "art", title: "Art" },
              { id: "education", title: "Education" },
              { id: "entertainment", title: "Entertainment" },
              { id: "famous-people", title: "Famous People" },
              { id: "featured", title: "Featured" },
              { id: "fiction", title: "Fiction" },
            ]}
          />
        </div>
        {/* <div className="w-[232px]"> */}
        {/*   <MenuSelect options={MenuSelectOptions} /> */}
        {/* </div> */}
      </div>

      <div className="-mx-3 mb-6 flex flex-col flex-wrap sm:flex-row">
        {!isLoadingTokenMetadatas && (
          <>
            {tokenMetadatas?.map(
              (tokenMetadata) =>
                tokenMetadata && (
                  <div
                    key={`token-${tokenMetadata.tokenId}`}
                    className="w-full px-1.5 pb-3 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5"
                  >
                    <NftCard {...tokenMetadata} />
                  </div>
                ),
            )}
            {tokenMetadatas?.length === 0 && (
              <div className="w-full text-center">No results</div>
            )}
          </>
        )}
      </div>

      {/* <button */}
      {/*   type="button" */}
      {/*   className="mx-auto flex items-center justify-center rounded-xl bg-other-bgSection px-4 py-2.5 text-sm font-semibold leading-5" */}
      {/* > */}
      {/*   Load more NFT Character */}
      {/* </button> */}
    </section>
  );
};

export default TokenListSection;
