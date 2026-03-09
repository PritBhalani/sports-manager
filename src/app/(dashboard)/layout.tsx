import { LayoutProps } from "@/types/layout.types";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Layout({ children }: LayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}