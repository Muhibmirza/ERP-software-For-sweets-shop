import type { Role } from '../types';

export type TabKey =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'production'
  | 'orders'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'hr'
  | 'payroll'
  | 'accounting'
  | 'reports'
  | 'settings'
  | 'sales'
  | 'closing'
  | 'sales-returns';

export const PERMISSIONS: Record<Role, { tabs: TabKey[]; dashboardWidgets: string[] }> = {
  ADMIN: {
    tabs: ['dashboard', 'pos', 'sales', 'closing', 'inventory', 'production', 'orders', 'customers', 'suppliers', 'expenses', 'hr', 'payroll', 'accounting', 'reports', 'settings', 'sales-returns'],
    dashboardWidgets: ['all']
  },
  PRODUCTION_MANAGER: {
    tabs: ['dashboard', 'inventory', 'production', 'orders', 'suppliers'],
    dashboardWidgets: ['production', 'inventory', 'stock_alerts', 'raw_materials']
  },
  CASHIER: {
    tabs: ['pos', 'orders', 'customers', 'sales-returns'],
    dashboardWidgets: []
  },
  STAFF: {
    tabs: [],
    dashboardWidgets: []
  }
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  PRODUCTION_MANAGER: 'Production Manager',
  CASHIER: 'Cashier',
  STAFF: 'Staff'
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/dashboard',
  PRODUCTION_MANAGER: '/production',
  CASHIER: '/pos',
  STAFF: '/unauthorized'
};

export const canAccessTab = (role: Role | undefined, tab: TabKey) => Boolean(role && PERMISSIONS[role]?.tabs.includes(tab));
