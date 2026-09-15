import React, { useState } from 'react';
import { Gavel, X } from 'lucide-react';

interface VerdictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (verdict: string) => void;
  employeeName: string;
}

const VerdictModal: React.FC<VerdictModalProps> = ({ isOpen, onClose, onSubmit, employeeName }) => {
  const [verdict, setVerdict] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(verdict);
    setVerdict('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-2 text-white">
                <Gavel className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold">ثبت رای کمیته انضباطی</h3>
             </div>
             <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
             </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            لطفاً رای نهایی کمیته را برای پرسنل <span className="font-bold text-gray-900">{employeeName}</span> وارد کنید.
            این رای در سوابق ایشان ثبت خواهد شد.
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-2">متن رای</label>
          <textarea
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all h-32 resize-none text-sm"
            placeholder="مثال: با توجه به دفاعیات نامبرده، مقرر گردید..."
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
          />
          
          <div className="flex gap-3 mt-6 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              ثبت نهایی رای
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerdictModal;