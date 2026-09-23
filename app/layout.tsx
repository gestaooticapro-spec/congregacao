import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthProvider } from "@/contexts/AuthProvider";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1473B8",
};

export const metadata: Metadata = {
  title: "CongGua\u00edra",
  description: "Sistema de Gest\u00e3o da Congrega\u00e7\u00e3o Gua\u00edra",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.cong.mentebinaria.com"
  ),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.cong.mentebinaria.com",
    siteName: "CongGuaira",
    images: [
      {
        url: "/opengraph-image.png?v=5",
        width: 1200,
        height: 630,
        alt: "Logo da Congregacao Guaira",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png?v=5"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" translate="no" className="overflow-x-clip" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-clip max-w-full`}
        suppressHydrationWarning
      >
        <SidebarProvider>
          <AuthProvider>
            <Sidebar />
            <MainContent>{children}</MainContent>
            <Toaster position="top-center" />
          </AuthProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}

