import React, { useState, useRef } from 'react';
import { Violation } from '../types';
import { generateSafetyReport } from '../services/geminiService';
import { Sparkles, Loader2, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface GeminiReportProps {
  violations: Violation[];
}

const GeminiReport: React.FC<GeminiReportProps> = ({ violations }) => {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerateReport = async () => {
    if (loading) return;
    setLoading(true);
    setIsOpen(true);
    const result = await generateSafetyReport(violations);
    setReport(result);
    setLoading(false);
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    
    const element = reportRef.current;
    
    const opt = {
        margin: [10, 10],
        filename: `Safety-Report-${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            // Ensure background color is captured if needed, mostly for the dark theme
            backgroundColor: '#4338ca' // Indigo-700 approx
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-l from-indigo-900 to-indigo-700 rounded-2xl p-6 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500 opacity-10 rounded-full translate-x-20 translate-y-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              هوش مصنوعی HSE
            </h2>
            <p className="text-indigo-200 mt-1 text-sm">
              تحلیل هوشمند تخلفات، شناسایی الگوهای خطر و ارائه راهکارهای پیشگیرانه.
            </p>
          </div>
          
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال تحلیل...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                تحلیل وضعیت ایمنی
              </>
            )}
          </button>
        </div>

        {(report || loading) && isOpen && (
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 animate-fade-in">
             <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    گزارش تحلیلی
                </h3>
                <div className="flex items-center gap-2">
                    {report && !loading && (
                        <button 
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-100 px-3 py-1.5 rounded-lg text-sm transition-colors border border-indigo-400/30"
                            title="دانلود گزارش به صورت PDF"
                        >
                            <Download className="w-4 h-4" />
                            <span>دانلود PDF</span>
                        </button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white p-1">
                        <ChevronUp className="w-5 h-5" />
                    </button>
                </div>
             </div>
            
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                    <div className="h-4 bg-white/20 rounded w-5/6"></div>
                </div>
            ) : (
                <div ref={reportRef} className="prose prose-invert prose-sm max-w-none text-right p-4 rounded-lg" dir="rtl">
                    <ReactMarkdown>{report}</ReactMarkdown>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiReport;