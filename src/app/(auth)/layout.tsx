import { LayoutProps } from "@/types/layout.types";

export default function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-8">
      {children}
    </div>
  );
}
