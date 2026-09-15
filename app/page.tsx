'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const App = dynamic(() => import('@/src/App'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans" dir="rtl">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-blue-500/20"></div>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
        <div>
          <h2 className="text-base font-bold text-white">سامانه SafeWatch HSE</h2>
          <p className="mt-1 text-xs text-slate-400">در حال اتصال به سرور و بارگذاری پایگاه داده رابطه‌ای PostgreSQL...</p>
        </div>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
