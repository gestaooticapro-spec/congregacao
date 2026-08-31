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
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "CongGuaíra",
  description: "Sistema de Gestão da Congregação Guaíra",
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
        url: "https://cong.mentebinaria.com/opengraph-image.png?v=3",
        width: 1200,
        height: 630,
        alt: "Logo da Congregacao Guaira",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://cong.mentebinaria.com/opengraph-image.png?v=3"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
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
