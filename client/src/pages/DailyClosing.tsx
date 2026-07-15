import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap } from '../api/client';
import { DailyClosingSlip } from '../components/print/DailyClosingSlip';
import { useAuthStore } from '../store/auth';
import { formatCurrency } from '../utils/format';
import { printElement } from '../utils/print';

export default function DailyClosing() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const user = useAuthStore((state) => state.user);
  const summary = useQuery({ queryKey: ['daily-closing', date], queryFn: () => unwrap<any>(api.get(`/api/sales/daily-closing/${date}`)) });
  const close = useMutation({ mutationFn: () => unwrap<any>(api.post('/api/sales/daily-closing', { date })) });
  const data = close.data || summary.data;
  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Cash Counter</p><h2 className="erp-title">Daily Closing</h2></div></div>
      <div className="erp-card flex flex-col gap-3 p-5 sm:flex-row">
        <input className="erp-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn-primary" onClick={() => close.mutate()}>Close Day</button>
        <button className="btn-secondary" onClick={() => printElement('daily-closing-slip')}>Print Daily Closing</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Total Revenue</p><h3 className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || data?.total || 0)}</h3></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Total Sales</p><h3 className="text-2xl font-bold">{data?.totalSales || 0}</h3></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Date</p><h3 className="text-2xl font-bold">{date}</h3></div>
      </div>
      <div className="erp-card overflow-x-auto p-5"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Payment</th><th>Count</th><th>Amount</th></tr></thead><tbody>{(data?.paymentBreakdown || []).map((row: any) => <tr key={row.paymentMethod} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60"><td className="py-3">{row.paymentMethod}</td><td>{row._count}</td><td>{formatCurrency(row._sum?.netAmount || 0)}</td></tr>)}</tbody></table></div>
      <div id="daily-closing-slip" className="fixed -left-[9999px] top-0 bg-white p-4 text-black"><DailyClosingSlip summary={data} cashier={user?.name} /></div>
    </section>
  );
}
