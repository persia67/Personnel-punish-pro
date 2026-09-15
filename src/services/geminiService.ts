import { GoogleGenAI, Type } from "@google/genai";
import { Violation, Reward, WorkerOfMonthResult, AppSettings } from "../types";

const cleanAndParseJson = (text: string): any => {
  if (!text) return {};
  let cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If it fails, let's try to extract the first valid JSON block
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err) {
        cleaned = match[1].trim();
      }
    }
    
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (err) {}
    }
    
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch (err) {}
    }
    throw e;
  }
};

const getSettings = (): AppSettings | null => {
  try {
    const stored = localStorage.getItem('sg_settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading settings", e);
  }
  return null;
};

const getApiKey = (): string => {
  const settings = getSettings();
  if (settings && settings.customApiKey && settings.customApiKey.trim() !== '') {
    return settings.customApiKey;
  }
  // Safe guard access to process.env in browser environment
  const envKey = typeof process !== 'undefined' && process?.env ? process.env.API_KEY : '';
  return envKey || '';
};

// Local Ollama Call
const callLocalOllama = async (prompt: string, url: string, model: string, isJson: boolean = false): Promise<string> => {
  const endpoint = `${url.trim()}/api/generate`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3',
      prompt: prompt,
      stream: false,
      format: isJson ? 'json' : undefined
    })
  });
  if (!response.ok) {
    throw new Error(`Ollama server returned error code ${response.status}`);
  }
  const data = await response.json();
  return data.response || '';
};

