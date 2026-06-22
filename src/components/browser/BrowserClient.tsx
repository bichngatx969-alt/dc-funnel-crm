"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Shortcut = {
  id: string;
  name: string;
  url: string;
  category: string;
};

const STORAGE_KEY = "dcos.browser.shortcuts.v1";

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "meta-business", name: "Meta Business Suite", url: "https://business.facebook.com/latest/inbox", category: "Facebook" },
  { id: "facebook-page", name: "Facebook Page", url: "https://www.facebook.com/pages/?category=your_pages", category: "Facebook" },
  { id: "zalo-oa", name: "Zalo OA", url: "https://oa.zalo.me/manage", category: "Zalo" },
  { id: "canva", name: "Canva", url: "https://www.canva.com", category: "Creator" },
  { id: "webcake", name: "Webcake", url: "https://webcake.io", category: "Commerce" },
  { id: "google-drive", name: "Google Drive", url: "https://drive.google.com", category: "Google" },
  { id: "gmail", name: "Gmail", url: "https://mail.google.com", category: "Google" },
];

export function BrowserClient() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Custom");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setShortcuts(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  }, [shortcuts]);

  const groups = useMemo(() => {
    const map = new Map<string, Shortcut[]>();
    for (const shortcut of shortcuts) {
      const key = shortcut.category || "Custom";
      map.set(key, [...(map.get(key) ?? []), shortcut]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shortcuts]);

  function addShortcut(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const nextName = name.trim();
    const nextUrl = normalizeUrl(url);
    if (!nextName) {
      setError("Vui lòng nhập tên shortcut.");
      return;
    }
    if (!nextUrl) {
      setError("URL phải bắt đầu bằng http:// hoặc https://.");
      return;
    }
    const next: Shortcut = {
      id: `custom-${Date.now()}`,
      name: nextName,
      url: nextUrl,
      category: category.trim() || "Custom",
    };
    setShortcuts((current) => [next, ...current]);
    setName("");
    setUrl("");
    setCategory("Custom");
  }

  function removeShortcut(id: string) {
    setShortcuts((current) => current.filter((shortcut) => shortcut.id !== id));
  }

  function resetDefaults() {
    setShortcuts(DEFAULT_SHORTCUTS);
    setError(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {groups.map(([group, items]) => (
          <section key={group} className="dc-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{group}</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{items.length} shortcut</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((shortcut) => (
                <article key={shortcut.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{shortcut.name}</h3>
                      <p className="mt-1 truncate text-xs text-gray-400">{shortcut.url}</p>
                    </div>
                    {shortcut.id.startsWith("custom-") && (
                      <button
                        type="button"
                        onClick={() => removeShortcut(shortcut.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <a
                    href={shortcut.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Mở
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="space-y-5">
        <form onSubmit={addShortcut} className="dc-card p-4 sm:p-5">
          <h2 className="text-lg font-bold text-gray-900">Thêm shortcut</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Tên
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="VD: Landing page chính"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="https://..."
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Nhóm
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Custom"
              />
            </label>
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Lưu shortcut
          </button>
        </form>

        <section className="dc-card p-4 sm:p-5">
          <h2 className="text-lg font-bold text-gray-900">Nguyên tắc Browser OS</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-gray-500">
            <p>DCOS chỉ mở shortcut/workbench thủ công và không tự lấy cookie, session hoặc mật khẩu cá nhân.</p>
            <p>Tích hợp tự động dài hạn sẽ đi qua API chính thức như Facebook Page, Messenger, Comment và Zalo OA.</p>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            className="mt-4 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Khôi phục mặc định
          </button>
        </section>
      </aside>
    </div>
  );
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return "";
}
