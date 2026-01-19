
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Settings as SettingsIcon, MapPin, Tag, Activity, Hash, ShieldCheck, Smartphone, CheckCircle2, Lock, List, MessageSquare, CreditCard, LayoutList, Eye, EyeOff, AlertTriangle, X, Mail } from 'lucide-react';
import { AppConfig } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { InboundEmailManager } from './InboundEmailManager';

// --- Standalone ConfigSection Component ---
interface ConfigSectionProps {
    title: string;
    categoryKey: keyof AppConfig;
    icon: any;
    items: string[];
    inputValue: string;
    setInputValue: (val: string) => void;
    codeValue?: string;
    setCodeValue?: (val: string) => void;
    codes?: Record<string, string>;
    onCodeChange?: (key: string, val: string) => void;
    onAdd: () => void;
    onConfirmDelete: (item: string) => void;
    checkInUse: (category: keyof AppConfig, val: string) => boolean;
    toggleHidden: (category: keyof AppConfig, val: string) => void;
    hiddenOptions: Record<string, string[]>;
    onBlockDelete: (item: string) => void; // Callback to parent to show modal
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ 
    title, 
    categoryKey, 
    icon: Icon, 
    items, 
    inputValue, 
    setInputValue, 
    codeValue, 
    setCodeValue, 
    codes, 
    onCodeChange, 
    onAdd, 
    onConfirmDelete,
    checkInUse,
    toggleHidden,
    hiddenOptions,
    onBlockDelete
  }) => {
    
    const handleDeleteAttempt = (item: string) => {
        // 1. Strict Check: Check if item is in use
        const isInUse = checkInUse(categoryKey, item);
        
        if (isInUse) {
            // Trigger parent modal instead of window.alert
            onBlockDelete(item);
            return;
        } 
        
        // 2. Not in use -> Trigger parent confirmation modal
        onConfirmDelete(item);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full animate-fade-in">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="الاسم (مثلاً: لابتوب)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white text-slate-800"
                />
                {setCodeValue && (
                    <input
                    type="text"
                    value={codeValue}
                    maxLength={3}
                    onChange={(e) => setCodeValue(e.target.value)}
                    placeholder="الكود (3 حروف)"
                    className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-center text-sm uppercase font-mono bg-white text-slate-800"
                    />
                )}
                <button
                onClick={onAdd}
                disabled={!inputValue.trim() || (setCodeValue && !codeValue?.trim())}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-64 scrollbar-thin">
                {items.map((item: string, idx: number) => {
                    const isHidden = hiddenOptions[categoryKey]?.includes(item);

                    return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${isHidden ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                            <span className={`text-sm truncate flex-1 ml-2 ${isHidden ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}>{item}</span>
                            
                            {codes && (
                                <div className="flex items-center gap-2">
                                    <Hash size={12} className="text-slate-400" />
                                    <input 
                                    type="text" 
                                    value={codes[item] || '---'} 
                                    maxLength={3}
                                    onChange={(e) => onCodeChange && onCodeChange(item, e.target.value)}
                                    className="w-12 bg-white border border-slate-200 text-center text-xs font-mono font-bold uppercase rounded p-1 focus:border-blue-500 outline-none text-slate-800"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-1 mr-2">
                                <button
                                    onClick={() => toggleHidden(categoryKey, item)}
                                    className={`p-1.5 rounded-lg transition-colors ${isHidden ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-blue-600'}`}
                                    title={isHidden ? "إظهار العنصر" : "إخفاء العنصر"}
                                >
                                    {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>

                                <button
                                    onClick={() => handleDeleteAttempt(item)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="حذف"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const Settings: React.FC = () => {
  const { config, updateConfig, updateCode, isMfaEnabled, generateMfaSecret, enableMfa, disableMfa, checkInUse, toggleHidden } = useApp();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'LISTS' | 'SECURITY' | 'EMAILS'>('LISTS');

  // Local state for inputs
  const [newType, setNewType] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  
  const [newLocation, setNewLocation] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('');

  const [newStatus, setNewStatus] = useState('');
  const [newTicketCat, setNewTicketCat] = useState('');
  const [newSubCat, setNewSubCat] = useState('');
  const [newSimProvider, setNewSimProvider] = useState('');

  // Delete Modal States
  const [blockedItem, setBlockedItem] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{category: keyof AppConfig, item: string} | null>(null);

  // MFA Setup State
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState(false);

  const handleStartMfaSetup = () => {
     const data = generateMfaSecret();
     setMfaSetupData(data);
     setMfaVerifyCode('');
     setMfaError(false);
  };

  const handleConfirmMfa = () => {
      if (mfaSetupData) {
          const success = enableMfa(mfaSetupData.secret, mfaVerifyCode);
          if (success) {
              setMfaSetupData(null);
          } else {
              setMfaError(true);
          }
      }
  };

  const handleAdd = (category: keyof AppConfig, value: string, setter: (s: string) => void, code?: string, codeSetter?: (s: string) => void) => {
    if (value.trim()) {
      updateConfig(category, 'add', value.trim(), code?.toUpperCase());
      setter('');
      if(codeSetter) codeSetter('');
    }
  };

  const executeDelete = () => {
      if (confirmDeleteItem) {
          updateConfig(confirmDeleteItem.category, 'remove', confirmDeleteItem.item);
          setConfirmDeleteItem(null);
      }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="text-slate-400" />
          إعدادات النظام
        </h2>
        <p className="text-slate-500 mt-1">إدارة القوائم المنسدلة والأمان</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
          <button 
              onClick={() => setActiveTab('LISTS')}
              className={`pb-3 px-6 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'LISTS' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <LayoutList size={18} />
              إدارة القوائم
              {activeTab === 'LISTS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button 
              onClick={() => setActiveTab('SECURITY')}
              className={`pb-3 px-6 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'SECURITY' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <ShieldCheck size={18} />
              الأمان
              {activeTab === 'SECURITY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button 
              onClick={() => setActiveTab('EMAILS')}
              className={`pb-3 px-6 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'EMAILS' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Mail size={18} />
              إدارة البريد الوارد
              {activeTab === 'EMAILS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        
        {/* TAB 1: LISTS */}
        {activeTab === 'LISTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                <ConfigSection
                    title="أنواع الأصول وأكوادها"
                    categoryKey="types"
                    icon={Tag}
                    items={config.types}
                    inputValue={newType}
                    setInputValue={setNewType}
                    codeValue={newTypeCode}
                    setCodeValue={setNewTypeCode}
                    codes={config.typeCodes}
                    onCodeChange={(key, val) => updateCode('typeCodes', key, val)}
                    onAdd={() => handleAdd('types', newType, setNewType, newTypeCode, setNewTypeCode)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'types', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />

                <ConfigSection
                    title="المواقع وأكوادها"
                    categoryKey="locations"
                    icon={MapPin}
                    items={config.locations}
                    inputValue={newLocation}
                    setInputValue={setNewLocation}
                    codeValue={newLocationCode}
                    setCodeValue={setNewLocationCode}
                    codes={config.locationCodes}
                    onCodeChange={(key, val) => updateCode('locationCodes', key, val)}
                    onAdd={() => handleAdd('locations', newLocation, setNewLocation, newLocationCode, setNewLocationCode)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'locations', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />

                <ConfigSection
                    title="حالات الأصول"
                    categoryKey="statuses"
                    icon={Activity}
                    items={config.statuses}
                    inputValue={newStatus}
                    setInputValue={setNewStatus}
                    onAdd={() => handleAdd('statuses', newStatus, setNewStatus)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'statuses', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />

                <ConfigSection
                    title="تصنيفات التذاكر"
                    categoryKey="ticketCategories"
                    icon={MessageSquare}
                    items={config.ticketCategories}
                    inputValue={newTicketCat}
                    setInputValue={setNewTicketCat}
                    onAdd={() => handleAdd('ticketCategories', newTicketCat, setNewTicketCat)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'ticketCategories', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />

                <ConfigSection
                    title="تصنيفات الاشتراكات"
                    categoryKey="subscriptionCategories"
                    icon={CreditCard}
                    items={config.subscriptionCategories}
                    inputValue={newSubCat}
                    setInputValue={setNewSubCat}
                    onAdd={() => handleAdd('subscriptionCategories', newSubCat, setNewSubCat)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'subscriptionCategories', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />

                <ConfigSection
                    title="مزودي الخدمة (SIM)"
                    categoryKey="simProviders"
                    icon={Smartphone}
                    items={config.simProviders}
                    inputValue={newSimProvider}
                    setInputValue={setNewSimProvider}
                    onAdd={() => handleAdd('simProviders', newSimProvider, setNewSimProvider)}
                    onConfirmDelete={(val) => setConfirmDeleteItem({ category: 'simProviders', item: val })}
                    checkInUse={checkInUse}
                    toggleHidden={toggleHidden}
                    hiddenOptions={config.hiddenOptions}
                    onBlockDelete={setBlockedItem}
                />
            </div>
        )}

        {/* TAB 2: SECURITY */}
        {activeTab === 'SECURITY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">الأمان والمصادقة</h3>
                        <p className="text-xs text-slate-500">حماية العمليات الحساسة مثل الحذف</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {!isMfaEnabled && !mfaSetupData && (
                        <div className="flex-1 w-full">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="bg-white p-2 rounded-lg text-slate-400 shadow-sm"><Smartphone size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">المصادقة الثنائية (2FA) غير مفعلة</h4>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                        قم بتفعيل المصادقة باستخدام تطبيقات مثل Google Authenticator أو Microsoft Authenticator لحماية عمليات الحذف والتعديلات الجذرية.
                                    </p>
                                    <button onClick={handleStartMfaSetup} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">
                                        إعداد المصادقة الآن
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mfaSetupData && (
                        <div className="flex-1 w-full max-w-2xl bg-indigo-50 p-6 rounded-xl border border-indigo-100 animate-fade-in">
                            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                <Smartphone size={18} /> إعداد تطبيق المصادقة
                            </h4>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100 h-fit">
                                    <QRCodeSVG value={mfaSetupData.uri} size={150} level="M" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <ol className="list-decimal list-inside text-sm text-indigo-800 space-y-2">
                                        <li>افتح تطبيق Google Authenticator أو Microsoft Authenticator.</li>
                                        <li>امسح رمز QR الظاهر أمامك.</li>
                                        <li>أدخل الرمز المكون من 6 أرقام الذي يظهر في التطبيق أدناه للتأكيد.</li>
                                    </ol>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            maxLength={6} 
                                            placeholder="000000" 
                                            className="w-32 px-4 py-2 rounded-lg border border-indigo-200 outline-none text-center tracking-widest font-mono font-bold bg-white"
                                            value={mfaVerifyCode}
                                            onChange={(e) => setMfaVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        />
                                        <button onClick={handleConfirmMfa} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">
                                            تفعيل
                                        </button>
                                        <button onClick={() => setMfaSetupData(null)} className="px-4 py-2 text-indigo-600 font-bold text-sm hover:bg-indigo-100 rounded-lg">
                                            إلغاء
                                        </button>
                                    </div>
                                    {mfaError && <p className="text-xs text-rose-600 font-bold">الرمز غير صحيح، يرجى المحاولة مرة أخرى.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {isMfaEnabled && (
                        <div className="flex-1 w-full">
                            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm"><CheckCircle2 size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-emerald-900">المصادقة الثنائية مفعلة</h4>
                                    <p className="text-sm text-emerald-800 mt-1">
                                        حسابك محمي. سيتم طلب رمز المصادقة عند إجراء عمليات حساسة مثل حذف الأصول.
                                    </p>
                                    <button onClick={disableMfa} className="mt-4 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-bold text-sm hover:bg-rose-50 transition-colors">
                                        تعطيل المصادقة
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 3: EMAIL MANAGEMENT */}
        {activeTab === 'EMAILS' && (
            <div className="animate-fade-in">
                <InboundEmailManager />
            </div>
        )}
      </div>

      {/* MODAL 1: Block Delete Warning */}
      {blockedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="text-rose-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">لا يمكن الحذف!</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                      العنصر <span className="font-bold text-slate-800 bg-slate-100 px-2 rounded mx-1">{blockedItem}</span> مرتبط بسجلات نشطة في النظام (أصول، تذاكر، أو اشتراكات).
                      <br/><br/>
                      <span className="text-sm text-slate-500">للحفاظ على تكامل البيانات، يرجى استخدام زر <b>"الإخفاء"</b> (العيون 👁️) بدلاً من الحذف.</span>
                  </p>
                  <button 
                      onClick={() => setBlockedItem(null)}
                      className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                  >
                      فهمت ذلك
                  </button>
              </div>
          </div>
      )}

      {/* MODAL 2: Confirm Delete */}
      {confirmDeleteItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <Trash2 className="text-amber-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
                  <p className="text-slate-600 mb-6">
                      هل أنت متأكد من حذف العنصر <span className="font-bold text-slate-800 bg-slate-100 px-2 rounded mx-1">{confirmDeleteItem.item}</span> نهائياً؟
                  </p>
                  <div className="flex gap-3 w-full">
                      <button 
                          onClick={() => setConfirmDeleteItem(null)}
                          className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                      >
                          إلغاء
                      </button>
                      <button 
                          onClick={executeDelete}
                          className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                      >
                          حذف نهائي
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
