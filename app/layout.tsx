
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Regret Engine | Plan Better. Regret Less.",
  description:
    "An AI-powered travel risk simulator that exposes budget pressure, schedule overload and travel fatigue before departure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
