
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, PropsWithChildren } from 'react';
import { Asset, AssetStatus, AssetType, AppConfig, AuditLogEntry, SequenceMap, AuditActionType, FieldChange, Ticket, TicketStatus, TicketChannel, TicketPriority, Subscription, SubscriptionType, BillingCycle, RenewalRecord, SubscriptionAssignment, ReminderRule, AppUser, UserRole, RolePermissions, Resource, PermissionAction, PermissionScope, SystemNotification, SmtpSettings, SimCard, SimStatus, SimType } from '../types';
import * as OTPAuth from 'otpauth';
import apiService from '../services/apiService';

// --- AUTHORIZATION MATRIX DEFINITION (INITIAL STATE) ---
const INITIAL_PERMISSIONS_MATRIX: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    assets: { view: { scope: 'GLOBAL' }, create: { scope: 'GLOBAL' }, update: { scope: 'GLOBAL' }, delete: { scope: 'GLOBAL' }, export: { scope: 'GLOBAL' } },
    tickets: { view: { scope: 'GLOBAL' }, create: { scope: 'GLOBAL' }, update: { scope: 'GLOBAL' }, assign: { scope: 'GLOBAL' }, change_status_closed: { scope: 'GLOBAL' }, delete: { scope: 'GLOBAL' }, export: { scope: 'GLOBAL' } },
    subscriptions: { view: { scope: 'GLOBAL' }, view_sensitive: { scope: 'GLOBAL' }, create: { scope: 'GLOBAL' }, update: { scope: 'GLOBAL' } },
    reports: { view: { scope: 'GLOBAL' }, view_sensitive: { scope: 'GLOBAL' } },
    settings: { update: { scope: 'GLOBAL' } },
    audit_log: { view: { scope: 'GLOBAL' } }
  },
  [UserRole.IT_MANAGER]: {
    assets: { view: { scope: 'BRANCH' }, create: { scope: 'BRANCH' }, update: { scope: 'BRANCH' }, delete: { scope: 'BRANCH' }, export: { scope: 'BRANCH' } },
    tickets: { view: { scope: 'BRANCH' }, create: { scope: 'BRANCH' }, update: { scope: 'BRANCH' }, assign: { scope: 'BRANCH' }, change_status_closed: { scope: 'BRANCH' }, export: { scope: 'BRANCH' } },
    subscriptions: { view: { scope: 'GLOBAL' }, view_sensitive: { scope: 'GLOBAL' }, create: { scope: 'GLOBAL' }, update: { scope: 'GLOBAL' } }, 
    reports: { view: { scope: 'BRANCH' }, view_sensitive: { scope: 'BRANCH' } },
    settings: { update: { scope: 'NONE' } }, 
    audit_log: { view: { scope: 'BRANCH' } }
  },
  [UserRole.TECHNICIAN]: {
    assets: { view: { scope: 'BRANCH' }, create: { scope: 'NONE' }, update: { scope: 'ASSIGNED' }, delete: { scope: 'NONE' } }, 
    tickets: { view: { scope: 'BRANCH' }, create: { scope: 'BRANCH' }, update: { scope: 'ASSIGNED' }, assign: { scope: 'NONE' }, change_status_closed: { scope: 'NONE' } }, 
    subscriptions: { view: { scope: 'NONE' } },
    reports: { view: { scope: 'NONE' } },
    settings: { update: { scope: 'NONE' } },
    audit_log: { view: { scope: 'NONE' } }
  },
  [UserRole.AUDITOR]: {
    assets: { view: { scope: 'GLOBAL' }, create: { scope: 'NONE' }, update: { scope: 'NONE' }, delete: { scope: 'NONE' }, export: { scope: 'GLOBAL' } },
    tickets: { view: { scope: 'GLOBAL' }, create: { scope: 'NONE' }, update: { scope: 'NONE' }, export: { scope: 'GLOBAL' } },
    subscriptions: { view: { scope: 'GLOBAL' }, view_sensitive: { scope: 'GLOBAL' }, export: { scope: 'GLOBAL' } },
    reports: { view: { scope: 'GLOBAL' }, view_sensitive: { scope: 'GLOBAL' } },
    settings: { update: { scope: 'NONE' } },
    audit_log: { view: { scope: 'GLOBAL' } }
  },
  [UserRole.VIEWER]: {
    assets: { view: { scope: 'GLOBAL' } },
    tickets: { view: { scope: 'NONE' } },
    subscriptions: { view: { scope: 'NONE' } },
    reports: { view: { scope: 'GLOBAL' } },
    settings: { update: { scope: 'NONE' } },
    audit_log: { view: { scope: 'NONE' } }
  }
};

// Initial Users Data - Will be loaded from API
const INITIAL_USERS: AppUser[] = [];

interface AppContextType {
  assets: Asset[];
  tickets: Ticket[];
  subscriptions: Subscription[];
  renewals: RenewalRecord[];
  subAssignments: SubscriptionAssignment[];
  simCards: SimCard[]; 
  config: AppConfig;
  auditLog: AuditLogEntry[];
  
  // User & Auth
  isAuthenticated: boolean;
  currentUser: AppUser | null;
  allUsers: AppUser[];
  rolePermissions: Record<UserRole, RolePermissions>;
  login: (email: string, password?: string) => Promise<boolean>; 
  logout: () => void; 
  switchUser: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  hasPermission: (resource: Resource, action: PermissionAction, dataContext?: any) => boolean;
  updatePermission: (role: UserRole, resource: Resource, action: PermissionAction, scope: PermissionScope) => void;
  
  // User Management Methods
  manageUser: (action: 'add' | 'update' | 'delete', userData: AppUser) => Promise<void>;

  // Asset Methods
  addAsset: (asset: Asset) => Promise<void>;
  addAssetsBulk: (assetsData: Partial<Asset>[]) => void;
  updateAsset: (id: string, updated: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  // Ticket Methods
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'receivedAt'> & { receivedAt?: string }) => Promise<string>;
  submitPublicTicket: (ticketData: Partial<Ticket>) => Promise<string>;
  addTicketsBulk: (ticketsData: Partial<Ticket>[]) => void;
  updateTicketStatus: (id: string, status: TicketStatus, resolutionData?: { type: 'ROUTINE' | 'SPECIALIZED', details?: string }) => Promise<void>;
  adjustTicketTime: (id: string, field: 'receivedAt' | 'startedAt' | 'resolvedAt', newTime: string, reason: string) => void;
  deleteTicket: (id: string) => Promise<void>;
  