// Local Hugging Face / OpenAI compatible Call
const callLocalHf = async (prompt: string, url: string, model: string, isJson: boolean = false): Promise<string> => {
  const endpoint = `${url.trim()}/v1/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'model',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: isJson ? { type: "json_object" } : undefined
    })
  });
  if (!response.ok) {
    throw new Error(`Local HF API returned error code ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

// On-Device Offline Report Simulator
export const generateOfflineSafetyReport = (violations: Violation[], language: string = 'fa'): string => {
  const isFa = language === 'fa';
  if (violations.length === 0) {
    return isFa ? `
# ⚜️ گزارش مدیریتی پایش وضعیت ایمنی و بهداشت (HSE)
> **تولید شده به وسیله شبیه‌ساز آفلاین سیستم**
> تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}
---
### 📊 خلاصه وضعیت و شاخص‌ها
* **تعداد کل تخلفات ثبت شده:** ۰ مورد
* **وضعیت کلی کارگاه:** عالی و عاری از تخلف

### 💡 پیشنهادات ایمنی
۱. حفظ روند فعلی و تداوم آموزش‌های بهداشت و ایمنی (HSE).
۲. تقدیر از کارکنان در جهت ارتقای فرهنگ خودکنترلی ایمنی.
    `.trim() : `
# ⚜️ Executive HSE Safety Status Report
> **Generated via On-Device Offline Simulator**
> Date: ${new Date().toLocaleDateString()}
---
### 📊 KPI Summary & Statistics
* **Total Violations Recorded:** 0 cases
* **Global Workplace Status:** Excellent & Violation-Free

### 💡 Recommendations
1. Maintain current standards and continue routine health & safety training (HSE).
2. Recognize safe-behaving personnel to reinforce active self-control culture.
    `.trim();
  }

  const total = violations.length;
  // Account for casing difference 'Critical' / 'Critical' or string
  const criticalCount = violations.filter(v => v.severity === 'Critical' || v.severity === 'High' || v.severity?.toLowerCase() === 'critical' || v.severity?.toLowerCase() === 'high').length;
  const pendingApproval = violations.filter(v => !v.isApproved).length;

  const deptCount: { [key: string]: number } = {};
  violations.forEach(v => {
    deptCount[v.department] = (deptCount[v.department] || 0) + 1;
  });
  const topDept = Object.entries(deptCount).sort((a, b) => b[1] - a[1])[0];

  const typeCount: { [key: string]: number } = {};
  violations.forEach(v => {
    typeCount[v.violationType] = (typeCount[v.violationType] || 0) + 1;
  });
  const topViolation = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

  if (isFa) {
    return `
# ⚜️ گزارش مدیریتی پایش وضعیت ایمنی و بهداشت (HSE)
> **تولید شده به وسیله موتور هوش مصنوعی محلی آفلاین (On-Device Local AI Engine)**
> تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}

---

### 📊 خلاصه وضعیت و شاخص‌ها (مجموعه داده پایش شده)
* **تعداد کل مغایرت‌ها و تخلفات ثبت شده:** **${total} مورد**
* **موارد با اهمیت بالا/بحرانی:** **${criticalCount} مورد** ⚠️
* **موارد در انتظار تایید نهایی مدیریت:** **${pendingApproval} مورد**
* **بخش فعال با بیشترین گزارش مغایرت:** \`${topDept ? topDept[0] : 'نامشخص'}\` با **${topDept ? topDept[1] : 0} گزارش**

---

### ⚠️ بررسی الگوها و کانون‌های پرریسک کارگاهی
بر اساس تحلیل آماری هوشمند الگوهای ثبت‌شده، مغایرت اصلی در حال حاضر حول محور موضوع **«${topViolation ? topViolation[0] : 'رعایت دستورالعمل‌های عمومی'}»** شکل گرفته است که حاکی از ضعف نظارتی یا نیاز به بازآموزی ایمنی در این کانون‌هاست. همچنین واحد \`${topDept ? topDept[0] : 'واحد عملیاتی مربوطه'}\` به عنوان کانون کلیدی تمرکز ثبت وقایع شناخته شده است و نیازمند تمهیدات بهبود فرآیند کارگاهی است.

---

### 💡 پیشنهادات و اقدامات اصلاحی هوشمند (اقدامات اولویت‌دار)

۱. **کاهش مغایرت‌های پر تکرار:** برگزاری ابزارشناسی ایمنی فوری (Toolbox Talk) با محوریت **«${topViolation ? topViolation[0] : 'رعایت دستورالعمل‌ها'}»** برای کلیه اپراتورها در ابتدای شیفت‌های کاری.
۲. **اقدام ویژه در واحد پیشرو:** استقرار یک نماینده مقیم HSE به صورت موقت در واحد \`${topDept ? topDept[0] : 'حوزه مربوطه'}\` جهت ارزیابی حضوری ریسک‌ها و افزایش ضریب نظارت.
۳. **اولویت‌بندی تایید:** تسریع در فرآیند بررسی و تایید نهایی **${pendingApproval} مورد در انتظار تایید** جهت ابلاغ مستقیم کسر امتیاز یا تذکرات کتبی به پرسنل خاطی.
۴. **بازرسی فنی دوره‌ای:** ممیزی و ارتقای چک‌لیست‌های بازرسی ادواری برای پیشگیری از حوادث احتمالی شدید.

*این برآورد به صورت خودکار و آفلاین در سیستم تولید گردیده و مصداق کامل ارزیابی اولیه ریسک مدیریت بهداشت حرفه‌ای است.*
    `.trim();
  } else {
    return `
# ⚜️ Executive HSE Safety Status Report
> **Generated via On-Device Offline AI Engine**
> Date: ${new Date().toLocaleDateString()}

---

### 📊 KPI Summary & Statistics
* **Total Discrepancies & Violations:** **${total} cases**
* **Critical / High Importance Issues:** **${criticalCount} cases** ⚠️
* **Pending Approval Items:** **${pendingApproval} cases**
* **Most Active Discrepancy Spot:** \`${topDept ? topDept[0] : 'Unknown'}\` with **${topDept ? topDept[1] : 0} reports**

---

### ⚠️ Pattern Detection & High-Risk Areas
Based on data patterns, main non-compliances are centered around **"${topViolation ? topViolation[0] : 'General Guidelines'}"**, indicating supervisory gaps or training re-evaluation needs in this domain. Additionally, \`${topDept ? topDept[0] : 'the operational area'}\` remains the focal hotspot of safety registrations of this period.

---

### 💡 Smart Recommendations & Preventive Mitigations

1. **Target Common Non-Compliances:** Hold urgent Toolbox Talks centered on **"${topViolation ? topViolation[0] : 'Standard Procedures'}"** for all operators in this shift.
2. **On-Site Supervision:** Station a temporary HSE representative directly within the \`${topDept ? topDept[0] : 'noted'}\` department to re-asses on-scene risks.
3. **Approval Priority:** Promptly dispatch or resolve **${pendingApproval} pending approval** cases to implement correct scores and trigger corrective feedback.
4. **Mechanical Audit:** Update periodic technical checklists to avoid incidents in critical sites.

*This report is securely generated on-device, offering solid HSE analysis without external dependency.*
    `.trim();
  }
};

// On-Device Offline Worker of the Month Simulator
export const selectOfflineWorkerOfMonth = (rewards: Reward[], violations: Violation[], language: string = 'fa'): WorkerOfMonthResult => {
  const isFa = language === 'fa';
  const currentMonth = isFa ? 'این ماه' : 'this month';

  const blacklistedIdSet = new Set(violations.map(v => v.personnelId));
  const eligibleRewards = rewards.filter(r => r.isApproved && !blacklistedIdSet.has(r.personnelId));

  if (eligibleRewards.length === 0) {
    return {
      winnerId: "---",
      winnerName: isFa ? "یافت نشد" : "Not Found",
      reasoning: isFa 
        ? "هیچ سابقه تشویقی معتبر و تایید شده ای برای پرسنل غیر از لیست تخلفات در این دوره وجود نداشت." 
        : "No eligible rewarded candidates were found who did not have violations in the current period.",
      period: currentMonth
    };
  }

  const candidateScores: { [key: string]: { name: string; score: number; count: number; types: string[] } } = {};
  eligibleRewards.forEach(r => {
    if (!candidateScores[r.personnelId]) {
      candidateScores[r.personnelId] = { name: r.employeeName, score: 0, count: 0, types: [] };
    }
    candidateScores[r.personnelId].score += r.score;
    candidateScores[r.personnelId].count += 1;
    candidateScores[r.personnelId].types.push(r.rewardType);
  });

  const sortedCandidates = Object.entries(candidateScores).sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score;
    return b[1].count - a[1].count;
  });

  const bestCandidateId = sortedCandidates[0][0];
  const bestCandidate = sortedCandidates[0][1];

  const mainType = bestCandidate.types[0] || 'SafetyPrinciples';
  let reasoning = '';

  if (isFa) {
    if (mainType === 'PPEUsage') {
      reasoning = `به علت رعایت کامل و مستمر استانداردهای تجهیزات حفاظت فردی (PPE) در محیط کارگاه و کمک به ترویج فرهنگ ایمنی همگانی با کسب ${bestCandidate.score} امتیاز تشویقی.`;
    } else if (mainType === 'SafeMethod') {
      reasoning = `به علت به کارگیری هنرمندانه شیوه‌های کار ایمن، رفع عیوب و خطرات بالقوه ماشین‌آلات و ترغیب سایرین به کار ایمن با ${bestCandidate.score} امتیاز تشویقی.`;
    } else {
      reasoning = `بنابر فعالیت فوق‌العاده در حوزه ایمنی و بهداشت، عدم ثبت هرگونه سابقه کاهنده امتیاز و کسب بالاتری امتیاز با تلاش مستمر گروهی.`;
    }
  } else {
    if (mainType === 'PPEUsage') {
      reasoning = `Awarded for complete and consistent compliance with Personal Protective Equipment (PPE) rules, driving safe behavior with total ${bestCandidate.score} reward points.`;
    } else if (mainType === 'SafeMethod') {
      reasoning = `Selected for executing flawless safe work procedures, active hazard recognition, and scoring total of ${bestCandidate.score} reward points.`;
    } else {
      reasoning = `For superb team discipline, active participation in safety workshops and securing the highest performance score without any registered violations.`;
    }
  }

  return {
    winnerId: bestCandidateId,
    winnerName: bestCandidate.name,
    reasoning: reasoning,
    period: currentMonth
  };
};

