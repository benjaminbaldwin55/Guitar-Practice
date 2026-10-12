import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Guitar Practice",
  description: "Practice app for Ben and Anna",
};

export const viewport: Viewport = {
  themeColor: "#231814",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="min-h-dvh md:flex">
            <Nav />
            <main className="flex-1 px-4 pt-8 pb-28 md:px-12 md:pt-14 md:pb-14">
              <div className="mx-auto max-w-5xl">{children}</div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
