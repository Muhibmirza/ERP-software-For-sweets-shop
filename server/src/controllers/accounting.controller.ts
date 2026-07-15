import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createManualEntry } from '../services/journalService';

const dateFilter = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return undefined;
  return {
    gte: startDate ? new Date(startDate) : undefined,
    lte: endDate ? new Date(`${endDate}T23:59:59`) : undefined
  };
};

export const getChartOfAccounts = async (_req: AuthRequest, res: Response) => {
  const accounts = await prisma.chartOfAccounts.findMany({
    include: { children: true },
    orderBy: { code: 'asc' }
  });
  res.json({ success: true, data: accounts });
};

export const createAccount = async (req: AuthRequest, res: Response) => {
  const account = await prisma.chartOfAccounts.create({ data: req.body });
  res.status(201).json({ success: true, data: account });
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  const account = await prisma.chartOfAccounts.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: account });
};

export const getJournalEntries = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, type } = req.query;
  const entries = await prisma.journalEntry.findMany({
    where: {
      referenceType: type ? String(type) as any : undefined,
      date: dateFilter(startDate as string, endDate as string)
    },
    include: { creator: { select: { name: true } }, lines: { include: { account: true } } },
    orderBy: { date: 'desc' }
  });
  res.json({ success: true, data: entries });
};

export const getJournalEntry = async (req: AuthRequest, res: Response) => {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: req.params.id },
    include: { creator: { select: { name: true } }, lines: { include: { account: true } } }
  });
  if (!entry) return res.status(404).json({ success: false, message: 'Journal entry not found' });
  res.json({ success: true, data: entry });
};

export const createJournalEntry = async (req: AuthRequest, res: Response) => {
  const entry = await createManualEntry(req.body.lines || [], req.body.description || 'Manual journal entry', req.user!.id);
  res.status(201).json({ success: true, data: entry });
};

export const getTrialBalance = async (_req: AuthRequest, res: Response) => {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { isActive: true },
    include: { lines: true },
    orderBy: { code: 'asc' }
  });
  const rows = accounts.map((account) => {
    const debit = account.lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = account.lines.reduce((sum, line) => sum + line.credit, 0);
    return { id: account.id, code: account.code, name: account.name, type: account.type, debit, credit, balance: account.balance };
  });
  res.json({ success: true, data: { rows, debitTotal: rows.reduce((s, r) => s + r.debit, 0), creditTotal: rows.reduce((s, r) => s + r.credit, 0) } });
};

export const getProfitLoss = async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month || new Date().getMonth() + 1);
  const year = Number(req.query.year || new Date().getFullYear());
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const end = new Date(year, month, 0, 23, 59, 59);
  const [salesData, saleItemsData, deliveredOrdersData, returnsData, expenseData, salaryData] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { netAmount: true, discount: true },
      _count: true
    }),
    prisma.saleItem.aggregate({
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true, subtotal: true, profit: true }
    }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED', updatedAt: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: true
    }),
    prisma.saleReturn.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { totalAmount: true }
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true }
    }),
    prisma.salary.aggregate({
      where: { month, year },
      _sum: { netSalary: true }
    })
  ]);

  const grossRevenue = (salesData._sum.netAmount || 0) + (deliveredOrdersData._sum.totalAmount || 0);
  const salesReturns = returnsData._sum.totalAmount || 0;
  const revenue = grossRevenue - salesReturns;
  const grossProfitFromItems = saleItemsData._sum.profit || 0;
  const cogs = Math.max((saleItemsData._sum.subtotal || 0) - grossProfitFromItems, 0);
  const grossProfit = revenue - cogs;
  const operatingExpenses = (expenseData._sum.amount || 0) + (salaryData._sum.netSalary || 0);
  const netProfit = grossProfit - operatingExpenses;

  res.json({
    success: true,
    data: {
      month,
      year,
      income: revenue,
      revenue,
      grossRevenue,
      salesReturns,
      deliveredOrdersRevenue: deliveredOrdersData._sum.totalAmount || 0,
      cogs,
      grossProfit,
      operatingExpenses,
      expenses: operatingExpenses,
      netProfit,
      totalSales: salesData._count + deliveredOrdersData._count,
      totalDiscount: salesData._sum.discount || 0
    }
  });
};

export const getBalanceSheet = async (_req: AuthRequest, res: Response) => {
  const accounts = await prisma.chartOfAccounts.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  const grouped = accounts.reduce((acc: any, account) => {
    acc[account.type] = [...(acc[account.type] || []), account];
    return acc;
  }, {});
  res.json({ success: true, data: grouped });
};

export const getCashBook = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const cash = await prisma.chartOfAccounts.findUnique({ where: { code: '1001' } });
  if (!cash) return res.json({ success: true, data: [] });
  const lines = await prisma.journalLine.findMany({
    where: { accountId: cash.id, journalEntry: { date: dateFilter(startDate as string, endDate as string) } },
    include: { journalEntry: true },
    orderBy: { journalEntry: { date: 'desc' } }
  });
  res.json({ success: true, data: lines });
};

export const getGeneralLedger = async (req: AuthRequest, res: Response) => {
  const lines = await prisma.journalLine.findMany({
    where: { accountId: req.params.accountId },
    include: { journalEntry: true, account: true },
    orderBy: { journalEntry: { date: 'desc' } }
  });
  res.json({ success: true, data: lines });
};

export const getSupplierLedger = async (req: AuthRequest, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.supplierId },
    include: { purchaseOrders: { include: { items: true }, orderBy: { createdAt: 'desc' } } }
  });
  res.json({ success: true, data: supplier });
};

export const getEmployeeLedger = async (req: AuthRequest, res: Response) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.employeeId },
    include: { advances: true, salaries: true }
  });
  res.json({ success: true, data: employee });
};
