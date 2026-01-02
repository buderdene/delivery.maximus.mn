import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from 'sonner';
import "./globals.css";

const gip = localFont({
  src: [
    {
      path: '../../public/fonts/GIP-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/GIP-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/GIP-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-gip',
});

export const metadata: Metadata = {
  title: "Sales Maximus - Борлуулалтын систем",
  description: "MAXIMUS ERP Борлуулалтын удирдлагын систем",
  icons: {
    icon: '/logos/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className={`${gip.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          richColors 
          position="top-right" 
          toastOptions={{
            style: {
              fontFamily: 'var(--font-gip)',
            },
          }}
        />
      </body>
    </html>
  );
}
