import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const mplus = M_PLUS_Rounded_1c({ 
  weight: ['400', '700', '800'],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GRIDFORGE",
  description: "Tactical Grid Battle Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${mplus.className} bg-amber-50 text-slate-800 antialiased h-screen w-screen overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
