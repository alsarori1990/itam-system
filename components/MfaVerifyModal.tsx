import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface MfaVerifyModalProps {
  actionTitle: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const MfaVerifyModal: React.FC<MfaVerifyModalProps> = ({ actionTitle, onVerified, onCancel }) => {
  const { verifyMfa } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(false);

    // Small timeout to simulate network check feel
    setTimeout(() => {
        const isValid = verifyMfa(code);
        if (isValid) {
            onVerified();
        } else {
            setError(true);
            setVerifying(false);
        }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
       <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
           <div className="flex flex-col items-center text-center mb-6">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                   <ShieldCheck size={32} />
               </div>
               <h3 className="text-xl font-bold text-slate-800">التحقق بخطوتين</h3>
               <p className="text-sm text-slate-500 mt-2">
                   يرجى إدخال رمز المصادقة من تطبيق Authenticator لإتمام عملية: <span className="font-bold text-slate-700">{actionTitle}</span>
               </p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                   <input 
                      autoFocus
                      type="text" 
                      maxLength={6}
                      className={`w-full text-center text-2xl font-mono tracking-widest py-3 rounded-xl border-2 outline-none transition-colors ${error ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 focus:border-blue-500'}`}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                   />
                   {error && <p className="text-xs text-rose-600 font-bold mt-2 text-center">الرمز غير صحيح، حاول مرة أخرى.</p>}
               </div>

               <div className="flex gap-3">
                   <button 
                      type="button" 
                      onClick={onCancel}
                      className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
                   >
                       إلغاء
                   </button>
                   <button 
                      type="submit" 
                      disabled={code.length !== 6 || verifying}
                      className="flex-1 py-3 text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                       {verifying && <Loader2 size={18} className="animate-spin" />}
                       تحقق وتنفيذ
                   </button>
               </div>
           </form>
       </div>
    </div>
  );
};