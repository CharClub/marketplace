import TokenListSection from "./TokenListSection";

const ExplorePage = () => {
  return (
    <>
      <section className="h-full min-h-[267px] bg-[url('/images/banner.svg')] bg-cover bg-center bg-no-repeat lg:h-[267px]">
        <div className="mx-auto flex size-full max-w-[990px] flex-col-reverse items-start justify-center gap-[54px] p-12 md:flex-row md:items-end md:py-0 lg:items-center">
          <div className="flex flex-1 flex-col justify-center md:py-12 lg:py-0">
            <h2 className="mb-2 text-h4 font-bold leading-h4">
              Mua 1 được 2 với CharMarket, ICP NFT market
            </h2>
            <h3 className="mb-4 text-base text-opacityColor-70">
              Mua NFT trên CharMarket bạn đồng thời sở hữu quyền trò chuyện với
              Character đó trên CharClub.AI
            </h3>
            <button
              type="button"
              className="w-fit rounded-xl bg-white px-4 py-3 text-base font-semibold text-primary"
            >
              Tìm hiểu thêm
            </button>
          </div>

          <div className="h-[267px] w-auto">
            <img
              src={"/images/character.webp"}
              alt="CharMarket"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <TokenListSection />
    </>
  );
};

export default ExplorePage;
