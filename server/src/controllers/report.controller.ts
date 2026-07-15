import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import dayjs from 'dayjs';

export const getDailyReport = async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || dayjs().format('YYYY-MM-DD');
    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');

    const [salesData, deliveredOrdersRevenue, returnsTotal, expensesData, salaryData, cogsData, ordersData] = await Promise.all([
      prisma.sale.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { netAmount: true, discount: true }, _count: true }),
      prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
      prisma.saleReturn.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.salary.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { netSalary: true } }),
      prisma.saleItem.aggregate({ where: { sale: { createdAt: { gte: start, lte: end } } }, _sum: { profit: true, subtotal: true } }),
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } })
    ]);

    const paymentBreakdown = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { netAmount: true }, _count: true
    });

    const topItems = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10
    });

    const topItemsWithDetails = await Promise.all(
      topItems.map(async (item) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true, unit: true } });
        return { ...item, product };
      })
    );

    const grossRevenue = (salesData._sum.netAmount || 0) + (deliveredOrdersRevenue._sum.totalAmount || 0);
    const salesReturns = returnsTotal._sum.totalAmount || 0;
    const revenue = grossRevenue - salesReturns;
    const grossProfitFromItems = cogsData._sum.profit || 0;
    const cogs = Math.max((cogsData._sum.subtotal || 0) - grossProfitFromItems, 0);
    const grossProfit = revenue - cogs;
    const operatingExpenses = (expensesData._sum.amount || 0) + (salaryData._sum.netSalary || 0);
    const netProfit = grossProfit - operatingExpenses;

    res.json({
      success: true, data: {
        date, grossRevenue, salesReturns, netRevenue: revenue, revenue, cogs, grossProfit, operatingExpenses, netProfit,
        expenses: operatingExpenses, profit: netProfit,
        totalSales: salesData._count,
        totalDiscount: salesData._sum.discount || 0,
        newOrders: ordersData,
        paymentBreakdown, topItems: topItemsWithDetails
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string) || dayjs().month() + 1;
    const year = parseInt(req.query.year as string) || dayjs().year();
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`);
    const end = new Date(dayjs(start).endOf('month').format('YYYY-MM-DD') + 'T23:59:59');

    const [salesData, deliveredOrdersRevenue, returnsTotal, expensesData, ordersData, salaryData, cogsData] = await Promise.all([
      prisma.sale.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { netAmount: true, discount: true }, _count: true }),
      prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
      prisma.saleReturn.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.salary.aggregate({ where: { month, year }, _sum: { netSalary: true } }),
      prisma.saleItem.aggregate({ where: { sale: { createdAt: { gte: start, lte: end } } }, _sum: { profit: true, subtotal: true } })
    ]);

    // Daily breakdown for chart
    const dailyBreakdown: any[] = [];
    const daysInMonth = dayjs(start).daysInMonth();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayStart = new Date(dayDate + 'T00:00:00');
      const dayEnd = new Date(dayDate + 'T23:59:59');
      const [daySales, dayOrders, dayReturns] = await Promise.all([
        prisma.sale.aggregate({ where: { createdAt: { gte: dayStart, lte: dayEnd } }, _sum: { netAmount: true } }),
        prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: dayStart, lte: dayEnd } }, _sum: { totalAmount: true } }),
        prisma.saleReturn.aggregate({ where: { createdAt: { gte: dayStart, lte: dayEnd } }, _sum: { totalAmount: true } })
      ]);
      dailyBreakdown.push({ day: d, date: dayDate, revenue: (daySales._sum.netAmount || 0) + (dayOrders._sum.totalAmount || 0) - (dayReturns._sum.totalAmount || 0) });
    }

    const grossRevenue = (salesData._sum.netAmount || 0) + (deliveredOrdersRevenue._sum.totalAmount || 0);
    const salesReturns = returnsTotal._sum.totalAmount || 0;
    const revenue = grossRevenue - salesReturns;
    const grossProfitFromItems = cogsData._sum.profit || 0;
    const cogs = Math.max((cogsData._sum.subtotal || 0) - grossProfitFromItems, 0);
    const grossProfit = revenue - cogs;
    const operatingExpenses = (expensesData._sum.amount || 0) + (salaryData._sum.netSalary || 0);
    const netProfit = grossProfit - operatingExpenses;

    res.json({
      success: true, data: {
        month, year, grossRevenue, salesReturns, netRevenue: revenue, revenue, cogs, grossProfit, operatingExpenses, netProfit,
        expenses: operatingExpenses, profit: netProfit,
        totalSales: salesData._count, totalOrders: ordersData,
        totalDiscount: salesData._sum.discount || 0,
        salaryExpenses: salaryData._sum.netSalary || 0,
        otherExpenses: expensesData._sum.amount || 0,
        dailyBreakdown
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStockValuationReport = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    const valuation = products.map(p => ({
      id: p.id, name: p.name, category: p.category.name,
      currentStock: p.currentStock, unit: p.unit,
      costPrice: p.costPrice, sellingPrice: p.sellingPrice,
      stockValue: p.currentStock * p.costPrice,
      retailValue: p.currentStock * p.sellingPrice,
      isLow: p.currentStock <= p.minStockLevel
    }));

    const totalStockValue = valuation.reduce((sum, p) => sum + p.stockValue, 0);
    const totalRetailValue = valuation.reduce((sum, p) => sum + p.retailValue, 0);
    const lowStockItems = valuation.filter(p => p.isLow);

    res.json({
      success: true,
      data: { products: valuation, totalStockValue, totalRetailValue, lowStockItems, lowStockCount: lowStockItems.length }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProductSalesReport = async (req: Request, res: Response) => {
  try {
    const { productId, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(dayjs().startOf('month').format('YYYY-MM-DD'));
    const end = endDate ? new Date(endDate as string + 'T23:59:59') : new Date();

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId as string },
        select: { id: true, name: true, unit: true }
      });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      const saleItems = await prisma.saleItem.findMany({
        where: { productId: productId as string, sale: { createdAt: { gte: start, lte: end } } },
        include: {
          sale: {
            select: {
              invoiceNo: true,
              createdAt: true,
              customer: { select: { name: true } },
              paymentMethod: true
            }
          }
        },
        orderBy: { sale: { createdAt: 'asc' } }
      });

      const totalQty = saleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const totalRevenue = saleItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      const byDay: Record<string, number> = {};
      saleItems.forEach((item) => {
        const day = dayjs(item.sale.createdAt).format('YYYY-MM-DD');
        byDay[day] = (byDay[day] || 0) + Number(item.subtotal || 0);
      });
      const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

      return res.json({
        success: true,
        data: {
          product,
          startDate: start,
          endDate: end,
          items: saleItems,
          summary: {
            totalTransactions: saleItems.length,
            totalQty,
            totalRevenue,
            avgPerTransaction: saleItems.length ? totalRevenue / saleItems.length : 0,
            bestDay: bestDay ? { date: bestDay[0], amount: bestDay[1] } : null
          }
        }
      });
    }

    const productSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true, subtotal: true },
      _count: true,
      orderBy: { _sum: { subtotal: 'desc' } }
    });

    const withDetails = await Promise.all(productSales.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }, include: { category: true }
      });
      return { ...item, product };
    }));

    res.json({ success: true, data: withDetails });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCashBookReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const cash = await prisma.chartOfAccounts.findUnique({ where: { code: '1001' } });
    if (!cash) return res.json({ success: true, data: [] });
    const lines = await prisma.journalLine.findMany({
      where: {
        accountId: cash.id,
        journalEntry: {
          date: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(`${endDate}T23:59:59`) : undefined
          }
        }
      },
      include: { journalEntry: true, account: true },
      orderBy: { journalEntry: { date: 'desc' } }
    });
    res.json({ success: true, data: lines });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfitLossReport = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month || dayjs().month() + 1);
    const year = Number(req.query.year || dayjs().year());
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
    const end = new Date(year, month, 0, 23, 59, 59);
    const lines = await prisma.journalLine.findMany({
      where: { journalEntry: { date: { gte: start, lte: end } }, account: { type: { in: ['INCOME', 'EXPENSE'] } } },
      include: { account: true }
    });
    const income = lines.filter((line) => line.account.type === 'INCOME').reduce((sum, line) => sum + line.credit - line.debit, 0);
    const expenses = lines.filter((line) => line.account.type === 'EXPENSE').reduce((sum, line) => sum + line.debit - line.credit, 0);
    res.json({ success: true, data: { month, year, income, expenses, netProfit: income - expenses } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPayrollReport = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month || dayjs().month() + 1);
    const year = Number(req.query.year || dayjs().year());
    const salaries = await prisma.salary.findMany({ where: { month, year }, include: { employee: true }, orderBy: { createdAt: 'desc' } });
    const total = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);
    res.json({ success: true, data: { month, year, total, salaries } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSupplierOutstandingReport = async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({ include: { purchaseOrders: true }, orderBy: { name: 'asc' } });
    const data = suppliers.map((supplier) => ({
      ...supplier,
      outstanding: supplier.purchaseOrders.reduce((sum, po) => sum + po.totalAmount - po.paidAmount, 0)
    }));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
