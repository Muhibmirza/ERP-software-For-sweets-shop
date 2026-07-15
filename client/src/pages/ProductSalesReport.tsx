import { useMutation, useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import dayjs from 'dayjs';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { api, unwrap } from '../api/client';
import { ProductSalesReportPrint } from '../components/print/ProductSalesReportPrint';
import { pkr } from '../utils/format';
import { silentPrint } from '../utils/print';

export default function ProductSalesReport() {
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [report, setReport] = useState<any>(null);
  const products = useQuery({ queryKey: ['products-list'], queryFn: () => unwrap<any[]>(api.get('/api/products?limit=300')) });
  const generate = useMutation({
    mutationFn: () => unwrap<any>(api.get('/api/reports/product-sales', { params: { productId, startDate, endDate } })),
    onSuccess: setReport
  });

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Reports</p><h2 className="erp-title">Product Sales Report</h2></div></div>
      <div className="erp-card grid gap-3 p-5 md:grid-cols-[1fr_180px_180px_auto_auto]">
        <select className="erp-input" value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Select product</option>
          {products.data?.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <input className="erp-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <input className="erp-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <button className="btn-primary" disabled={!productId || generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? 'Generating...' : 'Generate Report'}</button>
        <button className="btn-secondary" disabled={!report} onClick={() => report && silentPrint(renderToStaticMarkup(<ProductSalesReportPrint report={report} />))}><Printer size={16} /> Print</button>
      </div>

      {report && (
        <div className="erp-card overflow-x-auto p-5">
          <h3 className="mb-1 font-serif text-xl font-semibold text-[#0f615d]">Sales Report: {report.product?.name}</h3>
          <p className="mb-4 text-sm text-[#6b7d78]">Period: {dayjs(report.startDate).format('DD-MMM-YYYY')} to {dayjs(report.endDate).format('DD-MMM-YYYY')}</p>
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Invoice No</th><th>Customer</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {(report.items || []).map((item: any) => (
                <tr key={item.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                  <td className="py-3">{dayjs(item.sale.createdAt).format('DD-MMM-YYYY hh:mm A')}</td>
                  <td>{item.sale.invoiceNo}</td>
                  <td>{item.sale.customer?.name || 'Walk-in Customer'}</td>
                  <td>{item.quantity} {report.product.unit}</td>
                  <td className="font-bold">{pkr(item.unitPrice)}</td>
                  <td className="font-bold">{pkr(item.subtotal)}</td>
                </tr>
              ))}
              {!report.items?.length && <tr><td colSpan={6} className="py-8 text-center text-[#6b7d78]">No sales found for this period.</td></tr>}
            </tbody>
          </table>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="Total Transactions" value={report.summary.totalTransactions} />
            <Metric label="Total Qty Sold" value={`${report.summary.totalQty} ${report.product.unit}`} />
            <Metric label="Total Revenue" value={pkr(report.summary.totalRevenue)} />
            <Metric label="Avg per Transaction" value={pkr(report.summary.avgPerTransaction)} />
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[#ead8bb] bg-white/60 p-4"><p className="text-sm text-[#6b7d78]">{label}</p><b>{value}</b></div>;
}
