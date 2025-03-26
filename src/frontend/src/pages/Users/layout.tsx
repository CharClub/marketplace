/* eslint-disable react/jsx-no-useless-fragment */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charm - A leading AI Character NFT Marketplace",
  description: "Own your AI character NFTs and earn passive income with them.",
};

export default function AccountLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return children;
}
