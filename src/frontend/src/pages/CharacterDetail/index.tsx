import { useNavigate, useParams } from "react-router-dom";
import LeftPanelNftDetail from "./LeftPanelNftDetail";
import RightPanelNftDetail from "./RightPanelNftDetail";

type Params = {
  tokenId: string;
};

export default function CharacterDetailPage() {
  const navigate = useNavigate();
  const params = useParams<Params>();
  const tokenId = Number(params.tokenId);

  if (Number.isNaN(tokenId)) {
    navigate("/404");
  }

  return (
    <section className="mx-auto max-w-[1440px] px-12 ">
      <div className="flex gap-2 border-b border-opacityColor-6 py-12">
        <div className="w-[calc(100%/3-8px/3)]">
          <LeftPanelNftDetail tokenId={tokenId} />
        </div>
        <div className="flex-1">
          <RightPanelNftDetail tokenId={tokenId} />
        </div>
      </div>
    </section>
  );
}
