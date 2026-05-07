"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader, Input, Button } from "@/components";
import { Pencil, Pipette } from "lucide-react";

// Add global type for EyeDropper
declare global {
  interface Window {
    EyeDropper: any;
  }
}

/**
 * Detailed Color Picker Popover matching the screenshot.
 * Includes Saturation box, Hue slider, and RGB inputs.
 */
function ColorPickerPopover({
  color,
  onColorChange,
  onClose,
  onOpenEyeDropper,
}: {
  color: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
  onOpenEyeDropper: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Mock RGB values based on the hex color for the UI
  // In a real app, we'd use a color library or conversion helper
  const r = 120, g = 187, b = 123;

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-50 mt-2 w-[240px] rounded-lg border border-border bg-white p-3 shadow-xl"
    >
      {/* Saturation/Value area */}
      <div
        className="relative mb-3 h-32 w-full rounded-md"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${color})`,
          backgroundColor: color
        }}
      >
        <div className="absolute left-[20%] top-[30%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm" />
      </div>

      {/* Controls: EyeDropper + Swatch + Hue Slider */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onOpenEyeDropper}
          className="text-muted hover:text-foreground"
        >
          <Pipette className="h-4 w-4" />
        </button>
        <div
          className="h-8 w-8 rounded-full border border-border"
          style={{ backgroundColor: color }}
        />
        <div className="h-3 flex-1 rounded-full bg-gradient-to-r from-[#ff0000] via-[#ffff00] via-[#00ff00] via-[#00ffff] via-[#0000ff] via-[#ff00ff] to-[#ff0000]">
          <div className="relative h-full w-full">
            <div className="absolute left-[60%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-sm" />
          </div>
        </div>
      </div>

      {/* RGB Inputs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1 text-center">
          <div className="rounded border border-border bg-surface px-1 py-1 text-xs text-foreground">
            {r}
          </div>
          <span className="text-[10px] uppercase text-muted">R</span>
        </div>
        <div className="space-y-1 text-center">
          <div className="rounded border border-border bg-surface px-1 py-1 text-xs text-foreground">
            {g}
          </div>
          <span className="text-[10px] uppercase text-muted">G</span>
        </div>
        <div className="space-y-1 text-center">
          <div className="rounded border border-border bg-surface px-1 py-1 text-xs text-foreground">
            {b}
          </div>
          <span className="text-[10px] uppercase text-muted">B</span>
        </div>
      </div>
    </div>
  );
}

export default function CreateFlagPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#78bb7b"); // Default to the green in the screenshot
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  /**
   * Opens the browser's native EyeDropper tool
   */
  const handleOpenEyeDropper = async () => {
    if (typeof window === "undefined") return;
    if (!window.EyeDropper) return;

    const eyeDropper = new window.EyeDropper();
    try {
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        setColor(result.sRGBHex);
      }
    } catch (e) {
      console.log("EyeDropper interaction cancelled");
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeader
        title="Flags"
        breadcrumbs={["Flags", "Create"]}
      />

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="space-y-6 p-5 sm:p-6">

          {/* Name Field */}
          <Input
            id="flag-name"
            label="Name"
            placeholder="Gold players"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Color Field */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              Color
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex flex-1 items-center overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                {/* Left Swatch */}
                <div className="flex h-full items-center pl-3">
                  <div
                    className="h-5 w-5 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </div>

                {/* Main Strip (Opens Picker) */}
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  className="mx-3 h-6 flex-1 rounded transition-opacity hover:opacity-90"
                  style={{ backgroundColor: color }}
                  aria-label="Toggle color picker"
                />

                {/* Right Pencil (Opens EyeDropper) */}
                <div className="flex h-full items-center border-l border-border px-3">
                  <button
                    type="button"
                    onClick={handleOpenEyeDropper}
                    className="text-muted transition-colors hover:text-foreground"
                    title="Pick color from screen"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Color Picker Popover */}
            {showPicker && (
              <ColorPickerPopover
                color={color}
                onColorChange={setColor}
                onClose={() => setShowPicker(false)}
                onOpenEyeDropper={handleOpenEyeDropper}
              />
            )}
          </div>

          {/* Description Field */}
          <Input
            id="flag-description"
            label="Description"
            placeholder="Big spenders"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Submit Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreate}
              disabled={saving}
              className="px-10"
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
