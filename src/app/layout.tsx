import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kitchen POS · Open-source restaurant point of sale",
    template: "%s · Kitchen POS",
  },
  description:
    "Open-source restaurant POS: create your kitchen, add menu items with pictures and prices, take orders, calculate change and track daily sales. English & Urdu.",
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

  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="text-slate-900 antialiased">
        <LanguageProvider initialLang={lang} loggedIn={Boolean(user)}>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