  // Subscription Methods
  addSubscription: (sub: Omit<Subscription, 'id' | 'status'>, initialRenewal?: Omit<RenewalRecord, 'id' | 'subscriptionId' | 'createdAt' | 'createdBy'>) => Promise<void>;
  addRenewal: (subId: string, renewal: Omit<RenewalRecord, 'id' | 'subscriptionId' | 'createdAt' | 'createdBy'>) => void;
  updateSubscription: (id: string, updated: Partial<Subscription>) => void;

  // SIM Card Methods
  addSimCard: (sim: Omit<SimCard, 'id'>) => Promise<void>;
  updateSimCard: (id: string, updated: Partial<SimCard>) => void;
  deleteSimCard: (id: string) => void;
  
  // General Methods
  updateConfig: (category: keyof AppConfig, action: 'add' | 'remove', value: string, code?: string) => void;
  updateCode: (category: 'typeCodes' | 'locationCodes', key: string, newCode: string) => void;
  updateSmtpSettings: (settings: SmtpSettings) => void;
  checkInUse: (category: keyof AppConfig, value: string) => boolean; // New Check Logic
  toggleHidden: (category: keyof AppConfig, value: string) => void; // New Hide Logic
  logAction: (action: string, details: string) => void;
  getAssetHistory: (assetId: string) => AuditLogEntry[];
  getTicketHistory: (ticketId: string) => AuditLogEntry[];
  getSubscriptionHistory: (subId: string) => AuditLogEntry[];
  getSimHistory: (simId: string) => AuditLogEntry[]; 
  getStats: () => any;
  generateAssetIdPreview: (type: string, location: string) => string;
  loading: boolean;

  // MFA Methods
  isMfaEnabled: boolean;
  generateMfaSecret: () => { secret: string; uri: string };
  enableMfa: (secret: string, token: string) => boolean;
  disableMfa: () => void;
  verifyMfa: (token: string) => boolean;

