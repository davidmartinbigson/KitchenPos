import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ThemeProvider, themeInitScript } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://prokitchenpos.com"),
  applicationName: "Kitchen POS",
  title: {
    default: "Kitchen POS — Restaurant POS Software with Free QR Code Menu",
    template: "%s · Kitchen POS",
  },
  description:
    "Kitchen POS is an easy point of sale (POS) system for restaurants, cafés and cloud kitchens: free QR code menu self-ordering, receipt printing, kitchen display screen, staff accounts and daily sales reports. Works offline. English & Urdu. Used in Pakistan, UAE, UK and USA.",
  keywords: [
    "kitchen pos",
    "kitchen point of sale",
    "restaurant pos",
    "restaurant pos system",
    "restaurant pos software",
    "pos system for restaurants",
    "cafe pos system",
    "qr code menu",
    "qr menu ordering system",
    "free qr menu for restaurant",
    "restaurant pos pakistan",
    "pos system uae",
    "restaurant pos uk",
    "cloud kitchen pos",
    "point of sale software",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Kitchen POS",
    url: "https://prokitchenpos.com",
    locale: "en_US",
    title: "Kitchen POS — Restaurant POS Software with Free QR Code Menu",
    description:
      "The easy point of sale for restaurants, cafés and cloud kitchens: QR code menu self-ordering, receipts, kitchen screen and daily sales reports. Works offline. English & Urdu.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitchen POS — Restaurant POS Software with Free QR Code Menu",
    description:
      "The easy point of sale for restaurants, cafés and cloud kitchens: QR code menu self-ordering, receipts, kitchen screen and daily sales reports. Works offline. English & Urdu.",
  },
  robots: { index: true, follow: true },
  verification: { google: "OydY78SNsYBYSifIQ0WWrpW51XEaT_rsfge-5dBCkp8" },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const user = await getCurrentUser();

  const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
  const lang: Lang = isLang(cookieLang)
    ? cookieLang
    : isLang(user?.language)
      ? (user?.language as Lang)
      : DEFAULT_LANG;

  const theme = cookieStore.get("kpos_theme")?.value === "dark" ? "dark" : "";

  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="text-slate-900 antialiased">
        <ThemeProvider>
          <LanguageProvider initialLang={lang} loggedIn={Boolean(user)}>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
