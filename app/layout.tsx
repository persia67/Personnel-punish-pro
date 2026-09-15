import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
  description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
  openGraph: {
    title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
    description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafeWatch HSE - سامانه پایش عملکرد و دیتابیس PostgreSQL',
    description: 'نسخه تفکیک‌شده سرور و کلاینت مجزا با پایگاه داده رابطه‌ای PostgreSQL برای سامانه مدیریت تشویق و تنبیه HSE بر پایه مخزن punishment-personnel.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
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
