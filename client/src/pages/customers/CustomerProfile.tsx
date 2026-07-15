import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { formatCurrency } from '../../utils/format';

export default function CustomerProfile() {
  const { id = '' } = useParams();
  const customer = useQuery({ queryKey: ['customer-profile', id], queryFn: () => unwrap<any>(api.get(`/api/customers/${id}`)), enabled: Boolean(id) });
  const data = customer.data;
  const orders = data?.orders || [];
  const sales = data?.sales || [];
  const totalSpent = (data?.totalSpent ?? sales.reduce((sum: number, sale: any) => sum + Number(sale.netAmount || 0), 0) + orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0));
  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Customer 360</p><h2 className="erp-title">{data?.name || 'Customer Profile'}</h2></div></div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Phone</p><b>{data?.phone || '-'}</b></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">City</p><b>{data?.city || '-'}</b></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Total Orders</p><b>{orders.length}</b></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Total Spent</p><b>{formatCurrency(totalSpent || 0)}</b></div>
        <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Outstanding</p><b>{formatCurrency(data?.outstandingBalance || 0)}</b></div>
      </div>
      <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Address</p><b>{data?.address || '-'}</b></div>
      <div className="erp-card overflow-x-auto p-5"><h3 className="mb-3 font-semibold">Order History</h3><table className="w-full min-w-[860px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Items</th><th>Total</th><th>Advance</th><th>Due</th><th>Status</th></tr></thead><tbody>{orders.map((order: any) => <tr className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60" key={order.id}><td className="py-3">{new Date(order.createdAt).toLocaleDateString()}</td><td>{(order.items || []).map((item: any) => `${item.product?.name || 'Item'} x ${item.quantity}`).join(', ') || '-'}</td><td>{formatCurrency(order.totalAmount)}</td><td>{formatCurrency(order.advancePaid || 0)}</td><td>{formatCurrency(order.dueAmount || 0)}</td><td><span className={`rounded px-2 py-1 text-xs font-semibold ${order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{order.status}</span></td></tr>)}</tbody></table></div>
      <div className="erp-card overflow-x-auto p-5"><h3 className="mb-3 font-semibold">Sales History</h3><table className="w-full min-w-[700px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Invoice</th><th>Date</th><th>Payment</th><th>Total</th></tr></thead><tbody>{sales.map((sale: any) => <tr className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60" key={sale.id}><td className="py-3">{sale.invoiceNo}</td><td>{new Date(sale.createdAt).toLocaleDateString()}</td><td>{sale.paymentMethod}</td><td>{formatCurrency(sale.netAmount)}</td></tr>)}</tbody></table></div>
    </section>
  );
}
