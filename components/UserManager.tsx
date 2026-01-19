
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, AppUser, Resource, PermissionAction, PermissionScope } from '../types';
import { Users, Plus, Edit, Trash2, ShieldCheck, MapPin, Mail, User, X, CheckCircle2, Lock, Unlock, Eye, FilePlus, Save, LayoutGrid } from 'lucide-react';

export const UserManager: React.FC = () => {
  const { allUsers = [], currentUser, manageUser, config, loginAsUser, rolePermissions, updatePermission } = useApp();
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Permissions Tab State
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<UserRole>(UserRole.SUPPORT_STAFF);

  // Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({
      name: '',
      email: '',
      roles: [UserRole.SUPPORT_STAFF],
      branches: []
  });

  const handleOpenModal = (user?: AppUser) => {
      if (user) {
          setEditingUser(user);
          setFormData(user);
      } else {
          setEditingUser(null);
          setFormData({
              name: '',
              email: '',
              roles: [UserRole.SUPPORT_STAFF],
              branches: []
          });
      }
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingUser) {
          manageUser('update', { ...editingUser, ...formData } as AppUser);
      } else {
          manageUser('add', formData as AppUser);
      }
      setShowModal(false);
  };

  const handleDelete = (user: AppUser) => {
      showConfirm(
          `هل أنت متأكد من حذف المستخدم ${user.name}؟`,
          () => {
              manageUser('delete', user);
          },
          undefined,
          'حذف',
          'إلغاء'
      );
  };

  // Helper for multi-select (add/remove from array)
  const toggleArrayItem = <T extends string>(item: T, list: T[], setter: (val: T[]) => void) => {
      if (list.includes(item)) {
          setter(list.filter(i => i !== item));
      } else {
          setter([...list, item]);
      }
  };

  const getRoleBadgeColor = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPER_ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
          case UserRole.SUPPORT_STAFF: return 'bg-blue-100 text-blue-700 border-blue-200';
          case UserRole.IT_SPECIALIST: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case UserRole.IT_SUPERVISOR: return 'bg-amber-100 text-amber-700 border-amber-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  if (!currentUser?.roles?.includes(UserRole.SUPER_ADMIN)) {
      return (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
              <ShieldCheck size={64} className="mb-4 text-slate-300"/>
              <h2 className="text-xl font-bold">غير مصرح لك بالوصول</h2>
              <p>فقط مدير النظام يمكنه إدارة المستخدمين.</p>
          </div>
      );
  }

  // --- Sub-components for Roles Tab ---
  const PermissionToggle = ({ resource, action, label }: { resource: Resource, action: PermissionAction, label: string }) => {
      const currentScope = rolePermissions[selectedRoleForPerms]?.[resource]?.[action]?.scope || 'NONE';
      
      const getScopeColor = (scope: PermissionScope) => {
          if (scope === 'GLOBAL') return 'bg-emerald-100 text-emerald-700';
          if (scope === 'BRANCH') return 'bg-blue-100 text-blue-700';
          if (scope === 'ASSIGNED') return 'bg-amber-100 text-amber-700';
          if (scope === 'OWN') return 'bg-indigo-100 text-indigo-700';
          return 'bg-slate-100 text-slate-400';
      };

      // Define possible scopes based on resource/action logic
      const availableScopes: PermissionScope[] = ['NONE', 'GLOBAL', 'BRANCH', 'ASSIGNED'];

      return (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <select 
                  value={currentScope}
                  onChange={(e) => updatePermission(selectedRoleForPerms, resource, action, e.target.value as PermissionScope)}
                  className={`text-xs font-bold py-1 px-2 rounded cursor-pointer border-none outline-none focus:ring-2 focus:ring-purple-200 ${getScopeColor(currentScope)}`}
              >
                  <option value="NONE">ممنوع (None)</option>
                  <option value="GLOBAL">شامل (Global)</option>
                  <option value="BRANCH">حسب الفرع (Branch)</option>
                  <option value="ASSIGNED">المسند فقط (Assigned)</option>
              </select>
          </div>
      );
  };

  const ResourceCard = ({ title, resource, actions }: { title: string, resource: Resource, actions: {action: PermissionAction, label: string}[] }) => (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">{title}</h4>
          <div className="space-y-2">
              {actions.map(a => (
                  <PermissionToggle key={a.action} resource={resource} action={a.action} label={a.label} />
              ))}
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-0 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-purple-600" /> إدارة المستخدمين والصلاحيات
                </h2>
                <div className="flex gap-6 mt-4">
                    <button 
                        onClick={() => setActiveTab('USERS')}
                        className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'USERS' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        المستخدمين
                        {activeTab === 'USERS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('ROLES')}
                        className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'ROLES' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        الأدوار والمصفوفة
                        {activeTab === 'ROLES' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full"></div>}
                    </button>
                </div>
            </div>
            
            {activeTab === 'USERS' && (
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm shadow-purple-200 transition-colors mb-4 md:mb-0"
                >
                    <Plus size={20} /> إضافة مستخدم
                </button>
            )}
        </div>

        {/* Content Area */}
        {activeTab === 'USERS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allUsers.map(user => (
                    <div key={user.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{user.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Edit size={16} />
                                </button>
                                {user.id !== currentUser.id && (
                                    <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><ShieldCheck size={14}/> الأدوار (Roles)</span>
                                <div className="flex flex-wrap gap-1">
                                    {user.roles.map(r => (
                                        <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeColor(r)}`}>
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin size={14}/> الفروع (Scopes)</span>
                                <div className="flex flex-wrap gap-1">
                                    {user.branches && user.branches.length > 0 ? (
                                        user.branches.map(b => (
                                            <span key={b} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200">
                                                {b}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">Global (No specific branch)</span>
                                    )}
                                </div>
                            </div>
                            {user.supportLevel && (
                                <div>
                                    <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><User size={14}/> مستوى الدعم</span>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        user.supportLevel === 'موظف دعم فني' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        user.supportLevel === 'أخصائي تقنية المعلومات' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        user.supportLevel === 'مشرف وحدة تقنية المعلومات' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                        {user.supportLevel}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-slate-400">{user.id}</span>
                            {user.id !== currentUser.id && (
                                <button 
                                    onClick={() => loginAsUser(user.id)}
                                    className="text-xs text-purple-600 font-bold hover:underline"
                                >
                                    تجربة الدخول
                                </button>
                            )}
                            {user.id === currentUser.id && (
                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> أنت
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            /* Roles & Permissions Tab */
            <div className="space-y-6">
                {/* Role Selector */}
                <div className="flex overflow-x-auto gap-3 pb-2">
                    {Object.values(UserRole).map(role => (
                        <button
                            key={role}
                            onClick={() => setSelectedRoleForPerms(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${
                                selectedRoleForPerms === role 
                                ? 'bg-purple-600 text-white border-purple-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800">تكوين صلاحيات: {selectedRoleForPerms}</h3>
                        <p className="text-sm text-slate-500">حدد نطاق الصلاحية لكل مورد. التغييرات تحفظ تلقائياً.</p>
                        {selectedRoleForPerms === UserRole.SUPER_ADMIN && (
                            <p className="mt-2 text-xs bg-amber-50 text-amber-700 p-2 rounded border border-amber-100">
                                تنبيه: يفضل إبقاء صلاحيات المدير العام "شاملة" لتجنب فقدان الوصول للنظام.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ResourceCard 
                            title="الأصول (Assets)" 
                            resource="assets"
                            actions={[
                                { action: 'view', label: 'عرض الأصول' },
                                { action: 'create', label: 'إنشاء أصول' },
                                { action: 'update', label: 'تعديل البيانات' },
                                { action: 'delete', label: 'حذف الأصول' },
                                { action: 'export', label: 'تصدير البيانات' }
                            ]}
                        />
                        <ResourceCard 
                            title="التذاكر (Tickets)" 
                            resource="tickets"
                            actions={[
                                { action: 'view', label: 'عرض التذاكر' },
                                { action: 'create', label: 'إنشاء تذكرة' },
                                { action: 'update', label: 'تحديث الحالة' },
                                { action: 'assign', label: 'تعيين فني' },
                                { action: 'change_status_closed', label: 'إغلاق نهائي' },
                                { action: 'export', label: 'تصدير' }
                            ]}
                        />
                        <ResourceCard 
                            title="الاشتراكات (Subscriptions)" 
                            resource="subscriptions"
                            actions={[
                                { action: 'view', label: 'عرض القائمة' },
                                { action: 'view_sensitive', label: 'عرض الأسعار' },
                                { action: 'create', label: 'إضافة اشتراك' },
                                { action: 'update', label: 'تجديد/تعديل' },
                                { action: 'delete', label: 'حذف' }
                            ]}
                        />
                        <ResourceCard 
                            title="التقارير والإعدادات" 
                            resource="reports"
                            actions={[
                                { action: 'view', label: 'عرض التقارير' },
                                { action: 'view_sensitive', label: 'تقارير مالية' },
                            ]}
                        />
                         <ResourceCard 
                            title="الإعدادات والنظام" 
                            resource="settings"
                            actions={[
                                { action: 'update', label: 'تعديل الإعدادات' },
                            ]}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                        <h3 className="text-xl font-bold text-slate-800">
                            {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                        </h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                            <div className="relative">
                                <User className="absolute right-3 top-3 text-slate-400" size={18} />
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 transition-colors"
                                    placeholder="مثال: محمد أحمد"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                            <div className="relative">
                                <Mail className="absolute right-3 top-3 text-slate-400" size={18} />
                                <input 
                                    required 
                                    type="email" 
                                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 transition-colors"
                                    placeholder="email@company.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        {!editingUser && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                                    <input 
                                        required 
                                        type="password" 
                                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 transition-colors"
                                        placeholder="••••••••"
                                        value={formData.password || ''}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Multi-Select for Roles */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">الأدوار (Roles) - متعدد</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.roles?.map(role => (
                                    <span key={role} className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 cursor-pointer hover:opacity-80 ${getRoleBadgeColor(role)}`} onClick={() => toggleArrayItem(role, formData.roles || [], (r) => setFormData({...formData, roles: r}))}>
                                        {role} <X size={12}/>
                                    </span>
                                ))}
                            </div>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white"
                                onChange={(e) => {
                                    if(e.target.value) toggleArrayItem(e.target.value as UserRole, formData.roles || [], (r) => setFormData({...formData, roles: r}));
                                    e.target.value = "";
                                }}
                            >
                                <option value="">+ إضافة دور...</option>
                                {Object.values(UserRole).filter(r => !formData.roles?.includes(r)).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>

                        {/* Support Level for Ticket Escalation */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">مستوى الدعم (لنظام التذاكر)</label>
                            <div className="bg-purple-50 p-2 rounded-lg text-xs text-purple-800 mb-2 border border-purple-100">
                                يستخدم في آلية تصعيد التذاكر: موظف دعم فني → أخصائي تقنية المعلومات → مشرف وحدة تقنية المعلومات
                            </div>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white"
                                value={formData.supportLevel || ''}
                                onChange={(e) => setFormData({...formData, supportLevel: e.target.value || undefined})}
                            >
                                <option value="">بدون مستوى دعم</option>
                                <option value="موظف دعم فني">موظف دعم فني</option>
                                <option value="أخصائي تقنية المعلومات">أخصائي تقنية المعلومات</option>
                                <option value="مشرف وحدة تقنية المعلومات">مشرف وحدة تقنية المعلومات</option>
                            </select>
                        </div>

                        {/* Multi-Select for Branches */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">الفروع (Scope) - متعدد</label>
                            <div className="bg-blue-50 p-2 rounded-lg text-xs text-blue-800 mb-2 border border-blue-100">
                                اترك القائمة فارغة إذا كان الدور "Global" أو لا يتطلب تحديد فرع.
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.branches?.map(b => (
                                    <span key={b} className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300" onClick={() => toggleArrayItem(b, formData.branches || [], (val) => setFormData({...formData, branches: val}))}>
                                        {b} <X size={12}/>
                                    </span>
                                ))}
                            </div>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white"
                                onChange={(e) => {
                                    if(e.target.value) toggleArrayItem(e.target.value, formData.branches || [], (val) => setFormData({...formData, branches: val}));
                                    e.target.value = "";
                                }}
                            >
                                <option value="">+ إضافة فرع...</option>
                                {config.locations.filter(l => !formData.branches?.includes(l)).map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                إلغاء
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200">
                                حفظ البيانات
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
