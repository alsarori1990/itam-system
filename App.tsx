import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AssetList } from './components/AssetList';
import { AssetForm } from './components/AssetForm';
import { SmartReports } from './components/SmartReports';
import { Settings } from './components/Settings';
import { TicketManager } from './components/TicketManager';
import { SubscriptionManager } from './components/SubscriptionManager';
import { SimCardManager } from './components/SimCardManager';
import { UserManager } from './components/UserManager';
import { Login } from './components/Login';
import { PublicTicketPage } from './components/PublicTicketPage';
import { EmailAccountsManager } from './components/EmailAccountsManager';
import { EmailTemplatesManager } from './components/EmailTemplatesManager';
import { Menu, X, ArrowRight, Bell, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Asset } from './types';

// Toast Component for Notifications
const NotificationContainer = () => {
    const { notifications, removeNotification } = useApp();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2 w-full max-w-sm pointer-events-none">
            {notifications.map(n => (
                <div 
                    key={n.id} 
                    className={`pointer-events-auto bg-white rounded-xl shadow-2xl p-4 border-l-4 flex items-start gap-3 animate-slide-in-up transition-all ${
                        n.type === 'success' ? 'border-emerald-500' :
                        n.type === 'warning' ? 'border-amber-500' :
                        n.type === 'error' ? 'border-rose-500' : 'border-blue-500'
                    }`}
                >
                    <div className={`mt-0.5 ${
                        n.type === 'success' ? 'text-emerald-500' :
                        n.type === 'warning' ? 'text-amber-500' :
                        n.type === 'error' ? 'text-rose-500' : 'text-blue-500'
                    }`}>
                        {n.type === 'success' ? <CheckCircle2 size={20} /> :
                         n.type === 'warning' ? <AlertTriangle size={20} /> :
                         n.type === 'error' ? <XCircle size={20} /> : <Info size={20} />}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 whitespace-pre-line">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <button 
                        onClick={() => removeNotification(n.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

const AppContent = () => {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Check for Public Mode
  const [isPublicMode, setIsPublicMode] = useState(false);

  useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     if (params.get('mode') === 'public') {
         setIsPublicMode(true);
     }
  }, []);

  // Helper to toggle public mode and update URL cleanly
  const togglePublicMode = (enable: boolean) => {
      setIsPublicMode(enable);
      if (enable) {
          navigate('/?mode=public');
      } else {
          navigate('/');
      }
  };

  // Unified navigation handler with React Router
  const handleNavigate = (page: string, params: any = {}) => {
    navigate(`/${page}`);
    setIsMobileMenuOpen(false); // Close mobile menu on nav
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    navigate('/edit-asset');
  };

  const getPageTitle = () => {
      const path = location.pathname.slice(1) || 'dashboard';
      switch(path) {
          case '':
          case 'dashboard': return 'لوحة التحكم';
          case 'tickets': return 'الدعم والصيانة';
          case 'assetlist': return 'قائمة الأصول';
          case 'subscriptions': return 'الاشتراكات';
          case 'sim-cards': return 'إدارة الشرائح';
          case 'add-asset': return 'إضافة أصل جديد';
          case 'edit-asset': return 'تعديل أصل';
          case 'reports': return 'التقارير الذكية';
          case 'users': return 'إدارة المستخدمين';
          case 'settings': return 'الإعدادات';
          case 'email-accounts': return 'حسابات البريد الإلكتروني';
          case 'email-templates': return 'قوالب البريد الإلكتروني';
          default: return 'نظام إدارة تقنية المعلومات';
      }
  };

  // 1. Check for Public Mode
  if (isPublicMode) {
      return <PublicTicketPage onBack={() => togglePublicMode(false)} />;
  }

  // 2. Check Authentication
  if (!isAuthenticated) {
      return <Login onPublicAccess={() => togglePublicMode(true)} />;
  }

  const currentPage = location.pathname.slice(1) || 'dashboard';

  // 3. Render Main App
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <NotificationContainer />

      {/* Desktop Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={(page) => handleNavigate(page)} />
      
      {/* Main Content Wrapper */}
      <div className="flex-1 md:mr-64 min-w-0 transition-all duration-300 flex flex-col">
        
        {/* Global Header (Mobile & Desktop) */}
        <div className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"
              >
                <Menu size={24} />
              </button>

              {/* Back Button */}
              <button 
                onClick={handleBack}
                className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 active:scale-95 transition-all flex items-center gap-2"
                title="رجوع"
              >
                <ArrowRight size={20} />
                <span className="text-sm font-bold hidden sm:inline">رجوع</span>
              </button>

              {/* Page Title */}
              <h1 className="text-lg font-bold text-slate-800 mr-2 md:mr-0">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-2">
             <div className="md:hidden flex items-center gap-2 font-bold text-slate-800">
                 <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md">ذ</div>
             </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay (Drawer) */}
        {isMobileMenuOpen && (
           <div className="fixed inset-0 z-50 flex justify-end md:hidden">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              {/* Drawer Content */}
              <div className="relative w-3/4 max-w-xs bg-slate-900 h-full shadow-2xl overflow-y-auto animate-slide-in-right">
                  <div className="p-5 flex justify-between items-center border-b border-slate-700">
                     <h2 className="text-white font-bold text-lg">القائمة</h2>
                     <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                     </button>
                  </div>
                  <div className="p-4 space-y-2">
                     <button onClick={() => handleNavigate('dashboard')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>لوحة التحكم</button>
                     <button onClick={() => handleNavigate('tickets')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>الدعم والصيانة</button>
                     <button onClick={() => handleNavigate('assetlist')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'assetlist' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>الأصول</button>
                     <button onClick={() => handleNavigate('subscriptions')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'subscriptions' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>الاشتراكات</button>
                     <button onClick={() => handleNavigate('sim-cards')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'sim-cards' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>شرائح الاتصال</button>
                     <button onClick={() => handleNavigate('add-asset')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'add-asset' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>إضافة أصل</button>
                     <button onClick={() => handleNavigate('reports')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>تقارير ذكية</button>
                     <button onClick={() => handleNavigate('users')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'users' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>المستخدمين</button>
                     <button onClick={() => handleNavigate('settings')} className={`text-right w-full py-3 px-4 rounded-xl font-medium ${currentPage === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>الإعدادات</button>
                  </div>
              </div>
           </div>
        )}

        {/* Page Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto flex-1 w-full">
          <Routes>
            <Route path="/" element={<Dashboard onNavigate={handleNavigate} />} />
            <Route path="/dashboard" element={<Dashboard onNavigate={handleNavigate} />} />
            <Route path="/tickets" element={<TicketManager />} />
            <Route path="/subscriptions" element={<SubscriptionManager />} />
            <Route path="/sim-cards" element={<SimCardManager />} />
            <Route path="/assetlist" element={<AssetList onEdit={handleEdit} />} />
            <Route path="/add-asset" element={<AssetForm onCancel={() => handleBack()} onSuccess={() => handleNavigate('assetlist')} />} />
            <Route path="/edit-asset" element={<AssetForm initialAsset={editingAsset || undefined} onCancel={() => handleBack()} onSuccess={() => { setEditingAsset(null); handleNavigate('assetlist'); }} />} />
            <Route path="/reports" element={<SmartReports />} />
            <Route path="/users" element={<UserManager />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/email-accounts" element={<EmailAccountsManager />} />
            <Route path="/email-templates" element={<EmailTemplatesManager />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
