import type { ReactNode, SVGProps } from "react";

// Icon riêng cho khung chat (stroke, currentColor) — đồng bộ style với layout/icons.
const PATHS: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  send: <path d="M4 11.5 20 4l-6 16-3-7-7-1.5Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  phone: (
    <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  ),
  sparkles: (
    <>
      <path d="M12 4 13.4 8.6 18 10l-4.6 1.4L12 16l-1.4-4.6L6 10l4.6-1.4L12 4Z" />
      <path d="M18.5 14.5 19 16l1.5.5L19 17l-.5 1.5L18 17l-1.5-.5L18 16l.5-1.5Z" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  attach: (
    <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.6 1.6 0 0 1-2.4-2.4l7.3-7.3" />
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </>
  ),
  back: <path d="m15 6-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  bot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 5v3M9 13h.01M15 13h.01M2 12v2M22 12v2" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  tag: (
    <>
      <path d="M3 7.5V4.5A1.5 1.5 0 0 1 4.5 3h3l11 11a1.6 1.6 0 0 1 0 2.3l-3.2 3.2a1.6 1.6 0 0 1-2.3 0L3 7.5Z" />
      <path d="M7 7h.01" />
    </>
  ),
  star: (
    <path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.6 6.6 19.5 7.9 13.6l-4.5-4 6-.6L12 3.5Z" />
  ),
  takeover: (
    <>
      <path d="M9 12.5 11 14.5 15.5 10" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  returnBot: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9a7 7 0 0 1 7 7v2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  source: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  cart: (
    <>
      <path d="M5 4h2l1.2 9.2a1.5 1.5 0 0 0 1.5 1.3h6.6a1.5 1.5 0 0 0 1.5-1.2L19 7H7.2" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M4 13h16M12 9v11M12 9C9 9 7 7.5 8 5.5 8.7 4 11 5 12 9c1-4 3.3-5 4-3.5C17 7.5 15 9 12 9Z" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14 4v5h5M8 13h7M8 16.5h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  edit: (
    <>
      <path d="M4 20h4l10-10a2 2 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </>
  ),
  userCheck: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a6 6 0 0 1 11 0" />
      <path d="m16 12 1.8 1.8L21 10" />
    </>
  ),
};

export type InboxIconName = keyof typeof PATHS;

export function InboxIcon({ name, ...props }: { name: InboxIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}
