# SafeWatch HSE - Dedicated Server & PostgreSQL Database
## نسخه سرور مجزا و پایگاه داده رابطه‌ای PostgreSQL

این دایرکتوری شامل نسخه سرور مجزا برای سامانه پایش عملکرد و تشویق و تنبیه پرسنل (SafeWatch HSE) به همراه معماری پایگاه داده تفکیک‌شده PostgreSQL می‌باشد.

---

### ۱. معماری سیستم (System Architecture)
```
┌─────────────────────────┐       HTTP / SSE       ┌─────────────────────────┐
│     Client (فرانت‌اند)    │ ◄────────────────────► │     Server (سرور مجزا)  │
│  (Next.js / React / PWA)│                        │    (Node.js / Express)  │
└─────────────────────────┘                        └────────────┬────────────┘
                                                                │ SQL Pool
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │   PostgreSQL Database   │
                                                   │  (جداول رابطه‌ای مجزا)  │
                                                   │ - users                 │
                                                   │ - employees             │
                                                   │ - violations            │
                                                   │ - rewards               │
                                                   │ - violation_codes       │
                                                   │ - reward_codes          │
                                                   │ - system_settings       │
                                                   └─────────────────────────┘
```

---

### ۲. راه‌اندازی سریع با Docker Compose
برای راه‌اندازی سرور و پایگاه داده PostgreSQL به‌صورت همزمان تنها با یک دستور:

```bash
docker-compose up -d
```

این دستور:
1. سرویس پایگاه داده PostgreSQL 16 را اجرا کرده و اسکریپت‌های `database/schema.sql` و `database/seed.sql` را به‌صورت خودکار اعمال می‌کند.
2. سرور برنامه را کامپایل و روی پورت `3000` اجرا کرده و به دیتابیس متصل می‌نماید.

---

### ۳. راه‌اندازی دستی (Manual Execution)
#### الف) متغیرهای محیطی دیتابیس (`.env`)
```env
PORT=3000
DATABASE_URL=postgres://safewatch_admin:safewatch_password_123@localhost:5432/safewatch_hse
# یا به تفکیک:
PGHOST=localhost
PGPORT=5432
PGUSER=safewatch_admin
PGPASSWORD=safewatch_password_123
PGDATABASE=safewatch_hse
```

#### ب) اجرای سرور:
```bash
cd server
npm install
npm run dev
```

---

### ۴. ساختار پایگاه داده تفکیک‌شده (`database/`)
- `schema.sql`: ساختار کامل جداول با کلیدهای اصلی، ایندکس‌ها و قیود یکتایی.
- `seed.sql`: داده‌های پایه سازمانی (نقش‌های استاندارد HSE، انتظامات، آموزش، منابع انسانی، کدهای پیش‌فرض و پرسنل نمونه).
- `connection.ts`: مدیریت استخر اتصالات (`pg.Pool`) با پشتیبانی از حالت سرور ریموت و موتور PostgreSQL تعبیه‌شده (`pg-mem`).
- `db-adapter.ts`: لایه دسترسی داده رابطه‌ای (Data Access Layer) جهت تعامل با تمام جداول.

---

### ۵. مستندات مسیرهای API سرور (Endpoints)
| متد | مسیر | توضیحات |
|---|---|---|
| `GET` | `/api/health` | وضعیت سلامت سرور و نسخه |
| `GET` | `/api/database/status` | آمار اتصالات و تعداد رکوردهای جداول PostgreSQL |
| `POST` | `/api/database/configure` | تغییر یا تست آدرس اتصال به PostgreSQL |
| `POST` | `/api/database/query` | اجرای کوئری SQL (کنسول مدیریت پایگاه داده) |
| `GET` | `/api/db` | دریافت وضعیت کامل اطلاعات از جداول دیتابیس |
| `POST` | `/api/db` | ثبت یا به‌روزرسانی رکوردهای دیتابیس |
| `PUT` | `/api/db/sync` | همگام‌سازی جامع اطلاعات بین کلاینت‌ها و PostgreSQL |
| `GET` | `/api/events` | کانال بلادرنگ رویدادها (Server-Sent Events) |
| `GET` | `/api/backups` | لیست فایل‌های پشتیبان |
| `POST` | `/api/backups/create` | ایجاد فایل پشتیبان دستی از PostgreSQL |
| `POST` | `/api/sms/send` | درگاه پروکسی ارسال پیامک سازمانی |
