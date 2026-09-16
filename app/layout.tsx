import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
  description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
    description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'SafeWatch HSE Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
    description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
