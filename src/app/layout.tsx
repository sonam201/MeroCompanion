import type { Metadata } from "next";
import { EB_Garamond, Share_Tech_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";
import { StarField } from "@/components/star-field";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-clock",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MeroCompanion",
  description: "Track your job-search tasks, goals, and focused work sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${shareTechMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <StarField />
        <Providers>{children}</Providers>
        <Toaster position="top-right" visibleToasts={1} richColors />
      </body>
    </html>
  );
}
