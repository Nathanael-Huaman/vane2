import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers";
import { AuthProvider } from "@/components/auth-provider";
import { EmailVerificationWarningBanner } from "@/components/email-verification-warning-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Obstedesign - Iniciar sesion",
  description: "Inicia sesion en tu cuenta de Obstedesign",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <EmailVerificationWarningBanner />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
