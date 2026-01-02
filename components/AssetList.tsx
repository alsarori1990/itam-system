
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, Edit, Trash2, X, Calendar, MapPin, User, Tag, Server, FileText, Ban, DollarSign, Printer, CheckSquare, Square, History, ArrowLeft, Activity, UserCog, FileSpreadsheet, Download, AlertTriangle, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { AssetStatus, Asset, AuditLogEntry, FieldChange } from '../types';
import { AssetLabelPrinter } from './AssetLabelPrinter';
import { MfaVerifyModal } from './MfaVerifyModal';
import { useDebounce } from '../utils/performanceUtils';

interface AssetListProps {
  onEdit: (asset: Asset) => void;
  initialFilters?: { status?: string; type?: string; location?: string; filterSpecial?: string };
}

// Field Name Translation Helper
const getFieldLabel = (field: string) => {
  const map: Record<string, string> = {
    name: 'اسم الجهاز',
    type: 'النوع',
    brand: 'العلامة التجارية',
    serialNumber: 'الرقم التسلسلي',
    status: 'الحالة',
    assignedTo: 'المسؤول',
    location: 'الموقع',
    purchaseDate: 'تاريخ الشراء',
    warrantyExpiry: 'انتهاء الضمان',
    notes: 'ملاحظات',
    disposalDate: 'تاريخ الإتلاف/البيع',
    disposalNotes: 'ملاحظات الإتلاف/البيع',
    image: 'صورة الأصل'
  };
  return map[field] || field;
};

// Helper for Action Styling
const getActionStyle = (type: string) => {
  switch (type) {
    case 'CREATE': return { bg: 'bg-green-100', text: 'text-green-700', icon: Server, label: 'إضافة جديد' };
    case 'UPDATE': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Edit, label: 'تحديث بيانات' };
    case 'STATUS_CHANGE': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: Activity, label: 'تغيير حالة' };
    case 'LOCATION_CHANGE': return { bg: 'bg-purple-100', text: 'text-purple-700', icon: MapPin, label: 'نقل موقع' };
    case 'ASSIGNMENT_CHANGE': return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: UserCog, label: 'تغيير مسؤول' };
    case 'DELETE': return { bg: 'bg-red-100', text: 'text-red-700', icon: Trash2, label: 'حذف' };
    default: return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Activity, label: 'عملية' };
  }
};

