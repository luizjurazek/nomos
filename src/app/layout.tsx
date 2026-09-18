import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Controle financeiro",
  description:
    "Controle financeiro do casal, conectado à planilha do Google Sheets.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Controle Financeiro",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff", // Altere para a cor primária ou do fundo do seu app
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-background text-foreground [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',var(--font-sans),system-ui,sans-serif]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
