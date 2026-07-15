import { useQuery } from '@tanstack/react-query';
import { BarChart3, Landmark, Wallet } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { formatCurrency } from '../../utils/format';

export default function AccountingDashboard() {
  const trial = useQuery({ queryKey: ['trial-balance'], queryFn: () => unwrap<any>(api.get('/api/accounting/trial-balance')) });
  const pnl = useQuery({ queryKey: ['profit-loss'], queryFn: () => unwrap<any>(api.get('/api/accounting/profit-loss')) });
  const cashBook = useQuery({ queryKey: ['cash-book'], queryFn: () => unwrap<any[]>(api.get('/api/accounting/cash-book')) });

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header">
        <div>
          <p className="erp-eyebrow">Double Entry Accounting</p>
          <h2 className="erp-title">Accounting Dashboard</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="erp-card p-5">
          <Landmark className="text-[#0f615d]" />
          <p className="mt-4 text-sm text-[#6b7d78]">Trial Balance Debit</p>
          <h3 className="text-2xl font-bold">{formatCurrency(trial.data?.debitTotal || 0)}</h3>
        </div>
        <div className="erp-card p-5">
          <BarChart3 className="text-[#c88421]" />
          <p className="mt-4 text-sm text-[#6b7d78]">Net Profit</p>
          <h3 className="text-2xl font-bold">{formatCurrency(pnl.data?.netProfit || 0)}</h3>
        </div>
        <div className="erp-card p-5">
          <Wallet className="text-[#0f615d]" />
          <p className="mt-4 text-sm text-[#6b7d78]">Cash Book Lines</p>
          <h3 className="text-2xl font-bold">{cashBook.data?.length || 0}</h3>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <AccountingMetric label="Revenue" value={pnl.data?.revenue || pnl.data?.income || 0} />
        <AccountingMetric label="COGS" value={pnl.data?.cogs || 0} negative />
        <AccountingMetric label="Gross Profit" value={pnl.data?.grossProfit || 0} />
        <AccountingMetric label="Operating Expenses" value={pnl.data?.operatingExpenses || pnl.data?.expenses || 0} negative />
        <AccountingMetric label="Net Profit" value={pnl.data?.netProfit || 0} highlight />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AccountingMetric label="Gross Revenue" value={pnl.data?.grossRevenue || pnl.data?.revenue || 0} />
        <AccountingMetric label="Sales Returns" value={pnl.data?.salesReturns || 0} negative />
        <AccountingMetric label="Net Revenue" value={pnl.data?.revenue || pnl.data?.income || 0} highlight />
      </div>
      <div className="erp-card overflow-x-auto p-5">
        <h3 className="mb-4 font-serif text-xl font-semibold text-[#0f615d]">Trial Balance</h3>
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Code</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>
            {(trial.data?.rows || []).map((row: any) => (
              <tr key={row.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]">
                <td className="py-3 font-semibold">{row.code}</td><td>{row.name}</td><td>{row.type}</td><td>{formatCurrency(row.debit)}</td><td>{formatCurrency(row.credit)}</td><td>{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AccountingMetric({ label, value, negative, highlight }: { label: string; value: number; negative?: boolean; highlight?: boolean }) {
  const tone = highlight ? (value >= 0 ? 'text-emerald-700' : 'text-red-700') : negative ? 'text-red-700' : 'text-[#123b39]';
  return (
    <div className="erp-card p-4">
      <p className="text-sm font-medium text-[#6b7d78]">{negative ? `- ${label}` : label}</p>
      <b className={`mt-1 block text-xl ${tone}`}>{formatCurrency(value)}</b>
    </div>
  );
}
