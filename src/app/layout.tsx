import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { ReauthProvider } from "@/context/ReauthContext";
import { Toast } from "@/components/ui/Toast";
import "./globals.css";
import "./landing-page.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeyseFit — Remote Fashion Measurements Made Simple",
  description:
    "Premium fashion technology platform for designers to manage clients, measurements, projects, and communication remotely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <AppProvider>
          <ReauthProvider>
            {children}
            <Toast />
          </ReauthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
