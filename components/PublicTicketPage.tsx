
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Send, CheckCircle2, AlertCircle, ArrowLeft, Mail, Phone, Image as ImageIcon, X } from 'lucide-react';
import { TicketPriority } from '../types';

interface PublicTicketPageProps {
    onBack: () => void;
}

const ALLOWED_DOMAINS = ['@daralesnad.net', '@daralesnad.com', '@daralesnad.sa'];

// Bilingual Helper for Priorities
const getPriorityLabel = (p: TicketPriority) => {
    switch (p) {
        case TicketPriority.LOW: return 'منخفض / Low';
        case TicketPriority.MEDIUM: return 'متوسط / Medium';
        case TicketPriority.HIGH: return 'عالي / High';
        case TicketPriority.CRITICAL: return 'حرج / Critical';
        default: return p;
    }
};

export const PublicTicketPage: React.FC<PublicTicketPageProps> = ({ onBack }) => {
  const { submitPublicTicket, config } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
      requesterName: '',
      email: '',
      phone: '',
      branch: '',
      // Category removed from user input
      priority: TicketPriority.MEDIUM,
      description: ''
  });
  
  const [attachment, setAttachment] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
      if (!email) {
          setEmailError('البريد الإلكتروني مطلوب / Email is required');
          return false;
      }
      
      const isValid = ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
      
      if (!isValid) {
          setEmailError(`عذراً، هذا البريد غير مقبول. يجب استخدام نطاق رسمي. / Invalid email domain.`);
          return false;
      }
      
      setEmailError('');
      return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateEmail(formData.email)) {
          return;
      }

      setLoading(true);
      
      // Simulate network delay for UX
      setTimeout(() => {
          // We append phone to the description to ensure the support team sees it
          let contactInfo = '';
          if (formData.phone) {
             contactInfo += `[Phone: ${formData.phone}]`;
          }
          const finalDescription = `${contactInfo}\n\n${formData.description}`;

          const id = submitPublicTicket({
              requesterName: formData.requesterName,
              requesterEmail: formData.email, // Passing email explicitly for SMTP
              branch: formData.branch,
              category: 'غير محدد', // Default for public tickets, to be classified by Technician
              priority: formData.priority,
              description: finalDescription,
              attachmentImage: attachment || undefined
          });
          setSubmittedId(id);
          setLoading(false);
      }, 1000);
  };

  const handleReset = () => {
      setSubmittedId(null);
      setFormData({
          requesterName: '',
          email: '',
          phone: '',
          branch: '',
          priority: TicketPriority.MEDIUM,
          description: ''
      });
      setAttachment(null);
      setEmailError('');
  };

  if (submittedId) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white w-full max-w-md rounded-3xl shadow-xl p-8 text-center border border-slate-100 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">تم استلام طلبك بنجاح!</h2>
                  <h3 className="text-lg font-medium text-slate-600 mb-4 font-sans">Request Received Successfully!</h3>
                  
                  <p className="text-slate-500 mb-2">رقم التذكرة للمتابعة / Ticket ID:</p>
                  
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 mb-8">
                      <span className="text-3xl font-mono font-bold text-blue-600 tracking-wider">{submittedId}</span>
                  </div>
                  
                  <div className="text-sm text-slate-400 mb-8 space-y-1">
                      <p>تم إرسال تأكيد إلى بريدك الإلكتروني ({formData.email}).</p>
                      <p className="font-sans text-xs">Confirmation sent to your email.</p>
                  </div>
                  
                  <button 
                      onClick={handleReset}
                      className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors mb-4"
                  >
                      تقديم طلب آخر / Submit Another Request
                  </button>
                  
                   <button 
                      onClick={(e) => { e.preventDefault(); onBack(); }}
                      className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                  >
                      العودة للرئيسية / Back to Home
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-lg">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-200">
                    ذ
                </div>
                <h1 className="text-2xl font-bold text-slate-800">بوابة الدعم الفني</h1>
                <h2 className="text-lg font-medium text-slate-600 font-sans">Technical Support Portal</h2>
                <div className="text-slate-500 mt-2 text-sm">
                    <p>نحن هنا لمساعدتك. قم بتقديم طلبك وسنتواصل معك.</p>
                    <p className="font-sans text-xs mt-1">We are here to help. Submit your request and we will contact you.</p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            الاسم الكامل <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Full Name</span> <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            required 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white text-slate-900"
                            placeholder="مثال: محمد عبدالله / Ex: Mohammed Abdullah"
                            value={formData.requesterName}
                            onChange={e => setFormData({...formData, requesterName: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            البريد الإلكتروني للشركة <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Company Email</span> <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                             <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
                            <input 
                                required 
                                type="email" 
                                className={`w-full pr-12 pl-4 py-3 rounded-xl border outline-none transition-all ${emailError ? 'border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'}`}
                                placeholder="name@daralesnad.com"
                                value={formData.email}
                                onChange={e => {
                                    setFormData({...formData, email: e.target.value});
                                    if (emailError) setEmailError('');
                                }}
                                onBlur={(e) => validateEmail(e.target.value)}
                            />
                        </div>
                        {emailError && (
                            <p className="text-xs font-bold text-rose-600 mt-2 flex items-start gap-1">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                {emailError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            رقم الهاتف <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Phone Number</span>
                            <span className="text-slate-400 text-xs font-normal mr-2">(اختياري / Optional)</span>
                        </label>
                        <div className="relative">
                             <Phone className="absolute right-4 top-3.5 text-slate-400" size={20} />
                            <input 
                                type="tel" 
                                className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white text-slate-900"
                                placeholder="05xxxxxxxx"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 truncate">
                            الموقع <span className="font-normal text-slate-400">/</span> <span className="font-sans text-slate-600">Location</span> <span className="text-rose-500">*</span>
                        </label>
                        <select 
                            required 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-slate-900"
                            value={formData.branch}
                            onChange={e => setFormData({...formData, branch: e.target.value})}
                        >
                            <option value="">اختر / Select</option>
                            {config.locations.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            الأهمية <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Priority</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            {[TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.CRITICAL].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setFormData({...formData, priority: p})}
                                    className={`py-2 px-1 text-[10px] md:text-xs font-bold rounded-lg transition-all text-center ${
                                        formData.priority === p 
                                        ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {getPriorityLabel(p)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            وصف المشكلة <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Description</span> <span className="text-rose-500">*</span>
                        </label>
                        <textarea 
                            required 
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white text-slate-900"
                            placeholder="الرجاء وصف المشكلة بدقة... / Please describe the issue..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            صورة للمشكلة <span className="font-normal text-slate-400 mx-1">/</span> <span className="font-sans text-slate-600">Image</span>
                            <span className="text-slate-400 text-xs font-normal mr-2">(اختياري / Optional)</span>
                        </label>
                        <div 
                            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
                                attachment ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                            }`}
                            onClick={() => !attachment && fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            
                            {attachment ? (
                                <div className="relative w-full">
                                    <img src={attachment} alt="Attachment" className="w-full h-40 object-contain rounded-lg" />
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                        className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600"
                                        title="حذف الصورة"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon className="text-slate-400 mb-2" size={32} />
                                    <p className="text-sm text-slate-500 font-medium">اضغط لرفع صورة</p>
                                    <p className="text-xs text-slate-400 font-sans">Click to upload image</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'جاري الإرسال / Sending...' : (
                                <>
                                    <Send size={20} className="ml-1" /> إرسال الطلب / Submit Request
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onBack(); }}
                            className="text-xs text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors mx-auto"
                        >
                            <ArrowLeft size={12} /> العودة لتسجيل الدخول / Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};