// Generates a complete Safety Report, choosing between cloud Gemini, local Ollama, local HF, or Offline Simulator
export const generateSafetyReport = async (violations: Violation[]): Promise<string> => {
  const settings = getSettings();
  const provider = settings?.aiProvider || 'GEMINI';
  const autoFailover = settings?.autoOfflineFailover !== false;
  const lang = settings?.language || 'fa';

  if (provider === 'SIMULATOR' || (!navigator.onLine && autoFailover)) {
    console.log("[AI] Routing request to on-device Simulator (Reason: provider preset or offline)");
    return generateOfflineSafetyReport(violations, lang);
  }

  const prompt = `
    به عنوان یک متخصص ارشد HSE، داده های زیر را تحلیل کن.
    داده ها: ${JSON.stringify(violations.map(v => ({
      type: v.violationType,
      severity: v.severity,
      penalties: v.penaltyActions,
      date: v.date,
      department: v.department
    })))}
    یک گزارش مدیریتی کوتاه و حرفه ای به زبان ${lang === 'fa' ? 'فارسی' : 'انگلیسی'} بنویس که شامل خلاصه وضعیت، الگوها و پیشنهادات باشد.
    پاسخ باید با فرمت Markdown باشد.
  `;

  try {
    if (provider === 'OLLAMA') {
      const url = settings?.ollamaUrl || 'http://localhost:11434';
      const model = settings?.ollamaModel || 'llama3';
      console.log(`[AI] Calling local Ollama server at ${url} with model ${model}`);
      return await callLocalOllama(prompt, url, model, false);
    }

    if (provider === 'LOCAL_HF') {
      const url = settings?.localHfUrl || 'http://localhost:8000';
      const model = settings?.localHfModel || 'model';
      console.log(`[AI] Calling local Hugging Face API at ${url} with model ${model}`);
      return await callLocalHf(prompt, url, model, false);
    }

    // Default: GEMINI API
    console.log("[AI] Requesting response from Google Cloud Gemini API...");
    const ai = new GoogleGenAI({ 
      apiKey: getApiKey(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    return response.text || "خطا در تولید گزارش از طریق سرور خارجی.";
  } catch (error) {
    console.error("[AI] Primary AI provider failed:", error);
    if (autoFailover) {
      console.warn("[AI] Auto-offline failover triggered. Displaying on-device generated simulation.");
      return generateOfflineSafetyReport(violations, lang);
    }
    return lang === 'fa' 
      ? `خطا در ارتباط با سرور هوش مصنوعی به آدرس محلی یا ابری. لطفا تنظیمات شبکه یا کلید API خود را بررسی نمایید.`
      : `Failed to connect to the designated AI Server. Please check your networks, local settings or API key.`;
  }
};

// Selects Worker of the Month, choosing between Cloud Gemini, Local Ollama, Local HF, or Offline Simulator
export const selectWorkerOfMonth = async (rewards: Reward[], violations: Violation[]): Promise<WorkerOfMonthResult> => {
  const settings = getSettings();
  const provider = settings?.aiProvider || 'GEMINI';
  const autoFailover = settings?.autoOfflineFailover !== false;
  const lang = settings?.language || 'fa';

  if (provider === 'SIMULATOR' || (!navigator.onLine && autoFailover)) {
    console.log("[AI] Routing Worker Selection to local on-device simulator");
    return selectOfflineWorkerOfMonth(rewards, violations, lang);
  }

  // Pre-filter blacklist for prompt space efficiency
  const blacklistedIds = Array.from(new Set(violations.map(v => v.personnelId)));
  const rewardsData = rewards.filter(r => r.isApproved).map(r => ({
    name: r.employeeName,
    id: r.personnelId,
    type: r.rewardType,
    description: r.description,
    date: r.date,
    score: r.score
  }));

  const prompt = `
    به عنوان یک مدیر منابع انسانی و HSE، از بین لیست پرسنل تشویق شده زیر، "کارگر نمونه ماه" را انتخاب کن.
    
    لیست تشویق شدگان:
    ${JSON.stringify(rewardsData)}
    
    لیست سیاه (کسانی که در این ماه تخلف داشته اند و نباید انتخاب شوند):
    ${blacklistedIds.join(', ')}

    معیارهای انتخاب:
    1. تعداد تشویق ها در این ماه و میزان امتیازها.
    2. اهمیت نوع تشویق (PPEUsage و SafeMethod اولویت زیادتری دارند).
    3. شرح دقیق اقدامات مثبت.
    
    خروجی باید دقیقاً با فرمت JSON با کلیه فیلدها باشد و هیچ توضیح فارسی یا کد مارک‌داون اضافه دور آن قرار مده:
    {
      "winnerId": "کد پرسنلی نفر برنده",
      "winnerName": "نام نفر برنده",
      "reasoning": "دلیل انتخاب به صورت فارسی یا انگلیسی و حرفه ای در 3 جمله",
      "period": "خرداد ۱۴۰۳"
    }
  `;

  try {
    if (provider === 'OLLAMA') {
      const url = settings?.ollamaUrl || 'http://localhost:11434';
      const model = settings?.ollamaModel || 'llama3';
      console.log(`[AI] Requesting Worker from Ollama at ${url}`);
      const rawText = await callLocalOllama(prompt, url, model, true);
      return cleanAndParseJson(rawText || "{}");
    }

    if (provider === 'LOCAL_HF') {
      const url = settings?.localHfUrl || 'http://localhost:8000';
      const model = settings?.localHfModel || 'model';
      console.log(`[AI] Requesting Worker from Hugging Face OpenAI Endpoint at ${url}`);
      const rawText = await callLocalHf(prompt, url, model, true);
      return cleanAndParseJson(rawText || "{}");
    }

    // Default: Gemini
    console.log("[AI] Requesting Worker from Google Gemini API...");
    const ai = new GoogleGenAI({ 
      apiKey: getApiKey(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winnerId: { type: Type.STRING },
            winnerName: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            period: { type: Type.STRING }
          },
          required: ["winnerId", "winnerName", "reasoning", "period"]
        }
      }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("[AI] Worker AI analysis failed or timed out:", error);
    if (autoFailover) {
      console.warn("[AI] Auto-Offline Mode activated for Worker Selection.");
      return selectOfflineWorkerOfMonth(rewards, violations, lang);
    }
    throw error;
  }
};