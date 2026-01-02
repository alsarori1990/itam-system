import React, { useState } from 'react';
import { LayoutDashboard, Box, PlusCircle, BarChart3, Settings, LifeBuoy, CreditCard, LogOut, UserCircle, Users, Power, Smartphone, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TicketStatus, UserRole } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, logout, hasPermission, tickets = [] } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculate new tickets count for badge
  const newTicketsCount = tickets.filter(t => t.status === TicketStatus.NEW).length;

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, visible: true },
    { 
        id: 'tickets', 
        label: 'الدعم والصيانة', 
        icon: LifeBuoy, 
        visible: hasPermission('tickets', 'view'),
        badge: newTicketsCount > 0 ? newTicketsCount : undefined
    },
    { id: 'assets', label: 'قائمة الأصول', icon: Box, visible: hasPermission('assets', 'view') },
    { id: 'subscriptions', label: 'الاشتراكات والتراخيص', icon: CreditCard, visible: hasPermission('subscriptions', 'view') },
    { id: 'sim-cards', label: 'شرائح الاتصال', icon: Smartphone, visible: hasPermission('subscriptions', 'view') },
    { id: 'add-asset', label: 'تسجيل أصل', icon: PlusCircle, visible: hasPermission('assets', 'create') },
    { id: 'reports', label: 'التقارير', icon: BarChart3, visible: hasPermission('reports', 'view') },
    { id: 'users', label: 'المستخدمين', icon: Users, visible: currentUser?.roles?.includes(UserRole.SUPER_ADMIN) ?? false },
    { id: 'settings', label: 'الإعدادات', icon: Settings, visible: hasPermission('settings', 'update') },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 bg-slate-900 text-white p-3 rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-slate-900 text-white flex flex-col h-screen fixed right-0 top-0 shadow-xl z-30 transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">ذ</div>
          <h1 className="text-sm font-bold leading-tight">نظام إدارة تقنية<br/>المعلومات الموحد</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                
                {/* Notification Badge */}
                {item.badge && (
                    <span className="absolute left-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                        {item.badge}
                    </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
               <UserCircle size={24} className="text-slate-300"/>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{currentUser?.name ?? 'مستخدم'}</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase truncate">{currentUser?.roles?.join(', ') ?? ''}</p>
            </div>
          </div>
          
          <button 
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-rose-600 hover:text-white transition-all text-sm font-bold group"
          >
              <Power size={16} className="group-hover:text-white" />
              تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
};
