export type BackupGroupKey = 'ADMIN' | 'PRODUCTION_MANAGER' | 'CASHIER';

export const BACKUP_GROUPS: Record<BackupGroupKey, { label: string; description: string; tables: string[] }> = {
  ADMIN: {
    label: 'Admin Account Data',
    description: 'Users, Settings, Audit Logs, Chart of Accounts, Journal Entries',
    tables: ['User', 'ShopSettings', 'AuditLog', 'ChartOfAccounts', 'JournalEntry', 'JournalLine']
  },
  PRODUCTION_MANAGER: {
    label: 'Production Manager Data',
    description: 'Products, Raw Materials, Recipes, Production Orders, Stock Movements, Suppliers, Purchases',
    tables: [
      'Product',
      'Category',
      'RawMaterial',
      'Recipe',
      'RecipeIngredient',
      'ProductionOrder',
      'ProductionConsumption',
      'StockMovement',
      'Supplier',
      'PurchaseOrder',
      'PurchaseItem'
    ]
  },
  CASHIER: {
    label: 'Cashier Data',
    description: 'Sales, Orders, Customers, Sales Returns, Daily Closings, Expenses, Employees, Payroll',
    tables: ['Sale', 'SaleItem', 'Order', 'OrderItem', 'Customer', 'Expense', 'Employee', 'Attendance', 'Salary', 'EmployeeAdvance', 'LeaveRequest']
  }
};

export const ALL_BACKUP_GROUPS = Object.keys(BACKUP_GROUPS) as BackupGroupKey[];
