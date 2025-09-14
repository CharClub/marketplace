import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useQueryIcrc7Tokens } from "../../hooks/queries/icrc7Tokens";
import NftCard from "../../components/ui/NftCard";
import ButtonSlider from "../../components/ui/Slide";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const {
    data: tokenMetadatas,
    isLoading: isLoadingTokenMetadatas,
    error: tokenMetadatasError,
  } = useQueryIcrc7Tokens({
    limit: 40,
    search: searchQuery,
  });

  useEffect(() => {
    if (tokenMetadatasError) {
      toast.error("Failed to load token metadata. Please try again later.");
    }
  }, [tokenMetadatasError]);

  return (
    <section className="mx-auto max-w-[1440px] p-12">
      <h2 className="mb-8 w-full text-center text-2xl font-bold text-white">
        {searchQuery ? `Search results for \"${searchQuery}\"` : "Search Results"}
      </h2>
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
                <div className="text-2xl text-gray-400">No NFTs Found</div>
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

export default SearchPage;
