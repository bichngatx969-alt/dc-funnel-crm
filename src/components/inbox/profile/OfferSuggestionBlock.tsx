import { ProfileBlock, BlockEmpty, BlockCta } from "./ProfileBlock";

// Gợi ý bán hàng: CHƯA có API → empty state + CTA (không fake dữ liệu).
export function OfferSuggestionBlock() {
  return (
    <ProfileBlock id="block-offers" title="Ưu đãi / Gợi ý bán hàng" icon="gift" collapsible defaultOpen>
      <BlockEmpty
        text="Chưa có ưu đãi phù hợp cho khách này."
        cta={<BlockCta icon="gift" label="Chọn ưu đãi" href="/offers" />}
      />
    </ProfileBlock>
  );
}
