
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, TicketStatus, TicketPriority, TicketChannel } from '../types';
import { Search, Plus, Filter, MessageSquare, Clock, User, CheckCircle2, AlertCircle, PlayCircle, XCircle, MoreVertical, Edit2, Calendar, ArrowRight, Inbox, CheckSquare, Activity, Wrench, FileText, FileSpreadsheet, Download, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Trash2, Bell, ClipboardCheck, Folder } from 'lucide-react';
import { useDebounce } from '../utils/performanceUtils';

interface TicketManagerProps {
    initialFilters?: { status?: string; ticketId?: string };
}

export const TicketManager: React.FC<TicketManagerProps> = ({ initialFilters }) => {
  const { tickets = [], assets = [], config, currentUser, allUsers = [], addTicket, addTicketsBulk, updateTicketStatus, updateTicketCategory, adjustTicketTime, deleteTicket, getTicketHistory, getStats, hasPermission, loadMoreTickets, hasMoreTickets, showConfirm } = useApp();
  
  // States
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Escalation Modal State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTargetUserId, setReassignTargetUserId] = useState('');
  const [reassignInstructions, setReassignInstructions] = useState('');

  // Category Edit Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryTicket, setEditingCategoryTicket] = useState<Ticket | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [autoStartWork, setAutoStartWork] = useState(false);

  // Create Form State
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({});

  const stats = getStats().ticketStats;

  // IMPORTANT: Filter Tickets by Permission First
  const accessibleTickets = tickets.filter(t => hasPermission('tickets', 'view', t));

  // Filter escalated tickets assigned to current user
  const escalatedToMe = accessibleTickets.filter(t => 
    t.assignedTo === currentUser?.name && 
    t.status === TicketStatus.ESCALATED
  );

  // Filter ALL tickets assigned to current user (not closed/resolved)
  const assignedToMe = accessibleTickets.filter(t => 
    t.assignedTo === currentUser?.name && 
    t.status !== TicketStatus.CLOSED && 
    t.status !== TicketStatus.RESOLVED
  );

  // Derived Counts
  const newTicketsCount = accessibleTickets.filter(t => t.status === TicketStatus.NEW).length;
  const closedTicketsCount = accessibleTickets.filter(t => t.status === TicketStatus.CLOSED).length;
  const openCount = accessibleTickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length;
  const escalatedToMeCount = escalatedToMe.length;
  const assignedToMeCount = assignedToMe.length;


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
  
  // Search from server when search term changes
  useEffect(() => {
    const searchFromServer = async () => {
      if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/tickets?search=${encodeURIComponent(debouncedSearchTerm)}&limit=500`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            const searchTickets = Array.isArray(result) ? result : (result.tickets || []);
            setSearchResults(searchTickets);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };
    
    searchFromServer();
  }, [debouncedSearchTerm]);

  // Filter Logic with useMemo for performance
  const filteredTickets = useMemo(() => {
    // Use search results if searching, otherwise use loaded tickets
    const sourceTickets = searchResults.length > 0 || isSearching ? searchResults : accessibleTickets;
    
    return sourceTickets.filter(t => {
     const matchesSearch = searchResults.length > 0 || !debouncedSearchTerm || 
                          t.requesterName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                          t.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
     
     let matchesStatus = true;
     if (filterStatus === 'ALL') {
         matchesStatus = true;
     } else if (filterStatus === 'ASSIGNED_TO_ME') {
         matchesStatus = t.assignedTo === currentUser?.name && t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED;
     } else if (filterStatus === 'OPEN_GROUP') {
         matchesStatus = t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED;
     } else {
         matchesStatus = t.status === filterStatus;
     }

     return matchesSearch && matchesStatus;
  });
  }, [accessibleTickets, debouncedSearchTerm, filterStatus, searchResults, isSearching]);

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

  const handleEscalateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket || !escalationReason.trim()) return;

      try {
          const response = await fetch(`/api/tickets/${selectedTicket.id}/escalate`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ reason: escalationReason })
          });

          if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'فشل التصعيد');
              return;
          }

          const updatedTicket = await response.json();
          // Update ticket in context (AppContext should have a method for this)
          window.location.reload(); // Temporary: reload to get updated data
          setShowEscalateModal(false);
          setEscalationReason('');
      } catch (error) {
          console.error('Escalation error:', error);
          alert('حدث خطأ أثناء التصعيد');
      }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket || !reassignTargetUserId || !reassignInstructions.trim()) return;

      try {
          const response = await fetch(`/api/tickets/${selectedTicket.id}/reassign`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ 
                  targetUserId: reassignTargetUserId,
                  instructions: reassignInstructions 
              })
          });

          if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'فشل إعادة الإسناد');
              return;
          }

          const updatedTicket = await response.json();
          // Update ticket in context
          window.location.reload(); // Temporary: reload to get updated data
          setShowReassignModal(false);
          setReassignTargetUserId('');
          setReassignInstructions('');
      } catch (error) {
          console.error('Reassignment error:', error);
          alert('حدث خطأ أثناء إعادة الإسناد');
      }
  };

  const handleCategoryUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingCategoryTicket || !newCategory) return;

      await updateTicketCategory(editingCategoryTicket.id, newCategory);
      
      // إذا كان autoStartWork مفعل، ابدأ العمل تلقائياً
      if (autoStartWork) {
          await updateTicketStatus(editingCategoryTicket.id, TicketStatus.IN_PROGRESS);
          setAutoStartWork(false);
      }
      
      setShowCategoryModal(false);
      setEditingCategoryTicket(null);
      setNewCategory('');
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
              showConfirm(
                  `تم العثور على ${parsedTickets.length} تذكرة صالحة. هل تريد استيرادها؟`,
                  () => {
                      addTicketsBulk(parsedTickets);
                      fileInputRef.current!.value = '';
                  },
                  undefined,
                  'استيراد',
                  'إلغاء'
              );
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
                {/* Assigned to Me - First Priority */}
                {assignedToMeCount > 0 && (
                <div 
                    onClick={() => toggleFilter('ASSIGNED_TO_ME')}
                    className={`bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border-2 shadow-md cursor-pointer transition-all ${
                        filterStatus === 'ASSIGNED_TO_ME' 
                        ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg' 
                        : 'border-emerald-300 hover:border-emerald-400 hover:shadow-lg'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-emerald-700 font-bold mb-1 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                مسندة إليّ
                            </p>
                            <h3 className="text-3xl font-bold text-emerald-600">{assignedToMeCount}</h3>
                            <p className="text-xs text-emerald-600 mt-1">تذاكر تحت مسؤوليتك</p>
                        </div>
                        <div className={`p-2 rounded-lg ${filterStatus === 'ASSIGNED_TO_ME' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                            <ClipboardCheck size={22} />
                        </div>
                    </div>
                </div>
                )}

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

                {/* Escalated to Me Filter - Only show if user has escalated tickets */}
                {escalatedToMeCount > 0 && (
                    <div 
                        onClick={() => toggleFilter(TicketStatus.ESCALATED)}
                        className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
                            filterStatus === TicketStatus.ESCALATED 
                            ? 'border-purple-500 ring-2 ring-purple-100' 
                            : 'border-slate-200 hover:border-purple-300'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1">
                                    <ArrowRight size={14} className="rotate-90" />
                                    مصعّدة إليّ
                                </p>
                                <h3 className="text-2xl font-bold text-purple-600">{escalatedToMeCount}</h3>
                            </div>
                            <div className={`p-2 rounded-lg ${filterStatus === TicketStatus.ESCALATED ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
                                <Bell size={20} className="animate-pulse" />
                            </div>
                        </div>
                    </div>
                )}

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
                        {/* بدء العمل - للتذاكر الجديدة أو المسندة */}
                        {hasPermission('tickets', 'update', activeTicket) && 
                         (activeTicket.status === TicketStatus.NEW || activeTicket.status === TicketStatus.ASSIGNED) && (
                            <button onClick={() => {
                                // التحقق من التصنيف للتذاكر القادمة من Email أو Portal
                                const needsCategory = (activeTicket.channel === 'Email' || activeTicket.channel === 'Portal') && 
                                                     (activeTicket.category === 'أخرى' || activeTicket.category === 'غير محدد' || !activeTicket.category);
                                
                                if (needsCategory) {
                                    // فتح modal التصنيف وتفعيل البدء التلقائي
                                    setEditingCategoryTicket(activeTicket);
                                    setNewCategory(activeTicket.category || '');
                                    setAutoStartWork(true);
                                    setShowCategoryModal(true);
                                } else {
                                    // بدء العمل مباشرة
                                    updateTicketStatus(activeTicket.id, TicketStatus.IN_PROGRESS);
                                }
                            }} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                                <PlayCircle size={18} /> بدء العمل
                            </button>
                        )}
                        {/* تم الحل - للتذاكر قيد العمل أو المصعدة أو المسندة */}
                        {hasPermission('tickets', 'update', activeTicket) && 
                         (activeTicket.status === TicketStatus.IN_PROGRESS || 
                          activeTicket.status === TicketStatus.ASSIGNED || 
                          activeTicket.status === TicketStatus.ESCALATED) && (
                             <button onClick={() => setShowResolveModal(true)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700">
                                <CheckCircle2 size={18} /> تم الحل
                            </button>
                        )}
                        {/* إغلاق التذكرة - للتذاكر المحلولة */}
                        {hasPermission('tickets', 'change_status_closed', activeTicket) && (activeTicket.status === TicketStatus.RESOLVED) && (
                             <button onClick={() => updateTicketStatus(activeTicket.id, TicketStatus.CLOSED)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-slate-800 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-slate-900">
                                <XCircle size={18} /> إغلاق التذكرة
                            </button>
                        )}
                        {hasPermission('tickets', 'delete', activeTicket) && (
                             <button onClick={() => {
                                showConfirm(
                                    `هل أنت متأكد من حذف التذكرة ${activeTicket.id}؟`,
                                    () => {
                                        deleteTicket(activeTicket.id);
                                        setView('list');
                                    },
                                    undefined,
                                    'حذف',
                                    'إلغاء'
                                );
                             }} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-red-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-red-700">
                                <Trash2 size={18} /> حذف
                            </button>
                        )}
                        {/* Escalation Button */}
                        {(() => {
                            const { currentUser } = useApp();
                            const canEscalate = currentUser?.supportLevel && 
                                              currentUser.supportLevel !== 'مشرف وحدة تقنية المعلومات' &&
                                              activeTicket.status !== TicketStatus.RESOLVED &&
                                              activeTicket.status !== TicketStatus.CLOSED;
                            
                            if (canEscalate) {
                                return (
                                    <button 
                                        onClick={() => setShowEscalateModal(true)}
                                        className="flex-1 sm:flex-none justify-center px-4 py-2 bg-amber-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-amber-700">
                                        <ArrowRight size={18} className="rotate-90" /> تصعيد
                                    </button>
                                );
                            }
                            return null;
                        })()}
                        {/* Reassignment Button (All Support Levels) */}
                        {(() => {
                            const { currentUser } = useApp();
                            const canReassign = currentUser?.supportLevel && 
                                              activeTicket.status !== TicketStatus.RESOLVED &&
                                              activeTicket.status !== TicketStatus.CLOSED;
                            
                            if (canReassign) {
                                return (
                                    <button 
                                        onClick={() => setShowReassignModal(true)}
                                        className="flex-1 sm:flex-none justify-center px-4 py-2 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700">
                                        <User size={18} /> إعادة إسناد
                                    </button>
                                );
                            }
                            return null;
                        })()}
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
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 max-w-full overflow-hidden">
                                {activeTicket.channel === 'Email' && activeTicket.description?.includes('<') ? (
                                  <div 
                                    className="text-slate-700 leading-relaxed prose prose-sm max-w-none break-words"
                                    dangerouslySetInnerHTML={{ __html: activeTicket.description }}
                                    style={{
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                      maxWidth: '100%'
                                    }}
                                  />
                                ) : (
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{activeTicket.description}</p>
                                )}
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

                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 items-center">
                                 <span className="flex items-center gap-1">
                                     <AlertCircle size={14}/> {activeTicket.category}
                                 </span>
                                 {/* Show warning if category is unclassified and allow editing */}
                                 {(activeTicket.category === 'أخرى' || activeTicket.category === 'غير محدد') && 
                                  (activeTicket.channel === 'Email' || activeTicket.channel === 'Portal') && 
                                  hasPermission('tickets', 'update', activeTicket) && (
                                     <button
                                         onClick={() => {
                                             setEditingCategoryTicket(activeTicket);
                                             setNewCategory(activeTicket.category);
                                             setShowCategoryModal(true);
                                         }}
                                         className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                                     >
                                         <Edit2 size={12} /> تصنيف مطلوب
                                     </button>
                                 )}
                                 {/* Allow all staff to edit category */}
                                 {hasPermission('tickets', 'update', activeTicket) && (
                                     <button
                                         onClick={() => {
                                             setEditingCategoryTicket(activeTicket);
                                             setNewCategory(activeTicket.category);
                                             setShowCategoryModal(true);
                                         }}
                                         className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 transition-colors"
                                         title="تعديل التصنيف"
                                     >
                                         <Edit2 size={12} />
                                     </button>
                                 )}
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

                        {/* Escalation History */}
                        {activeTicket.escalationHistory && activeTicket.escalationHistory.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Activity size={20} className="text-purple-600" /> سجل التصعيد والإسناد
                                </h3>
                                <div className="space-y-3">
                                    {activeTicket.escalationHistory.map((record, index) => (
                                        <div key={record.id} className="flex gap-3 text-sm pb-3 border-b border-slate-100 last:border-0">
                                            <div className="mt-1">
                                                {record.action === 'AUTO_ASSIGN' && <CheckSquare size={16} className="text-blue-500" />}
                                                {record.action === 'ESCALATE' && <ArrowRight size={16} className="text-amber-500 rotate-90" />}
                                                {record.action === 'REASSIGN' && <User size={16} className="text-purple-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <span className="font-bold text-slate-700 block">
                                                            {record.action === 'AUTO_ASSIGN' && 'إسناد تلقائي'}
                                                            {record.action === 'ESCALATE' && 'تصعيد'}
                                                            {record.action === 'REASSIGN' && 'إعادة إسناد'}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            من: {record.fromUser || 'النظام'} {record.fromLevel && `(${record.fromLevel})`}
                                                            {' → '}
                                                            إلى: {record.toUser} ({record.toLevel})
                                                        </span>
                                                    </div>
                                                    <span className="text-slate-400 text-xs">
                                                        {new Date(record.timestamp).toLocaleString('ar-SA')}
                                                    </span>
                                                </div>
                                                {record.reason && (
                                                    <div className={`mt-2 p-2 rounded border text-xs ${
                                                        record.action === 'ESCALATE' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                                                        record.action === 'REASSIGN' ? 'bg-purple-50 border-purple-100 text-purple-800' :
                                                        'bg-blue-50 border-blue-100 text-blue-800'
                                                    }`}>
                                                        <span className="font-bold">
                                                            {record.action === 'ESCALATE' && 'سبب التصعيد: '}
                                                            {record.action === 'REASSIGN' && 'تعليمات: '}
                                                            {record.action === 'AUTO_ASSIGN' && 'ملاحظة: '}
                                                        </span>
                                                        {record.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <User size={18} /> مسند إلى
                            </h3>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <p className="font-bold text-slate-800">
                                    {activeTicket.assignedTo || 'غير محدد'}
                                </p>
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
                        <div className="relative">
                            <input type="text" placeholder="بحث في جميع التذاكر..." className="border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm w-full md:w-64 bg-white text-slate-800" 
                               value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            {isSearching && (
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-bold">
                                    {searchResults.length}
                                </div>
                            )}
                        </div>
                        
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
                    <table className="w-full text-right table-fixed">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-6 py-4 w-32">رقم التذكرة</th>
                                <th className="px-6 py-4 w-40">مقدم الطلب</th>
                                <th className="px-6 py-4 w-32">الموقع</th>
                                <th className="px-6 py-4 w-40">التصنيف / القناة</th>
                                <th className="px-6 py-4 w-24">الأولوية</th>
                                <th className="px-6 py-4 w-32">وقت الاستلام</th>
                                <th className="px-6 py-4 w-28">الحالة</th>
                                <th className="px-6 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTickets.map(t => (
                                <tr key={t.id} onClick={() => { setSelectedTicket(t); setView('detail'); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-bold text-blue-600 break-all">{t.id}</span>
                                            {t.assignedTo === currentUser?.name && t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                                                    <ClipboardCheck size={10} />
                                                    مسندة لك
                                                </span>
                                            )}
                                            {t.status === TicketStatus.ESCALATED && t.assignedTo === currentUser?.name && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold border border-purple-200 animate-pulse">
                                                    <ArrowRight size={10} className="rotate-90" />
                                                    مصعّدة
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 text-sm break-words overflow-hidden">{t.requesterName}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="break-words overflow-hidden" title={t.branch}>
                                            {t.branch}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700 break-words">{t.category}</span>
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
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-medium">
                                عرض {startIndex + 1} إلى {Math.min(startIndex + ITEMS_PER_PAGE, filteredTickets.length)} من أصل {filteredTickets.length} تذكرة
                            </span>
                            
                            {hasMoreTickets && (
                                <button 
                                    onClick={loadMoreTickets}
                                    className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1"
                                >
                                    <Download size={14} /> تحميل المزيد من السيرفر
                                </button>
                            )}
                        </div>
                        
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

        {/* Escalate Ticket Modal */}
        {showEscalateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ArrowRight className="text-amber-600 rotate-90" size={24} /> تصعيد التذكرة
                    </h3>
                    
                    <form onSubmit={handleEscalateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                سبب التصعيد <span className="text-rose-500">*</span>
                            </label>
                            <textarea 
                                required
                                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-amber-500 outline-none h-32 resize-none"
                                placeholder="اشرح سبب تصعيد هذه التذكرة للمستوى الأعلى..."
                                value={escalationReason}
                                onChange={(e) => setEscalationReason(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                سيتم إرسال التذكرة تلقائياً إلى {(() => {
                                    const { currentUser } = useApp();
                                    if (currentUser?.supportLevel === 'موظف دعم') return 'أخصائي';
                                    if (currentUser?.supportLevel === 'أخصائي') return 'مشرف';
                                    return 'المستوى الأعلى';
                                })()} متاح في نفس الفرع
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowEscalateModal(false);
                                    setEscalationReason('');
                                }} 
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                إلغاء
                            </button>
                            <button 
                                type="submit"
                                disabled={!escalationReason.trim()}
                                className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200"
                            >
                                تصعيد الآن
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Edit Category Modal */}
        {showCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Folder className="text-indigo-600" size={24} /> تعديل تصنيف التذكرة
                    </h3>
                    
                    <form onSubmit={handleCategoryUpdate} className="space-y-4">
                        {autoStartWork && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                    <PlayCircle size={16} className="text-blue-600" />
                                    <strong>بعد تحديد التصنيف سيتم بدء العمل على التذكرة تلقائياً</strong>
                                </p>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                التصنيف <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                required
                                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-indigo-500 outline-none"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            >
                                <option value="">اختر التصنيف...</option>
                                {config.ticketCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                ⚠️ يجب تصنيف التذاكر القادمة من البريد الإلكتروني أو البوابة بشكل صحيح
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowCategoryModal(false);
                                    setEditingCategoryTicket(null);
                                    setNewCategory('');
                                    setAutoStartWork(false);
                                }} 
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                إلغاء
                            </button>
                            <button 
                                type="submit"
                                disabled={!newCategory}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                            >
                                {autoStartWork ? 'حفظ وبدء العمل' : 'حفظ التصنيف'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Reassign Ticket Modal */}
        {showReassignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="text-purple-600" size={24} /> إعادة إسناد التذكرة
                    </h3>
                    
                    <form onSubmit={handleReassignSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                اختر المستخدم <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                required
                                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-purple-500 outline-none"
                                value={reassignTargetUserId}
                                onChange={(e) => setReassignTargetUserId(e.target.value)}
                            >
                                <option value="">اختر مستخدم...</option>
                                {allUsers
                                    .filter(u => {
                                        if (!u.isActive || !u.supportLevel) return false;
                                        
                                        // Define hierarchy levels
                                        const hierarchy = {
                                            'موظف دعم فني': 1,
                                            'أخصائي تقنية المعلومات': 2,
                                            'مشرف وحدة تقنية المعلومات': 3
                                        };
                                        
                                        const currentLevel = hierarchy[currentUser?.supportLevel || ''] || 0;
                                        const targetLevel = hierarchy[u.supportLevel] || 0;
                                        
                                        // Can only reassign to same level or lower
                                        return targetLevel <= currentLevel;
                                    })
                                    .map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.supportLevel})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                تعليمات للمستخدم الجديد <span className="text-rose-500">*</span>
                            </label>
                            <textarea 
                                required
                                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-purple-500 outline-none h-32 resize-none"
                                placeholder="اكتب تعليمات أو ملاحظات للمستخدم الذي سيستلم التذكرة..."
                                value={reassignInstructions}
                                onChange={(e) => setReassignInstructions(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowReassignModal(false);
                                    setReassignTargetUserId('');
                                    setReassignInstructions('');
                                }} 
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                إلغاء
                            </button>
                            <button 
                                type="submit"
                                disabled={!reassignTargetUserId || !reassignInstructions.trim()}
                                className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                            >
                                إعادة إسناد
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
