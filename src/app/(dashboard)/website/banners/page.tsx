"use client";

import { useState } from "react";
import Image from "next/image";
import { PageHeader, Card, Button, Select } from "@/components";
import { Pencil, Plus } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  position: number;
  status: boolean;
};

const MOCK_BANNERS: Banner[] = [
  {
    id: "1",
    title: "Women Power",
    imageUrl: "/images/banners/banner-1.jpg",
    position: 1,
    status: true,
  },
  {
    id: "2",
    title: "Free Tickets",
    imageUrl: "/images/banners/banner-2.jpg",
    position: 2,
    status: true,
  },
  {
    id: "3",
    title: "Stadium Street",
    imageUrl: "/images/banners/banner-3.jpg",
    position: 3,
    status: true,
  },
];

export default function WebsiteBannersPage() {
  const [banners, setBanners] = useState<Banner[]>(MOCK_BANNERS);
  const [pageSize, setPageSize] = useState("15");

  const handleToggleStatus = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: !b.status } : b)),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Website Banners"
        breadcrumbs={["Web", "Banners"]}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
          >
            Add Banner
          </Button>
        }
      />

      <Card className="border-none bg-transparent p-0 shadow-none">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="relative h-32 w-full bg-zinc-100 sm:h-40">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  <span>Status</span>
                  <label className="inline-flex items-center gap-2 text-[11px] font-medium">
                    <span
                      className={
                        banner.status ? "text-emerald-600" : "text-zinc-400"
                      }
                    >
                      {banner.status ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(banner.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                        banner.status
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-zinc-300 bg-zinc-200"
                      }`}
                      aria-pressed={banner.status}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          banner.status ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs font-medium text-zinc-700">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                      Position
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {banner.position}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                    aria-label="Edit banner"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: page size + count + pagination stub */}
        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-zinc-200 pt-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              options={[
                { label: "15", value: "15" },
                { label: "30", value: "30" },
                { label: "60", value: "60" },
              ]}
              className="h-8 w-20"
              aria-label="Rows per page"
            />
            <span className="text-xs text-zinc-500">
              {banners.length} items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-600 disabled:opacity-40"
              disabled
            >
              {"<"}
            </button>
            <span className="text-xs font-medium text-zinc-700">1</span>
            <button
              type="button"
              className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-600 disabled:opacity-40"
              disabled
            >
              {">"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

