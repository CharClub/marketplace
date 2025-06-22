import NftCard from "@charm/components/ui/NftCard";
import ButtonSlider from "@charm/components/ui/Slide";
import { useQueryIcrc7Tokens } from "@charm/hooks/queries/icrc7Tokens";

import { useState } from "react";
import { motion } from "framer-motion";

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
              { id: "Movies & TV", title: "Movies & TV" },
              { id: "LGBTQ+", title: "LGBTQ+" },
              { id: "Mental Health", title: "Mental Health" },
              { id: "Entertainment", title: "Entertainment" },
              { id: "Animal & Object", title: "Animal & Object" },
              { id: "Education", title: "Education" },
              { id: "Music", title: "Music" },
              { id: "Relationship & Love", title: "Relationship & Love" },
              { id: "Game", title: "Game" },
              { id: "Fiction", title: "Fiction" },
              { id: "Anime", title: "Anime" },
              { id: "Newest", title: "Newest" },
              { id: "Literature & Poetry", title: "Literature & Poetry" },
              { id: "Art", title: "Art" },
              { id: "History", title: "History" },
              { id: "Science & Tech", title: "Science & Tech" },
              { id: "Famous People", title: "Famous People" },
            ]}
          />
        </div>
        {/* <div className="w-[232px]"> */}
        {/*   <MenuSelect options={MenuSelectOptions} /> */}
        {/* </div> */}
      </div>

      <motion.div
        className="-mx-3 mb-6 flex flex-col flex-wrap sm:flex-row min-h-[400px]"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {!isLoadingTokenMetadatas && (
          <>
            {tokenMetadatas?.map(
              (tokenMetadata) =>
                tokenMetadata && (
                  <motion.div
                    key={`token-${tokenMetadata.tokenId}`}
                    className="w-full px-1.5 pb-3 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NftCard {...tokenMetadata} />
                  </motion.div>
                ),
            )}
            {tokenMetadatas?.length === 0 && (
              <div className="w-full text-center py-10">
                <div className="text-2xl text-gray-400">
                  No NFTs Found
                </div>
                <div className="mt-2 text-gray-400">
                  Try selecting a different category or check back later.
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </section>
  );
};

export default TokenListSection;
