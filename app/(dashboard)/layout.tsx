import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </ThemeProvider>
  );
}

