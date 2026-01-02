
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FileSpreadsheet, Printer, MapPin, Server, CheckCircle2, DollarSign, UserCheck, Share2, Filter, X } from 'lucide-react';
import { TicketStatus, BillingCycle, Asset, Ticket, Subscription, AppUser } from '../types';

export const SmartReports: React.FC = () => {
  const { assets = [], tickets = [], subscriptions = [], renewals = [], config, allUsers = [] } = useApp();
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TICKETS' | 'SUBSCRIPTIONS'>('ASSETS');
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // --- Filtering Logic ---
  const isInRange = (dateStr?: string) => {
      // If no filters set, return true
      if (!dateFilter.start && !dateFilter.end) return true;
      if (!dateStr) return false;

      const target = new Date(dateStr).getTime();
      const start = dateFilter.start ? new Date(dateFilter.start).getTime() : -8640000000000000;
      // Set end date to end of the day (23:59:59)
      const end = dateFilter.end ? new Date(dateFilter.end).getTime() + 86399000 : 8640000000000000; 

      return target >= start && target <= end;
  };

  const filteredAssets = useMemo(() => assets.filter(a => isInRange(a.purchaseDate)), [assets, dateFilter]);
  const filteredTickets = useMemo(() => tickets.filter(t => isInRange(t.receivedAt)), [tickets, dateFilter]);
  // Filter subscriptions based on renewal date (Financial forecast view)
  const filteredSubscriptions = useMemo(() => subscriptions.filter(s => isInRange(s.nextRenewalDate)), [subscriptions, dateFilter]);

  // --- Helpers ---
  const calculateAssetAge = (purchaseDate: string) => {
    const start = new Date(purchaseDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    return years + (months / 12);
  };

  const calculateDurationHours = (start: string, end?: string) => {
    if (!end) return '0';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return (diff / (1000 * 60 * 60)).toFixed(1);
  };

  const getAnnualCost = (cost: number, cycle: BillingCycle) => {
    if (cycle === BillingCycle.MONTHLY) return cost * 12;
    if (cycle === BillingCycle.WEEKLY) return cost * 52;
    if (cycle === BillingCycle.YEARLY) return cost;
    return cost;
  };

  // --- Export Logic ---
  const handleExport = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (activeTab === 'ASSETS') {
      filename = `Assets_Report_${dateFilter.start || 'All'}_to_${dateFilter.end || 'All'}.csv`;
      headers = ['الاسم', 'النوع', 'العلامة التجارية', 'S/N', 'الحالة', 'الموقع', 'المسؤول', 'تاريخ الشراء', 'عمر الجهاز (سنة)', 'انتهاء الضمان'];
      rows = filteredAssets.map(a => [
        `"${a.name}"`, a.type, a.brand, `"${a.serialNumber}"`, a.status, `"${a.location}"`, `"${a.assignedTo}"`, a.purchaseDate, calculateAssetAge(a.purchaseDate).toFixed(1), a.warrantyExpiry
      ]);
    } else if (activeTab === 'TICKETS') {
      filename = `Tickets_Report_${dateFilter.start || 'All'}_to_${dateFilter.end || 'All'}.csv`;
      headers = ['رقم التذكرة', 'مقدم الطلب', 'الفئة', 'الأولوية', 'الحالة', 'القناة', 'تم الحل بواسطة', 'وقت الاستلام', 'وقت الحل', 'مدة الحل (ساعة)'];
      rows = filteredTickets.map(t => [
        t.id, `"${t.requesterName}"`, t.category, t.priority, t.status, t.channel, t.assignedTo || 'غير معين', t.receivedAt, t.resolvedAt || '-', calculateDurationHours(t.receivedAt, t.resolvedAt)
      ]);
    } else {
      filename = `Subscriptions_Report_${dateFilter.start || 'All'}_to_${dateFilter.end || 'All'}.csv`;
      headers = ['الاشتراك', 'المزود', 'النوع', 'دورة الدفع', 'التكلفة', 'التكلفة السنوية التقديرية', 'التجديد القادم'];
      rows = filteredSubscriptions.map(s => {
         const lastRenewal = renewals.find(r => r.id === s.currentRenewalId);
         const cost = lastRenewal?.cost || 0;
         return [
            `"${s.name}"`, s.vendor, s.type, s.billingCycle, cost, getAnnualCost(cost, s.billingCycle), s.nextRenewalDate || '-'
         ];
      });
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Sub-Components for Reports ---

  const AssetsReport = ({ data }: { data: Asset[] }) => {
    const total = data.length;
    const active = data.filter(a => a.status === 'مستخدم').length;
    const maintenance = data.filter(a => a.status === 'في الصيانة').length;
    const expiredWarranty = data.filter(a => new Date(a.warrantyExpiry) < new Date()).length;
    
    // Grouping
    const byLocation = data.reduce((acc, curr) => { acc[curr.location] = (acc[curr.location] || 0) + 1; return acc; }, {} as Record<string, number>);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-2 items-center text-sm text-blue-800">
                <Filter size={16} />
                <span>يتم عرض الأصول بناءً على <b>تاريخ الشراء</b> ضمن النطاق المحدد.</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الأصول (للفترة)</p>
                    <h3 className="text-2xl font-bold text-slate-800">{total}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">نسبة الاستخدام</p>
                    <h3 className="text-2xl font-bold text-blue-600">{total > 0 ? Math.round((active/total)*100) : 0}%</h3>
                    <p className="text-xs text-slate-400 mt-1">{active} جهاز نشط</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">في الصيانة</p>
                    <h3 className="text-2xl font-bold text-amber-600">{maintenance}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">خارج الضمان</p>
                    <h3 className="text-2xl font-bold text-rose-600">{expiredWarranty}</h3>
                </div>
            </div>

            {/* Deep Detail Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                    <span>تحليل تفصيلي للمخزون</span>
                    <span className="text-xs font-normal text-slate-500">يظهر أحدث 50 سجل من النتائج</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-white text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="p-3">الأصل</th>
                                <th className="p-3">الموقع</th>
                                <th className="p-3">تاريخ الشراء</th>
                                <th className="p-3">العمر (سنوات)</th>
                                <th className="p-3">الضمان</th>
                                <th className="p-3">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-slate-400">لا توجد بيانات للفترة المحددة</td></tr>
                            ) : (
                                data.slice(0, 50).map(asset => {
                                    const age = calculateAssetAge(asset.purchaseDate);
                                    const isWarrantyExpired = new Date(asset.warrantyExpiry) < new Date();
                                    return (
                                        <tr key={asset.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{asset.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">{asset.serialNumber}</div>
                                            </td>
                                            <td className="p-3 text-slate-600">{asset.location}</td>
                                            <td className="p-3 text-slate-600 font-mono">{asset.purchaseDate}</td>
                                            <td className="p-3">
                                                <span className={`font-bold ${age > 3 ? 'text-amber-600' : 'text-slate-700'}`}>{age.toFixed(1)}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${isWarrantyExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isWarrantyExpired ? 'منتهي' : 'ساري'}
                                                </span>
                                                <div className="text-[10px] text-slate-400 mt-1">{asset.warrantyExpiry}</div>
                                            </td>
                                            <td className="p-3 text-slate-600">{asset.status}</td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin size={18}/> التوزيع حسب الموقع</h4>
                    <div className="space-y-3">
                        {Object.entries(byLocation).map(([loc, count]) => (
                            <div key={loc} className="flex justify-between items-center">
                                <span className="text-slate-600">{loc}</span>
                                <div className="flex items-center gap-2 w-1/2 justify-end">
                                    <div className="h-2 rounded-full bg-slate-100 w-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(count/total)*100}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 w-8 text-left">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
  };

  const TicketsReport = ({ data, users }: { data: Ticket[], users: AppUser[] }) => {
    const total = data.length;
    const resolved = data.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
    
    // Avg Resolution Time
    let totalHours = 0;
    let countedTickets = 0;
    data.forEach(t => {
        if(t.receivedAt && t.resolvedAt) {
            totalHours += parseFloat(calculateDurationHours(t.receivedAt, t.resolvedAt));
            countedTickets++;
        }
    });
    const avgTime = countedTickets > 0 ? (totalHours / countedTickets).toFixed(1) : 0;

    // By Category
    const byCategory = data.reduce((acc, curr) => { acc[curr.category] = (acc[curr.category] || 0) + 1; return acc; }, {} as Record<string, number>);

    // By Channel
    const byChannel = data.reduce((acc, curr) => {
        const ch = curr.channel || 'غير محدد';
        acc[ch] = (acc[ch] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // By Assigned User (Resolved Tickets Only)
    // Fix: Map ID/String to Full Name if possible
    const resolvedTickets = data.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED);
    const byUserResolved = resolvedTickets.reduce((acc, curr) => {
        let userLabel = curr.assignedTo || 'غير معين';
        
        // Try to find the full name in the users list
        const matchedUser = users.find(u => u.id === userLabel || u.name === userLabel || u.email === userLabel);
        if (matchedUser) {
            userLabel = matchedUser.name;
        }

        acc[userLabel] = (acc[userLabel] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-2 items-center text-sm text-blue-800">
                <Filter size={16} />
                <span>يتم عرض التذاكر التي تم <b>استلامها</b> (تاريخ الفتح) ضمن النطاق المحدد.</span>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">إجمالي التذاكر (للفترة)</p>
                    <h3 className="text-2xl font-bold text-slate-800">{total}</h3>
                    <p className="text-xs text-emerald-600 mt-1">{resolved} تم حلها</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">متوسط زمن الحل</p>
                    <h3 className="text-2xl font-bold text-indigo-600">{avgTime} <span className="text-sm text-slate-400">ساعة</span></h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">نسبة الإنجاز</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{total > 0 ? Math.round((resolved/total)*100) : 0}%</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resolved By User Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserCheck size={18} className="text-emerald-600"/>
                        التذاكر التي تم حلها حسب الفني/المستخدم
                    </h4>
                    <div className="space-y-4">
                        {Object.entries(byUserResolved).sort((a,b) => b[1] - a[1]).map(([user, count]) => (
                            <div key={user}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-slate-700">{user}</span>
                                    <span className="text-xs font-bold text-emerald-700">{count} تذكرة</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 w-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / resolved) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(byUserResolved).length === 0 && <p className="text-center text-slate-400 text-sm py-4">لا توجد تذاكر محلولة بعد</p>}
                    </div>
                </div>

                {/* Tickets By Channel Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Share2 size={18} className="text-blue-600"/>
                        عدد التذاكر حسب القناة/المصدر
                    </h4>
                    <div className="space-y-3">
                        {Object.entries(byChannel).sort((a,b) => b[1] - a[1]).map(([channel, count]) => (
                            <div key={channel} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="font-medium text-slate-700">{channel}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(count/total)*100}%` }}></div>
                                    </div>
                                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-bold min-w-[3rem] text-center text-slate-700">{count}</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(byChannel).length === 0 && <p className="text-center text-slate-400 text-sm py-4">لا توجد بيانات</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4">الأكثر تكراراً (حسب الفئة)</h4>
                    <div className="space-y-4">
                        {Object.entries(byCategory).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">{cat}</span>
                                <span className="bg-white px-3 py-1 rounded border border-slate-200 text-sm font-bold text-slate-700">{count} تذكرة</span>
                            </div>
                        ))}
                        {Object.keys(byCategory).length === 0 && <p className="text-center text-slate-400 text-sm py-4">لا توجد بيانات</p>}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h4 className="font-bold text-slate-800 mb-4">تفاصيل التذاكر المغلقة (للفترة)</h4>
                    <div className="space-y-3">
                        {data.filter(t => t.resolvedAt).slice(0, 5).map(t => (
                            <div key={t.id} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t.id}</span>
                                        <p className="text-sm font-bold text-slate-800">{t.requesterName}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{t.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-emerald-600">{calculateDurationHours(t.receivedAt, t.resolvedAt)} ساعة</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{new Date(t.resolvedAt!).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>
                        ))}
                        {data.filter(t => t.resolvedAt).length === 0 && <p className="text-center text-slate-400 text-sm py-4">لا توجد تذاكر مغلقة في هذه الفترة</p>}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const SubscriptionsReport = ({ data }: { data: Subscription[] }) => {
    let totalAnnualCost = 0;
    
    // Calculate cost based on renewals linked to filtered subscriptions
    data.forEach(sub => {
        const renewal = renewals.find(r => r.id === sub.currentRenewalId);
        if (renewal) {
            totalAnnualCost += getAnnualCost(renewal.cost, sub.billingCycle);
        }
    });

    // Sort by renewal date
    const sortedSubs = [...data].sort((a,b) => {
        const dateA = a.nextRenewalDate ? new Date(a.nextRenewalDate).getTime() : 0;
        const dateB = b.nextRenewalDate ? new Date(b.nextRenewalDate).getTime() : 0;
        return dateA - dateB;
    });

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-2 items-center text-sm text-blue-800">
                <Filter size={16} />
                <span>يتم عرض الاشتراكات التي يحين <b>موعد تجديدها</b> (استحقاق الدفع) ضمن النطاق المحدد.</span>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">الاشتراكات المستحقة</p>
                    <h3 className="text-2xl font-bold text-slate-800">{data.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">إجمالي تكلفة التجديد (للفترة)</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{totalAnnualCost.toLocaleString()} <span className="text-sm text-slate-400">ريال</span></h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold mb-1">أنواع الاشتراكات</p>
                    <h3 className="text-2xl font-bold text-blue-600">
                         {new Set(data.map(s => s.type)).size}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
                    جدول التجديدات المستحقة خلال الفترة
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-white text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="p-3">الاسم / المزود</th>
                                <th className="p-3">دورة الدفع</th>
                                <th className="p-3">التكلفة الفعلية</th>
                                <th className="p-3 bg-slate-50">التكلفة السنوية (Est)</th>
                                <th className="p-3">تاريخ التجديد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedSubs.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-400">لا توجد تجديدات مستحقة في الفترة المحددة</td></tr>
                            ) : (
                                sortedSubs.map(sub => {
                                    const renewal = renewals.find(r => r.id === sub.currentRenewalId);
                                    const cost = renewal?.cost || 0;
                                    const annual = getAnnualCost(cost, sub.billingCycle);
                                    return (
                                        <tr key={sub.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{sub.name}</div>
                                                <div className="text-xs text-slate-500">{sub.vendor}</div>
                                            </td>
                                            <td className="p-3 text-slate-600">{sub.billingCycle}</td>
                                            <td className="p-3 font-medium">{cost.toLocaleString()} {renewal?.currency}</td>
                                            <td className="p-3 bg-slate-50 font-bold text-emerald-700">{annual.toLocaleString()}</td>
                                            <td className="p-3 text-blue-600 font-mono text-xs font-bold">{sub.nextRenewalDate}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">مركز التقارير المتقدمة</h2>
            <p className="text-slate-500 mt-1">تحليلات دقيقة للأصول، الصيانة، والتكاليف</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end md:items-center">
             {/* Date Filter Inputs */}
             <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <div className="relative group">
                    <label className="absolute -top-2 right-2 bg-white px-1 text-[10px] text-slate-400 font-bold group-focus-within:text-blue-600">من تاريخ</label>
                    <input 
                        type="date" 
                        className="px-3 py-1.5 text-sm bg-transparent outline-none text-slate-700 w-32 pt-2"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                    />
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="relative group">
                    <label className="absolute -top-2 right-2 bg-white px-1 text-[10px] text-slate-400 font-bold group-focus-within:text-blue-600">إلى تاريخ</label>
                    <input 
                        type="date" 
                        className="px-3 py-1.5 text-sm bg-transparent outline-none text-slate-700 w-32 pt-2"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                    />
                </div>
                {(dateFilter.start || dateFilter.end) && (
                    <button 
                        onClick={() => setDateFilter({ start: '', end: '' })}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="مسح الفلتر"
                    >
                        <X size={16} />
                    </button>
                )}
             </div>

             <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                    <Printer size={18} /> <span className="hidden lg:inline">طباعة</span>
                </button>
                <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 transition-colors">
                    <FileSpreadsheet size={18} /> تصدير
                </button>
             </div>
          </div>
       </div>

       {/* Tabs Navigation */}
       <div className="bg-white rounded-xl p-1.5 border border-slate-200 flex gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('ASSETS')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'ASSETS' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Server size={16} />
            تقرير الأصول
          </button>
          <button 
            onClick={() => setActiveTab('TICKETS')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'TICKETS' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CheckCircle2 size={16} />
            الدعم والصيانة
          </button>
          <button 
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SUBSCRIPTIONS' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <DollarSign size={16} />
            الاشتراكات والتكاليف
          </button>
       </div>

       {/* Report Content */}
       <div className="min-h-[400px]">
          {activeTab === 'ASSETS' && <AssetsReport data={filteredAssets} />}
          {activeTab === 'TICKETS' && <TicketsReport data={filteredTickets} users={allUsers} />}
          {activeTab === 'SUBSCRIPTIONS' && <SubscriptionsReport data={filteredSubscriptions} />}
       </div>
    </div>
  );
};
