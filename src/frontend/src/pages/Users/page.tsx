import NftCard from "@charm/components/ui/NftCard";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import MenuSelect from "@charm/components/ui/MenuSelect";
import { MenuSelectOptions } from "../Explore/constants";
import { useNavigate, useNavigation, useParams } from "react-router-dom";
import { getShortenAddress, isValidAddress } from "@charm/utils/crypto";
import { useQueryIcrc7Tokens } from "@charm/hooks/queries/icrc7Tokens";
import { useEffect } from "react";
import toast from "react-hot-toast";

type Params = {
  address: string;
};

export default function UserProfile() {
  const params = useParams<Params>();
  const navigate = useNavigate();

  const { address } = params;

  const { data: tokenMetadatas, isLoading: isLoadingTokenMetadatas } =
    useQueryIcrc7Tokens({
      limit: 20,
      owner: address,
    });

  useEffect(() => {
    if (!address) {
      return;
    }

    if (!isValidAddress(address)) {
      toast.error("Invalid address");
      navigate("/");
    }
  }, [address, navigate]);

  return (
    <>
      <section className="relative mb-8 h-[152px] bg-[url('/images/banner-account.png')] bg-cover bg-center bg-no-repeat">
        <div className="relative mx-auto size-full max-w-[1440px] px-12">
          <div className="absolute -bottom-8 left-12 size-[128px] rounded-full bg-other-bg-0 p-2">
            <img
              height={120}
              width={120}
              src={"/images/character-avatar.png"}
              alt="CharMarket"
              className="rounded-full object-cover"
            />
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-12">
        <div>
          {address && (
            <p className="mb-1 text-h5 font-bold leading-h5">
              {getShortenAddress(address)}
            </p>
          )}
        </div>
        <TabGroup>
          <div className="mb-6 flex">
            <TabList className="flex flex-1 gap-1">
              <Tab className="rounded-xl px-4 py-3 text-base font-medium leading-6 text-opacityColor-70 outline-none data-[selected]:bg-other-bg-2 data-[selected]:text-white">
                Tokens Collected
              </Tab>
              {/* <Tab className="rounded-xl px-4 py-3 text-base font-medium leading-6 text-opacityColor-70 outline-none data-[selected]:bg-other-bg-2 data-[selected]:text-white"> */}
              {/*   Wishlist */}
              {/* </Tab> */}
            </TabList>
            {/* <div className="w-1/3 max-w-80"> */}
            {/*   <MenuSelect options={MenuSelectOptions} /> */}
            {/* </div> */}
          </div>
          <TabPanels className="mb-6">
            <TabPanel>
              <div className="flex flex-col flex-wrap gap-2 sm:flex-row">
                {!isLoadingTokenMetadatas && (
                  <>
                    {tokenMetadatas?.map((tokenMetadata) => (
                      <div
                        key={`token-${tokenMetadata.tokenId}`}
                        className="w-full px-1.5 pb-3 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5"
                      >
                        <NftCard {...tokenMetadata} />
                      </div>
                    ))}
                    {tokenMetadatas?.length === 0 && (
                      <p className="text-center w-full">Nothing found</p>
                    )}
                  </>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </section>
    </>
  );
}
