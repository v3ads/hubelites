import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HubElites — Ambassador Marketing Engine",
  description: "Turn your eStage ambassador domain into an AI-powered marketing engine.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
