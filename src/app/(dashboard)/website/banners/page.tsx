"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { PageHeader, Card, Button, Select, Dialog, Input } from "@/components";
import { Plus, Trash2 } from "lucide-react";
import {
  addAgentBanner,
  changeActiveAgentBanner,
  deleteAgentBanner,
  getAgentBannerList,
} from "@/services/website.service";

type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  position: number;
  status: boolean;
};

export default function WebsiteBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [pageSize, setPageSize] = useState("15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addImageContent, setAddImageContent] = useState("");
  const [addFileName, setAddFileName] = useState("");
  const [addIsMobile, setAddIsMobile] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAgentBannerList({ page, pageSize: Number(pageSize) })
      .then((res) => {
        if (cancelled) return;
        setBanners(
          res.data.map((item, idx) => ({
            id: item.id,
            title: `Banner ${idx + 1}`,
            imageUrl: item.imageContent,
            position: idx + 1,
            status: item.isActive,
          })),
        );
        setTotalItems(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load banners.");
        setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, reloadKey]);

  const resetAddForm = () => {
    setAddImageContent("");
    setAddFileName("");
    setAddIsMobile(false);
    setAddError(null);
  };

  const closeAddDialog = () => {
    if (adding) return;
    setIsAddDialogOpen(false);
    resetAddForm();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAddImageContent("");
      setAddFileName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAddError("Please select a valid image file.");
      setAddImageContent("");
      setAddFileName("");
      return;
    }

    if (file.size > 200 * 1024) {
      setAddError("Image must be under 200KB.");
      setAddImageContent("");
      setAddFileName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAddImageContent(result);
      setAddFileName(file.name);
      setAddError(null);
    };
    reader.onerror = () => {
      setAddError("Failed to read image file.");
      setAddImageContent("");
      setAddFileName("");
    };
    reader.readAsDataURL(file);
  };

  const handleAddBanner = async () => {
    if (!addImageContent) {
      setAddError("Please select an image to upload.");
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      await addAgentBanner({
        isMobile: addIsMobile,
        imageContent: addImageContent,
        isActive: true,
      });
      setIsAddDialogOpen(false);
      resetAddForm();
      setPage(1);
      setReloadKey((prev) => prev + 1);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add banner.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const target = banners.find((b) => b.id === id);
    if (!target) return;

    const nextStatus = !target.status;
    // Optimistic UI update so toggle feels instant.
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)),
    );
    setTogglingId(id);
    setError(null);
    try {
      await changeActiveAgentBanner(id, nextStatus);
    } catch (e) {
      // Revert optimistic state if API fails.
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: target.status } : b)),
      );
      setError(
        e instanceof Error
          ? e.message
          : "Failed to update banner status.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAgentBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setTotalItems((prev) => Math.max(0, prev - 1));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to delete banner.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Website Banners"
        breadcrumbs={["Website", "Banners"]}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => {
              resetAddForm();
              setIsAddDialogOpen(true);
            }}
          >
            Add Banner
          </Button>
        }
      />

      <Card padded={false} className="border-none bg-transparent p-0 shadow-none">
        {error ? (
          <p className="mb-3 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="mb-3 text-sm text-muted">Loading banners...</p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
            >
              <div className="relative h-32 w-full bg-surface-2 sm:h-40">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  <span>Status</span>
                  <label className="inline-flex items-center gap-2 text-[11px] font-medium">
                    <span
                      className={
                        banner.status ? "text-success" : "text-placeholder"
                      }
                    >
                      {banner.status ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(banner.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                        banner.status
                          ? "border-success bg-success"
                          : "border-border-strong bg-surface-2"
                      }`}
                      aria-pressed={banner.status}
                      disabled={togglingId === banner.id}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                          banner.status ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs font-medium text-foreground-secondary">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      Position
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {banner.position}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-foreground-tertiary transition-colors hover:bg-surface-muted hover:text-foreground"
                    aria-label="Delete banner"
                    onClick={() => void handleDeleteBanner(banner.id)}
                    disabled={deletingId === banner.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: page size + count + pagination stub */}
        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-border pt-3 text-sm text-foreground-tertiary sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(e.target.value);
              }}
              options={[
                { label: "15", value: "15" },
                { label: "30", value: "30" },
                { label: "60", value: "60" },
              ]}
              className="h-8 w-20"
              aria-label="Rows per page"
            />
            <span className="text-xs text-muted">
              {totalItems || banners.length} items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-sm border border-border bg-surface text-xs font-medium text-foreground-tertiary disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </button>
            <span className="text-xs font-medium text-foreground-secondary">{page}</span>
            <button
              type="button"
              className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-sm border border-border bg-surface text-xs font-medium text-foreground-tertiary disabled:opacity-40"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {">"}
            </button>
          </div>
        </div>
      </Card>

      <Dialog
        isOpen={isAddDialogOpen}
        onClose={closeAddDialog}
        title="Add Banner"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button variant="primary" onClick={() => void handleAddBanner()} disabled={adding}>
              {adding ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={closeAddDialog} disabled={adding}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            <span className="font-semibold text-error">Note:</span> For better performance, upload
            only .jpg or .jpeg under 200kb.
          </p>
          {addError ? (
            <p className="text-sm text-error" role="alert">
              {addError}
            </p>
          ) : null}
          <Input type="file" accept=".jpg,.jpeg,image/jpeg" onChange={handleFileChange} />
          {addFileName ? <p className="text-xs text-muted">Selected: {addFileName}</p> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={addIsMobile}
                onChange={(e) => setAddIsMobile(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              For Mobile?
            </label>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

