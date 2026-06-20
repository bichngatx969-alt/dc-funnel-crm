import { ProfileBlock, InfoRow } from "./ProfileBlock";
import { fmtDate, type ContactDetail } from "@/components/contacts/types";

export function ContactInfoBlock({
  contact,
  pageName,
}: {
  contact: ContactDetail | null;
  pageName: string | null;
}) {
  return (
    <ProfileBlock id="block-info" title="Thông tin chung" icon="person" collapsible defaultOpen>
      <div className="divide-y divide-gray-50">
        <InfoRow label="Họ tên" value={contact?.name} />
        <InfoRow label="Giới tính" value={contact?.gender} />
        <InfoRow label="Số điện thoại" value={contact?.phone} />
        <InfoRow label="Email" value={contact?.email} />
        <InfoRow label="Địa chỉ" value={contact?.address} />
        <InfoRow label="Nguồn khách" value={contact?.source} />
        <InfoRow label="Fanpage" value={contact?.facebookPage?.pageName ?? pageName} />
        <InfoRow label="Ngày tạo" value={contact?.createdAt ? fmtDate(contact.createdAt) : null} />
      </div>
    </ProfileBlock>
  );
}
