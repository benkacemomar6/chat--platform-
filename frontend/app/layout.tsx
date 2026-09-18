import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Platform",
  description: "A simple microservices chat demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
