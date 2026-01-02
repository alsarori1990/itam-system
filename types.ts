
export enum AssetType {
  LAPTOP = 'لابتوب',
  DESKTOP = 'حاسوب مكتبي',
  SERVER = 'خادم (Server)',
  PRINTER = 'طابعة',
  NETWORK = 'أجهزة شبكة',
  MOBILE = 'هاتف/جهاز لوحي',
  OTHER = 'أخرى'
}

export enum AssetStatus {
  NEW = 'جديد',
  IN_USE = 'مستخدم',
  MAINTENANCE = 'في الصيانة',
  DAMAGED = 'معطل / يحتاج صيانة',
  SOLD = 'مباع',
  SCRAPPED = 'تم الإتلاف',
  RETIRED = 'خارج الخدمة (مخزن)'
}

export interface Asset {
  id: string; // This will now be the Asset Tag (e.g., THK-LAP-RUH-24-0001)
  name: string;
  type: string;
  brand: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: string;
  assignedTo: string;
  location: string;
  image?: string;
  notes?: string;
  lastUpdated: string;
  disposalDate?: string;
  disposalNotes?: string;
}

// --- TICKET SYSTEM TYPES ---

export enum TicketStatus {
  NEW = 'جديد',
  ASSIGNED = 'تم التعيين',
  IN_PROGRESS = 'جاري العمل',
  WAITING = 'في الانتظار',
  RESOLVED = 'تم الحل',
  CLOSED = 'مغلقة',
  REOPENED = 'معاد فتحها'
}

export enum TicketPriority {
  LOW = 'منخفض',
  MEDIUM = 'متوسط',
  HIGH = 'عالي',
  CRITICAL = 'حرج'
}

export enum TicketChannel {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  PHONE = 'Phone',
  WALK_IN = 'Walk-in',
  PORTAL = 'Portal'
}

export interface Ticket {
  id: string; // TKT-24-0001
  requesterName: string;
  requesterEmail?: string; // Added field for email notifications
  branch: string;
  channel: TicketChannel;
  category: string;
  subcategory?: string;
  priority: TicketPriority;
  description: string;
  attachmentImage?: string; // New: Optional Image Attachment (Base64)
  linkedAssetId?: string; // Optional link to an asset
  status: TicketStatus;
  assignedTo?: string; // Technician
  
  // Resolution Details
  resolutionType?: 'ROUTINE' | 'SPECIALIZED';
  resolutionDetails?: string;

  // Timestamps
  receivedAt: string; // ISO Date - The critical one
  isReceivedAtAdjusted?: boolean; // Flag for UI
  startedAt?: string;
  resolvedAt?: string;
  closedAt?: string;

  // Calculated (can be computed on fly, but storing helps with reporting)
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

// --- SUBSCRIPTION & LICENSE TYPES ---

export enum SubscriptionType {
  SAAS = 'اشتراك خدمة (SaaS)',
  LICENSE = 'ترخيص برنامج (License)',
  MAINTENANCE = 'عقد صيانة',
  DOMAIN_HOSTING = 'نطاق / استضافة',
  OTHER = 'أخرى'
}

export enum BillingCycle {
  MONTHLY = 'شهري',
  YEARLY = 'سنوي',
  WEEKLY = 'أسبوعي',
  ONE_TIME = 'مرة واحدة'
}

export interface RenewalRecord {
  id: string;
  subscriptionId: string;
  startDate: string;
  endDate: string;
  cost: number;
  currency: string;
  quantity?: number; // Seats/Licenses count
  invoiceNo?: string;
  notes?: string;
  isBackdated?: boolean; // If entered after expiry
  createdAt: string;
  createdBy: string;
}

export interface SubscriptionAssignment {
  id: string;
  subscriptionId: string;
  assignedToId: string; // User Name or Asset ID
  assignedType: 'USER' | 'ASSET';
  assignedDate: string;
}

export interface Subscription {
  id: string;
  name: string;
  vendor: string;
  type: SubscriptionType;
  category: string; // E.g., Design, Security, Cloud
  
  billingCycle: BillingCycle;
  owner: string; // IT Manager, etc.
  costCenter?: string; // Branch or Department

  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  autoRenewal: boolean;
  
  // Computed fields based on latest renewal
  currentRenewalId?: string;
  nextRenewalDate?: string; // The specific date it expires
  totalSeats?: number;
  
