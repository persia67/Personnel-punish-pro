import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6" dir="rtl">
      <div className="max-w-md w-full text-center space-y-4">
        <img 
          src="/icon.png" 
          alt="SafeWatch HSE" 
          className="w-16 h-16 rounded-2xl mx-auto object-contain shadow-lg border border-white/20 p-1" 
        />
        <h1 className="text-2xl font-bold">صفحه مورد نظر یافت نشد</h1>
        <p className="text-sm text-slate-400">
          صفحه‌ای که به دنبال آن هستید وجود ندارد یا به آدرس دیگری منتقل شده است.
        </p>
        <div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md active:scale-95"
          >
            بازگشت به سامانه SafeWatch HSE
          </Link>
        </div>
      </div>
    </div>
  );
}
