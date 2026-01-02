
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SimCard, SimType, SimStatus } from '../types';
import { Smartphone, Plus, Filter, AlertTriangle, ArrowRight, Edit, Trash2, Cpu as SimIcon, Search, ChevronLeft, ChevronRight, History, User, Clock, Activity, Save } from 'lucide-react';

interface SimCardManagerProps {
    initialFilters?: { status?: string };
}

// Field Name Translation Helper for History Log
const getFieldLabel = (field: string) => {
  const map: Record<string, string> = {
    serialNumber: 'الرقم التسلسلي (ICCID)',
    phoneNumber: 'رقم الشريحة',
    status: 'الحالة',
    assignedTo: 'الموظف المسؤول',
    department: 'القسم', // Added department translation
    planName: 'اسم الباقة',
    provider: 'المزود',
    branch: 'الفرع',
    notes: 'ملاحظات'
  };
  return map[field] || field;
};

export const SimCardManager: React.FC<SimCardManagerProps> = ({ initialFilters }) => {
  const { simCards, config, addSimCard, updateSimCard, deleteSimCard, getSimHistory, hasPermission } = useApp();
  
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedSim, setSelectedSim] = useState<SimCard | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Forms State
  const [simForm, setSimForm] = useState<Partial<SimCard>>({});
  const [simWarning, setSimWarning] = useState<string | null>(null);

  // Permission Check for Sensitive Data (Costs)
  const canSeeCosts = hasPermission('subscriptions', 'view_sensitive');

  // Apply Initial Filters
  useEffect(() => {
    if (initialFilters?.status) {
        setFilterStatus(initialFilters.status);
    }
  }, [initialFilters]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Helper: Get SIM Status Color
  const getSimStatusColor = (status: SimStatus) => {
      switch(status) {
          case SimStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case SimStatus.AVAILABLE: return 'bg-blue-100 text-blue-700 border-blue-200';
          case SimStatus.SUSPENDED: return 'bg-amber-100 text-amber-700 border-amber-200';
          case SimStatus.LOST: return 'bg-rose-100 text-rose-700 border-rose-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  // --- Filtering & Pagination Logic ---
  const filteredSims = simCards.filter(s => {
      const matchSearch = s.serialNumber.includes(searchTerm) || (s.phoneNumber && s.phoneNumber.includes(searchTerm)) || (s.assignedTo && s.assignedTo.includes(searchTerm));
      const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
      return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredSims.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredSims.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // --- Handlers ---

  // SIM Validation & Submit
  const handleSimNumberChange = (val: string) => {
      setSimForm(prev => ({ ...prev, phoneNumber: val }));
      // Warning for duplicate phone number (Non-blocking)
      const duplicate = simCards.find(s => s.phoneNumber === val && s.id !== selectedSim?.id);
      if (duplicate) {
          setSimWarning('تنبيه: رقم الشريحة هذا مستخدم سابقاً مع شريحة أخرى.');
      } else {
          setSimWarning(null);
      }
  };

  const handleSimSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (selectedSim) {
              updateSimCard(selectedSim.id, simForm);
          } else {
              // @ts-ignore
              addSimCard(simForm);
          }
          // After save, go back to list
          setView('list');
          setSimForm({});
          setSelectedSim(null);
          setSimWarning(null);
      } catch (error) {
          // Error handled in context
      }
  };

  const handleRowClick = (sim: SimCard) => {
      setSelectedSim(sim);
      setDetailTab('info');
      setView('detail');
  };

  const handleEditClick = (sim: SimCard) => {
      setSelectedSim(sim);
      setSimForm(sim);
      setView('create');
  };

  const handleDeleteClick = (sim: SimCard) => {
      if(confirm('هل أنت متأكد من حذف الشريحة؟')) {
          deleteSimCard(sim.id);
          if (view === 'detail') setView('list');
      }
  };

  // --- Views ---

  const CreateSimView = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{selectedSim ? 'تعديل بيانات الشريحة' : 'إضافة شريحة جديدة'}</h2>
              <button onClick={() => { setView('list'); setSelectedSim(null); setSimForm({}); setSimWarning(null); }} className="text-slate-400 hover:text-slate-600">إلغاء</button>
          </div>
          <form onSubmit={handleSimSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">الرقم التسلسلي (ICCID) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                          <SimIcon size={16} className="absolute right-3 top-3 text-slate-400" />
                          <input 
                              required 
                              type="text" 
                              className="w-full pr-10 pl-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono tracking-wide focus:border-blue-500" 
                              placeholder="89966..."
                              value={simForm.serialNumber || ''} 
                              onChange={e => setSimForm({...simForm, serialNumber: e.target.value})} 
                              // Lock serial number in edit mode to prevent confusion or require special permission
                              disabled={!!selectedSim} 
                          />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">يجب أن يكون فريداً وغير مكرر في النظام.</p>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">رقم الشريحة (Phone Number)</label>
                      <input 
                          type="text" 
                          className={`w-full p-3 rounded-xl border bg-white text-slate-800 ${simWarning ? 'border-amber-300 focus:border-amber-500' : 'border-slate-200'}`}
                          placeholder="05..."
                          value={simForm.phoneNumber || ''} 
                          onChange={e => handleSimNumberChange(e.target.value)} 
                      />
                      {simWarning && (
                          <div className="flex items-center gap-1 mt-1 text-amber-600 text-xs font-bold animate-pulse">
                              <AlertTriangle size={12} /> {simWarning}
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">المزود (Provider)</label>
                      <select 
                          required
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                          value={simForm.provider || ''} 
                          onChange={e => setSimForm({...simForm, provider: e.target.value})}
                      >
                          <option value="">اختر المزود</option>
                          {config.simProviders.filter(p => !config.hiddenOptions?.simProviders?.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">نوع الشريحة</label>
                      <select 
                          required
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                          value={simForm.type || ''} 
                          onChange={e => setSimForm({...simForm, type: e.target.value as SimType})}
                      >
                          <option value="">اختر النوع</option>
                          {Object.values(SimType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الباقة (Plan Name)</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                          value={simForm.planName || ''} onChange={e => setSimForm({...simForm, planName: e.target.value})} placeholder="مثال: باقة أعمال 400" />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الموظف المسؤول (اختياري)</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                          value={simForm.assignedTo || ''} onChange={e => setSimForm({...simForm, assignedTo: e.target.value})} />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">القسم</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                          value={simForm.department || ''} onChange={e => setSimForm({...simForm, department: e.target.value})} placeholder="مثال: المبيعات" />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الفرع / الموقع</label>
                      <select required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-black"
                          value={simForm.branch || ''} onChange={e => setSimForm({...simForm, branch: e.target.value})}>
                          <option value="">اختر الفرع</option>
                          {config.locations.filter(l => !config.hiddenOptions?.locations?.includes(l)).map(l => (
                            <option key={l} value={l} className="text-black">{l}</option>
                          ))}
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                      <select required className="w-full p-3 rounded-xl border border-slate-200 bg-white text-black"
                          value={simForm.status || SimStatus.ACTIVE} onChange={e => setSimForm({...simForm, status: e.target.value as SimStatus})}>
                          {Object.values(SimStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>

                  {canSeeCosts && (
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">التكلفة الشهرية</label>
                          <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                              value={simForm.cost || ''} onChange={e => setSimForm({...simForm, cost: parseFloat(e.target.value)})} />
                      </div>
                  )}
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات</label>
                  <textarea className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" rows={3}
                      value={simForm.notes || ''} onChange={e => setSimForm({...simForm, notes: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {selectedSim ? 'تحديث الشريحة' : 'حفظ الشريحة'}
              </button>
          </form>
      </div>
  );

  const DetailView = () => {
      if (!selectedSim) return null;
      const history = getSimHistory(selectedSim.id);

      return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setView('list')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                          <ArrowRight size={20} className="text-slate-600" />
                      </button>
                      <div>
                          <h2 className="text-xl font-bold text-slate-800">{selectedSim.phoneNumber || selectedSim.serialNumber}</h2>
                          <p className="text-slate-500 text-sm font-mono">{selectedSim.serialNumber}</p>
                      </div>
                  </div>
                  
                  <div className="flex gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getSimStatusColor(selectedSim.status)}`}>
                          {selectedSim.status}
                      </span>
                      {hasPermission('subscriptions', 'update') && (
                          <button onClick={() => { setSimForm(selectedSim); setView('create'); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                              <Edit size={20} />
                          </button>
                      )}
                      {hasPermission('subscriptions', 'delete') && (
                          <button onClick={() => handleDeleteClick(selectedSim)} className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                              <Trash2 size={20} />
                          </button>
                      )}
                  </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-6 gap-6">
                  <button 
                      onClick={() => setDetailTab('info')}
                      className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      <Smartphone size={18} /> بيانات الشريحة
                  </button>
                  <button 
                      onClick={() => setDetailTab('history')}
                      className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      <History size={18} /> سجل التغييرات
                  </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                  {detailTab === 'info' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">المعلومات الأساسية</h3>
                              <div className="flex justify-between">
                                  <span className="text-slate-500 text-sm">المزود</span>
                                  <span className="font-bold text-slate-800">{selectedSim.provider}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-slate-500 text-sm">نوع الشريحة</span>
                                  <span className="font-bold text-slate-800">{selectedSim.type}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-slate-500 text-sm">الباقة</span>
                                  <span className="font-bold text-slate-800">{selectedSim.planName}</span>
                              </div>
                              {canSeeCosts && (
                                  <div className="flex justify-between">
                                      <span className="text-slate-500 text-sm">التكلفة الشهرية</span>
                                      <span className="font-bold text-emerald-600">{selectedSim.cost} ريال</span>
                                  </div>
                              )}
                          </div>

                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">التخصيص والموقع</h3>
                              <div className="flex justify-between items-center">
                                  <span className="text-slate-500 text-sm">الموظف المسؤول</span>
                                  <span className="font-bold text-slate-800 flex items-center gap-2">
                                      <User size={16} className="text-slate-400" />
                                      {selectedSim.assignedTo || 'غير مسند'}
                                  </span>
                              </div>
                              {selectedSim.department && (
                                  <div className="flex justify-between">
                                      <span className="text-slate-500 text-sm">القسم</span>
                                      <span className="font-bold text-slate-800">{selectedSim.department}</span>
                                  </div>
                              )}
                              <div className="flex justify-between">
                                  <span className="text-slate-500 text-sm">الفرع</span>
                                  <span className="font-bold text-slate-800">{selectedSim.branch}</span>
                              </div>
                          </div>

                          {selectedSim.notes && (
                              <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                  <h3 className="font-bold text-slate-800 mb-2">ملاحظات</h3>
                                  <p className="text-slate-600 text-sm leading-relaxed">{selectedSim.notes}</p>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="max-w-3xl">
                          {history.length === 0 ? (
                              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                  <History size={48} className="mb-4 opacity-50" />
                                  <p>لا يوجد سجل تغييرات لهذه الشريحة بعد.</p>
                              </div>
                          ) : (
                              <div className="space-y-6 relative before:absolute before:inset-0 before:mr-6 before:h-full before:w-0.5 before:bg-slate-200">
                                  {history.map((log) => (
                                      <div key={log.id} className="relative pr-12">
                                          <div className="absolute -right-2 top-0 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-white shadow-sm"></div>
                                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                              <div className="flex justify-between items-start mb-2">
                                                  <div>
                                                      <p className="font-bold text-slate-800 text-sm">{log.details}</p>
                                                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                          <Clock size={12} /> {new Date(log.timestamp).toLocaleString('ar-SA')}
                                                      </span>
                                                  </div>
                                                  <div className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1">
                                                      <User size={12} /> {log.user}
                                                  </div>
                                              </div>

                                              {/* Changes Diff */}
                                              {log.changes && log.changes.length > 0 && (
                                                  <div className="mt-3 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                                                      <table className="w-full text-xs text-right">
                                                          <thead className="bg-slate-100 text-slate-500 font-medium">
                                                              <tr>
                                                                  <th className="px-3 py-2">الحقل</th>
                                                                  <th className="px-3 py-2 text-rose-600">قبل</th>
                                                                  <th className="px-3 py-2 text-emerald-600">بعد</th>
                                                              </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-100">
                                                              {log.changes.map((change, idx) => (
                                                                  <tr key={idx}>
                                                                      <td className="px-3 py-2 font-bold text-slate-700">{getFieldLabel(change.fieldName)}</td>
                                                                      <td className="px-3 py-2 text-rose-700 line-through bg-rose-50/50">{String(change.oldValue)}</td>
                                                                      <td className="px-3 py-2 text-emerald-700 font-bold bg-emerald-50/50">{String(change.newValue)}</td>
                                                                  </tr>
                                                              ))}
                                                          </tbody>
                                                      </table>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const ListView = () => (
     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header and Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="text-blue-500" /> شرائح الاتصال
            </h2>

            <div className="flex gap-3 w-full md:w-auto">
                <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                    <input type="text" placeholder="بحث (رقم، سيريال، موظف)..." className="border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm w-full md:w-64 bg-white text-slate-800 focus:border-blue-500 outline-none" 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                
                {hasPermission('subscriptions', 'create') && (
                    <button 
                        onClick={() => { setSelectedSim(null); setSimForm({}); setView('create'); }} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus size={16} /> إضافة جديد
                    </button>
                )}
            </div>
        </div>
        
        {/* Filters */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
            <button 
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
                الكل
            </button>
            {Object.values(SimStatus).map(status => (
                <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                    {status}
                </button>
            ))}
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                    <tr>
                        <th className="px-6 py-4">الرقم التسلسلي (ICCID)</th>
                        <th className="px-6 py-4">رقم الشريحة</th>
                        <th className="px-6 py-4">المزود / الباقة</th>
                        <th className="px-6 py-4">المسؤول</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4 text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedItems.map((sim) => (
                        <tr key={sim.id} onClick={() => handleRowClick(sim)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="px-6 py-4">
                                <p className="font-mono font-bold text-slate-800 text-sm tracking-wide group-hover:text-blue-600 transition-colors">{sim.serialNumber}</p>
                                <p className="text-[10px] text-slate-400">{sim.type}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                                {sim.phoneNumber || '-'}
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-700">{sim.provider}</p>
                                <p className="text-xs text-slate-500">{sim.planName}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                                <div className="flex flex-col">
                                    <span>{sim.assignedTo || 'غير مسند'}</span>
                                    {sim.department && <span className="text-[10px] text-slate-500">{sim.department}</span>}
                                    <span className="text-[10px] text-slate-400">{sim.branch}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getSimStatusColor(sim.status)}`}>
                                    {sim.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                    {hasPermission('subscriptions', 'update') && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditClick(sim); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="تعديل"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {hasPermission('subscriptions', 'delete') && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(sim); }}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="حذف"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {filteredSims.length === 0 && (
                <div className="p-12 text-center text-slate-400">لا توجد شرائح مطابقة للبحث</div>
            )}
        </div>

        {/* Pagination Controls */}
        {filteredSims.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" dir="rtl">
                <span className="text-xs text-slate-500 font-medium">
                    عرض {startIndex + 1} إلى {Math.min(startIndex + ITEMS_PER_PAGE, filteredSims.length)} من أصل {filteredSims.length} سجل
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
       {view === 'create' ? <CreateSimView /> : 
        view === 'detail' ? <DetailView /> :
        <ListView />}
    </div>
  );
};
