"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";
import { ProductAuditPanel, type ProductAudit } from "./ProductAuditPanel";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  description: string | null;
  isActive: boolean;
  aiAuditScore: number | null;
  aiAuditedAt: string | null;
  aiAuditJson: ProductAudit | null;
  updatedAt: string;
};

function scoreChip(score: number | null) {
  if (score == null) return <span className="text-[11px] text-gray-300">chưa kiểm tra</span>;
  const tone = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>AI {score}%</span>;
}

export function ProductsClient({ aiEnabled }: { aiEnabled: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<ProductAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form tạo nhanh
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("pageSize", "100");
      const d = await apiGet<{ items: Product[] }>(`/api/products?${params.toString()}`);
      setItems(d.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((p) => p.id === selectedId) ?? null;

  async function selectProduct(id: string) {
    setSelectedId(id);
    setAudit(null);
    try {
      const d = await apiGet<{ audit: ProductAudit | null }>(`/api/products/${id}/ai-audit`);
      setAudit(d.audit ?? null);
    } catch {
      setAudit(null);
    }
  }

  async function runAudit() {
    if (!selectedId) return;
    setAuditing(true);
    setError(null);
    try {
      const res = await apiSend<{ aiConfigured: boolean; status: string; product: Product; audit: ProductAudit }>(
        `/api/products/${selectedId}/ai-audit`,
        "POST"
      );
      setAudit(res.audit);
      setItems((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...res.product } : p)));
    } catch (e: any) {
      setError(e?.message ?? "Không kiểm tra được sản phẩm.");
    } finally {
      setAuditing(false);
    }
  }

  async function createProduct() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiSend<{ product: Product }>(`/api/products`, "POST", {
        name: name.trim(),
        sku: sku.trim() || undefined,
        priceVnd: price ? Number(price.replace(/[^\d]/g, "")) : 0,
        description: desc.trim() || undefined,
      });
      setName("");
      setSku("");
      setPrice("");
      setDesc("");
      setShowForm(false);
      await load();
      if (res.product?.id) void selectProduct(res.product.id);
    } catch (e: any) {
      setError(e?.message ?? "Không tạo được sản phẩm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dc-card flex h-[calc(100vh-180px)] min-h-[480px] overflow-hidden rounded-2xl">
      {/* Cột trái: danh sách */}
      <div className={`flex w-full flex-col border-r border-gray-100 md:w-[360px] ${selectedId ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-2 border-b border-gray-100 p-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand focus-within:bg-white">
            <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm…"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            <Icon name="plus" className="h-4 w-4" />
            Thêm sản phẩm
          </button>
          {showForm && (
            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên sản phẩm *" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] focus:border-brand focus:outline-none" />
              <div className="flex gap-1.5">
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="w-1/2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] focus:border-brand focus:outline-none" />
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Giá VND" inputMode="numeric" className="w-1/2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] focus:border-brand focus:outline-none" />
              </div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả ngắn" rows={2} className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] focus:border-brand focus:outline-none" />
              <button onClick={createProduct} disabled={saving || !name.trim()} className="w-full rounded-lg bg-gray-900 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
                {saving ? "Đang lưu…" : "Lưu sản phẩm"}
              </button>
            </div>
          )}
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
                <Icon name="products" className="h-6 w-6" />
              </span>
              <p className="text-[13px] font-medium text-gray-600">Chưa có sản phẩm/dịch vụ</p>
              <p className="max-w-[15rem] text-[12px] text-gray-400">
                Thêm sản phẩm đầu tiên để AI có dữ liệu tư vấn và đề xuất offer.
              </p>
            </div>
          ) : (
            items.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                  selectedId === p.id ? "bg-brand-light/70" : "hover:bg-gray-100/70"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-gray-800">{p.name}</span>
                  <span className="text-[12px] text-gray-500">{formatVnd(p.priceVnd)}{p.sku ? ` · ${p.sku}` : ""}</span>
                </span>
                {scoreChip(p.aiAuditScore)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cột phải: audit panel */}
      <div className={`min-w-0 flex-1 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <>
            <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 px-3 pt-3 text-[12px] text-gray-500 md:hidden">
              <Icon name="chevron" className="h-4 w-4 rotate-180" /> Danh sách
            </button>
            <ProductAuditPanel product={selected} audit={audit} auditing={auditing} aiEnabled={aiEnabled} onAudit={runAudit} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-gray-400">
            <Icon name="sparkles" className="h-8 w-8 text-gray-300" />
            <p className="text-[13px]">Chọn một sản phẩm để xem AI kiểm tra thông tin.</p>
          </div>
        )}
        {error && <p className="px-4 pb-3 text-[12px] text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
