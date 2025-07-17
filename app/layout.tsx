"use client";
import { LayoutProvider } from "../layout/context/layoutcontext";
import { Providers } from "./providers";
import ClientOnly from "@/components/ClientOnly";

import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/primereact.css";
import "../styles/demo/Demos.scss";
import "../styles/layout/layout.scss";
interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>PrimoChat Admin - Community Management System</title>
                <meta name="description" content="Administrative dashboard for PrimoChat community management" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/images/logo.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/images/logo.svg" />
                <link
                    id="theme-link"
                    href={`/theme/theme-light/indigo/theme.css`}
                    rel="stylesheet"
                ></link>
            </head>
            <body>
                <Providers>
                    <PrimeReactProvider>
                        <ClientOnly>
                            <LayoutProvider>{children}</LayoutProvider>
                        </ClientOnly>
                    </PrimeReactProvider>
                </Providers>
            </body>
        </html>
    );
}
