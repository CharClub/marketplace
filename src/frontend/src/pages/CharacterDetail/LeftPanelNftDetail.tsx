import { ArrowRight } from "@charm/components/icons/ArrowRight";
import { ArrowRightLeft } from "@charm/components/icons/ArrowRightLeft";
import { CurrencyDollar } from "@charm/components/icons/CurrencyDollar";
import { Stop } from "@charm/components/icons/Stop";
import { useActor } from "@charm/hooks/actor";
import { useAuth } from "@charm/hooks/auth";
import { useQueryIcrc7OwnerOf } from "@charm/hooks/queries/icrc7OwnerOf";
import { useQueryIcrc7TokenMetadata } from "@charm/hooks/queries/icrc7TokenMetadata";
import { useQueryTokenPricing } from "@charm/hooks/queries/tokenPricing";
import { sendICP, transactionFee } from "@charm/libs/icp-ledger";
import FlashIcon from "@charm/static/icons/flash.svg?react";
import HeartIcon from "@charm/static/icons/heart.svg?react";
import { accountToIdentifier } from "@charm/utils/crypto";
import { e8sToIcp, icpToE8s } from "@charm/utils/icp";
import { opt, unwrap } from "@charm/utils/idl";
import { InsufficientFundsError } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { nowInBigIntNanoSeconds } from "@dfinity/utils";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  CreateBuyOrderResult,
  CreateListingArgs,
  PaymentInstruction,
  TransferArgs,
} from "@ic/backend/backend.did";
import { useQueryClient } from "@tanstack/react-query";
import Big from "big.js";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export type RightPanelNftDetailProps = {
  tokenId: string | number;
};

const WISHLIST_ENABLED = false;

