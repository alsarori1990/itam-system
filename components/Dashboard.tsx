
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle2, Monitor, Server, Wrench, LifeBuoy, CreditCard, TrendingUp, Clock, AlertCircle, Calendar } from 'lucide-react';
import { TicketStatus, TicketPriority, BillingCycle, AssetStatus } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];
const TICKET_COLORS = {
  [TicketStatus.NEW]: '#3b82f6',
  [TicketStatus.IN_PROGRESS]: '#f59e0b',
  [TicketStatus.RESOLVED]: '#10b981',
  [TicketStatus.CLOSED]: '#64748b'
};

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

// Memoized Dashboard for better performance
const DashboardComponent: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { assets = [], tickets = [], subscriptions = [], renewals = [] } = useApp();

  // --- Calculations (Memoized for Performance) ---

  // 1. Asset Stats
  const totalAssets = useMemo(() => assets.length, [assets.length]);
  const maintenanceAssets = useMemo(() => 
    assets.filter(a => a.status === AssetStatus.MAINTENANCE).length, 
    [assets]
  );
  const warrantyExpired = useMemo(() => 
    assets.filter(a => new Date(a.warrantyExpiry) < new Date()).length, 
    [assets]
  );
  const assetTypeData = useMemo(() => 
    Object.entries(
      assets.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })),
    [assets]
  );

  // 2. Ticket Stats (Memoized)
  const openTickets = useMemo(() => 
    tickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length,
    [tickets]
  );
  const newTickets = useMemo(() => 
    tickets.filter(t => t.status === TicketStatus.NEW).length,
    [tickets]
  );
  const criticalTickets = useMemo(() => 
    tickets.filter(t => (t.priority === TicketPriority.CRITICAL || t.priority === TicketPriority.HIGH) && t.status !== TicketStatus.CLOSED).length,
    [tickets]
  );
  
  const ticketStatusData = useMemo(() => [
    { name: 'جديدة', count: tickets.filter(t => t.status === TicketStatus.NEW).length, fill: TICKET_COLORS[TicketStatus.NEW] },
    { name: 'جارية', count: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length, fill: TICKET_COLORS[TicketStatus.IN_PROGRESS] },
    { name: 'محلولة', count: tickets.filter(t => t.status === TicketStatus.RESOLVED).length, fill: TICKET_COLORS[TicketStatus.RESOLVED] },
    { name: 'مغلقة', count: tickets.filter(t => t.status === TicketStatus.CLOSED).length, fill: TICKET_COLORS[TicketStatus.CLOSED] },
  ], [tickets]);

  // 3. Subscription Stats (Memoized)
  const activeSubs = useMemo(() => 
    subscriptions.filter(s => s.status === 'ACTIVE'),
    [subscriptions]
  );
  const upcomingRenewals = useMemo(() => 
    activeSubs.filter(s => {
      if (!s.nextRenewalDate) return false;
      const diff = new Date(s.nextRenewalDate).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days >= 0 && days <= 30;
    }),
    [activeSubs]
  );

  // Calculate Monthly Burn Rate (Estimated & Memoized)
  const monthlyBurnRate = useMemo(() => 
    activeSubs.reduce((acc, sub) => {
      const renewal = renewals.find(r => r.id === sub.currentRenewalId);
      if (!renewal) return acc;
      let monthlyCost = 0;
      if (sub.billingCycle === BillingCycle.MONTHLY) monthlyCost = renewal.cost;
      else if (sub.billingCycle === BillingCycle.YEARLY) monthlyCost = renewal.cost / 12;
      else if (sub.billingCycle === BillingCycle.WEEKLY) monthlyCost = renewal.cost * 4;
      return acc + monthlyCost;
    }, 0),
    [activeSubs, renewals]
  );


  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-xl md:text-2xl font-bold text-slate-800">لوحة التحكم الشاملة</h2>
           <p className="text-sm md:text-base text-slate-500 mt-1">نظرة عامة على الأداء، الطلبات، والتكاليف</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-bold bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
           <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1 flex-1 justify-center sm:flex-none"><CheckCircle2 size={14}/> النظام يعمل</span>
           <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg flex-1 text-center sm:flex-none">{new Date().toLocaleDateString('ar-SA')}</span>
        </div>
      </div>

      {/* KPI Cards Row - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Assets KPI */}
        <div 
          onClick={() => onNavigate('assets')}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-98"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-500 text-xs font-bold mb-1">إجمالي الأصول</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{totalAssets}</h3>
             </div>
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Monitor size={24} />
             </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] md:text-xs">
             <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('assets', { status: AssetStatus.MAINTENANCE }); }}
                className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
             >
                <Wrench size={12} /> {maintenanceAssets} في الصيانة
             </button>
             <button
                onClick={(e) => { e.stopPropagation(); onNavigate('assets', { filterSpecial: 'WARRANTY_EXPIRED' }); }}
                className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors"
             >
                <AlertCircle size={12} /> {warrantyExpired} ضمان منتهي
             </button>
          </div>
        </div>

        {/* Tickets KPI */}
        <div 
          onClick={() => onNavigate('tickets', { status: 'OPEN_GROUP' })}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-98"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-500 text-xs font-bold mb-1">تذاكر مفتوحة</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{openTickets}</h3>
             </div>
             <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <LifeBuoy size={24} />
             </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] md:text-xs">
             <button
                onClick={(e) => { e.stopPropagation(); onNavigate('tickets', { status: TicketStatus.NEW }); }} 
                className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
             >
                <AlertCircle size={12} /> {newTickets} جديدة
             </button>
             {criticalTickets > 0 && (
                <span className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50 px-2 py-1 rounded">
                    <AlertTriangle size={12} /> {criticalTickets} حرجة
                </span>
             )}
          </div>
        </div>

        {/* Subscriptions KPI */}
        <div 
          onClick={() => onNavigate('subscriptions')}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-98"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-500 text-xs font-bold mb-1">الاشتراكات النشطة</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{activeSubs.length}</h3>
             </div>
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CreditCard size={24} />
             </div>
          </div>
          <div className="flex gap-3 text-[10px] md:text-xs">
             <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded w-full justify-center">
                <TrendingUp size={12} /> تكلفة شهرية: {Math.round(monthlyBurnRate).toLocaleString()}
             </span>
          </div>
        </div>

        {/* Action Required KPI */}
        <div 
          onClick={() => onNavigate('subscriptions', { filterSpecial: 'EXPIRING_SOON' })}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-98"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-500 text-xs font-bold mb-1">تجديدات قادمة</p>
                <h3 className={`text-2xl md:text-3xl font-bold ${upcomingRenewals.length > 0 ? 'text-indigo-600' : 'text-slate-800'}`}>
                    {upcomingRenewals.length}
                </h3>
             </div>
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calendar size={24} />
             </div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-400">اشتراكات تنتهي خلال 30 يوم</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Asset Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Monitor size={18} className="text-blue-500"/> توزيع الأصول
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => onNavigate('assets', { type: data.name })}
                  className="cursor-pointer"
                >
                  {assetTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Status Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <LifeBuoy size={18} className="text-orange-500"/> حالة تذاكر الدعم
          </h3>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}}
                    dy={10}
                />
                <YAxis hide />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                    dataKey="count" 
                    radius={[8, 8, 8, 8]} 
                    barSize={45}
                    label={{ position: 'top', fill: '#64748b', fontSize: 14, fontWeight: 'bold', dy: -5 }}
                >
                    {ticketStatusData.map((entry, index) => (
                        <Cell 
                           key={`cell-${index}`} 
                           fill={entry.fill} 
                           className="cursor-pointer hover:opacity-80 transition-opacity"
                           onClick={() => {
                               const statusMap = [TicketStatus.NEW, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
                               onNavigate('tickets', { status: statusMap[index] });
                           }}
                        />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists / Feed Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <LifeBuoy size={16} className="text-orange-500" /> آخر التذاكر
                </h3>
                <button 
                  onClick={() => onNavigate('tickets')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  عرض الكل
                </button>
            </div>
            <div className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-80">
                {tickets.slice(0, 5).map(ticket => (
                    <div 
                      key={ticket.id} 
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('tickets', { ticketId: ticket.id })}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-blue-600 font-mono">{ticket.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                ticket.priority === 'عالي' || ticket.priority === 'حرج' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                            }`}>{ticket.priority}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 truncate mb-1">{ticket.requesterName}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                    </div>
                ))}
                {tickets.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">لا توجد تذاكر</div>}
            </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" /> تجديدات قادمة
                </h3>
                <button 
                  onClick={() => onNavigate('subscriptions', { filterSpecial: 'EXPIRING_SOON' })}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  عرض الكل
                </button>
            </div>
            <div className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-80">
                {upcomingRenewals.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                        <CheckCircle2 size={32} className="text-emerald-200 mb-2"/>
                        لا توجد تجديدات خلال 30 يوم
                    </div>
                ) : (
                    upcomingRenewals.slice(0, 5).map(sub => {
                        const diff = new Date(sub.nextRenewalDate!).getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 3600 * 24));
                        return (
                            <div 
                              key={sub.id} 
                              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                              onClick={() => onNavigate('subscriptions', { filterSpecial: 'EXPIRING_SOON' })}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{sub.name}</span>
                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">{days} يوم</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>{sub.vendor}</span>
                                    <span className="font-mono">{sub.nextRenewalDate}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Critical Alerts / Assets */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-500" /> تنبيهات النظام
                </h3>
            </div>
            <div className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-80">
                {maintenanceAssets === 0 && warrantyExpired === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                        <CheckCircle2 size={32} className="text-emerald-200 mb-2"/>
                        لا توجد تنبيهات حرجة
                    </div>
                )}
                {assets.filter(a => a.status === AssetStatus.MAINTENANCE).map(a => (
                    <div 
                      key={a.id} 
                      className="p-4 bg-amber-50/30 hover:bg-amber-50 transition-colors border-l-4 border-amber-400 cursor-pointer"
                      onClick={() => onNavigate('assets', { status: AssetStatus.MAINTENANCE })}
                    >
                        <p className="text-sm font-bold text-slate-800 mb-1">{a.name}</p>
                        <div className="flex justify-between items-center">
                             <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                                <Wrench size={12}/> في الصيانة
                             </span>
                             <span className="text-[10px] text-slate-400 font-mono">{a.id}</span>
                        </div>
                    </div>
                ))}
                {assets.filter(a => new Date(a.warrantyExpiry) < new Date()).map(a => (
                    <div 
                      key={a.id} 
                      className="p-4 bg-rose-50/30 hover:bg-rose-50 transition-colors border-l-4 border-rose-400 cursor-pointer"
                      onClick={() => onNavigate('assets', { filterSpecial: 'WARRANTY_EXPIRED' })}
                    >
                        <p className="text-sm font-bold text-slate-800 mb-1">{a.name}</p>
                        <div className="flex justify-between items-center">
                             <span className="text-xs text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle size={12}/> ضمان منتهي
                             </span>
                             <span className="text-[10px] text-slate-400 font-mono">{a.warrantyExpiry}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const Dashboard = React.memo(DashboardComponent);
