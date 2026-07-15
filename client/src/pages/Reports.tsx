import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BarChart3, Boxes, FileText, ReceiptText, Users } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { pkr } from '../utils/format';

const colors = ['#0f615d', '#c88421', '#2563eb', '#dc2626', '#7c3aed'];

export default function Reports() {
  const daily = useQuery({ queryKey: ['daily-report'], queryFn: () => unwrap<any>(api.get('/api/reports/daily')) });
  const monthly = useQuery({ queryKey: ['monthly-report'], queryFn: () => unwrap<any>(api.get('/api/reports/monthly')) });
  const profitLoss = useQuery({ queryKey: ['reports-profit-loss'], queryFn: () => unwrap<any>(api.get('/api/reports/profit-loss')) });
  const stockValuation = useQuery({ queryKey: ['stock-valuation-report'], queryFn: () => unwrap<any>(api.get('/api/reports/stock-valuation')) });
  const productSales = useQuery({ queryKey: ['product-sales-report'], queryFn: () => unwrap<any[]>(api.get('/api/reports/product-sales')) });
  const payroll = useQuery({ queryKey: ['payroll-report'], queryFn: () => unwrap<any>(api.get('/api/reports/payroll')) });
  const supplierOutstanding = useQuery({ queryKey: ['supplier-outstanding-report'], queryFn: () => unwrap<any[]>(api.get('/api/reports/supplier-outstanding')) });

  const dailyBreakdown = monthly.data?.dailyBreakdown || [];
  const paymentBreakdown = daily.data?.paymentBreakdown || [];
  const lowStock = stockValuation.data?.lowStockItems || [];

  const cards = [
    { label: 'Daily Revenue', value: pkr(daily.data?.revenue || 0), icon: ReceiptText },
    { label: 'Monthly Revenue', value: pkr(monthly.data?.revenue || 0), icon: BarChart3 },
    { label: 'Net Profit', value: pkr(profitLoss.data?.netProfit || monthly.data?.profit || 0), icon: FileText },
    { label: 'Stock Value', value: pkr(stockValuation.data?.totalStockValue || 0), icon: Boxes },
    { label: 'Payroll', value: pkr(payroll.data?.total || 0), icon: Users },
    { label: 'Low Stock', value: String(lowStock.length), icon: AlertTriangle }
  ];

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header">
        <div>
          <p className="erp-eyebrow">Business Intelligence</p>
          <h2 className="erp-title">Reports</h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="erp-card p-4">
            <card.icon className="mb-4 text-[#0f615d]" size={22} />
            <p className="text-sm font-medium text-[#6b7d78]">{card.label}</p>
            <b className="mt-1 block text-xl text-[#123b39]">{card.value}</b>
          </div>
        ))}
      </div>

      <div className="erp-card flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold text-[#0f615d]">Product Sales Report</h3>
          <p className="text-sm text-[#6b7d78]">Select one product and date range, then print a detailed sales report.</p>
        </div>
        <Link className="btn-primary" to="/reports/product-sales">Open Report</Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="erp-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-[#0f615d]">Monthly Revenue Trend</h3>
            <span className="rounded-full bg-[#f1e3cb] px-3 py-1 text-xs font-semibold text-[#0f615d]">{dailyBreakdown.length} days</span>
          </div>
          <div className="h-72">
            {dailyBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ead8bb" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => pkr(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#0f615d" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No sales yet" text="Revenue chart will appear after POS sales are recorded." />
            )}
          </div>
        </section>

        <section className="erp-card p-5">
          <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Payment Mix</h3>
          <div className="h-72">
            {paymentBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="_count" nameKey="paymentMethod" outerRadius={92}>
                    {paymentBreakdown.map((_: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No payments yet" text="Payment method chart will update from live sales." />
            )}
          </div>
        </section>
      </div>

      <section className="erp-card p-5">
        <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Profit Breakdown</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <ReportMetric label="Revenue" value={monthly.data?.revenue || 0} />
          <ReportMetric label="COGS" value={monthly.data?.cogs || 0} negative />
          <ReportMetric label="Gross Profit" value={monthly.data?.grossProfit || 0} />
          <ReportMetric label="Operating Expenses" value={monthly.data?.operatingExpenses || 0} negative />
          <ReportMetric label="Net Profit" value={monthly.data?.netProfit || 0} highlight />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="erp-card p-5">
          <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Product-wise Sales</h3>
          <div className="h-72">
            {(productSales.data || []).length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(productSales.data || []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ead8bb" />
                  <XAxis dataKey="product.name" />
                  <YAxis />
                  <Tooltip formatter={(value) => pkr(Number(value))} />
                  <Bar dataKey="_sum.subtotal" fill="#c88421" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No product sales" text="Top products will show after invoices are created." />
            )}
          </div>
        </section>

        <section className="erp-card overflow-hidden p-5">
          <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Supplier Outstanding</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Supplier</th><th>Phone</th><th>Outstanding</th></tr></thead>
              <tbody>
                {(supplierOutstanding.data || []).length ? supplierOutstanding.data?.map((supplier: any) => (
                  <tr key={supplier.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]">
                    <td className="py-3 font-semibold">{supplier.name}</td>
                    <td>{supplier.phone}</td>
                    <td>{pkr(supplier.outstanding || 0)}</td>
                  </tr>
                )) : (
                  <tr><td className="py-8 text-center text-[#6b7d78]" colSpan={3}>No supplier balances yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="erp-card overflow-hidden p-5">
        <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Stock Valuation Alerts</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Item</th><th>Category</th><th>Stock</th><th>Min Level</th><th>Value</th></tr></thead>
            <tbody>
              {lowStock.length ? lowStock.map((item: any) => (
                <tr key={item.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]">
                  <td className="py-3 font-semibold">{item.name}</td>
                  <td>{item.category || '-'}</td>
                  <td>{item.currentStock} {item.unit}</td>
                  <td>{item.minStockLevel}</td>
                  <td>{pkr(item.stockValue || 0)}</td>
                </tr>
              )) : (
                <tr><td className="py-8 text-center text-[#6b7d78]" colSpan={5}>No low-stock items right now.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#dac197] bg-white/45 p-6 text-center">
      <div>
        <FileText className="mx-auto mb-3 text-[#c88421]" />
        <h4 className="font-semibold text-[#123b39]">{title}</h4>
        <p className="mt-1 text-sm text-[#6b7d78]">{text}</p>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, negative, highlight }: { label: string; value: number; negative?: boolean; highlight?: boolean }) {
  const tone = highlight ? (value >= 0 ? 'text-emerald-700' : 'text-red-700') : negative ? 'text-red-700' : 'text-[#123b39]';
  return (
    <div className="rounded-xl border border-[#ead8bb] bg-white/60 p-4">
      <p className="text-sm font-medium text-[#6b7d78]">{negative ? `- ${label}` : label}</p>
      <b className={`mt-1 block text-xl ${tone}`}>{pkr(value)}</b>
    </div>
  );
}
