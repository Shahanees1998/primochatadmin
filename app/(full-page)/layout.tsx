import { Metadata } from "next";

interface MainLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: "FRATERNA Admin",
    description:
        "Administrative dashboard for FRATERNA community management",
    robots: { index: false, follow: false },
    openGraph: {
        type: "website",
        title: "FRATERNA Admin",
        url: "https://www.primefaces.org/apollo-react",
        description:
            "The ultimate collection of design-agnostic, flexible and accessible React UI Components.",
        images: ["/images/logo.svg"],
        ttl: 604800,
    },
    icons: {
        icon: "/favicon.ico",
    },
};

export default function MainLayout({ children }: MainLayoutProps) {
    return <div>{children}</div>;
}
