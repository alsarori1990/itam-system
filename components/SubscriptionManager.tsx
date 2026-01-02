
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Subscription, RenewalRecord, BillingCycle, SubscriptionType } from '../types';
import { CreditCard, Plus, Filter, AlertTriangle, CheckCircle2, XCircle, Calendar, DollarSign, History, User, Clock, ArrowRight, Save, RotateCcw, Lock, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useDebounce } from '../utils/performanceUtils';

interface SubscriptionManagerProps {
    initialFilters?: { filterSpecial?: string; type?: string };
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ initialFilters }) => {
  const { subscriptions, renewals, config, addSubscription, addRenewal, getSubscriptionHistory, hasPermission } = useApp();
  
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'renew'>('list');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState('ALL');
  const [filterSpecial, setFilterSpecial] = useState<'NONE' | 'EXPIRING_SOON'>('NONE');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Permission Check for Sensitive Data
  const canSeeCosts = hasPermission('subscriptions', 'view_sensitive');

  // Forms State
  const [newSub, setNewSub] = useState<Partial<Subscription>>({});
  const [newRenewal, setNewRenewal] = useState<Partial<RenewalRecord>>({});

  // Apply Initial Filters
  useEffect(() => {
    if (initialFilters) {
        if (initialFilters.filterSpecial === 'EXPIRING_SOON') {
            setFilterSpecial('EXPIRING_SOON');
        }
        if (initialFilters.type) {
            setFilterType(initialFilters.type);
        }
    }
  }, [initialFilters]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, filterType, filterSpecial]);

  // Helper: Calculate Days Remaining
  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return -999;
    const end = new Date(dateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  // Helper: Get Status Badge based on days remaining
  const getStatusBadge = (sub: Subscription) => {
    const days = getDaysRemaining(sub.nextRenewalDate);
    if (sub.status === 'CANCELLED') return <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">ملغي</span>;
    
    if (days < 0) return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">منتهي</span>;
    if (days <= 7) return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">ينتهي قريباً جداً ({days} يوم)</span>;
    if (days <= 30) return <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">ينتهي خلال {days} يوم</span>;
    
    return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">نشط</span>;
  };

  // --- Filtering & Pagination Logic ---
  const filteredSubs = useMemo(() => subscriptions.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || s.vendor.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || s.type === filterType;
    let matchSpecial = true;
    if (filterSpecial === 'EXPIRING_SOON') {
        const days = getDaysRemaining(s.nextRenewalDate);
        matchSpecial = days <= 30 && s.status !== 'CANCELLED';
    }
    return matchSearch && matchType && matchSpecial;
  }), [subscriptions, debouncedSearchTerm, filterType, filterSpecial]);

  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredSubs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // --- Handlers ---

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSub.name && newSub.billingCycle) {
      // @ts-ignore - Simplified for demo
      addSubscription(newSub, newRenewal.cost ? newRenewal : undefined);
      setView('list');
      setNewSub({});
      setNewRenewal({});
    }
  };

  const handleRenewSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSub && newRenewal.endDate && newRenewal.cost) {
      // @ts-ignore
      addRenewal(selectedSub.id, newRenewal);
      setView('detail');
      setNewRenewal({});
    }
  };

  const openRenewWizard = () => {
    if (!selectedSub) return;
    const lastDate = selectedSub.nextRenewalDate ? new Date(selectedSub.nextRenewalDate) : new Date();
    
    // Auto calculate next period
    const start = new Date(lastDate);
    start.setDate(start.getDate() + 1); // Start next day

    const end = new Date(start);
    if (selectedSub.billingCycle === BillingCycle.MONTHLY) end.setMonth(end.getMonth() + 1);
    else if (selectedSub.billingCycle === BillingCycle.YEARLY) end.setFullYear(end.getFullYear() + 1);
    else if (selectedSub.billingCycle === BillingCycle.WEEKLY) end.setDate(end.getDate() + 7);
    
    // Find last renewal cost to suggest
    const lastRenewal = renewals.find(r => r.id === selectedSub.currentRenewalId);

    setNewRenewal({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      cost: lastRenewal?.cost || 0,
      currency: lastRenewal?.currency || 'SAR',
      quantity: selectedSub.totalSeats || 1
    });
    setView('renew');
  };

  // --- Views ---

  const CreateView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto animate-fade-in">
       <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-slate-800">إضافة اشتراك / ترخيص جديد</h2>
           <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">إلغاء</button>
       </div>
       <form onSubmit={handleCreateSub} className="space-y-6">
          {/* ... inputs ... */}
          {/* Similar to previous, but wrapping cost input with permission check */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الاشتراك</label>
                <input required type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                   value={newSub.name || ''} onChange={e => setNewSub({...newSub, name: e.target.value})} placeholder="مثال: Adobe CC" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المزود (Vendor)</label>
                <input required type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                   value={newSub.vendor || ''} onChange={e => setNewSub({...newSub, vendor: e.target.value})} />
             </div>
             {/* ... */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">النوع</label>
                <select required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-black"
                   value={newSub.type || ''} onChange={e => setNewSub({...newSub, type: e.target.value as SubscriptionType})}>
                   <option value="">اختر النوع</option>
                   {Object.values(SubscriptionType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
             
             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التصنيف (Category)</label>
                <select required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-black"
                   value={newSub.category || ''} onChange={e => setNewSub({...newSub, category: e.target.value})}>
                   <option value="">اختر التصنيف</option>
                   {config.subscriptionCategories.filter(c => !config.hiddenOptions?.subscriptionCategories?.includes(c)).map(c => (
                     <option key={c} value={c}>{c}</option>
                   ))}
                </select>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">دورة الفوترة</label>
                <select required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-black"
                   value={newSub.billingCycle || ''} onChange={e => setNewSub({...newSub, billingCycle: e.target.value as BillingCycle})}>
                   <option value="">اختر الدورة</option>
                   {Object.values(BillingCycle).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
             <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><DollarSign size={16}/> تفاصيل الفترة الحالية (First Renewal)</h4>
             <div className="grid grid-cols-2 gap-4">
                {/* ... Dates ... */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ البداية</label>
                   <input type="date" required className="w-full p-2 rounded-lg border border-slate-200 text-slate-800 bg-white"
                      value={newRenewal.startDate || ''} onChange={e => setNewRenewal({...newRenewal, startDate: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ النهاية</label>
                   <input type="date" required className="w-full p-2 rounded-lg border border-slate-200 text-slate-800 bg-white"
                      value={newRenewal.endDate || ''} onChange={e => setNewRenewal({...newRenewal, endDate: e.target.value})} />
                </div>
                
                {canSeeCosts ? (
                    <>
                        <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">التكلفة</label>
                        <input type="number" required className="w-full p-2 rounded-lg border border-slate-200 text-slate-800 bg-white"
                            value={newRenewal.cost || ''} onChange={e => setNewRenewal({...newRenewal, cost: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">العملة</label>
                        <select className="w-full p-2 rounded-lg border border-slate-200 bg-white text-black"
                            value={newRenewal.currency || 'SAR'} onChange={e => setNewRenewal({...newRenewal, currency: e.target.value})}>
                            <option value="SAR">SAR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                        </div>
                    </>
                ) : (
                    <div className="col-span-2 flex items-center gap-2 text-slate-400 text-sm bg-slate-100 p-2 rounded-lg">
                        <Lock size={16} />
                        لا تملك صلاحية لإدخال أو عرض التكاليف المالية.
                    </div>
                )}
             </div>
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">حفظ الاشتراك</button>
       </form>
    </div>
  );

  const RenewalWizard = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
                 <RotateCcw size={24} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-slate-800">تجديد الاشتراك</h2>
                 <p className="text-slate-500 text-sm">{selectedSub?.name}</p>
             </div>
        </div>

        <form onSubmit={handleRenewSub} className="space-y-5">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800">
                سيتم إضافة سجل تجديد جديد وتحديث تاريخ الانتهاء الرئيسي للاشتراك.
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">بداية الفترة</label>
                   <input type="date" required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                      value={newRenewal.startDate || ''} onChange={e => setNewRenewal({...newRenewal, startDate: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">نهاية الفترة</label>
                   <input type="date" required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                      value={newRenewal.endDate || ''} onChange={e => setNewRenewal({...newRenewal, endDate: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {canSeeCosts ? (
                    <>
                        <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">التكلفة الجديدة</label>
                        <input type="number" required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                            value={newRenewal.cost || ''} onChange={e => setNewRenewal({...newRenewal, cost: parseFloat(e.target.value)})} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Lock size={16} /> التكلفة مخفية
                    </div>
                )}
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">عدد المقاعد/الرخص</label>
                   <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                      value={newRenewal.quantity || ''} onChange={e => setNewRenewal({...newRenewal, quantity: parseFloat(e.target.value)})} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات (اختياري)</label>
                <textarea className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" rows={2}
                   value={newRenewal.notes || ''} onChange={e => setNewRenewal({...newRenewal, notes: e.target.value})} 
                   placeholder="سبب التغيير في السعر، رقم الفاتورة..."
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setView('detail')} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">تأكيد التجديد</button>
            </div>
        </form>
    </div>
  );

  const DetailView = () => {
    if (!selectedSub) return null;
    const subHistory = renewals.filter(r => r.subscriptionId === selectedSub.id).sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    
    return (
        <div className="flex flex-col h-full animate-fade-in">
             <div className="flex items-center justify-between mb-6">
                <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
                    <ArrowRight size={20} /> عودة للقائمة
                </button>
                <div className="flex gap-2">
                    <button onClick={openRenewWizard} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm">
                        <RotateCcw size={18} /> تجديد الآن
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <h2 className="text-2xl font-bold text-slate-800">{selectedSub.name}</h2>
                                 <p className="text-slate-500">{selectedSub.vendor} • {selectedSub.billingCycle}</p>
                             </div>
                             {getStatusBadge(selectedSub)}
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                             {/* ... details ... */}
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-xs text-slate-500 font-bold mb-1">ينتهي في</p>
                                 <p className="font-mono font-bold text-slate-800">{selectedSub.nextRenewalDate}</p>
                             </div>
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-xs text-slate-500 font-bold mb-1">المقاعد</p>
                                 <p className="font-mono font-bold text-slate-800">{selectedSub.totalSeats}</p>
                             </div>
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-xs text-slate-500 font-bold mb-1">المسؤول</p>
                                 <p className="font-bold text-slate-800 text-sm truncate">{selectedSub.owner}</p>
                             </div>
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <p className="text-xs text-slate-500 font-bold mb-1">النوع</p>
                                 <p className="font-bold text-slate-800 text-sm truncate">{selectedSub.type}</p>
                             </div>
                         </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={20}/> سجل التجديدات (History)</h3>
                         <div className="overflow-x-auto">
                             <table className="w-full text-right text-sm">
                                 <thead className="bg-slate-50 text-slate-500">
                                     <tr>
                                         <th className="p-3 rounded-r-lg">الفترة</th>
                                         <th className="p-3">التكلفة</th>
                                         <th className="p-3">تاريخ الإضافة</th>
                                         <th className="p-3 rounded-l-lg">ملاحظات</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {subHistory.map(h => (
                                         <tr key={h.id}>
                                             <td className="p-3 font-mono">
                                                 {h.startDate} <span className="text-slate-400">➔</span> {h.endDate}
                                                 {h.isBackdated && <span className="mr-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">بأثر رجعي</span>}
                                             </td>
                                             <td className="p-3 font-bold text-slate-700">
                                                {canSeeCosts ? `${h.cost} ${h.currency}` : <span className="flex items-center gap-1 text-slate-400"><Lock size={12}/> مخفي</span>}
                                             </td>
                                             <td className="p-3 text-slate-500 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
                                             <td className="p-3 text-slate-500 italic">{h.notes || '-'}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                     {/* Alerts Config Display */}
                     <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                         <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertTriangle size={18}/> قواعد التنبيه</h3>
                         <div className="text-sm text-slate-600">
                             يتم إرسال تنبيهات لهذا الاشتراك قبل:
                             <div className="flex flex-wrap gap-2 mt-2">
                                 {config.reminderRules.find(r => r.cycle === selectedSub.billingCycle)?.days.map(d => (
                                     <span key={d} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-xs">{d} يوم</span>
                                 ))}
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
  };

  const ListView = () => (
     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header and Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="text-blue-500" /> إدارة الاشتراكات والتراخيص
            </h2>

            <div className="flex gap-3 w-full md:w-auto">
                <input type="text" placeholder="بحث..." className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-full md:w-64 bg-white text-slate-800" 
                   value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {hasPermission('subscriptions', 'create') && (
                    <button 
                        onClick={() => setView('create')} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus size={16} /> إضافة جديد
                    </button>
                )}
            </div>
        </div>
        
        {/* Filters */}
        {filterSpecial === 'EXPIRING_SOON' && (
              <div className="px-6 pt-4">
                  <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 p-2 rounded-lg text-sm border border-indigo-100">
                      <Calendar size={16} />
                      <span>تصفية: يتم عرض الاشتراكات التي تنتهي خلال 30 يوم فقط.</span>
                      <button onClick={() => setFilterSpecial('NONE')} className="text-indigo-900 underline hover:no-underline font-bold">إلغاء التصفية</button>
                  </div>
              </div>
        )}

        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                    <tr>
                        <th className="px-6 py-4">الاسم / المزود</th>
                        <th className="px-6 py-4">النوع</th>
                        <th className="px-6 py-4">التجديد القادم</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(paginatedItems as Subscription[]).map((sub) => (
                        <tr key={sub.id} onClick={() => { setSelectedSub(sub); setView('detail'); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                            <td className="px-6 py-4">
                                <p className="font-bold text-slate-800 text-sm">{sub.name}</p>
                                <p className="text-xs text-slate-500">{sub.vendor}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                                {sub.type}
                                <span className="block text-[10px] text-slate-400">{sub.billingCycle}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-mono text-slate-700 text-sm">{sub.nextRenewalDate}</span>
                                <div className="text-[10px] text-slate-400 mt-1">المتبقي: {getDaysRemaining(sub.nextRenewalDate)} يوم</div>
                            </td>
                            <td className="px-6 py-4">
                                {getStatusBadge(sub)}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-400">
                                <ArrowRight size={16} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {filteredSubs.length === 0 && (
                <div className="p-12 text-center text-slate-400">لا توجد بيانات</div>
            )}
        </div>

        {/* Pagination Controls */}
        {filteredSubs.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" dir="rtl">
                <span className="text-xs text-slate-500 font-medium">
                    عرض {startIndex + 1} إلى {Math.min(startIndex + ITEMS_PER_PAGE, filteredSubs.length)} من أصل {filteredSubs.length} اشتراك
                </span>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-bold shadow-sm"
                    >
                        <ChevronRight size={16} /> السابق
                    </button>
                    
                    <span className="text-sm font-bold text-slate-700 mx-2">
                        صفحة {currentPage} من {totalPages}
                    </span>
                    
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-bold shadow-sm"
                    >
                        التالي <ChevronLeft size={16} />
                    </button>
                </div>
            </div>
        )}
     </div>
  );

  return (
    <div className="space-y-6">
       {view === 'create' ? <CreateView /> : 
        view === 'detail' ? <DetailView /> : 
        view === 'renew' ? <RenewalWizard /> : 
        <ListView />}
    </div>
  );
};