  notes?: string;
  website?: string;
}

// --- SIM CARDS MANAGEMENT TYPES ---

export enum SimType {
  VOICE = 'مكالمات فقط (Voice)',
  DATA = 'بيانات فقط (Data)',
  VOICE_DATA = 'مكالمات وبيانات (Voice + Data)'
}

export enum SimStatus {
  ACTIVE = 'نشطة (Active)',
  AVAILABLE = 'متاحة (Available)',
  SUSPENDED = 'موقوفة مؤقتاً (Suspended)',
  LOST = 'مفقودة (Lost)',
  DAMAGED = 'تالفة (Damaged)',
  CANCELLED = 'ملغاة (Cancelled)'
}

export interface SimCard {
  id: string; // Internal System ID
  serialNumber: string; // ICCID (Unique Constraint)
  phoneNumber?: string; // MSISDN (Can be duplicated or reused)
  provider: string; // STC, Mobily, Zain, etc.
  type: SimType;
  planName: string; // e.g. Business 400
  assignedTo?: string; // Employee Name
  department?: string; // Department Name
  branch: string;
  status: SimStatus;
  notes?: string;
  cost?: number; // Monthly Cost
  contractEndDate?: string;
}

// --- GENERAL TYPES ---

export type AuditActionType = 
  | 'CREATE' | 'UPDATE' | 'DELETE' 
  | 'STATUS_CHANGE' | 'LOCATION_CHANGE' | 'ASSIGNMENT_CHANGE'
  | 'TICKET_CREATE' | 'TICKET_UPDATE' | 'TICKET_STATUS_CHANGE' | 'TICKET_TIME_ADJUST'
  | 'SUB_CREATE' | 'SUB_RENEW' | 'SUB_UPDATE'
  | 'SIM_CREATE' | 'SIM_UPDATE' | 'SIM_DELETE';

export interface FieldChange {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLogEntry {
  id: string;
  assetId?: string; 
  ticketId?: string; 
  subscriptionId?: string;
  simCardId?: string;
  actionType: AuditActionType;
  details: string; 
  changes?: FieldChange[];
  timestamp: string;
  user: string;
  reason?: string; 
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  linkTo?: string; // Optional link (e.g., to ticket detail)
}

export interface CodeMap {
  [key: string]: string; 
}

export interface SequenceMap {
  [key: string]: number; 
}

export interface ReminderRule {
  cycle: BillingCycle;
  days: number[]; // e.g. [30, 7, 1]
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: string;
  user: string;
  pass: string;
  fromEmail: string;
  adminEmails: string; // Comma separated
}

export interface AppConfig {
  types: string[];
  statuses: string[];
  locations: string[];
  ticketCategories: string[];
  subscriptionCategories: string[]; 
  simProviders: string[]; 
  hiddenOptions: Record<string, string[]>; // New: Track hidden options
  typeCodes: CodeMap;
  locationCodes: CodeMap;
  companyPrefix: string;
  reminderRules: ReminderRule[];
  smtpSettings?: SmtpSettings;
}

export interface DashboardStats {
  totalAssets: number;
  assetsInMaintenance: number;
  expiringWarranties: number;
  totalValueEstimate: number;
}

// --- AUTHORIZATION & USER TYPES ---

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  IT_MANAGER = 'IT Manager',
  TECHNICIAN = 'IT Technician',
  AUDITOR = 'Auditor / Finance',
  VIEWER = 'Viewer'
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string; // For creation only, not stored in frontend
  roles: UserRole[]; 
  branches?: string[];
  department?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  isMfaEnabled?: boolean;
}

// Actions for Permissions
export type PermissionAction = 
  | 'view' 
  | 'view_sensitive' // Prices, Contracts
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'approve' 
  | 'assign'
  | 'change_status_closed' // Specific for Tickets
  | 'export';

// Resources
export type Resource = 'assets' | 'tickets' | 'subscriptions' | 'reports' | 'settings' | 'audit_log';

export type PermissionScope = 'GLOBAL' | 'BRANCH' | 'OWN' | 'ASSIGNED' | 'NONE';

export interface PermissionRule {
  scope: PermissionScope;
  conditions?: Record<string, any>; // Future use for complex ABAC
}

export type RolePermissions = Record<Resource, Partial<Record<PermissionAction, PermissionRule>>>;