export const AssetList: React.FC<AssetListProps> = ({ onEdit, initialFilters }) => {
  const { assets = [], deleteAsset, addAssetsBulk, config, getAssetHistory, isMfaEnabled, hasPermission } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search for performance
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [assetsToPrint, setAssetsToPrint] = useState<Asset[]>([]);
  
  // Pagination State for Main List
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Pagination State for History Tab
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_ITEMS_PER_PAGE = 50;

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete States
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [showMfaForDelete, setShowMfaForDelete] = useState(false);
  
  // Tab State for Modal
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // Filter States
  const [filterType, setFilterType] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterSpecial, setFilterSpecial] = useState<'NONE' | 'WARRANTY_EXPIRED'>('NONE');

  // Apply Initial Filters
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.status) {
        setFilterStatus(initialFilters.status);
        setShowFilters(true);
      }
      if (initialFilters.type) {
        setFilterType(initialFilters.type);
        setShowFilters(true);
      }
      if (initialFilters.filterSpecial === 'WARRANTY_EXPIRED') {
          setFilterSpecial('WARRANTY_EXPIRED');
      }
    }
  }, [initialFilters]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, filterType, filterBrand, filterStatus, filterLocation, filterUser, filterSpecial]);

  // Reset History pagination when switching assets
  useEffect(() => {
      setHistoryPage(1);
  }, [selectedAsset]);

  // Derived Options for Dropdowns
  // IMPORTANT: Filter assets first by Permission View Scope
  const accessibleAssets = useMemo(() => {
      return assets.filter(a => hasPermission('assets', 'view', a));
  }, [assets, hasPermission]);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(accessibleAssets.map(a => a.assignedTo).filter(Boolean)));
  }, [accessibleAssets]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(accessibleAssets.map(a => a.brand).filter(Boolean)));
  }, [accessibleAssets]);

  const filteredAssets = useMemo(() => accessibleAssets.filter(asset => {
    const term = debouncedSearchTerm.toLowerCase();
    // Enhanced Search: Checks name, serial, brand, assignedTo, and location
    const matchesSearch = asset.name.toLowerCase().includes(term) || 
                          asset.serialNumber.toLowerCase().includes(term) ||
                          (asset.brand && asset.brand.toLowerCase().includes(term)) ||
                          (asset.assignedTo && asset.assignedTo.toLowerCase().includes(term)) ||
                          (asset.location && asset.location.toLowerCase().includes(term));
    
    const matchesType = filterType === 'ALL' || asset.type === filterType;
    const matchesBrand = filterBrand === 'ALL' || asset.brand === filterBrand;
    const matchesStatus = filterStatus === 'ALL' || asset.status === filterStatus;
    const matchesLocation = filterLocation === 'ALL' || asset.location === filterLocation;
    const matchesUser = filterUser === 'ALL' || asset.assignedTo === filterUser;
    
    let matchesSpecial = true;
    if (filterSpecial === 'WARRANTY_EXPIRED') {
        matchesSpecial = new Date(asset.warrantyExpiry) < new Date();
    }

    return matchesSearch && matchesType && matchesBrand && matchesStatus && matchesLocation && matchesUser && matchesSpecial;
  }), [accessibleAssets, debouncedSearchTerm, filterType, filterBrand, filterStatus, filterLocation, filterUser, filterSpecial]);

  // Pagination Calculations - Main List
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAssets = filteredAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Pagination Calculations - History Tab (Logic handled inside render to access selectedAsset)
  const getHistoryPagination = (assetId: string) => {
      const fullHistory = getAssetHistory(assetId);
      const totalHistoryPages = Math.ceil(fullHistory.length / HISTORY_ITEMS_PER_PAGE);
      const startHistoryIndex = (historyPage - 1) * HISTORY_ITEMS_PER_PAGE;
      const paginatedHistory = fullHistory.slice(startHistoryIndex, startHistoryIndex + HISTORY_ITEMS_PER_PAGE);
      return { paginatedHistory, totalHistoryPages, fullHistoryLength: fullHistory.length, startHistoryIndex };
  };

  const activeFiltersCount = [
    filterType !== 'ALL',
    filterBrand !== 'ALL',
    filterStatus !== 'ALL',
    filterLocation !== 'ALL',
    filterUser !== 'ALL',
    filterSpecial !== 'NONE'
  ].filter(Boolean).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case AssetStatus.NEW: return 'bg-blue-100 text-blue-700';
      case AssetStatus.IN_USE: return 'bg-emerald-100 text-emerald-700';
      case AssetStatus.MAINTENANCE: return 'bg-amber-100 text-amber-700';
      case AssetStatus.DAMAGED: return 'bg-rose-100 text-rose-700';
      case AssetStatus.SOLD: return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case AssetStatus.SCRAPPED: return 'bg-slate-200 text-slate-700 line-through';
      case AssetStatus.RETIRED: return 'bg-gray-100 text-gray-500';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const clearFilters = () => {
    setFilterType('ALL');
    setFilterBrand('ALL');
    setFilterStatus('ALL');
    setFilterLocation('ALL');
    setFilterUser('ALL');
    setFilterSpecial('NONE');
    setSearchTerm('');
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedAssetIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedAssetIds(newSelection);
  };

  const toggleAll = () => {
    // Selects ALL filtered assets (not just current page) for bulk actions efficiency
    if (selectedAssetIds.size === filteredAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleBatchPrint = () => {
    const selected = accessibleAssets.filter(a => selectedAssetIds.has(a.id));
    setAssetsToPrint(selected);
    setShowPrintModal(true);
  };

  const handleSinglePrint = (asset: Asset) => {
    setAssetsToPrint([asset]);
    setShowPrintModal(true);
  };
  
  const handleOpenAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setActiveTab('details');
  };

  // --- Delete Logic ---

  const initiateDelete = (asset: Asset) => {
      setAssetToDelete(asset);
  };

  const handleConfirmDeleteClick = () => {
      if (isMfaEnabled) {
          setShowMfaForDelete(true);
      } else {
          executeDelete();
      }
  };

  const executeDelete = () => {
      if (assetToDelete) {
          deleteAsset(assetToDelete.id);
          setAssetToDelete(null);
          setShowMfaForDelete(false);
      }
  };

  // --- Import/Export Logic ---

  const handleDownloadTemplate = () => {
      const headers = ['الاسم', 'النوع', 'الماركة', 'السيريال', 'تاريخ الشراء', 'انتهاء الضمان', 'الحالة', 'الموقع', 'المسؤول', 'ملاحظات'];
      const exampleRow = ['لابتوب HP G8', 'لابتوب', 'HP', 'CND12345', '2023-01-01', '2026-01-01', 'مستخدم', 'الرياض - المكتب الرئيسي', 'محمد أحمد', 'جهاز جديد'];
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), exampleRow.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Assets_Import_Template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (!text) return;

          const lines = text.split('\n').filter(line => line.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const parsedAssets: Partial<Asset>[] = [];

          for (let i = 1; i < lines.length; i++) {
              const currentLine = lines[i].split(',');
              if (currentLine.length < headers.length) continue;

              const rowData: any = {};
              headers.forEach((header, index) => {
                  rowData[header] = currentLine[index]?.trim().replace(/"/g, '');
              });

              // Map Arabic Headers to English Keys
              parsedAssets.push({
                  name: rowData['الاسم'] || rowData['name'] || '',
                  type: rowData['النوع'] || rowData['type'] || '',
                  brand: rowData['الماركة'] || rowData['brand'] || '',
                  serialNumber: rowData['السيريال'] || rowData['serialNumber'] || '',
                  purchaseDate: rowData['تاريخ الشراء'] || rowData['purchaseDate'] || '',
                  warrantyExpiry: rowData['انتهاء الضمان'] || rowData['warrantyExpiry'] || '',
                  status: rowData['الحالة'] || rowData['status'] || 'جديد',
                  location: rowData['الموقع'] || rowData['location'] || '',
                  assignedTo: rowData['المسؤول'] || rowData['assignedTo'] || '',
                  notes: rowData['ملاحظات'] || rowData['notes'] || ''
              });
          }

          if (parsedAssets.length > 0) {
              if (confirm(`تم العثور على ${parsedAssets.length} أصل. هل تريد استيرادها؟`)) {
                  addAssetsBulk(parsedAssets);
              }
          } else {
              alert('لم يتم العثور على بيانات صالحة في الملف.');
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  const handleExportAssets = () => {
    // Defines Headers
    const headers = [
      'رقم الأصل (ID)',
      'الاسم',
      'النوع',
      'العلامة التجارية',
      'الرقم التسلسلي',
      'الحالة',
      'الموقع',
      'المسؤول',
      'تاريخ الشراء',
      'انتهاء الضمان',
      'ملاحظات',
      'تاريخ الاستبعاد/البيع',
      'ملاحظات الاستبعاد',
      'آخر تحديث'
    ];

    // Map rows based on filteredAssets
    const rows = filteredAssets.map(a => {
      const escape = (val?: string) => val ? `"${val.replace(/"/g, '""')}"` : '-';
      return [
        a.id,
        escape(a.name),
        escape(a.type),
        escape(a.brand),
        escape(a.serialNumber),
        a.status,
        escape(a.location),
        escape(a.assignedTo),
        a.purchaseDate || '-',
        a.warrantyExpiry || '-',
        escape(a.notes),
        a.disposalDate || '-',
        escape(a.disposalNotes),
        new Date(a.lastUpdated).toLocaleDateString('en-GB')
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Assets_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportHistoryCSV = () => {
    if (!selectedAsset) return;
    const history = getAssetHistory(selectedAsset.id);
    const headers = ['التاريخ', 'الوقت', 'المستخدم', 'نوع العملية', 'التفاصيل', 'التغييرات (الحقل: قبل -> بعد)'];
    
    const rows = history.map(log => {
      const dateObj = new Date(log.timestamp);
      const changesStr = log.changes 
        ? log.changes.map(c => `[${getFieldLabel(c.fieldName)}: ${c.oldValue} -> ${c.newValue}]`).join(' | ') 
        : '-';

      return [
        `"${dateObj.toLocaleDateString('en-GB')}"`,
        `"${dateObj.toLocaleTimeString('en-US')}"`,
        `"${log.user}"`,
        `"${log.actionType}"`,
        `"${log.details}"`,
        `"${changesStr}"`
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `History_${selectedAsset.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render History Tab content (to keep main JSX cleaner)
  const renderHistoryTab = () => {
      if (!selectedAsset) return null;
      const { paginatedHistory, totalHistoryPages, fullHistoryLength, startHistoryIndex } = getHistoryPagination(selectedAsset.id);

      return (
          <div className="flex flex-col h-full">
              <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:mr-4 before:h-full before:w-0.5 before:bg-slate-200 flex-1">
                  {fullHistoryLength === 0 ? (
                      <div className="text-center py-10 text-slate-400">لا يوجد سجل تعديلات لهذا الأصل</div>
                  ) : (
                      paginatedHistory.map((log, index) => {
                          const style = getActionStyle(log.actionType);
                          const date = new Date(log.timestamp);
                          
                          return (
                            <div key={log.id} className="relative pr-8 animate-fade-in">
                                <div className={`absolute -right-2 top-0 w-5 h-5 rounded-full border-2 border-white shadow-sm ${style.bg} flex items-center justify-center z-10`}>
                                    <div className={`w-2 h-2 rounded-full ${style.text.replace('text', 'bg')}`}></div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${style.bg} ${style.text}`}>
                                            {style.label}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {date.toLocaleDateString('en-GB')} {date.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <User size={12} />
                                        {log.user}
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm font-medium text-slate-800 mb-2">{log.details}</p>
                                    
                                    {/* Changes Table (Diff View) */}
                                    {log.changes && log.changes.length > 0 && (
                                        <div className="mt-3 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                                        <table className="w-full text-xs text-right">
                                            <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3 py-2">الحقل</th>
                                                    <th className="px-3 py-2 text-rose-600">قبل</th>
                                                    <th className="px-3 py-2 text-emerald-600">بعد</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {log.changes.map((change, idx) => (
                                                    <tr key={idx}>
                                                    <td className="px-3 py-2 font-medium text-slate-700">{getFieldLabel(change.fieldName)}</td>
                                                    <td className="px-3 py-2 text-rose-700 bg-rose-50/50 line-through decoration-rose-300">{String(change.oldValue)}</td>
                                                    <td className="px-3 py-2 text-emerald-700 bg-emerald-50/50 font-bold">{String(change.newValue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                          );
                      })
                  )}
              </div>

              {/* History Pagination Controls */}
              {fullHistoryLength > HISTORY_ITEMS_PER_PAGE && (
                  <div className="p-4 mt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-xl" dir="rtl">
                      <span className="text-xs text-slate-500 font-medium">
                          عرض {startHistoryIndex + 1} إلى {Math.min(startHistoryIndex + HISTORY_ITEMS_PER_PAGE, fullHistoryLength)} من أصل {fullHistoryLength} سجل
                      </span>
                      
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                              disabled={historyPage === 1}
                              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-bold shadow-sm"
                          >
                              <ChevronRight size={16} /> السابق
                          </button>
                          
                          <span className="text-sm font-bold text-slate-700 mx-2">
                              صفحة {historyPage} من {totalHistoryPages}
                          </span>
                          
                          <button 
                              onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                              disabled={historyPage === totalHistoryPages}
                              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-bold shadow-sm"
                          >
                              التالي <ChevronLeft size={16} />
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header & Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
               <h2 className="text-xl font-bold text-slate-800">سجل الأصول</h2>
               {selectedAssetIds.size > 0 && (
                 <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{selectedAssetIds.size} محدد</span>
                    <button 
                       onClick={handleBatchPrint}
                       className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors"
                    >
                       <Printer size={14} /> <span className="hidden sm:inline">طباعة ملصقات</span>
                    </button>
                 </div>
               )}
            </div>
            
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute right-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="بحث (اسم، تسلسلي، موقع)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                />
              </div>

              {/* Import/Export Controls */}
              {hasPermission('assets', 'create') && (
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="استيراد (Excel/CSV)"
                    >
                        <Upload size={18} />
                    </button>
                    <button 
                        onClick={handleDownloadTemplate}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        title="تحميل قالب الاستيراد"
                    >
                        <FileText size={18} />
                    </button>
                </div>
              )}

              {hasPermission('assets', 'export') && (
                <button 
                    onClick={handleExportAssets}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="تصدير القائمة الحالية (Excel)"
                >
                    <FileSpreadsheet size={18} />
                </button>
              )}

              <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-colors relative ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  title="تصفية متقدمة"
              >
                <Filter size={18} />
                {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full border border-white font-bold">
                        {activeFiltersCount}
                    </span>
                )}
              </button>
            </div>
          </div>
          
          {filterSpecial !== 'NONE' && (
              <div className="flex flex-wrap items-center gap-2 bg-rose-50 text-rose-700 p-2 rounded-lg text-sm border border-rose-100">
                  <AlertTriangle size={16} />
                  <span>تنبيه: يتم عرض الأصول {filterSpecial === 'WARRANTY_EXPIRED' ? 'منتهية الضمان' : ''} فقط.</span>
                  <button onClick={() => setFilterSpecial('NONE')} className="text-rose-900 underline hover:no-underline font-bold">إلغاء التصفية</button>
              </div>
          )}

          {/* Filters Panel - Same as before */}
          {showFilters && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">نوع الأصل</label>
                    <select 
                      value={filterType} 
                      onChange={e => setFilterType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="ALL">الكل</option>
                      {config.types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الماركة</label>
                    <select 
                      value={filterBrand} 
                      onChange={e => setFilterBrand(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="ALL">الكل</option>
                      {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                    <select 
                      value={filterStatus} 
                      onChange={e => setFilterStatus(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="ALL">الكل</option>
                      {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الموقع</label>
                    <select 
                      value={filterLocation} 
                      onChange={e => setFilterLocation(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="ALL">الكل</option>
                      {config.locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                   <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">المستخدم</label>
                    <select 
                      value={filterUser} 
                      onChange={e => setFilterUser(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="ALL">الكل</option>
                      {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                   <div className="flex items-end">
                      <button onClick={clearFilters} className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm hover:bg-slate-100 hover:text-rose-600 transition-colors flex items-center justify-center gap-2">
                          <X size={14} /> مسح التصفيات
                      </button>
                  </div>
              </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase whitespace-nowrap">
              <tr>
                <th className="px-6 py-4 w-10">
                   <button onClick={toggleAll} className="text-slate-400 hover:text-blue-600">
                      {selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                   </button>
                </th>
                <th className="px-6 py-4">الأصل</th>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4">الرقم التسلسلي</th>
                <th className="px-6 py-4">المسؤول</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 whitespace-nowrap">
              {paginatedAssets.map((asset) => (
                <tr 
                  key={asset.id} 
                  onClick={() => handleOpenAsset(asset)}
                  className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${selectedAssetIds.has(asset.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-6 py-4" onClick={(e) => { e.stopPropagation(); toggleSelection(asset.id); }}>
                     <div className={`text-slate-400 transition-colors ${selectedAssetIds.has(asset.id) ? 'text-blue-600' : 'group-hover:text-slate-500'}`}>
                        {selectedAssetIds.has(asset.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {asset.image ? (
                          <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                      ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">img</div>
                      )}
                      <div className="max-w-[150px] truncate">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate" title={asset.name}>{asset.name}</p>
                        <p className="text-slate-500 text-xs">{asset.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{asset.serialNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col max-w-[150px]">
                          <span className="truncate" title={asset.assignedTo}>{asset.assignedTo}</span>
                          <span className="text-xs text-slate-400 mt-0.5 truncate" title={asset.location}>{asset.location}</span>
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {hasPermission('assets', 'update', asset) && (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(asset); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit size={16} className="pointer-events-none" />
                          </button>
                      )}
                      {hasPermission('assets', 'delete', asset) && (
                          <button 
                            type="button"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                initiateDelete(asset);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} className="pointer-events-none" />
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssets.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              لا توجد أصول مطابقة (أو ليس لديك صلاحية لعرضها)
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredAssets.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" dir="rtl">
                <span className="text-xs text-slate-500 font-medium">
                    عرض {startIndex + 1} إلى {Math.min(startIndex + ITEMS_PER_PAGE, filteredAssets.length)} من أصل {filteredAssets.length} أصل
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

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-rose-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 mb-6">هل أنت متأكد من حذف الأصل <span className="font-bold text-slate-800">{assetToDelete.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.</p>
            
            <div className="flex gap-3 w-full">
                <button 
                    onClick={() => setAssetToDelete(null)}
                    className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                    إلغاء
                </button>
                <button 
                    onClick={handleConfirmDeleteClick}
                    className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                >
                    {isMfaEnabled ? 'متابعة للتحقق' : 'حذف نهائي'}
                </button>
            </div>
            </div>
        </div>
      )}

      {/* MFA Verification Modal for Delete */}
      {showMfaForDelete && assetToDelete && (
          <MfaVerifyModal 
              actionTitle={`حذف الأصل: ${assetToDelete.name}`}
              onVerified={executeDelete}
              onCancel={() => setShowMfaForDelete(false)}
          />
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedAsset.name}</h3>
                    <p className="text-slate-500 text-sm mt-1 font-mono">{selectedAsset.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedAsset(null)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
               </div>
               
               {/* Tab Navigation */}
               <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === 'details' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     تفاصيل الأصل
                     {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     سجل التعديلات (History)
                     {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
                  </button>
               </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 bg-slate-50/50 flex-1">
              
              {activeTab === 'details' ? (
                  /* Details View */
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/3">
                        <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
                          {selectedAsset.image ? (
                            <img src={selectedAsset.image} alt={selectedAsset.name} className="w-full h-full object-cover" />
                          ) : (
                            <Server size={48} className="text-slate-300" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-500">الحالة الحالية</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedAsset.status)}`}>
                            {selectedAsset.status}
                          </span>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <Tag size={16} className="text-slate-400" />
                            <div className="flex-1">
                              <p className="text-xs text-slate-500">الرقم التسلسلي</p>
                              <p className="text-sm font-mono font-bold text-slate-700 break-all">{selectedAsset.serialNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <User size={16} className="text-slate-400" />
                            <div className="flex-1">
                              <p className="text-xs text-slate-500">المسؤول</p>
                              <p className="text-sm font-medium text-slate-700">{selectedAsset.assignedTo || 'غير محدد'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-slate-400" />
                            <div className="flex-1">
                              <p className="text-xs text-slate-500">الموقع</p>
                              <p className="text-sm font-medium text-slate-700">{selectedAsset.location || 'غير محدد'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : (
                  /* History / Timeline View - Using Helper */
                  renderHistoryTab()
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3">
              {activeTab === 'details' ? (
                 <>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSinglePrint(selectedAsset); }}
                      className="bg-slate-800 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                      title="طباعة ملصق للأصل"
                    >
                      <Printer size={18} className="pointer-events-none" />
                      ملصق
                    </button>
                    {hasPermission('assets', 'update', selectedAsset) && (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(selectedAsset); setSelectedAsset(null); }}
                          className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit size={18} className="pointer-events-none" />
                          تعديل البيانات
                        </button>
                    )}
                 </>
              ) : (
                 <div className="flex gap-3 w-full">
                   <button 
                     type="button"
                     onClick={handleExportHistoryCSV}
                     className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
                   >
                     <FileSpreadsheet size={18} />
                     تصدير Excel
                   </button>
                 </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Print Label Modal */}
      {showPrintModal && (
        <AssetLabelPrinter 
          assets={assetsToPrint} 
          onClose={() => { setShowPrintModal(false); setAssetsToPrint([]); }} 
        />
      )}
    </>
  );
};
