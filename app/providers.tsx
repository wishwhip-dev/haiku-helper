"use client";

import { Toaster } from "sonner";
import { CopyBoot } from "@/components/copy-boot";
import { HomeScreen } from "@/components/home-screen";
import { VisitBeacon } from "@/components/visit-beacon";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<Toaster richColors position="top-right" /><CopyBoot /><HomeScreen /><VisitBeacon /></>;
}
