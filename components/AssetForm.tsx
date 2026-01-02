
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, Cpu, DollarSign, Trash, Fingerprint, RefreshCw } from 'lucide-react';
import { AssetStatus, Asset } from '../types';
import { useApp } from '../context/AppContext';

interface AssetFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialAsset?: Asset;
}

export const AssetForm: React.FC<AssetFormProps> = ({ onCancel, onSuccess, initialAsset }) => {
  const { addAsset, updateAsset, config, generateAssetIdPreview } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(initialAsset?.image || null);
  const [idPreview, setIdPreview] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Asset>>({
    name: initialAsset?.name || '',
    type: initialAsset?.type || config.types[0] || 'أخرى',
    brand: initialAsset?.brand || '',
    serialNumber: initialAsset?.serialNumber || '',
    purchaseDate: initialAsset?.purchaseDate || new Date().toISOString().split('T')[0],
    warrantyExpiry: initialAsset?.warrantyExpiry || '',
    status: initialAsset?.status || config.statuses[0] || 'جديد',
    assignedTo: initialAsset?.assignedTo || '',
    location: initialAsset?.location || config.locations[0] || '',
    disposalDate: initialAsset?.disposalDate || '',
    disposalNotes: initialAsset?.disposalNotes || '',
    notes: initialAsset?.notes || ''
  });

  // Update preview whenever type or location changes
  useEffect(() => {
    if (!initialAsset) {
      if (formData.type && formData.location) {
        setIdPreview(generateAssetIdPreview(formData.type, formData.location));
      }
    } else {
        setIdPreview(initialAsset.id);
    }
  }, [formData.type, formData.location, initialAsset, generateAssetIdPreview]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const assetData = {
        ...formData,
        image: previewImage || undefined,
        lastUpdated: new Date().toISOString()
      };

      if (initialAsset) {
        // ID is not updated for existing assets (Immutability rule)
        updateAsset(initialAsset.id, assetData);
      } else {
        // ID generated inside Context
        addAsset(assetData as Asset);
      }
      
      setLoading(false);
      onSuccess();
    }, 800);
  };

  const isDisposalStatus = formData.status === AssetStatus.SOLD || formData.status === AssetStatus.SCRAPPED || formData.status === 'مباع' || formData.status === 'تم الإتلاف';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {initialAsset ? 'تعديل بيانات الأصل' : 'تسجيل أصل جديد'}
          </h2>
          <p className="text-slate-500 mt-1">
            {initialAsset ? 'تحديث معلومات الجهاز الحالي' : 'أدخل بيانات الجهاز وتفاصيل حالته'}
          </p>
        </div>
        <button 
          type="button" 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          إلغاء
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image Upload */}
        <div className="lg:col-span-1 space-y-4">
          <div 
            className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${
              previewImage ? 'border-blue-500 bg-slate-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewImage ? (
              <img src={previewImage} alt="Asset Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                  <Camera size={32} />
                </div>
                <p className="text-sm font-medium text-slate-600">التقاط صورة / رفع ملف</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />

          {/* Asset ID Preview Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
             <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Fingerprint size={16} />
                <span className="text-xs font-bold">رقم الأصل (Asset Tag)</span>
             </div>
             <div className="flex items-center justify-between">
                <span className={`font-mono font-bold text-lg ${initialAsset ? 'text-slate-800' : 'text-blue-600'}`}>
                   {idPreview || '---'}
                </span>
                {!initialAsset && (
                   <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      تلقائي
                   </span>
                )}
             </div>
             {!initialAsset && (
                <p className="text-[10px] text-slate-400 mt-2">
                   سيتم توليد الرقم التسلسلي (XXXX) عند الحفظ لضمان عدم التكرار.
                </p>
             )}
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم الجهاز</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-slate-800"
              placeholder="مثال: لابتوب ديل XPS 15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نوع الأصل</label>
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-black"
            >
              {config.types.filter(t => !config.hiddenOptions?.types?.includes(t) || t === formData.type).map(t => (
                <option key={t} value={t} className="text-black">{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">العلامة التجارية</label>
            <input
              type="text"
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">الرقم التسلسلي (S/N)</label>
            <div className="relative">
              <input
                type="text"
                value={formData.serialNumber}
                onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none pl-10 bg-white text-slate-800"
                placeholder="---"
              />
              <button type="button" className="absolute left-3 top-3 text-slate-400 hover:text-slate-600">
                <div className="w-5 h-5 border-2 border-slate-400 rounded-sm flex items-center justify-center text-[10px]">|||</div>
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <label className="block text-sm font-bold text-slate-800 mb-2">الحالة والموقع</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-black"
                  >
                    {config.statuses.filter(s => !config.hiddenOptions?.statuses?.includes(s) || s === formData.status).map(s => (
                      <option key={s} value={s} className="text-black">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">الموقع الحالي</label>
                  <select
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-black"
                  >
                     <option value="" disabled className="text-slate-400">اختر الموقع</option>
                     {config.locations.filter(l => !config.hiddenOptions?.locations?.includes(l) || l === formData.location).map(l => (
                        <option key={l} value={l} className="text-black">{l}</option>
                     ))}
                  </select>
                </div>
             </div>

             {/* Dynamic Fields for Sold/Scrapped */}
             {isDisposalStatus && (
               <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 text-slate-700">
                     {formData.status === AssetStatus.SOLD ? <DollarSign size={18} /> : <Trash size={18} />}
                     <span className="font-bold text-sm">تفاصيل {formData.status === AssetStatus.SOLD ? 'البيع' : 'الإتلاف'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">تاريخ العملية</label>
                      <input
                        type="date"
                        required={isDisposalStatus}
                        value={formData.disposalDate || ''}
                        onChange={e => setFormData({...formData, disposalDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 focus:border-amber-500 outline-none text-amber-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ملاحظات العملية</label>
                      <input
                        type="text"
                        placeholder={formData.status === AssetStatus.SOLD ? "لمن تم البيع / السعر" : "طريقة الإتلاف / السبب"}
                        value={formData.disposalNotes || ''}
                        onChange={e => setFormData({...formData, disposalNotes: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 focus:border-amber-500 outline-none text-amber-900"
                      />
                    </div>
                  </div>
               </div>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الشراء</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">انتهاء الضمان</label>
            <input
              type="date"
              value={formData.warrantyExpiry}
              onChange={e => setFormData({...formData, warrantyExpiry: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-slate-800"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">المستخدم المسؤول (اختياري)</label>
            <input
              type="text"
              value={formData.assignedTo}
              onChange={e => setFormData({...formData, assignedTo: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-slate-800"
            />
          </div>
          
           <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات عامة</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white text-slate-800"
            />
          </div>

          <div className="md:col-span-2 pt-4 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {initialAsset ? 'تحديث البيانات' : 'حفظ وإنشاء الرقم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