  // Notifications
  notifications: SystemNotification[];
  addNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error', linkTo?: string) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Initial Maps & Configs
const INITIAL_TYPE_CODES = {
  [AssetType.LAPTOP]: 'LAP',
  [AssetType.DESKTOP]: 'DSK',
  [AssetType.SERVER]: 'SRV',
  [AssetType.PRINTER]: 'PRN',
  [AssetType.NETWORK]: 'NET',
  [AssetType.MOBILE]: 'TAB',
  [AssetType.OTHER]: 'OTH'
};

const INITIAL_LOCATION_CODES: Record<string, string> = {
  'الرياض - المكتب الرئيسي': 'RUH',
  'جدة - الفرع': 'JED',
  'الدمام - المستودع': 'DMM',
  'غرفة الخوادم A': 'SVR',
  'الدور الثاني': 'FL2'
};

const INITIAL_REMINDER_RULES: ReminderRule[] = [
  { cycle: BillingCycle.YEARLY, days: [90, 60, 30, 14, 7, 0] },
  { cycle: BillingCycle.MONTHLY, days: [7, 3, 0] },
  { cycle: BillingCycle.WEEKLY, days: [2, 0] },
];

const INITIAL_CONFIG: AppConfig = {
  types: Object.values(AssetType),
  statuses: Object.values(AssetStatus),
  locations: ['الرياض - المكتب الرئيسي', 'جدة - الفرع', 'الدمام - المستودع', 'غرفة الخوادم A', 'الدور الثاني'],
  ticketCategories: ['أجهزة', 'برمجيات', 'شبكات', 'طابعات', 'صلاحيات', 'أخرى'],
  subscriptionCategories: ['SaaS', 'Security', 'Cloud Infrastructure', 'Design Tools', 'Communication', 'Domain/Hosting'],
  simProviders: ['STC', 'Mobily', 'Zain', 'Virgin', 'Salam', 'RedBull'],
  hiddenOptions: { // Initialize hiddenOptions
      types: [],
      statuses: [],
      locations: [],
      ticketCategories: [],
      subscriptionCategories: [],
      simProviders: []
  },
  typeCodes: INITIAL_TYPE_CODES,
  locationCodes: INITIAL_LOCATION_CODES,
  companyPrefix: 'IT',
  reminderRules: INITIAL_REMINDER_RULES,
  smtpSettings: {
      enabled: false,
      host: '',
      port: '587',
      user: '',
      pass: '',
      fromEmail: 'support@company.com',
      adminEmails: 'admin@company.com'
  }
};

const INITIAL_ASSETS: Asset[] = []; // Will be loaded from API

const INITIAL_TICKETS: Ticket[] = []; // Will be loaded from API

const INITIAL_SUBSCRIPTIONS: Subscription[] = []; // Will be loaded from API

const INITIAL_RENEWALS: RenewalRecord[] = []; // Will be loaded from API

const INITIAL_SIMS: SimCard[] = []; // Will be loaded from API

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [subAssignments, setSubAssignments] = useState<SubscriptionAssignment[]>([]);
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  // ... rest of state
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [sequences, setSequences] = useState<SequenceMap>({
    'LAP-RUH-23': 15,
    'SRV-SVR-22': 8,
    'TKT-24': 2,
    'SUB': 2,
    'REN': 2
  });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Auth & Permissions State - Start empty, load from API
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null); 
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Default: Not Authenticated
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissions>>(INITIAL_PERMISSIONS_MATRIX);

  // MFA State
  const [mfaSecret, setMfaSecret] = useState<string | null>(() => localStorage.getItem('mfa_secret'));
  const isMfaEnabled = !!mfaSecret;

  // ... (Other functions: sendEmail, addNotification, removeNotification, login, logout, manageUser, hasPermission, updatePermission...)
  
  // Re-pasting required functions to maintain context
  const sendEmail = (to: string, subject: string, body: string) => {
      if (!config.smtpSettings?.enabled) return;
      // SMTP email sending logic here (for production, integrate with actual SMTP service)
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', linkTo?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date().toISOString(), linkTo }]);
    setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 6000);
  };

  // Play notification sound for new portal tickets
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Try to vibrate on mobile (works on Android Chrome, not iOS Safari)
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300, 100, 500]);
      }
      
      // Request notification permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('🔔 تذكرة جديدة من البوابة!', {
          body: 'تم استلام تذكرة جديدة من البوابة العامة',
          icon: '/icon-192.png',
          tag: 'new-ticket',
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      // Create 3 beeps pattern over 3 seconds
      const beepTimes = [0, 0.8, 1.6]; // Three beeps at different times
      
      beepTimes.forEach((startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Higher frequency for more attention-grabbing sound
        oscillator.frequency.value = 1200; // Hz (higher pitch)
        oscillator.type = 'square'; // Square wave for more harsh/alert sound
        
        // Maximum volume
        gainNode.gain.setValueAtTime(1.0, audioContext.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + 0.4);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + 0.4);
      });
      
      // Add a longer final beep
      const finalOscillator = audioContext.createOscillator();
      const finalGain = audioContext.createGain();
      
      finalOscillator.connect(finalGain);
      finalGain.connect(audioContext.destination);
      
      finalOscillator.frequency.value = 1000;
      finalOscillator.type = 'square';
      
      finalGain.gain.setValueAtTime(1.0, audioContext.currentTime + 2.4);
      finalGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3.0);
      
      finalOscillator.start(audioContext.currentTime + 2.4);
      finalOscillator.stop(audioContext.currentTime + 3.0);
      
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const login = async (email: string, password: string = 'admin') => {
      try {
          const response = await apiService.login(email, password);
          const user: AppUser = {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              roles: response.user.roles as UserRole[],
              branches: response.user.branches || [],
              isActive: true,
              lastLogin: new Date().toISOString(),
              isMfaEnabled: response.user.isMfaEnabled,
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
          
          // Load all data after successful login
          await loadAllData();
          return true;
      } catch (error) {
          console.error('Login failed:', error);
          return false;
      }
  };

  const logout = () => { 
      apiService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      // Clear all data on logout
      setAssets([]);
      setTickets([]);
      setSubscriptions([]);
      setSimCards([]);
      setAllUsers([]);
      setAuditLog([]);
  };

  const loadUsers = async () => {
      try {
          const users = await apiService.getUsers();
          setAllUsers(Array.isArray(users) ? users : []);
      } catch (error) {
          console.error('Failed to load users:', error);
          setAllUsers([]);
      }
  };

  const loadAssets = async () => {
      try {
          const assets = await apiService.getAssets();
          setAssets(Array.isArray(assets) ? assets : []);
      } catch (error) {
          console.error('Failed to load assets:', error);
          setAssets([]);
      }
  };

  const loadTickets = async () => {
      try {
          const newTickets = await apiService.getTickets();
          const ticketsArray = Array.isArray(newTickets) ? newTickets : [];
          
          // Merge with localStorage resolvedBy data
          const ticketResolutions = JSON.parse(localStorage.getItem('ticketResolutions') || '{}');
          const enhancedTickets = ticketsArray.map(ticket => ({
              ...ticket,
              resolvedBy: ticketResolutions[ticket.id] || ticket.resolvedBy
          }));
          
          setTickets(enhancedTickets);
      } catch (error) {
          console.error('Failed to load tickets:', error);
          setTickets([]);
      }
  };

  const loadSimCards = async () => {
      try {
          const simCards = await apiService.getSimCards();
          setSimCards(Array.isArray(simCards) ? simCards : []);
      } catch (error) {
          console.error('Failed to load sim cards:', error);
          setSimCards([]);
      }
  };

  const loadSubscriptions = async () => {
      try {
          const subscriptions = await apiService.getSubscriptions();
          setSubscriptions(Array.isArray(subscriptions) ? subscriptions : []);
      } catch (error) {
          console.error('Failed to load subscriptions:', error);
          setSubscriptions([]);
      }
  };

  const loadAuditLogs = async () => {
      try {
          const auditLogs = await apiService.getAuditLogs();
          setAuditLog(Array.isArray(auditLogs) ? auditLogs : []);
      } catch (error) {
          console.error('Failed to load audit logs:', error);
          setAuditLog([]);
      }
  };

  // Load all data function
  const loadAllData = async () => {
      await Promise.all([
          loadUsers(),
          loadAssets(),
          loadTickets(),
          loadSimCards(),
          loadSubscriptions(),
          loadAuditLogs()
      ]);
  };

  const manageUser = async (action: 'add' | 'update' | 'delete', userData: AppUser) => {
      try {
          if (action === 'add') {
              const newUser = await apiService.createUser({
                  name: userData.name,
                  email: userData.email,
                  password: userData.password || 'password123', // Default password
                  roles: userData.roles,
                  branches: userData.branches || [],
                  isActive: true
              });
              setAllUsers(prev => [...prev, newUser]);
              logSystemEvent('CREATE', `تم إضافة مستخدم جديد: ${userData.name}`);
              addNotification(`تم إضافة المستخدم ${userData.name} بنجاح`, 'success');
          } else if (action === 'update') {
              const updatedUser = await apiService.updateUser(userData.id!, userData);
              setAllUsers(prev => prev.map(u => u.id === userData.id ? updatedUser : u));
              logSystemEvent('UPDATE', `تم تحديث بيانات المستخدم: ${userData.name}`);
              if (currentUser.id === userData.id) setCurrentUser(updatedUser);
              addNotification(`تم تحديث بيانات ${userData.name} بنجاح`, 'success');
          } else if (action === 'delete') {
              await apiService.deleteUser(userData.id!);
              setAllUsers(prev => prev.filter(u => u.id !== userData.id));
              logSystemEvent('DELETE', `تم حذف المستخدم: ${userData.name}`);
              addNotification(`تم حذف المستخدم ${userData.name}`, 'success');
          }
      } catch (error) {
          console.error(`Failed to ${action} user:`, error);
          addNotification(`فشل في ${action === 'add' ? 'إضافة' : action === 'update' ? 'تحديث' : 'حذف'} المستخدم`, 'error');
      }
  };

  const switchUser = (role: UserRole) => {
      const targetUser = allUsers.find(u => u.roles.includes(role));
      if (targetUser) { setCurrentUser(targetUser); }
  };

  const loginAsUser = (userId: string) => {
      const user = allUsers.find(u => u.id === userId);
      if (user) { setCurrentUser(user); setIsAuthenticated(true); }
  };

  // Auto-login on page refresh if valid token exists
  useEffect(() => {
      const token = localStorage.getItem('authToken');
      if (token && !isAuthenticated && !currentUser) {
          console.log('Auto-login: Token found, verifying...');
          // Verify token and get user data
          apiService.getCurrentUser()
              .then(userData => {
                  console.log('Auto-login: User verified', userData.name);
                  const user: AppUser = {
                      id: userData.id,
                      name: userData.name,
                      email: userData.email,
                      roles: userData.roles as UserRole[],
                      branches: userData.branches || [],
                      isActive: true,
                      lastLogin: new Date().toISOString(),
                      isMfaEnabled: userData.isMfaEnabled,
                  };
                  setCurrentUser(user);
                  setIsAuthenticated(true);
              })
              .catch((error) => {
                  console.error('Auto-login failed:', error);
                  // Token invalid, clear it
                  apiService.logout();
                  setIsAuthenticated(false);
                  setCurrentUser(null);
              });
      }
  }, []);

  // Load data when authentication status changes
  useEffect(() => {
      if (isAuthenticated && currentUser) {
          loadAllData();
      }
  }, [isAuthenticated, currentUser]);

  // Poll for new portal tickets every 30 seconds
  useEffect(() => {
      if (!isAuthenticated || !currentUser) return;

      const checkForNewPortalTickets = async () => {
          try {
              const latestTickets = await apiService.getTickets();
              if (!Array.isArray(latestTickets)) return;

              const currentIds = new Set(tickets.map(t => t.id));
              const newPortalTickets = latestTickets.filter((t: Ticket) => 
                  !currentIds.has(t.id) && t.channel === TicketChannel.PORTAL
              );

              if (newPortalTickets.length > 0) {
                  playNotificationSound();
                  
                  // Merge with localStorage resolvedBy data
                  const ticketResolutions = JSON.parse(localStorage.getItem('ticketResolutions') || '{}');
                  const enhancedTickets = latestTickets.map((ticket: any) => ({
                      ...ticket,
                      resolvedBy: ticketResolutions[ticket.id] || ticket.resolvedBy
                  }));
                  
                  setTickets(enhancedTickets);
                  addNotification(`تذكرة جديدة من البوابة العامة! (${newPortalTickets.length})`, 'info');
              }
          } catch (error) {
              console.error('Failed to check for new tickets:', error);
          }
      };

      const interval = setInterval(checkForNewPortalTickets, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
  }, [isAuthenticated, currentUser, tickets]);

  const hasPermission = (resource: Resource, action: PermissionAction, dataContext?: any): boolean => {
      if (!currentUser || !currentUser.roles) return false; // Guard clause for null user
      
      for (const role of currentUser.roles) {
          const rolePerms = rolePermissions[role];
          if (!rolePerms) continue;
          const resourcePerms = rolePerms[resource];
          if (!resourcePerms) continue;
          const rule = resourcePerms[action];
          if (!rule) continue;
          if (rule.scope === 'GLOBAL') return true;
          if (rule.scope === 'NONE') continue; 
          if (rule.scope === 'BRANCH') {
              if (!dataContext) return true; 
              const userBranches = currentUser.branches || [];
              if (userBranches.length === 0) continue; 
              if (resource === 'assets') {
                  const asset = dataContext as Asset;
                  if (userBranches.includes(asset.location)) return true;
              }
              if (resource === 'tickets') {
                  const ticket = dataContext as Ticket;
                  if (userBranches.includes(ticket.branch)) return true;
              }
          }
          if (rule.scope === 'ASSIGNED') {
              if (!dataContext) continue;
              if (resource === 'assets') {
                  const asset = dataContext as Asset;
                  const userBranches = currentUser.branches || [];
                  if (userBranches.includes(asset.location)) return true; 
                  if (asset.assignedTo === currentUser.name) return true;
              }
              if (resource === 'tickets') {
                  const ticket = dataContext as Ticket;
                  if (ticket.assignedTo === currentUser.name) return true;
                  if (role === UserRole.TECHNICIAN && ticket.assignedTo === 'فني دعم') return true;
              }
          }
      }
      return false; 
  };

  const updatePermission = (role: UserRole, resource: Resource, action: PermissionAction, scope: PermissionScope) => {
      if (!hasPermission('settings', 'update')) return;
      setRolePermissions(prev => {
          const newMatrix = { ...prev };
          if (!newMatrix[role]) newMatrix[role] = {} as any;
          if (!newMatrix[role][resource]) newMatrix[role][resource] = {};
          // @ts-ignore
          newMatrix[role][resource][action] = { scope };
          return newMatrix;
      });
      logAction('UPDATE', `تحديث صلاحية ${role}: ${resource}.${action} -> ${scope}`);
  };

  // --- Check Usage Logic ---
  const checkInUse = (category: keyof AppConfig, value: string): boolean => {
    switch (category) {
      case 'types': return assets.some(a => a.type === value);
      case 'statuses': return assets.some(a => a.status === value);
      case 'locations': return assets.some(a => a.location === value) || tickets.some(t => t.branch === value) || simCards.some(s => s.branch === value);
      case 'ticketCategories': return tickets.some(t => t.category === value);
      case 'subscriptionCategories': return subscriptions.some(s => s.category === value);
      case 'simProviders': return simCards.some(s => s.provider === value);
      default: return false;
    }
  };

  // --- Toggle Hidden Logic ---
  const toggleHidden = (category: keyof AppConfig, value: string) => {
    if (!hasPermission('settings', 'update')) return;
    setConfig(prev => {
        const currentHidden = prev.hiddenOptions[category as string] || [];
        const isHidden = currentHidden.includes(value);
        let newHidden;
        if (isHidden) {
            newHidden = currentHidden.filter((i: string) => i !== value);
        } else {
            newHidden = [...currentHidden, value];
        }
        return {
            ...prev,
            hiddenOptions: {
                ...prev.hiddenOptions,
                [category]: newHidden
            }
        };
    });
    logAction('UPDATE', `تغيير حالة ظهور "${value}" في قائمة ${category}`);
  };

  // ... (Other standard functions: calculateDiff, getNextId, logSystemEvent, generateMfaSecret, verifyMfa, enableMfa, disableMfa...)
  // Re-implemented to be complete
  const calculateDiff = (oldObj: any, newObj: any, keysToCheck: string[]): FieldChange[] => {
    const changes: FieldChange[] = [];
    keysToCheck.forEach(key => {
      if (newObj[key] !== undefined && newObj[key] !== oldObj[key]) {
        changes.push({ fieldName: key, oldValue: oldObj[key] || '(فارغ)', newValue: newObj[key] || '(فارغ)' });
      }
    });
    return changes;
  };

  const getNextId = (prefix: string, sequenceKey: string): string => {
    const currentSeq = sequences[sequenceKey] || 0;
    const nextSeq = currentSeq + 1;
    setSequences(prev => ({ ...prev, [sequenceKey]: nextSeq }));
    const seqString = nextSeq.toString().padStart(3, '0');
    return prefix + '-' + seqString;
  };

  const logSystemEvent = (actionType: AuditActionType, details: string, assetId?: string, ticketId?: string, changes?: FieldChange[], reason?: string, subscriptionId?: string, simCardId?: string) => {
    const newLog: AuditLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      assetId, ticketId, subscriptionId, simCardId, actionType, details, changes, timestamp: new Date().toISOString(), user: isAuthenticated ? currentUser.name : 'زائر (بوابة عامة)', reason
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const generateMfaSecret = () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ issuer: 'ITAM System', label: currentUser.email, algorithm: 'SHA1', digits: 6, period: 30, secret: secret });
    return { secret: secret.base32, uri: totp.toString() };
  };

  const verifyMfa = (token: string): boolean => {
    if (!mfaSecret) return true;
    const totp = new OTPAuth.TOTP({ issuer: 'ITAM System', label: currentUser.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(mfaSecret) });
    return totp.validate({ token, window: 1 }) !== null;
  };

  const enableMfa = (secret: string, token: string): boolean => {
    const totp = new OTPAuth.TOTP({ issuer: 'ITAM System', label: currentUser.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
    if (totp.validate({ token, window: 1 }) !== null) {
      setMfaSecret(secret);
      localStorage.setItem('mfa_secret', secret);
      logAction('UPDATE', 'تم تفعيل المصادقة الثنائية (MFA)');
      return true;
    }
    return false;
  };

  const disableMfa = () => {
    setMfaSecret(null);
    localStorage.removeItem('mfa_secret');
    logAction('UPDATE', 'تم تعطيل المصادقة الثنائية (MFA)');
  };

  const generateAssetIdPreview = (type: string, location: string): string => {
    const typeCode = config.typeCodes[type] || 'UNK';
    const locCode = config.locationCodes[location] || 'UNK';
    const year = new Date().getFullYear().toString().substr(-2);
    return `${config.companyPrefix}-${typeCode}-${locCode}-${year}-XXXX`;
  };

  // ... CRUD Operations
  const addAsset = async (asset: Asset) => {
    if (!hasPermission('assets', 'create')) return;
    try {
        const typeCode = config.typeCodes[asset.type] || 'UNK';
        const locCode = config.locationCodes[asset.location] || 'UNK';
        const year = new Date().getFullYear().toString().substr(-2);
        const sequenceKey = `${typeCode}-${year}`;
        const currentSeq = sequences[sequenceKey] || 0;
        const nextSeq = currentSeq + 1;
        setSequences(prev => ({ ...prev, [sequenceKey]: nextSeq }));
        const realId = `${config.companyPrefix}-${typeCode}-${locCode}-${year}-${nextSeq.toString().padStart(4, '0')}`;
        const assetWithId = { ...asset, id: realId };
        
        const newAsset = await apiService.createAsset(assetWithId);
        setAssets(prev => [newAsset, ...prev]);
        logSystemEvent('CREATE', `تم إنشاء الأصل الجديد ${newAsset.name}`, realId);
        addNotification(`تم إضافة الأصل ${newAsset.name} بنجاح`, 'success');
    } catch (error) {
        console.error('Failed to add asset:', error);
        addNotification('فشل في إضافة الأصل', 'error');
    }
  };

  const addAssetsBulk = (assetsData: Partial<Asset>[]) => {
      if (!hasPermission('assets', 'create')) return;
      const year = new Date().getFullYear().toString().substr(-2);
      const timestamp = new Date().toISOString();
      const newAssets: Asset[] = [];
      const updatedSequences = { ...sequences };

      assetsData.forEach(data => {
          if (!data.type || !data.location || !data.name) return;
          const typeCode = config.typeCodes[data.type] || 'UNK';
          const locCode = config.locationCodes[data.location] || 'UNK';
          const sequenceKey = `${typeCode}-${year}`;
          const currentSeq = updatedSequences[sequenceKey] || 0;
          const nextSeq = currentSeq + 1;
          updatedSequences[sequenceKey] = nextSeq;
          const realId = `${config.companyPrefix}-${typeCode}-${locCode}-${year}-${nextSeq.toString().padStart(4, '0')}`;
          newAssets.push({
              ...data, id: realId, status: data.status || AssetStatus.NEW, purchaseDate: data.purchaseDate || timestamp.split('T')[0], warrantyExpiry: data.warrantyExpiry || '', serialNumber: data.serialNumber || 'N/A', brand: data.brand || '', assignedTo: data.assignedTo || '', lastUpdated: timestamp, notes: data.notes || ''
          } as Asset);
      });
      setSequences(updatedSequences);
      setAssets(prev => [...newAssets, ...prev]);
      logSystemEvent('CREATE', `تم استيراد ${newAssets.length} أصل من ملف خارجي.`);
  };

  const updateAsset = async (id: string, updated: Partial<Asset>) => {
    const oldAsset = assets.find(a => a.id === id);
    if (!oldAsset) return;
    if (!hasPermission('assets', 'update', oldAsset)) return;
    try {
        const updatedAsset = await apiService.updateAsset(id, updated);
        const changes = calculateDiff(oldAsset, updated, ['name', 'type', 'brand', 'serialNumber', 'status', 'assignedTo', 'location']);
        let actionType: AuditActionType = 'UPDATE';
        if (changes.some(c => c.fieldName === 'status')) actionType = 'STATUS_CHANGE';
        setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
        if (changes.length > 0) logSystemEvent(actionType, `تم تعديل ${changes.length} حقل/حقول`, id, undefined, changes);
        addNotification(`تم تحديث الأصل بنجاح`, 'success');
    } catch (error) {
        console.error('Failed to update asset:', error);
        addNotification('فشل في تحديث الأصل', 'error');
    }
  };

  const deleteAsset = async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    if (!hasPermission('assets', 'delete', asset)) return;
    try {
        await apiService.deleteAsset(id);
        setAssets(prev => prev.filter(a => a.id !== id));
        logSystemEvent('DELETE', `تم حذف الأصل ${asset.name} نهائياً`, id);
        addNotification(`تم حذف الأصل ${asset.name}`, 'success');
    } catch (error) {
        console.error('Failed to delete asset:', error);
        addNotification('فشل في حذف الأصل', 'error');
    }
  };

  const addTicket = async (ticketData: any): Promise<string> => {
    if (!hasPermission('tickets', 'create')) return '';
    try {
        const now = new Date().toISOString();
        const finalReceivedAt = ticketData.receivedAt || now;
        
        // Let backend generate unique ID - send without id field
        const newTicket: Partial<Ticket> = { 
            ...ticketData, 
            status: TicketStatus.NEW, 
            receivedAt: finalReceivedAt, 
            isReceivedAtAdjusted: ticketData.receivedAt ? true : false 
        };
        
        const createdTicket = await apiService.createTicket(newTicket);
        setTickets(prev => [createdTicket, ...prev]);
        logSystemEvent('TICKET_CREATE', `إنشاء تذكرة صيانة جديدة`, undefined, createdTicket.id);
        addNotification(`تم إنشاء تذكرة جديدة (${createdTicket.id}) بنجاح`, 'success', createdTicket.id);
        return createdTicket.id;
    } catch (error) {
        console.error('Failed to add ticket:', error);
        addNotification('فشل في إنشاء التذكرة', 'error');
        return '';
    }
  };

  const submitPublicTicket = async (ticketData: Partial<Ticket>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      
      // Let backend generate unique ID
      const ticketToCreate: Partial<Ticket> = {
        requesterName: ticketData.requesterName || 'زائر',
        requesterEmail: ticketData.requesterEmail,
        branch: ticketData.branch || config.locations[0],
        channel: TicketChannel.PORTAL,
        category: ticketData.category || 'أخرى',
        priority: ticketData.priority || TicketPriority.MEDIUM,
        description: ticketData.description || '',
        attachmentImage: ticketData.attachmentImage,
        status: TicketStatus.NEW,
        receivedAt: now,
        assignedTo: '',
        isReceivedAtAdjusted: false
      };

      // Save directly to API without permission check (public access)
      const createdTicket = await apiService.createPublicTicket(ticketToCreate);
      setTickets(prev => [createdTicket, ...prev]);
      
      logSystemEvent('TICKET_CREATE', `تذكرة جديدة من البوابة العامة: ${ticketData.requesterName}`, undefined, createdTicket.id);
      addNotification(`🔔 تذكرة جديدة من البوابة: ${ticketData.requesterName}`, 'info', createdTicket.id);
      
      return createdTicket.id;
    } catch (error) {
      console.error('Failed to submit public ticket:', error);
      addNotification('فشل في إرسال التذكرة', 'error');
      return 'ERROR';
    }
  };

  const addTicketsBulk = (ticketsData: Partial<Ticket>[]) => {
      if (!hasPermission('tickets', 'create')) return;
      const year = new Date().getFullYear().toString().substr(-2);
      const sequenceKey = `TKT-${year}`;
      const defaultTimestamp = new Date().toISOString();
      const newTickets: Ticket[] = [];
      const updatedSequences = { ...sequences };
      let currentSeq = updatedSequences[sequenceKey] || 0;
      ticketsData.forEach(t => {
          currentSeq++;
          const id = `TKT-${year}-${currentSeq.toString().padStart(3, '0')}`;
          let validReceivedAt = defaultTimestamp;
          if (t.receivedAt) { const parsed = new Date(t.receivedAt); if (!isNaN(parsed.getTime())) validReceivedAt = parsed.toISOString(); }
          newTickets.push({ ...t, id, status: t.status || TicketStatus.NEW, receivedAt: validReceivedAt, requesterName: t.requesterName || 'غير محدد', priority: t.priority || TicketPriority.MEDIUM, channel: t.channel || TicketChannel.PORTAL, category: t.category || 'أخرى', description: t.description || 'لا يوجد وصف', isReceivedAtAdjusted: false } as Ticket);
      });
      updatedSequences[sequenceKey] = currentSeq;
      setSequences(updatedSequences);
      setTickets(prev => [...newTickets, ...prev]);
      logSystemEvent('TICKET_CREATE', `تم استيراد ${newTickets.length} تذكرة جديدة من ملف.`);
      addNotification(`تم استيراد ${newTickets.length} تذكرة بنجاح`, 'success');
  };

  const updateTicketStatus = async (id: string, status: TicketStatus, resolutionData?: { type: 'ROUTINE' | 'SPECIALIZED', details?: string }) => {
    const oldTicket = tickets.find(t => t.id === id);
    if (!oldTicket) return;
    if (!hasPermission('tickets', 'update', oldTicket)) return;
    if (status === TicketStatus.CLOSED && !hasPermission('tickets', 'change_status_closed', oldTicket)) return;
    try {
        const updates: Partial<Ticket> = { status };
        if (resolutionData) { updates.resolutionType = resolutionData.type; updates.resolutionDetails = resolutionData.details; }
        const now = new Date().toISOString();
        if (status === TicketStatus.IN_PROGRESS && !oldTicket.startedAt) updates.startedAt = now;
        if (status === TicketStatus.RESOLVED && !oldTicket.resolvedAt) {
            updates.resolvedAt = now;
            updates.resolvedBy = currentUser?.name || 'غير محدد'; // Save who resolved the ticket
            
            // If ticket is not assigned to anyone, assign it to current user who is resolving it
            if (!oldTicket.assignedTo || oldTicket.assignedTo === 'غير معين') {
                updates.assignedTo = currentUser?.name || 'غير محدد';
            }
            
            // Save resolvedBy to localStorage for reports (since backend doesn't support it yet)
            const ticketResolutions = JSON.parse(localStorage.getItem('ticketResolutions') || '{}');
            ticketResolutions[id] = currentUser?.name || 'غير محدد';
            localStorage.setItem('ticketResolutions', JSON.stringify(ticketResolutions));
        }
        if (status === TicketStatus.CLOSED && !oldTicket.closedAt) updates.closedAt = now;
        if (status === TicketStatus.REOPENED) { 
            updates.resolvedAt = undefined; 
            updates.closedAt = undefined; 
            updates.resolvedBy = undefined; // Clear resolved by when reopening
            
            // Remove from localStorage when reopening
            const ticketResolutions = JSON.parse(localStorage.getItem('ticketResolutions') || '{}');
            delete ticketResolutions[id];
            localStorage.setItem('ticketResolutions', JSON.stringify(ticketResolutions));
        }
        
        // For now, don't send resolvedBy to backend (it doesn't support it)
        const backendUpdates = { ...updates };
        delete backendUpdates.resolvedBy;
        
        console.log('🔧 Updating ticket:', id, 'with updates:', backendUpdates);
        
        const updatedTicket = await apiService.updateTicket(id, backendUpdates);
        
        console.log('✅ Ticket updated successfully:', updatedTicket);
        
        // Manually add resolvedBy to the local state
        const finalTicket = { ...updatedTicket, resolvedBy: updates.resolvedBy };
        setTickets(prev => prev.map(t => t.id === id ? finalTicket : t));
        
        console.log('📊 Final ticket state:', finalTicket);
        
        logSystemEvent('TICKET_STATUS_CHANGE', `تغيير حالة التذكرة إلى ${status}`, undefined, id);
        if (status === TicketStatus.RESOLVED) addNotification(`تم حل التذكرة ${id}`, 'success');
    } catch (error) {
        console.error('Failed to update ticket status:', error);
        addNotification('فشل في تحديث حالة التذكرة', 'error');
    }
  };

  const adjustTicketTime = (id: string, field: string, newTime: string, reason: string) => {
    const oldTicket = tickets.find(t => t.id === id);
    if (!oldTicket || !hasPermission('tickets', 'update', oldTicket)) return;
    const updates: Partial<Ticket> = { [field]: newTime };
    if (field === 'receivedAt') updates.isReceivedAtAdjusted = true;
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    logSystemEvent('TICKET_TIME_ADJUST', `تعديل ${field} يدويًا`, undefined, id, undefined, reason);
  };

  const deleteTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket || !hasPermission('tickets', 'delete', ticket)) return;
    try {
        await apiService.deleteTicket(id);
        setTickets(prev => prev.filter(t => t.id !== id));
        logSystemEvent('TICKET_DELETE', `تم حذف التذكرة ${id}`);
        addNotification(`تم حذف التذكرة ${id} بنجاح`, 'success');
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        addNotification('فشل في حذف التذكرة', 'error');
    }
  };

  const addSubscription = async (subData: Omit<Subscription, 'id' | 'status'>, initialRenewal?: Omit<RenewalRecord, 'id' | 'subscriptionId' | 'createdAt' | 'createdBy'>) => {
    if (!hasPermission('subscriptions', 'create')) return;
    try {
        const subId = getNextId('SUB', 'SUB');
        let currentRenewalId = undefined; 
        let nextRenewalDate = undefined;
        
        if (initialRenewal) {
          const renId = getNextId('REN', 'REN');
          const newRenewal: RenewalRecord = { ...initialRenewal, id: renId, subscriptionId: subId, createdAt: new Date().toISOString(), createdBy: currentUser.name };
          setRenewals(prev => [newRenewal, ...prev]);
          currentRenewalId = renId;
          nextRenewalDate = initialRenewal.endDate;
        }
        
        const newSubData: Subscription = { ...subData, id: subId, status: 'ACTIVE', currentRenewalId, nextRenewalDate, totalSeats: initialRenewal?.quantity || 0 };
        const newSub = await apiService.createSubscription(newSubData);
        setSubscriptions(prev => [newSub, ...prev]);
        logSystemEvent('SUB_CREATE', `إضافة اشتراك جديد: ${newSub.name}`, undefined, undefined, undefined, undefined, subId);
        addNotification('تم إضافة الاشتراك بنجاح', 'success');
    } catch (error) {
        console.error('Failed to add subscription:', error);
        addNotification('فشل في إضافة الاشتراك', 'error');
    }
  };

  const addRenewal = (subId: string, renewalData: Omit<RenewalRecord, 'id' | 'subscriptionId' | 'createdAt' | 'createdBy'>) => {
    if (!hasPermission('subscriptions', 'update')) return;
    const renId = getNextId('REN', 'REN');
    const isBackdated = new Date(renewalData.endDate) < new Date();
    const newRenewal: RenewalRecord = { ...renewalData, id: renId, subscriptionId: subId, isBackdated, createdAt: new Date().toISOString(), createdBy: currentUser.name };
    setRenewals(prev => [newRenewal, ...prev]);
    setSubscriptions(prev => prev.map(sub => {
      if (sub.id === subId) {
        const currentEndDate = sub.nextRenewalDate ? new Date(sub.nextRenewalDate) : new Date(0);
        const newEndDate = new Date(renewalData.endDate);
        if (newEndDate > currentEndDate) { return { ...sub, status: 'ACTIVE', currentRenewalId: renId, nextRenewalDate: renewalData.endDate, totalSeats: renewalData.quantity || sub.totalSeats }; }
        return sub;
      }
      return sub;
    }));
    logSystemEvent('SUB_RENEW', isBackdated ? 'تسجيل تجديد بأثر رجعي' : 'تجديد الاشتراك', undefined, undefined, undefined, renewalData.notes, subId);
    addNotification('تم تجديد الاشتراك بنجاح', 'success');
  };

  const updateSubscription = (id: string, updated: Partial<Subscription>) => {
    if (!hasPermission('subscriptions', 'update')) return;
    const oldSub = subscriptions.find(s => s.id === id);
    if (!oldSub) return;
    const changes = calculateDiff(oldSub, updated, ['name', 'vendor', 'owner', 'status', 'notes', 'costCenter']);
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    if (changes.length > 0) logSystemEvent('SUB_UPDATE', 'تحديث بيانات الاشتراك', undefined, undefined, changes, undefined, id);
  };

  const addSimCard = async (simData: Omit<SimCard, 'id'>) => {
      if (!hasPermission('subscriptions', 'create')) return;
      try {
          const existingSim = simCards.find(s => s.serialNumber === simData.serialNumber);
          if (existingSim) { 
              addNotification('خطأ: الرقم التسلسلي للشريحة (Serial Number) مستخدم بالفعل', 'error'); 
              return;
          }
          const id = `SIM-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          const newSimData: SimCard = { ...simData, id };
          
          const newSim = await apiService.createSimCard(newSimData);
          setSimCards(prev => [newSim, ...prev]);
          logSystemEvent('SIM_CREATE', `إضافة شريحة جديدة: ${newSim.phoneNumber || newSim.serialNumber}`, undefined, undefined, undefined, undefined, undefined, newSim.id);
          addNotification('تم إضافة الشريحة بنجاح', 'success');
      } catch (error) {
          console.error('Failed to add SIM card:', error);
          addNotification('فشل في إضافة الشريحة', 'error');
      }
  };

  const updateSimCard = (id: string, updated: Partial<SimCard>) => {
      if (!hasPermission('subscriptions', 'update')) return;
      const oldSim = simCards.find(s => s.id === id);
      if (!oldSim) return;
      if (updated.serialNumber && updated.serialNumber !== oldSim.serialNumber) {
          const existingSim = simCards.find(s => s.serialNumber === updated.serialNumber);
          if (existingSim) { addNotification('خطأ: الرقم التسلسلي للشريحة مستخدم بالفعل', 'error'); throw new Error('Duplicate Serial Number'); }
      }
      const changes = calculateDiff(oldSim, updated, ['serialNumber', 'phoneNumber', 'status', 'assignedTo', 'department', 'planName']);
      setSimCards(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      if (changes.length > 0) { logSystemEvent('SIM_UPDATE', 'تحديث بيانات الشريحة', undefined, undefined, changes, undefined, undefined, id); addNotification('تم تحديث بيانات الشريحة', 'success'); }
  };

  const deleteSimCard = (id: string) => {
      if (!hasPermission('subscriptions', 'delete')) return; 
      const sim = simCards.find(s => s.id === id);
      if (!sim) return;
      setSimCards(prev => prev.filter(s => s.id !== id));
      logSystemEvent('SIM_DELETE', `حذف الشريحة: ${sim.serialNumber}`, undefined, undefined, undefined, undefined, undefined, id);
      addNotification('تم حذف الشريحة', 'warning');
  };

  const updateConfig = (category: keyof AppConfig, action: 'add' | 'remove', value: string, code?: string) => {
    if (!hasPermission('settings', 'update')) return;
    setConfig(prev => {
      // @ts-ignore
      const list = prev[category] as string[];
      if (action === 'add') {
        if (list.includes(value)) return prev;
        let newCodes = {};
        if (category === 'types' && code) newCodes = { typeCodes: { ...prev.typeCodes, [value]: code } };
        else if (category === 'locations' && code) newCodes = { locationCodes: { ...prev.locationCodes, [value]: code } };
        return { ...prev, [category]: [...list, value], ...newCodes };
      } else {
        let newCodes = {};
        if (category === 'types') { const { [value]: removed, ...rest } = prev.typeCodes; newCodes = { typeCodes: rest }; }
        else if (category === 'locations') { const { [value]: removed, ...rest } = prev.locationCodes; newCodes = { locationCodes: rest }; }
        return { ...prev, [category]: list.filter(item => item !== value), ...newCodes };
      }
    });
    logAction('UPDATE', `تحديث الإعدادات: ${action === 'add' ? 'إضافة' : 'حذف'} ${value}`);
  };

  const updateCode = (category: 'typeCodes' | 'locationCodes', key: string, newCode: string) => {
    if (!hasPermission('settings', 'update')) return;
    setConfig(prev => ({ ...prev, [category]: { ...prev[category], [key]: newCode.toUpperCase() } }));
  };

  const updateSmtpSettings = (settings: SmtpSettings) => {
      if (!hasPermission('settings', 'update')) return;
      setConfig(prev => ({ ...prev, smtpSettings: settings }));
      logAction('UPDATE', 'تم تحديث إعدادات البريد الإلكتروني SMTP');
  };

  const logAction = (action: string, details: string) => logSystemEvent('UPDATE', details);

  const getAssetHistory = (assetId: string) => auditLog.filter(log => log.assetId === assetId);
  const getTicketHistory = (ticketId: string) => auditLog.filter(log => log.ticketId === ticketId);
  const getSubscriptionHistory = (subId: string) => auditLog.filter(log => log.subscriptionId === subId);
  const getSimHistory = (simId: string) => auditLog.filter(log => log.simCardId === simId);

  const getStats = () => {
    const viewableAssets = assets.filter(a => hasPermission('assets', 'view', a));
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(new Date().getDate() + 30);
    const expiredOrExpiring = viewableAssets.filter(a => new Date(a.warrantyExpiry) <= thirtyDaysFromNow).length;
    const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
    return {
      totalAssets: viewableAssets.length,
      assetsInMaintenance: viewableAssets.filter(a => a.status === AssetStatus.MAINTENANCE).length,
      expiringWarranties: expiredOrExpiring,
      assetsByType: viewableAssets.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {} as Record<string, number>),
      ticketStats: { total: tickets.length, open: tickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length, avgResponseTimeMinutes: 0 },
      subscriptionStats: { total: subscriptions.length, active: activeSubs.length }
    };
  };

  return (
    <AppContext.Provider value={{ 
        assets, tickets, subscriptions, renewals, subAssignments, simCards, config, auditLog, 
        currentUser, allUsers, rolePermissions, isAuthenticated, switchUser, loginAsUser, login, logout, hasPermission, updatePermission, manageUser,
        addAsset, addAssetsBulk, updateAsset, deleteAsset, 
        addTicket, submitPublicTicket, addTicketsBulk, updateTicketStatus, adjustTicketTime, deleteTicket,
        addSubscription, addRenewal, updateSubscription,
        addSimCard, updateSimCard, deleteSimCard,
        updateConfig, updateCode, updateSmtpSettings, logAction, 
        checkInUse, toggleHidden, // New Exports
        getAssetHistory, getTicketHistory, getSubscriptionHistory, getSimHistory, getStats, generateAssetIdPreview, loading,
        isMfaEnabled, generateMfaSecret, enableMfa, disableMfa, verifyMfa,
        notifications, addNotification, removeNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};
