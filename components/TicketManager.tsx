
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus, TicketPriority, TicketChannel } from '../types';
import { Search, Plus, Filter, MessageSquare, Clock, User, CheckCircle2, AlertCircle, PlayCircle, XCircle, MoreVertical, Edit2, Calendar, ArrowRight, Inbox, CheckSquare, Activity, Wrench, FileText, FileSpreadsheet, Download, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '../utils/performanceUtils';

interface TicketManagerProps {
    initialFilters?: { status?: string; ticketId?: string };
}

export const TicketManager: React.FC<TicketManagerProps> = ({ initialFilters }) => {
  const { tickets = [], assets = [], config, addTicket, addTicketsBulk, updateTicketStatus, adjustTicketTime, getTicketHistory, getStats, hasPermission } = useApp();
  
  // States
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time Adjustment Modal State
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [adjustTime, setAdjustTime] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [editingField, setEditingField] = useState<'receivedAt' | 'startedAt' | 'resolvedAt' | null>(null);

  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionType, setResolutionType] = useState<'ROUTINE' | 'SPECIALIZED'>('ROUTINE');
  const [resolutionDetails, setResolutionDetails] = useState('');

  // Create Form State
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({});

  const stats = getStats().ticketStats;

  // IMPORTANT: Filter Tickets by Permission First
  const accessibleTickets = tickets.filter(t => hasPermission('tickets', 'view', t));

  // Derived Counts
  const newTicketsCount = accessibleTickets.filter(t => t.status === TicketStatus.NEW).length;
  const closedTicketsCount = accessibleTickets.filter(t => t.status === TicketStatus.CLOSED).length;
  const openCount = accessibleTickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length;


  // Apply Initial Filters
  useEffect(() => {
    if (initialFilters) {
        if (initialFilters.ticketId) {
            const ticket = tickets.find(t => t.id === initialFilters.ticketId);
            if (ticket) {
                if (hasPermission('tickets', 'view', ticket)) {
                    setSelectedTicket(ticket);
                    setView('detail');
                }
            }
        }
        if (initialFilters.status) {
            setFilterStatus(initialFilters.status);
        }
    }
  }, [initialFilters, tickets, hasPermission]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Filter Logic with useMemo for performance
  const filteredTickets = useMemo(() => accessibleTickets.filter(t => {
     const matchesSearch = t.requesterName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || t.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
     
     let matchesStatus = true;
     if (filterStatus === 'ALL') {
         matchesStatus = true;
     } else if (filterStatus === 'OPEN_GROUP') {
         matchesStatus = t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED;
     } else {
         matchesStatus = t.status === filterStatus;
     }

     return matchesSearch && matchesStatus;
  }), [accessibleTickets, debouncedSearchTerm, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleFilter = (status: string) => {
      setFilterStatus(prev => prev === status ? 'ALL' : status);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(newTicket.description && newTicket.category && newTicket.branch && newTicket.priority && newTicket.channel) {
        // @ts-ignore
        addTicket({
          ...newTicket,
          requesterName: newTicket.requesterName || 'غير محدد' // Default if empty
        });
        setView('list');
        setNewTicket({});
    }
  };

  const handleTimeAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTicket && adjustTime && editingField) {
        adjustTicketTime(selectedTicket.id, editingField, adjustTime, adjustReason);
        setShowTimeModal(false);
        setAdjustReason('');
        setAdjustTime('');
        setEditingField(null);
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTicket) {
          updateTicketStatus(selectedTicket.id, TicketStatus.RESOLVED, {
              type: resolutionType,
              details: resolutionType === 'SPECIALIZED' ? resolutionDetails : undefined
          });
          setShowResolveModal(false);
          setResolutionDetails('');
          setResolutionType('ROUTINE');
      }
  };

  const handleExportTickets = () => {
    const headers = [
        'رقم التذكرة',
        'مقدم الطلب',
        'الفرع',
        'القناة',
        'التصنيف',
        'التصنيف الفرعي',
        'الأولوية',
        'وصف المشكلة',
        'رقم الأصل المرتبط',
        'الحالة',
        'الفني المسؤول',
        'نوع الحل',
        'تفاصيل الحل',
        'وقت الاستلام',
        'وقت البدء',
        'وقت الحل',
        'وقت الإغلاق',
        'هل تم تعديل الوقت يدوياً؟'
    ];

    const rows = filteredTickets.map(t => {
        const formatDate = (d?: string) => d ? new Date(d).toLocaleString('en-GB').replace(',', '') : '-';
        const escapeCsv = (str?: string) => str ? `"${str.replace(/"/g, '""')}"` : '-';

        return [
            t.id,
            escapeCsv(t.requesterName),
            escapeCsv(t.branch),
            t.channel,
            t.category,
            escapeCsv(t.subcategory),
            t.priority,
            escapeCsv(t.description),
            t.linkedAssetId || '-',
            t.status,
            escapeCsv(t.assignedTo),
            t.resolutionType === 'ROUTINE' ? 'روتيني' : (t.resolutionType === 'SPECIALIZED' ? 'متخصص' : '-'),
            escapeCsv(t.resolutionDetails),
            formatDate(t.receivedAt),
            formatDate(t.startedAt),
            formatDate(t.resolvedAt),
            formatDate(t.closedAt),
            t.isReceivedAtAdjusted ? 'نعم' : 'لا'
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Tickets_Full_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
      const headers = [
          'مقدم الطلب', 
          'الفرع', 
          'القناة', 
          'التصنيف', 
          'التصنيف الفرعي', 
          'الأولوية', 
          'الوصف', 
          'رقم الأصل (اختياري)',
          'الحالة',
          'الفني المسؤول',
          'وقت الاستلام (YYYY-MM-DD)',
          'وقت البدء (YYYY-MM-DD)',
          'وقت الحل (YYYY-MM-DD)',
          'وقت الإغلاق (YYYY-MM-DD)',
          'نوع الحل',
          'تفاصيل الحل'
      ];
      
      const exampleRow = [
          'محمد أحمد', 
          'الرياض - المكتب الرئيسي', 
          'Email', 
          'أجهزة', 
          'استبدال قطعة', 
          'متوسط', 
          'اللابتوب لا يعمل', 
          'IT-LAP-RUH-23-0001',
          'تم الحل',
          'فني دعم 1',
          '2023-01-01 09:00',
          '2023-01-01 10:00',
          '2023-01-02 14:00',
          '2023-01-03 10:00',
          'روتيني',
          'تم استبدال البطارية'
      ];
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), exampleRow.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Tickets_Import_Template_Full.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Robust CSV Parsing Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (!text) return;

          // Normalize newlines
          const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 2) {
              alert('الملف فارغ أو لا يحتوي على بيانات.');
              return;
          }

          // 1. Detect Delimiter (first line)
          const firstLine = lines[0];
          const delimiter = firstLine.includes(';') ? ';' : ',';

          // 2. Splitter Function (Handles Quotes)
          const splitCSVLine = (str: string) => {
              const res = [];
              let current = '';
              let inQuote = false;
              for (let i = 0; i < str.length; i++) {
                  const c = str[i];
                  if (c === '"') {
                      if (inQuote && str[i + 1] === '"') {
                          current += '"';
                          i++;
                      } else {
                          inQuote = !inQuote;
                      }
                  } else if (c === delimiter && !inQuote) {
                      res.push(current);
                      current = '';
                  } else {
                      current += c;
                  }
              }
              res.push(current);
              return res;
          };

          // 3. Parse Headers
          const headers = splitCSVLine(firstLine).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
          // Headers detected and processed

          const parsedTickets: Partial<Ticket>[] = [];

          for (let i = 1; i < lines.length; i++) {
              const rowValues = splitCSVLine(lines[i]);
              
              // Skip completely empty lines
              if (rowValues.length < 2 && !rowValues[0].trim()) continue;

              const rowData: any = {};
              headers.forEach((header, index) => {
                  const val = rowValues[index] ? rowValues[index].trim().replace(/^"|"$/g, '').replace(/""/g, '"') : '';
                  rowData[header] = val;
              });

              // Helper for safe fetching
              const getVal = (keys: string[]) => {
                  for (const k of keys) {
                      if (rowData[k] !== undefined && rowData[k] !== '') return rowData[k];
                  }
                  return undefined;
              };

              // Date Parser (Safe)
              const parseDate = (d?: string) => {
                  if (!d) return undefined;
                  const date = new Date(d);
                  return isNaN(date.getTime()) ? undefined : date.toISOString();
              };

              // Map Status safely
              let status = (getVal(['الحالة', 'status'])) as TicketStatus;
              if (!Object.values(TicketStatus).includes(status)) status = TicketStatus.NEW;

              const ticketObj: Partial<Ticket> = {
                  requesterName: getVal(['مقدم الطلب', 'requesterName']) || 'مجهول',
                  branch: getVal(['الفرع', 'branch']) || config.locations[0],
                  channel: (getVal(['القناة', 'channel']) || 'Portal') as TicketChannel,
                  category: getVal(['التصنيف', 'category']) || 'أخرى',
                  subcategory: getVal(['التصنيف الفرعي', 'subcategory']),
                  priority: (getVal(['الأولوية', 'priority']) || 'متوسط') as TicketPriority,
                  description: getVal(['الوصف', 'description']) || 'لا يوجد وصف',
                  linkedAssetId: getVal(['رقم الأصل (اختياري)', 'رقم الأصل', 'linkedAssetId']),
                  
                  status: status,
                  assignedTo: getVal(['الفني المسؤول', 'assignedTo']),
                  receivedAt: parseDate(getVal(['وقت الاستلام (YYYY-MM-DD)', 'receivedAt'])) || new Date().toISOString(),
                  startedAt: parseDate(getVal(['وقت البدء (YYYY-MM-DD)', 'startedAt'])),
                  resolvedAt: parseDate(getVal(['وقت الحل (YYYY-MM-DD)', 'resolvedAt'])),
                  closedAt: parseDate(getVal(['وقت الإغلاق (YYYY-MM-DD)', 'closedAt'])),
                  resolutionType: (getVal(['نوع الحل', 'resolutionType']) === 'متخصص' ? 'SPECIALIZED' : 'ROUTINE'),
                  resolutionDetails: getVal(['تفاصيل الحل', 'resolutionDetails'])
              };

              // Validation: Must have at least a description to be valid
              if (ticketObj.description) {
                  parsedTickets.push(ticketObj);
              }
          }

          if (parsedTickets.length > 0) {
              if (confirm(`تم العثور على ${parsedTickets.length} تذكرة صالحة. هل تريد استيرادها؟`)) {
                  addTicketsBulk(parsedTickets);
              }
          } else {
              alert('لم يتم العثور على بيانات صالحة. يرجى التأكد من أن الملف يحتوي على البيانات وتطابق العناوين.');
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const openTimeModal = (field: 'receivedAt' | 'startedAt' | 'resolvedAt', currentValue: string | undefined) => {
      setEditingField(field);
      // Ensure we have a valid date string before creating Date object for UI
      const safeDate = currentValue ? new Date(currentValue) : new Date();
      const val = !isNaN(safeDate.getTime()) ? safeDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      setAdjustTime(val);
      setShowTimeModal(true);
  };

  const getPriorityColor = (p: TicketPriority) => {
    switch(p) {
        case TicketPriority.CRITICAL: return 'bg-rose-100 text-rose-700 border-rose-200';
        case TicketPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
        case TicketPriority.MEDIUM: return 'bg-blue-100 text-blue-700 border-blue-200';
        case TicketPriority.LOW: return 'bg-slate-100 text-slate-700 border-slate-200';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper to get active ticket details efficiently
  const activeTicket = selectedTicket ? (tickets.find(t => t.id === selectedTicket.id) || selectedTicket) : null;
  const activeTicketHistory = activeTicket ? getTicketHistory(activeTicket.id) : [];

  return (
    <div className="space-y-6">
        {/* Top KPI Cards (Only in List View) */}
        {view === 'list' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* New Tickets Filter */}
                <div 
                    onClick={() => toggleFilter(TicketStatus.NEW)}
                    className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
                        filterStatus === TicketStatus.NEW 
                        ? 'border-blue-500 ring-2 ring-blue-100' 
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">التذاكر الجديدة</p>
                            <h3 className="text-2xl font-bold text-blue-600">{newTicketsCount}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${filterStatus === TicketStatus.NEW ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                            <Inbox size={20} />
                        </div>
                    </div>
                </div>

                {/* Open Tickets Filter */}
                <div 
                    onClick={() => toggleFilter('OPEN_GROUP')}
                    className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
                        filterStatus === 'OPEN_GROUP' 
                        ? 'border-amber-500 ring-2 ring-amber-100' 
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">تذاكر جارية (مفتوحة)</p>
                            <h3 className="text-2xl font-bold text-amber-600">{openCount}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${filterStatus === 'OPEN_GROUP' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'}`}>
                            <Activity size={20} />
                        </div>
                    </div>
                </div>

                {/* Closed Tickets Filter */}
                <div 
                    onClick={() => toggleFilter(TicketStatus.CLOSED)}
                    className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
                        filterStatus === TicketStatus.CLOSED 
                        ? 'border-emerald-500 ring-2 ring-emerald-100' 
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">التذاكر المغلقة</p>
                            <h3 className="text-2xl font-bold text-emerald-600">{closedTicketsCount}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${filterStatus === TicketStatus.CLOSED ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                            <CheckSquare size={20} />
                        </div>
                    </div>
                </div>

                {/* Avg Response (Informational) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">متوسط الاستجابة</p>
                            <h3 className="text-2xl font-bold text-slate-700">{stats.avgResponseTimeMinutes} <span className="text-sm font-normal text-slate-400">دقيقة</span></h3>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-600">
                           <Clock size={20} />
                       </div>
                    </div>
                </div>
             </div>
        )}

        {/* View Switcher Content */}
        {view === 'create' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto animate-fade-in">
               <div className="flex items-center justify-between mb-6">
                   <h2 className="text-xl font-bold text-slate-800">فتح تذكرة صيانة جديدة</h2>
                   <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">إلغاء</button>
               </div>
               <form onSubmit={handleCreate} className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">اسم مقدم الطلب (اختياري)</label>
                           <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800" 
                              value={newTicket.requesterName || ''} onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})} 
                              placeholder="غير محدد"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">القناة (المصدر)</label>
                           <select required 
                              className={`w-full p-3 rounded-xl border border-slate-200 bg-white ${!newTicket.channel ? 'text-slate-400' : 'text-black'}`}
                              value={newTicket.channel || ''} 
                              onChange={e => setNewTicket({...newTicket, channel: e.target.value as TicketChannel})}
                           >
                              <option value="" disabled>اختر القناة</option>
                              {Object.values(TicketChannel).map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">الفرع / الموقع</label>
                           <select required 
                              className={`w-full p-3 rounded-xl border border-slate-200 bg-white ${!newTicket.branch ? 'text-slate-400' : 'text-black'}`}
                              value={newTicket.branch || ''} 
                              onChange={e => setNewTicket({...newTicket, branch: e.target.value})}
                           >
                              <option value="" disabled>اختر الفرع / الموقع</option>
                              {config.locations.filter(l => !config.hiddenOptions?.locations?.includes(l)).map(l => (
                                <option key={l} value={l} className="text-black">{l}</option>
                              ))}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">الأولوية</label>
                           <select required 
                              className={`w-full p-3 rounded-xl border border-slate-200 bg-white ${!newTicket.priority ? 'text-slate-400' : 'text-black'}`}
                              value={newTicket.priority || ''} 
                              onChange={e => setNewTicket({...newTicket, priority: e.target.value as TicketPriority})}
                           >
                              <option value="" disabled>اختر الأولوية</option>
                              {Object.values(TicketPriority).map(p => <option key={p} value={p} className="text-black">{p}</option>)}
                           </select>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">التصنيف</label>
                           <select required 
                              className={`w-full p-3 rounded-xl border border-slate-200 bg-white ${!newTicket.category ? 'text-slate-400' : 'text-black'}`}
                              value={newTicket.category || ''} 
                              onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                           >
                              <option value="" disabled>اختر التصنيف</option>
                              {config.ticketCategories.filter(c => !config.hiddenOptions?.ticketCategories?.includes(c)).map(c => (
                                <option key={c} value={c} className="text-black">{c}</option>
                              ))}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">ربط بأصل (اختياري)</label>
                           <select 
                              className={`w-full p-3 rounded-xl border border-slate-200 bg-white ${!newTicket.linkedAssetId ? 'text-slate-400' : 'text-black'}`}
                              value={newTicket.linkedAssetId || ''} 
                              onChange={e => setNewTicket({...newTicket, linkedAssetId: e.target.value})}
                           >
                              <option value="">بدون ربط</option>
                              {assets.map(a => <option key={a.id} value={a.id} className="text-black">{a.name} ({a.serialNumber})</option>)}
                           </select>
                       </div>
                   </div>

                   <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">وصف المشكلة</label>
                        <textarea required rows={4} className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800"
                           value={newTicket.description || ''} onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                           placeholder="اكتب تفاصيل المشكلة هنا..."
                        />
                   </div>

                   <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                       إنشاء التذكرة
                   </button>
               </form>
            </div>
        ) : 
         (view === 'detail' && activeTicket) ? (
            <div className="flex flex-col h-full animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
                        <ArrowRight size={20} /> عودة للقائمة
                    </button>
                    {/* Permission Based Buttons */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {hasPermission('tickets', 'update', activeTicket) && activeTicket.status === TicketStatus.NEW && (
                            <button onClick={() => updateTicketStatus(activeTicket.id, TicketStatus.IN_PROGRESS)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                                <PlayCircle size={18} /> بدء العمل
                            </button>
                        )}
                        {hasPermission('tickets', 'update', activeTicket) && activeTicket.status === TicketStatus.IN_PROGRESS && (
                             <button onClick={() => setShowResolveModal(true)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700">
                                <CheckCircle2 size={18} /> تم الحل
                            </button>
                        )}
                        {hasPermission('tickets', 'change_status_closed', activeTicket) && (activeTicket.status === TicketStatus.RESOLVED) && (
                             <button onClick={() => updateTicketStatus(activeTicket.id, TicketStatus.CLOSED)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-slate-800 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-slate-900">
                                <XCircle size={18} /> إغلاق التذكرة
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{activeTicket.requesterName}</h2>
                                    <p className="text-slate-500 text-sm">{activeTicket.branch} • عبر {activeTicket.channel}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(activeTicket.priority)}`}>
                                    {activeTicket.priority}
                                </span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                 <p className="text-slate-700 leading-relaxed">{activeTicket.description}</p>
                            </div>

                            {/* Attachment Section */}
                            {activeTicket.attachmentImage && (
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <ImageIcon size={14} /> صورة مرفقة من المستخدم
                                    </p>
                                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 w-fit max-w-full">
                                        <img src={activeTicket.attachmentImage} alt="Problem Attachment" className="max-h-60 object-contain bg-slate-100" />
                                        <a 
                                            href={activeTicket.attachmentImage} 
                                            download={`attachment-${activeTicket.id}.png`}
                                            className="absolute bottom-2 right-2 bg-slate-900/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="تحميل الصورة"
                                        >
                                            <Download size={16} />
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                 <span className="flex items-center gap-1"><AlertCircle size={14}/> {activeTicket.category}</span>
                                 {activeTicket.linkedAssetId && <span className="flex items-center gap-1"><MessageSquare size={14}/> أصل مرتبط: {activeTicket.linkedAssetId}</span>}
                            </div>
                        </div>

                        {/* Resolution Details Block (Visible if Resolved) */}
                        {activeTicket.resolutionType && (
                            <div className="bg-emerald-50 rounded-2xl p-6 shadow-sm border border-emerald-100">
                                <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={20} /> تفاصيل الحل
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded border border-emerald-200">
                                        {activeTicket.resolutionType === 'ROUTINE' ? 'حل روتيني' : 'حل متخصص'}
                                    </span>
                                </div>
                                {activeTicket.resolutionDetails && (
                                    <div className="bg-white p-3 rounded-xl border border-emerald-100 text-emerald-900 text-sm mt-2">
                                        <span className="font-bold block mb-1">وصف الإصلاح:</span>
                                        {activeTicket.resolutionDetails}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Timeline & Audit */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4">سجل النشاط (Audit Log)</h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                 {activeTicketHistory.length === 0 ? <p className="text-slate-400 text-sm">لا يوجد نشاط مسجل</p> : 
                                    activeTicketHistory.map(log => (
                                        <div key={log.id} className="flex gap-3 text-sm pb-3 border-b border-slate-100 last:border-0">
                                            <div className="mt-1">
                                                {log.actionType === 'TICKET_TIME_ADJUST' ? <Clock size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-blue-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-700">{log.actionType}</span>
                                                    <span className="text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                                                </div>
                                                <p className="text-slate-600">{log.details}</p>
                                                {log.reason && (
                                                    <div className="mt-1 bg-amber-50 p-2 rounded border border-amber-100 text-amber-800 text-xs">
                                                        <span className="font-bold">سبب التعديل:</span> {log.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                 }
                            </div>
                        </div>
                    </div>

                    {/* Side Panel: Timings */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Clock size={20} /> التوقيت والمؤشرات
                            </h3>
                            
                            {/* Received At Block */}
                            <div className="mb-4 pb-4 border-b border-slate-100 relative group">
                                 <label className="text-xs font-bold text-slate-500 block mb-1">وقت الاستلام (Received At)</label>
                                 <div className="flex items-center justify-between">
                                     <span className="font-mono text-slate-800 font-bold">
                                        {activeTicket.receivedAt && !isNaN(new Date(activeTicket.receivedAt).getTime()) 
                                            ? new Date(activeTicket.receivedAt).toLocaleString('en-GB') 
                                            : '--'}
                                     </span>
                                     {hasPermission('tickets', 'update', activeTicket) && (
                                        <button onClick={() => openTimeModal('receivedAt', activeTicket.receivedAt)} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors" title="تعديل الوقت يدويًا">
                                            <Edit2 size={14} />
                                        </button>
                                     )}
                                 </div>
                                 {activeTicket.isReceivedAtAdjusted && (
                                     <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                         معدل يدويًا (Adjusted)
                                     </span>
                                 )}
                            </div>

                            <div className="space-y-3">
                                 <div>
                                     <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-500 block">بدء العمل (Started At)</label>
                                        {activeTicket.startedAt && hasPermission('tickets', 'update', activeTicket) && (
                                            <button onClick={() => openTimeModal('startedAt', activeTicket.startedAt)} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                        )}
                                     </div>
                                     <span className="text-sm text-slate-800">{activeTicket.startedAt ? new Date(activeTicket.startedAt).toLocaleString('en-GB') : '--'}</span>
                                 </div>
                                 <div>
                                     <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-500 block">وقت الحل (Resolved At)</label>
                                        {activeTicket.resolvedAt && hasPermission('tickets', 'update', activeTicket) && (
                                            <button onClick={() => openTimeModal('resolvedAt', activeTicket.resolvedAt)} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                        )}
                                     </div>
                                     <span className="text-sm text-slate-800">{activeTicket.resolvedAt ? new Date(activeTicket.resolvedAt).toLocaleString('en-GB') : '--'}</span>
                                 </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-2">الحالة الحالية</h3>
                            <div className={`p-3 rounded-xl text-center font-bold border-2 ${
                                activeTicket.status === TicketStatus.RESOLVED ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 
                                activeTicket.status === TicketStatus.NEW ? 'border-blue-100 bg-blue-50 text-blue-700' : 
                                'border-slate-100 bg-slate-50 text-slate-700'
                            }`}>
                                {activeTicket.status}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         ) : 
         (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                {/* List Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="text-blue-500" /> تذاكر الدعم الفني
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <input type="text" placeholder="بحث..." className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-full md:w-64 bg-white text-slate-800" 
                           value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        
                        {/* Action Buttons Group */}
                        <div className="flex items-center gap-2">
                             {hasPermission('tickets', 'create') && (
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
                                        title="استيراد تذاكر (CSV)"
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

                             {hasPermission('tickets', 'export') && (
                                <button 
                                    onClick={handleExportTickets}
                                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    title="تصدير جميع التفاصيل (Excel)"
                                >
                                    <FileSpreadsheet size={18} />
                                </button>
                            )}
                        </div>

                        {hasPermission('tickets', 'create') && (
                            <button onClick={() => setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
                                <Plus size={16} /> تذكرة جديدة
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase whitespace-nowrap">
                            <tr>
                                <th className="px-6 py-4">رقم التذكرة</th>
                                <th className="px-6 py-4">مقدم الطلب</th>
                                <th className="px-6 py-4">الموقع</th>
                                <th className="px-6 py-4">التصنيف / القناة</th>
                                <th className="px-6 py-4">الأولوية</th>
                                <th className="px-6 py-4">وقت الاستلام</th>
                                <th className="px-6 py-4">الحالة</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                            {paginatedTickets.map(t => (
                                <tr key={t.id} onClick={() => { setSelectedTicket(t); setView('detail'); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{t.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 text-sm">{t.requesterName}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]" title={t.branch}>
                                        {t.branch}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700">{t.category}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.channel}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getPriorityColor(t.priority)}`}>
                                            {t.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(t.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        <br/>
                                        <span className="text-[10px] text-slate-400">{new Date(t.receivedAt).toLocaleDateString()}</span>
                                        {t.isReceivedAtAdjusted && <AlertCircle size={12} className="inline mr-1 text-amber-500" />}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            t.status === TicketStatus.RESOLVED ? 'bg-emerald-100 text-emerald-700' :
                                            t.status === TicketStatus.CLOSED ? 'bg-slate-100 text-slate-500' :
                                            t.status === TicketStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-50 text-blue-700'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-400">
                                        <MoreVertical size={16} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTickets.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            لا توجد تذاكر تطابق معايير البحث
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {filteredTickets.length > 0 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" dir="rtl">
                        <span className="text-xs text-slate-500 font-medium">
                            عرض {startIndex + 1} إلى {Math.min(startIndex + ITEMS_PER_PAGE, filteredTickets.length)} من أصل {filteredTickets.length} تذكرة
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
         )
        }

        {/* Resolve Ticket Modal */}
        {showResolveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-600" /> إتمام حل التذكرة
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setResolutionType('ROUTINE')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${resolutionType === 'ROUTINE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                            >
                                <CheckCircle2 size={24} />
                                <span className="font-bold">حل روتيني</span>
                                <span className="text-xs font-normal opacity-70">إجراءات قياسية معتادة</span>
                            </button>
                            <button 
                                onClick={() => setResolutionType('SPECIALIZED')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${resolutionType === 'SPECIALIZED' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                            >
                                <Wrench size={24} />
                                <span className="font-bold">حل متخصص</span>
                                <span className="text-xs font-normal opacity-70">يتطلب توثيق طريقة الإصلاح</span>
                            </button>
                        </div>

                        {resolutionType === 'SPECIALIZED' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-bold text-slate-700 mb-2">وصف طريقة الإصلاح / الحل <span className="text-rose-500">*</span></label>
                                <textarea 
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-amber-500 outline-none h-32 resize-none"
                                    placeholder="اشرح الخطوات التقنية التي قمت بها لحل المشكلة..."
                                    value={resolutionDetails}
                                    onChange={(e) => setResolutionDetails(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => setShowResolveModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                إلغاء
                            </button>
                            <button 
                                onClick={handleResolveSubmit}
                                disabled={resolutionType === 'SPECIALIZED' && !resolutionDetails.trim()}
                                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                            >
                                تأكيد الحل
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
