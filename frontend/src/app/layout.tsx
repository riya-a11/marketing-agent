import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing OS — From what you shipped to what the world sees",
  description: "Turn company updates into strategic, evidence-grounded content for every channel — in minutes, not days.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#111215] text-[#FBF9F5] font-sans antialiased selection:bg-[#EAE3D2] selection:text-[#16181D]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

