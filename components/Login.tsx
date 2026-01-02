
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Mail, ChevronRight, Fingerprint, ShieldCheck, User, LifeBuoy } from 'lucide-react';

interface LoginProps {
  onPublicAccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onPublicAccess }) => {
  const { login, allUsers } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
        // For demo: verify email exists in system, accept any password
        const success = login(email);
        if (!success) {
            setError('البريد الإلكتروني غير مسجل في النظام.');
        } else {
            setError('');
        }
    } else {
        setError('يرجى ملء جميع الحقول');
    }
  };

  // Quick Login Helper
  const handleQuickLogin = (userEmail: string) => {
      login(userEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
            
            {/* Logo Area */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-blue-200">
                    ذ
                </div>
                <h1 className="text-2xl font-bold text-slate-800">نظام إدارة تقنية المعلومات الموحد</h1>
                <p className="text-slate-500 mt-2">قم بتسجيل الدخول للمتابعة</p>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
                            <input 
                                type="email" 
                                className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-3.5 text-slate-400" size={20} />
                            <input 
                                type="password" 
                                className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        تسجيل الدخول <ChevronRight size={20} className="mt-0.5" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={(e) => { e.preventDefault(); onPublicAccess(); }}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 cursor-pointer"
                    >
                        <LifeBuoy size={16} />
                        هل تواجه مشكلة؟ تقديم تذكرة دعم (زائر)
                    </button>
                </div>

                {/* Dev Tools / Quick Login */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 text-center mb-4 uppercase tracking-widest">الدخول السريع (للتجربة)</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleQuickLogin('admin@company.com')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors group">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck size={16} className="text-purple-600"/>
                                <span className="text-xs font-bold text-slate-700 group-hover:text-purple-700">مدير عام</span>
                            </div>
                            <p className="text-[10px] text-slate-400">صلاحيات كاملة</p>
                        </button>
                        <button onClick={() => handleQuickLogin('saad@company.com')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors group">
                            <div className="flex items-center gap-2 mb-1">
                                <Fingerprint size={16} className="text-blue-600"/>
                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">مدير IT</span>
                            </div>
                            <p className="text-[10px] text-slate-400">فرع جدة</p>
                        </button>
                        <button onClick={() => handleQuickLogin('tech@company.com')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors group">
                            <div className="flex items-center gap-2 mb-1">
                                <User size={16} className="text-emerald-600"/>
                                <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">فني دعم</span>
                            </div>
                            <p className="text-[10px] text-slate-400">مهام محددة</p>
                        </button>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-slate-400 text-xs mt-8">
                &copy; {new Date().getFullYear()} نظام إدارة الأصول التقنية الموحد. جميع الحقوق محفوظة.
            </p>
        </div>
    </div>
  );
};
