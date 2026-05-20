import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Birdie & Cause — Play a round. Change a life.",
  description:
    "A subscription-driven golf platform where every score-card funds a cause. Win monthly prize draws while supporting the charity of your choice.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Birdie & Cause",
    description: "Play a round. Change a life.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
