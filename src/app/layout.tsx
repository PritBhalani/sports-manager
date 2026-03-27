import type { Viewport } from "next";
import { LayoutProps } from "@/types/layout.types";
import { DialogProvider } from "@/components";
import "./globals.css";

export const metadata = {
  title: "Sports Manager",
  description: "Sports Manager Admin Panel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en" className="font-sans antialiased">
      <body className="min-h-screen font-sans antialiased">
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}