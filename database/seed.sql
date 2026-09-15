-- =========================================================================
-- SafeWatch HSE Management System - PostgreSQL Seed Data
-- =========================================================================

-- Insert Standard Organizational RBAC Users
INSERT INTO users (id, username, password, full_name, role, avatar, phone_number, email, telegram_username)
VALUES
('dev1', 'Dev123', 'Pass123', 'مدیر سیستم و توسعه‌دهنده', 'DEVELOPER', '', '09121111111', 'dev@safewatch.ir', '@Dev123_Support'),
('u0', 'Manager123', 'Pass123', 'مهندس رضایی (مدیر کارخانه)', 'PLANT_MANAGER', '', '09122222222', 'manager@safewatch.ir', '@Manager123_Support'),
('u1', 'HrManager123', 'Pass123', 'خانم دکتر احمدی (مدیر منابع انسانی)', 'HR_MANAGER', '', '09123333333', 'hr@safewatch.ir', '@Hr_Support'),
('u2', 'HseManager123', 'Pass123', 'مهندس کاظمی (مدیر ایمنی و بهداشت HSE)', 'HSE_MANAGER', '', '09124444444', 'hse@safewatch.ir', '@HseManager_Support'),
('u3', 'HseOfficer123', 'Pass123', 'مهندس مرادی (افسر ارشد ایمنی)', 'HSE_OFFICER', '', '09125555555', 'officer@safewatch.ir', '@Officer_Support'),
('u4', 'Security123', 'Pass123', 'سروان محمدی (مسئول واحد انتظامات)', 'SECURITY_MANAGER', '', '09126666666', 'security@safewatch.ir', '@Security_Support'),
('u7', 'Guard123', 'Pass123', 'آقای صادقی (نگهبان انتظامات)', 'SECURITY_GUARD', '', '09129999999', 'guard@safewatch.ir', NULL),
('u5', 'Training123', 'Pass123', 'استاد کریمی (مسئول واحد آموزش)', 'TRAINING_MANAGER', '', '09127777777', 'training@safewatch.ir', '@Training_Support'),
('u6', 'Admin123', 'Pass123', 'آقای رستمی (کارشناس امور اداری)', 'ADMIN_STAFF', '', '09128888888', 'admin@safewatch.ir', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Standard Violation Codes
INSERT INTO violation_codes (id, code, label, score, department)
VALUES
('vc1', 101, 'عدم استفاده از کلاه و عینک ایمنی استاندارد (PPE)', -5, 'HSE'),
('vc2', 102, 'کار در ارتفاع بدون اتصال کمربند مهار سقوط (هارنس)', -15, 'HSE'),
('vc3', 103, 'استعمال دخانیات در مناطق ممنوعه یا انبار مواد اشتعال‌پذیر', -20, 'HSE'),
('vc4', 104, 'عدم صدور یا تایید مجوز شروع کار گرم / پروانه کار (PTW)', -10, 'HSE'),
('vc5', 201, 'ورود غیرمجاز به محوطه کارگاهی بدون ثبت اثر انگشت یا کارت تردد', -5, 'SECURITY'),
('vc6', 202, 'همراه داشتن اقلام و تجهیزات غیرمجاز در مبادی ورودی و خروجی', -10, 'SECURITY'),
('vc7', 301, 'غیبت غیرموجه در دوره‌های آموزش اجباری ایمنی و آتش‌نشانی', -5, 'TRAINING'),
('vc8', 401, 'تاخیر غیرموجه مکرر در ثبت حضور و غیاب اداری', -3, 'ADMIN')
ON CONFLICT (code) DO NOTHING;

-- Insert Standard Reward Codes
INSERT INTO reward_codes (id, code, label, score, department)
VALUES
('rc1', 501, 'رعایت کامل و مستمر اصول بهداشت، ایمنی و محیط زیست (HSE)', 10, 'HSE'),
('rc2', 502, 'شناسایی به موقع کانون خطر و پیشگیری فعالانه از حادثه قریب‌الوقوع', 20, 'HSE'),
('rc3', 503, 'ارائه طرح خلاقانه بهبود ایمنی در فرآیند تولید و عملیات', 15, 'HSE'),
('rc4', 601, 'هوشیاری بالا و گزارش موارد مشکوک امنیتی در ایست و بازرسی', 10, 'SECURITY'),
('rc5', 701, 'کسب رتبه ممتاز در آزمون جامع ادواری آموزش ایمنی', 10, 'TRAINING'),
('rc6', 801, 'انضباط کاری ستودنی و ثبت دقیق مستندات در مهلت مقرر', 5, 'ADMIN')
ON CONFLICT (code) DO NOTHING;

-- Insert Sample Enterprise Personnel
INSERT INTO employees (id, personnel_id, full_name, department, job_title, national_id, hire_date, phone_number)
VALUES
('emp1', '1001', 'علی اکبری', 'تولید و عملیات', 'تکنسین خط تولید', '0012345678', '1401/02/15', '09121001001'),
('emp2', '1002', 'حسین موسوی', 'تعمیرات و نگهداری', 'مکانیک ارشد تاسیسات', '0023456789', '1399/08/10', '09121001002'),
('emp3', '1003', 'رضا باقری', 'انبارداری و لجستیک', 'مسئول انبار قطعات', '0034567890', '1400/05/20', '09121001003'),
('emp4', '1004', 'مهدی صادقی', 'تاسیسات', 'برقکار صنعتی', '0045678901', '1402/01/18', '09121001004'),
('emp5', '1005', 'سعید حیدری', 'تولید و عملیات', 'اپراتور دستگاه CNC', '0056789012', '1401/11/01', '09121001005')
ON CONFLICT (personnel_id) DO NOTHING;

-- Insert Initial System Settings Document
INSERT INTO system_settings (id, settings_json)
VALUES (
  'default',
  '{
    "language": "fa",
    "themeColor": "slate",
    "companyName": "سامانه مدیریت ایمنی و پایش عملکرد پرسنل (SafeWatch HSE)",
    "companyLogo": null,
    "aiProvider": "GEMINI",
    "customDepartments": ["تولید و عملیات", "تعمیرات و نگهداری", "انبارداری و لجستیک", "تاسیسات", "اداری و مالی"],
    "defaultLoginDepartment": "ALL"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
