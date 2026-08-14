import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Self-hosted instead of next/font/google: Turbopack's Google Fonts fetch at build time
// started failing (404s on the specific woff2 hashes it requested) with no code change on
// our side, which broke every production build. These are the same files Google serves,
// just vendored so builds don't depend on that endpoint being up.
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const baloo = localFont({
  src: "./fonts/Baloo2-latin.woff2",
  variable: "--font-baloo",
  weight: "500 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fatty Apuntes",
  description: "Apuntes de la facu, organizados por año y materia.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fatty Apuntes",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8792c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Runs before paint so a saved dark theme is applied to the very first frame;
            anything React does happens after the page is already on screen. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${baloo.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
