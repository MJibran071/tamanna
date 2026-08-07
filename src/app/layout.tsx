import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { PWARegister } from "@/components/pwa-register";
import AmbientBackground from "@/components/ambient-background";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4648d4" },
    { media: "(prefers-color-scheme: dark)", color: "#131b2e" },
  ],
};

export const metadata: Metadata = {
  title: "Tamanna - Voice Assistant",
  description:
    "A sophisticated voice interface that feels alive yet unobtrusive. Powered by intelligent design.",
  keywords: ["Tamanna", "Voice Assistant", "AI", "Voice Interface", "PWA"],
  authors: [{ name: "Tamanna" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tamanna",
  },
  openGraph: {
    title: "Tamanna - Voice Assistant",
    description:
      "A sophisticated voice interface that feels alive yet unobtrusive.",
    siteName: "Tamanna",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${hankenGrotesk.variable} ${inter.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AmbientBackground />
          {children}
          <Toaster />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
