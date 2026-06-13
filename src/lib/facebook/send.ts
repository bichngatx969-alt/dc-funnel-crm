import { env } from "@/lib/env";
import { decryptToken } from "@/lib/security/token-encryption";

// ----------------------------------------------------------------
// Facebook Send API Adapter
// Tài liệu: https://developers.facebook.com/docs/messenger-platform/reference/send-api
//
// Lưu ý quan trọng về cửa sổ 24 giờ của Messenger:
// - Tất cả hàm dưới đây dùng messaging_type = "RESPONSE", tức là CHỈ gửi để
//   phản hồi trong vòng 24h kể từ tin nhắn gần nhất của khách.
// - KHÔNG dùng adapter này để gửi quảng cáo/follow-up chủ động ngoài cửa sổ 24h.
//   Việc đó cần Message Tag hợp lệ hoặc kênh khác (email/SMS) và không nằm trong MVP.
// ----------------------------------------------------------------

function graphBase(): string {
  return `https://graph.facebook.com/${env.metaGraphVersion}`;
}

export type SendResult = {
  ok: boolean;
  messageId?: string;
  error?: unknown;
};

async function callSendApi(
  body: Record<string, unknown>,
  pageAccessToken?: string | null
): Promise<SendResult> {
  const token = pageAccessToken || env.metaPageAccessToken;
  if (!token) {
    console.error("[FB SEND] Thiếu META_PAGE_ACCESS_TOKEN — bỏ qua việc gửi tin nhắn.");
    return { ok: false, error: "missing_page_access_token" };
  }
  const accessToken = token.startsWith("v1.") ? decryptToken(token) : token;

  try {
    const res = await fetch(
      `${graphBase()}/me/messages?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = (await res.json().catch(() => ({}))) as {
      message_id?: string;
      error?: { message?: string; code?: number; error_subcode?: number; type?: string };
    };

    if (!res.ok || data.error) {
      console.error(
        "[FB SEND] Lỗi từ Meta API:",
        JSON.stringify({ status: res.status, error: data.error ?? data })
      );
      return { ok: false, error: data.error ?? data };
    }

    return { ok: true, messageId: data.message_id };
  } catch (err) {
    console.error("[FB SEND] Lỗi mạng khi gọi Send API:", err);
    return { ok: false, error: String(err) };
  }
}

export async function sendTypingOn(
  psid: string,
  pageAccessToken?: string | null
): Promise<SendResult> {
  return callSendApi({ recipient: { id: psid }, sender_action: "typing_on" }, pageAccessToken);
}

export async function sendTypingOff(psid: string): Promise<SendResult> {
  return callSendApi({ recipient: { id: psid }, sender_action: "typing_off" });
}

export async function sendTextMessage(
  psid: string,
  text: string,
  pageAccessToken?: string | null
): Promise<SendResult> {
  return callSendApi(
    {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text },
    },
    pageAccessToken
  );
}

export type QuickReply = { title: string; payload: string };

export async function sendQuickReplies(
  psid: string,
  text: string,
  replies: QuickReply[],
  pageAccessToken?: string | null
): Promise<SendResult> {
  return callSendApi(
    {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: {
        text,
        // Messenger giới hạn tối đa 13 quick replies, title <= 20 ký tự.
        quick_replies: replies.slice(0, 13).map((r) => ({
          content_type: "text",
          title: r.title.slice(0, 20),
          payload: r.payload,
        })),
      },
    },
    pageAccessToken
  );
}

export async function sendHandoverNotice(psid: string): Promise<SendResult> {
  return sendTextMessage(
    psid,
    "Dạ em kết nối anh/chị với nhân viên tư vấn để được hỗ trợ nhanh nhất ạ. Anh/chị vui lòng chờ trong giây lát nhé."
  );
}

export type OfferLite = {
  title: string;
  offerText: string;
  priceText?: string | null;
};

export async function sendOfferMessage(
  psid: string,
  offer: OfferLite,
  pageAccessToken?: string | null
): Promise<SendResult> {
  const lines = [offer.title, offer.offerText];
  if (offer.priceText) lines.push(offer.priceText);
  return sendTextMessage(psid, lines.filter(Boolean).join("\n"), pageAccessToken);
}

// Lấy thông tin hồ sơ khách (tên, ảnh đại diện) qua Graph API. Optional, bỏ qua nếu lỗi.
export async function fetchUserProfile(
  psid: string,
  pageAccessToken?: string | null
): Promise<{ name?: string; avatarUrl?: string } | null> {
  const token = pageAccessToken || env.metaPageAccessToken;
  if (!token) return null;
  const accessToken = token.startsWith("v1.") ? decryptToken(token) : token;
  try {
    const res = await fetch(
      `${graphBase()}/${psid}?fields=name,first_name,last_name,profile_pic&access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    const data = (await res.json().catch(() => ({}))) as {
      name?: string;
      first_name?: string;
      last_name?: string;
      profile_pic?: string;
      error?: unknown;
    };
    if (data.error) return null;
    const name =
      data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
    return { name, avatarUrl: data.profile_pic };
  } catch {
    return null;
  }
}
