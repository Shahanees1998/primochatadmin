"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
} 