const LeftPanelNftDetail = ({ tokenId }: RightPanelNftDetailProps) => {
  const queryClient = useQueryClient();
  const { defaultAccountId, isAuthenticated, login, agent } = useAuth();
  const { actor } = useActor();
  const { data: tokenMetadatas } = useQueryIcrc7TokenMetadata({
    tokenIds: [BigInt(tokenId)],
  });
  const [fee, setFee] = useState<string | null>(null);
  const [transferPrincipal, setTransferPrincipal] = useState<string>("");
  const [isOpenConfirmBuyDialog, setIsOpenConfirmBuyDialog] = useState(false);
  const [isOpenCreateListingDialog, setIsopenCreateListingDialog] =
    useState(false);
  const [isOpenRemoveListingDialog, setIsopenRemoveListingDialog] =
    useState(false);
  const [isOpenTransferDialog, setIsOpenTransferDialog] = useState(false);
  const [listingPrice, setListingPrice] = useState("");
  const [transferMemo, setTransferMemo] = useState("");

  const { data: owner } = useQueryIcrc7OwnerOf({
    tokenId: BigInt(tokenId),
  });

  const { data: tokenPricing } = useQueryTokenPricing({
    tokenId: BigInt(tokenId),
  });

  useEffect(() => {
    if (!agent) return;
    transactionFee({ agent }).then((fee) => setFee(e8sToIcp(fee).toString()));
  }, [agent]);

  const tokenMetadata = tokenMetadatas?.[0];
  const isTokenOwner =
    accountToIdentifier(owner, { truncate: false }) === defaultAccountId;

  const handleListingPriceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    const regex = /^[0-9]+(\.[0-9]{0,4})?$/;
    if (regex.test(value)) {
      setListingPrice(value);
    }
  };

  const handleTransferPrincipalChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setTransferPrincipal(event.target.value);
  }

  const handleTransferMemoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    const regex = /^[0-9]*$/;
    if (regex.test(value)) {
      setTransferMemo(value);
    }
  }

  const handleBuy = async (confirmed: boolean) => {
    if (!isAuthenticated) return login();
    if (!confirmed) return setIsOpenConfirmBuyDialog(true);
    setIsOpenConfirmBuyDialog(false);
    if (!actor || !agent) {
      toast.error("Please connect wallet to continues");
      return;
    }

    const process = async () => {
      const buyOrderResult = (await actor.createBuyOrder({
        token: BigInt(tokenId),
        createdAtTime: nowInBigIntNanoSeconds(),
      })) as CreateBuyOrderResult;

      const buyOrder = unwrap<PaymentInstruction>(buyOrderResult);
      console.log({ buyOrder });

      if (!buyOrder) {
        toast.error("Failed to create buy order");
        return;
      }

      const blockIndex = await sendICP({
        agent,
        to: buyOrder.to,
        amount: buyOrder.amount.e8s,
        fee: BigInt(
          Big(fee ?? 0)
            .times(100000000)
            .toString(),
        ),
        memo: buyOrder.memo,
        createdAt: nowInBigIntNanoSeconds(),
      });

      const verifyResult = await actor.verifyBuyTokenTx(
        BigInt(tokenId),
        buyOrder.listingId,
        blockIndex,
      );

      unwrap(verifyResult);
    };

    await toast.promise(process(), {
      loading: "Creating buy order",
      success: "Successfully buy the NFT",
      error(e) {
        if (typeof e === "object" && e !== null) {
          if ("BuyOrderAlreadyExists" in e) {
            return "There is already a buy order for this NFT";
          }
        }

        if (e instanceof InsufficientFundsError) {
          return "Insufficient funds";
        }

        console.error(e);
        return "Failed to create buy order";
      },
    });

    queryClient.invalidateQueries({
      queryKey: ["tokenPricing"],
    });
    queryClient.invalidateQueries({
      queryKey: ["getTransactions"],
    });
    queryClient.refetchQueries({
      queryKey: ["icrc7OwnerOf"],
    });
  };

  const handleTransfer = async (confirmed?: boolean) => {
    if (!confirmed) {
      setIsOpenTransferDialog(true);
      return;
    }

    setIsOpenTransferDialog(false);

    if (!actor || !agent) {
      toast.error("Please connect wallet to continues");
      return;
    }

    const result = await toast.promise(
      actor.icrc7_transfer({
        to: {
          owner: Principal.fromText(transferPrincipal),
          subaccount: [],
        },
        created_at_time: opt(nowInBigIntNanoSeconds()),
        from: [],
        spender_subaccount: [],
        is_atomic: [],
        memo: opt(BigInt(transferMemo)),
        token_ids: [BigInt(tokenId)],
      } satisfies TransferArgs),
      {
        loading: "Transfering token",
        success: "Successfully transfer token",
        error: "Failed to transfer token",
      },
    );

    console.log("transferNFT", { result });

    queryClient.refetchQueries({
      queryKey: ["tokenPricing"],
    });
    queryClient.refetchQueries({
      queryKey: ["getTransactions"],
    });
    queryClient.refetchQueries({
      queryKey: ["icrc7OwnerOf"],
    });
  };

  const handleCreateListing = async (confirmed?: boolean) => {
    if (!confirmed) {
      setIsopenCreateListingDialog(true);
      return;
    }

    setIsopenCreateListingDialog(false);

    if (!actor || !agent) {
      toast.error("Please connect wallet to continues");
      return;
    }

    const result = await toast.promise(
      actor.createListing({
        token: BigInt(tokenId),
        price: {
          e8s: BigInt(icpToE8s(listingPrice).toString()),
        },
      } satisfies CreateListingArgs),
      {
        loading: "Creating listing",
        success: "Successfully create listing",
        error: "Failed to create listing",
      },
    );

    console.log("createListing", { result });

    queryClient.refetchQueries({
      queryKey: ["tokenPricing"],
    });
    queryClient.refetchQueries({
      queryKey: ["getTransactions"],
    });
    queryClient.refetchQueries({
      queryKey: ["icrc7OwnerOf"],
    });
  };

  const handleRemoveListing = async (confirmed?: boolean) => {
    if (!confirmed) {
      return setIsopenRemoveListingDialog(true);
    }

    setIsopenRemoveListingDialog(false);
    if (!actor || !agent) {
      toast.error("Please connect wallet to continues");
      return;
    }

    const result = await toast.promise(actor.removeListing(BigInt(tokenId)), {
      loading: "Removing listing",
      success: "Successfully remove listing",
      error: "Failed to remove listing",
    });

    queryClient.refetchQueries({
      queryKey: ["tokenPricing"],
    });
    queryClient.refetchQueries({
      queryKey: ["getTransactions"],
    });
    queryClient.refetchQueries({
      queryKey: ["icrc7OwnerOf"],
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="relative aspect-square size-full">
          <AnimatePresence>
            {tokenMetadata && (
              <motion.div
                key={tokenMetadata.tokenImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="aspect-square size-full rounded-3xl overflow-hidden absolute inset-0"
              >
                <img
                  src={tokenMetadata.tokenImage}
                  alt={`Image of ${tokenMetadata.tokenName}`}
                  className="object-cover w-full h-full"
                  width={256}
                  height={256}
                />
              </motion.div>
            )}
            {!tokenMetadata && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="aspect-square size-full rounded-3xl overflow-hidden"
              >
                <img
                  src="/images/default-avatar.png"
                  alt="Placeholder"
                  className="object-cover w-full h-full"
                  width={256}
                  height={256}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {WISHLIST_ENABLED && (
            <button
              type="button"
              className="absolute left-4 top-4 flex items-center justify-center gap-1 rounded-full bg-other-bgTag fill-white p-2 text-base font-medium leading-6"
            >
              <HeartIcon /> Add to Wish list
            </button>
          )}
        </div>
        <div className="flex gap-4 rounded-3xl bg-other-bgSection p-6">
          <div className="relative size-12 rounded-full border-2 border-primary p-0.5">
            <img
              src={"/images/default-avatar.png"}
              alt="Image of Character"
              className="aspect-square size-full rounded-full object-cover"
              width={48}
              height={48}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="truncate text-base font-medium leading-6">
              {accountToIdentifier(owner, { fallback: "-", truncate: true })}
            </p>
            <p className="truncate text-sm font-normal leading-5 text-other-bodyText">
              NFT's owner
            </p>
          </div>
        </div>
        {!!tokenPricing && (
          <>
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-other-bgSection p-6">
              <div className="flex flex-col gap-2">
                <p className="truncate text-base font-normal leading-6 text-other-bodyText">
                  Listing price
                </p>
                <p className="text-h5 font-bold leading-h5 text-lg">
                  {e8sToIcp(tokenPricing.price?.e8s).toString() || "-"} ICP
                </p>
              </div>

              {!!tokenPricing?.price?.e8s &&
                tokenPricing.price.e8s > 0 &&
                (isTokenOwner ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveListing()}
                    className="flex flex-col gap-2 rounded-xl bg-red-500 fill-white p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Stop />
                      <div className="flex-shrink-0 font-medium">
                        Remove listing
                      </div>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuy(false)}
                    className="flex flex-col gap-2 rounded-xl bg-primary fill-white p-4"
                  >
                    <div className="flex items-center gap-2">
                      <FlashIcon />
                      <div className="flex-shrink-0 font-medium">
                        {isAuthenticated ? "Buy Now" : "Connect to buy"}
                      </div>
                    </div>

                    <span className="text-xs font-medium">
                      (Fee: {fee ?? "-"} ICP)
                    </span>
                  </button>
                ))}
            </div>
          </>
        )}

        {isTokenOwner && !tokenPricing && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-other-bgSection p-6">
            <button
              type="button"
              onClick={() => handleCreateListing()}
              className="flex flex-col gap-2 rounded-xl bg-primary fill-white p-4 w-full"
            >
              <div className="flex items-center gap-2">
                <CurrencyDollar />
                <div className="flex-shrink-0 font-medium">Create Listing</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTransfer()}
              className="flex flex-col gap-2 rounded-xl bg-gray-800 fill-white p-4 w-full"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft />
                <div className="flex-shrink-0 font-medium">Transfer</div>
              </div>
            </button>
          </div>
        )}
      </div>
      
      {/* TODO: Move these dialog to new file */}
      <Dialog
        open={isOpenConfirmBuyDialog}
        onClose={() => setIsOpenConfirmBuyDialog(false)}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
          <DialogPanel className="max-w-lg space-y-4 border border-gray-700 bg-gray-900 p-8 text-white shadow-xl rounded-xl">
            <DialogTitle className="font-bold text-xl text-white">
              Confirm Purchase
            </DialogTitle>
            <Description className="text-gray-300">
              Are you sure you want to proceed with this purchase?
            </Description>
            <p className="text-sm text-gray-400">
              This action cannot be undone. Once confirmed, the amount will be
              deducted from your balance.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
                onClick={() => setIsOpenConfirmBuyDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => handleBuy(true)}
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isOpenCreateListingDialog}
        onClose={() => setIsopenCreateListingDialog(false)}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
          <DialogPanel className="max-w-lg space-y-4 border border-gray-700 bg-gray-900 p-8 text-white shadow-xl rounded-xl">
            <DialogTitle className="font-bold text-xl text-white">
              Create new listing
            </DialogTitle>
            <Description className="text-gray-300">
              Please input the price you want to list the NFT for.
            </Description>

            <input
              type="text"
              id="priceInput"
              placeholder="Listing price (in ICP)"
              className="w-full bg-background-1 text-base font-normal leading-6 text-white placeholder:text-opacityColor-70 px-4 py-2 rounded-md"
              value={listingPrice}
              onChange={handleListingPriceChange}
            />
            <div className="flex justify-end gap-4">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
                onClick={() => setIsopenCreateListingDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => handleCreateListing(true)}
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isOpenConfirmBuyDialog}
        onClose={() => setIsOpenConfirmBuyDialog(false)}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
          <DialogPanel className="max-w-lg space-y-4 border border-gray-700 bg-gray-900 p-8 text-white shadow-xl rounded-xl">
            <DialogTitle className="font-bold text-xl text-white">
              Confirm Purchase
            </DialogTitle>
            <Description className="text-gray-300">
              Are you sure you want to proceed with this purchase?
            </Description>
            <p className="text-sm text-gray-400">
              This action cannot be undone. Once confirmed, the amount will be
              deducted from your balance.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
                onClick={() => setIsOpenConfirmBuyDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => handleBuy(true)}
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isOpenTransferDialog}
        onClose={() => setIsOpenTransferDialog(false)}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
          <DialogPanel className="w-[470px] space-y-4 border border-gray-700 bg-gray-900 p-8 text-white shadow-xl rounded-xl">
            <DialogTitle className="font-bold text-xl text-white">
              Confirm Transfer Token
            </DialogTitle>

            <Description className="text-gray-300">
              Please input the principal address of receiver.
            </Description>
            <input
              type="text"
              id="transferPrincipal"
              placeholder="Principal address"
              className="w-full bg-background-1 text-base font-normal leading-6 text-white placeholder:text-opacityColor-70 px-4 py-2 rounded-md"
              value={transferPrincipal}
              onChange={handleTransferPrincipalChange}
            />
            <input
              type="text"
              id="transferMemo"
              placeholder="Memo (optional)"
              className="w-full bg-background-1 text-base font-normal leading-6 text-white placeholder:text-opacityColor-70 px-4 py-2 rounded-md"
              value={transferMemo}
              onChange={handleTransferMemoChange}
            />
            <div className="flex justify-end gap-4">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
                onClick={() => setIsOpenTransferDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => handleTransfer(true)}
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={isOpenRemoveListingDialog}
        onClose={() => setIsOpenConfirmBuyDialog(false)}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
          <DialogPanel className="max-w-lg space-y-4 border border-gray-700 bg-gray-900 p-8 text-white shadow-xl rounded-xl">
            <DialogTitle className="font-bold text-xl text-white">
              Confirm Cancel Listing
            </DialogTitle>
            <Description className="text-gray-300">
              Are you sure you want to cancel this listing?
            </Description>
            <p className="text-sm text-gray-400">
              This action cannot be undone. Once confirmed, the listing will be
              canceled.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
                onClick={() => setIsopenRemoveListingDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => handleRemoveListing(true)}
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};

export default LeftPanelNftDetail;
