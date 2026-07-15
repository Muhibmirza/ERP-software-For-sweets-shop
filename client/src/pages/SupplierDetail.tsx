import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api/client';
import { pkr } from '../utils/format';
import { useUiStore } from '../store/ui';
import { Modal } from '../components/ui/Modal';
import { ALL_UNITS } from '../constants/units';
import { SupplierPaymentSlipPrint } from '../components/print/SupplierPaymentSlipPrint';
import { silentPrint } from '../utils/print';

export default function SupplierDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const toast = useUiStore((state) => state.toast);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [shortTermDeduction, setShortTermDeduction] = useState('');
  const [longTermDeduction, setLongTermDeduction] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [monthlyEdit, setMonthlyEdit] = useState<Record<string, string>>({});
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [advanceForm, setAdvanceForm] = useState({ advanceType: 'SHORT_TERM', totalAmount: '', monthlyDeduction: '', reason: '' });
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    purchaseOrderId: '',
    reason: '',
    items: [{ rawMaterialId: '', quantity: '', unit: 'KG', rate: '' }]
  });
  const ledger = useQuery({
    queryKey: ['supplier-detail', id],
    queryFn: () => unwrap<any>(api.get(`/api/suppliers/${id}/ledger`)),
    enabled: Boolean(id)
  });
  const rawMaterials = useQuery({ queryKey: ['raw-materials'], queryFn: () => unwrap<any[]>(api.get('/api/raw-materials')) });
  const paymentSummary = useQuery({
    queryKey: ['supplier-payment-summary', id],
    queryFn: () => unwrap<any>(api.get(`/api/suppliers/${id}/payment-summary?days=10`)),
    enabled: Boolean(id)
  });
  const createAdvance = useMutation({
    mutationFn: () => unwrap(api.post(`/api/suppliers/${id}/advances`, {
      advanceType: advanceForm.advanceType,
      totalAmount: Number(advanceForm.totalAmount || 0),
      monthlyDeduction: advanceForm.advanceType === 'LONG_TERM' ? Number(advanceForm.monthlyDeduction || 0) : null,
      reason: advanceForm.reason
    })),
    onSuccess: () => {
      toast('Supplier advance saved');
      setAdvanceForm({ advanceType: 'SHORT_TERM', totalAmount: '', monthlyDeduction: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['supplier-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-summary', id] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not save supplier advance', 'error')
  });
  const updateMonthlyDeduction = useMutation({
    mutationFn: ({ advanceId, monthlyDeduction }: { advanceId: string; monthlyDeduction: number }) => unwrap(api.patch(`/api/loans/supplier/${advanceId}`, { monthlyDeduction })),
    onSuccess: () => {
      toast('Monthly deduction updated');
      queryClient.invalidateQueries({ queryKey: ['supplier-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-summary', id] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not update monthly deduction', 'error')
  });
  const paySupplier = useMutation({
    mutationFn: () => unwrap(api.post(`/api/suppliers/${id}/payment`, {
      amount: Number(paymentAmount || 0),
      paymentMethod,
      shortTermDeduction: Number(shortTermDeduction || 0),
      longTermDeduction: Number(longTermDeduction || 0),
      notes: paymentNotes
    })),
    onSuccess: (result: any) => {
      setLastPayment(result);
      toast(result?.totalAdvanceDeduction > 0 ? `Payment saved. Advance deducted: ${pkr(result.totalAdvanceDeduction)}` : 'Supplier payment saved');
      setPaymentAmount('');
      setLongTermDeduction('');
      setPaymentNotes('');
      queryClient.invalidateQueries({ queryKey: ['supplier-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-outstanding-report'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not save payment', 'error')
  });
  const createReturn = useMutation({
    mutationFn: () => unwrap(api.post(`/api/suppliers/${id}/return`, {
      purchaseOrderId: returnForm.purchaseOrderId || undefined,
      reason: returnForm.reason,
      items: returnForm.items.map((item) => ({
        rawMaterialId: item.rawMaterialId,
        quantity: Number(item.quantity || 0),
        unit: item.unit,
        rate: Number(item.rate || 0)
      }))
    })),
    onSuccess: () => {
      toast('Supplier return recorded');
      setReturnOpen(false);
      setReturnForm({ purchaseOrderId: '', reason: '', items: [{ rawMaterialId: '', quantity: '', unit: 'KG', rate: '' }] });
      queryClient.invalidateQueries({ queryKey: ['supplier-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not record supplier return', 'error')
  });
  const data = ledger.data;
  const supplier = data?.supplier || data;
  const outstanding = Number(data?.outstandingBalance ?? supplier?.balance ?? 0);
  const returnTotal = returnForm.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
  const advanceSummary = paymentSummary.data?.advances || data?.advances || [];
  const shortTermOutstanding = useMemo(() => advanceSummary.filter((advance: any) => advance.advanceType === 'SHORT_TERM' && !advance.isFullyRecovered).reduce((sum: number, advance: any) => sum + Number(advance.remainingBalance || 0), 0), [advanceSummary]);
  const longTermOutstanding = useMemo(() => advanceSummary.filter((advance: any) => advance.advanceType === 'LONG_TERM' && !advance.isFullyRecovered).reduce((sum: number, advance: any) => sum + Number(advance.remainingBalance || 0), 0), [advanceSummary]);
  const netCashToPay = Math.max(0, Number(paymentAmount || 0) - Number(shortTermDeduction || 0) - Number(longTermDeduction || 0));
  useEffect(() => {
    setShortTermDeduction(shortTermOutstanding ? String(shortTermOutstanding) : '');
  }, [shortTermOutstanding]);
  const printPaymentSlip = (payment = lastPayment) => {
    if (!paymentSummary.data) return toast('Payment summary is still loading', 'error');
    silentPrint(renderToStaticMarkup(<SupplierPaymentSlipPrint summary={paymentSummary.data} payment={payment} />));
  };

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Supplier 360</p><h2 className="erp-title">{supplier?.name || 'Supplier Profile'}</h2></div></div>
      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Phone" value={supplier?.phone || '-'} />
        <Info label="City" value={supplier?.city || '-'} />
        <Info label="Outstanding" value={pkr(outstanding)} danger={outstanding > 0} />
        <Info label="Purchases" value={String(data?.purchaseOrders?.length || 0)} />
      </div>
      <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">Address</p><b>{supplier?.address || '-'}</b></div>

      <div className="erp-card p-5">
        <h3 className="mb-3 font-semibold text-[#0f615d]">Record Supplier Payment</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm"><span>Amount Being Paid *</span><input className="erp-input" type="number" min="0" step="0.001" placeholder="Payment amount" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          <label className="grid gap-1 text-sm"><span>Payment Method *</span><select className="erp-input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="JAZZCASH">JazzCash</option>
            <option value="EASYPAISA">EasyPaisa</option>
            <option value="BANK">Bank</option>
          </select></label>
          <label className="grid gap-1 text-sm"><span>Short Term Advance Deduct</span><input className="erp-input" type="number" min="0" step="0.001" placeholder="0" value={shortTermDeduction} onChange={(event) => setShortTermDeduction(event.target.value)} /></label>
          <label className="grid gap-1 text-sm"><span>Long Term Advance Deduct</span><input className="erp-input" type="number" min="0" step="0.001" placeholder="Manual amount" value={longTermDeduction} onChange={(event) => setLongTermDeduction(event.target.value)} /></label>
          <div className="rounded-xl border border-[#ead8bb] bg-white/70 px-3 py-2 text-sm"><span className="text-[#6b7d78]">Remaining Long Term</span><b className="block text-[#0f615d]">{pkr(longTermOutstanding)}</b></div>
          <div className="rounded-xl border border-[#ead8bb] bg-white/70 px-3 py-2 text-sm"><span className="text-[#6b7d78]">Net Cash to Pay</span><b className="block text-[#0f615d]">{pkr(netCashToPay)}</b></div>
          <input className="erp-input lg:col-span-2" placeholder="Notes" value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} />
          <button className="btn-secondary" type="button" onClick={() => setPaymentAmount(String(Math.max(outstanding, 0)))} disabled={outstanding <= 0}>Full Balance</button>
          <button className="btn-primary" type="button" onClick={() => paySupplier.mutate()} disabled={Number(paymentAmount || 0) <= 0 || paySupplier.isPending}>{paySupplier.isPending ? 'Saving...' : 'Mark Paid'}</button>
        </div>
        {lastPayment && <button className="btn-secondary mt-3" type="button" onClick={() => printPaymentSlip(lastPayment)}>Print Payment Slip</button>}
        <p className="mt-2 text-xs text-[#6b7d78]">Payment oldest unpaid purchases par apply hogi, supplier balance aur accounting cash/payable ledger update hoga.</p>
      </div>

      <div className="erp-card p-5">
        <h3 className="mb-3 font-semibold text-[#0f615d]">Supplier Advances</h3>
        <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_1fr_auto]">
          <select className="erp-input" value={advanceForm.advanceType} onChange={(event) => setAdvanceForm({ ...advanceForm, advanceType: event.target.value })}>
            <option value="SHORT_TERM">Short Term Kharchi</option>
            <option value="LONG_TERM">Long Term Advance</option>
          </select>
          <input className="erp-input" type="number" min="0" step="0.001" placeholder="Total amount" value={advanceForm.totalAmount} onChange={(event) => setAdvanceForm({ ...advanceForm, totalAmount: event.target.value })} />
          <input className="erp-input" type="number" min="0" step="0.001" placeholder="Monthly deduction" disabled={advanceForm.advanceType !== 'LONG_TERM'} value={advanceForm.monthlyDeduction} onChange={(event) => setAdvanceForm({ ...advanceForm, monthlyDeduction: event.target.value })} />
          <input className="erp-input" placeholder="Reason" value={advanceForm.reason} onChange={(event) => setAdvanceForm({ ...advanceForm, reason: event.target.value })} />
          <button className="btn-primary" type="button" disabled={createAdvance.isPending || Number(advanceForm.totalAmount || 0) <= 0} onClick={() => createAdvance.mutate()}>Save</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Type</th><th>Total</th><th>Monthly</th><th>Remaining</th><th>Status</th></tr></thead>
            <tbody>
              {(data?.advances || []).map((advance: any) => (
                <tr key={advance.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                  <td className="py-3">{advance.advanceType === 'SHORT_TERM' ? 'Short Term Kharchi' : 'Long Term Advance'}</td>
                  <td>{pkr(advance.totalAmount || 0)}</td>
                  <td>
                    {advance.advanceType === 'LONG_TERM' ? (
                      <div className="flex min-w-[180px] items-center gap-2">
                        <input className="erp-input h-9 w-24" type="number" min="0" step="0.001" value={monthlyEdit[advance.id] ?? String(advance.monthlyDeduction || '')} onChange={(event) => setMonthlyEdit({ ...monthlyEdit, [advance.id]: event.target.value })} />
                        <button className="rounded-md border border-[#dac197] px-2 py-1 text-xs font-bold text-[#0f615d]" type="button" disabled={updateMonthlyDeduction.isPending} onClick={() => updateMonthlyDeduction.mutate({ advanceId: advance.id, monthlyDeduction: Number(monthlyEdit[advance.id] ?? advance.monthlyDeduction ?? 0) })}>Save</button>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="font-bold">{pkr(advance.remainingBalance || 0)}</td>
                  <td>{advance.isFullyRecovered ? 'Recovered' : 'Open'}</td>
                </tr>
              ))}
              {!data?.advances?.length && <tr><td colSpan={5} className="py-6 text-center text-[#6b7d78]">No supplier advances recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="erp-card overflow-x-auto p-5">
        <h3 className="mb-3 font-semibold">Payments Made</h3>
        <table className="w-full min-w-[620px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Method</th><th>Amount</th><th>Notes</th><th>Print</th></tr></thead>
          <tbody>
            {(data?.payments || []).map((payment: any) => (
              <tr key={payment.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                <td className="py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td><span className="rounded-full bg-[#e8f4f1] px-2 py-1 text-xs font-bold text-[#0f615d]">{payment.paymentMethod}</span></td>
                <td className="font-bold">{pkr(payment.amount || 0)}</td>
                <td>{payment.notes || '-'}</td>
                <td><button className="btn-secondary" type="button" onClick={() => printPaymentSlip(payment)}>Print Slip</button></td>
              </tr>
            ))}
            {!data?.payments?.length && <tr><td colSpan={5} className="py-8 text-center text-[#6b7d78]">No supplier payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="erp-card overflow-x-auto p-5">
        <h3 className="mb-3 font-semibold">Purchase History</h3>
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {(data?.purchaseOrders || []).map((purchase: any) => {
              const due = Number(purchase.totalAmount || 0) - Number(purchase.paidAmount || 0);
              return <tr key={purchase.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60"><td className="py-3">{new Date(purchase.createdAt).toLocaleDateString()}</td><td>{(purchase.items || []).map((item: any) => `${item.rawMaterial?.name || 'Item'} (${item.quantity})`).join(', ') || '-'}</td><td>{pkr(purchase.totalAmount)}</td><td>{pkr(purchase.paidAmount)}</td><td className={due > 0 ? 'font-semibold text-red-700' : 'text-emerald-700'}>{pkr(due)}</td><td>{purchase.status}</td></tr>;
            })}
            {!data?.purchaseOrders?.length && <tr><td colSpan={6} className="py-8 text-center text-[#6b7d78]">No purchases found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="erp-card overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Returns to Supplier</h3>
          <button className="btn-primary" type="button" onClick={() => setReturnOpen(true)}>+ New Return</button>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Items</th><th>Amount</th><th>Reason</th><th>PO</th></tr></thead>
          <tbody>
            {(data?.returns || []).map((row: any) => (
              <tr key={row.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                <td className="py-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td>{(row.items || []).map((item: any) => `${item.rawMaterial?.name || 'Item'} (${item.quantity} ${item.unit})`).join(', ')}</td>
                <td className="font-bold">{pkr(row.totalAmount || 0)}</td>
                <td>{row.reason}</td>
                <td>{row.purchaseOrder ? `PO ${row.purchaseOrder.id.slice(-6).toUpperCase()}` : '-'}</td>
              </tr>
            ))}
            {!data?.returns?.length && <tr><td colSpan={5} className="py-8 text-center text-[#6b7d78]">No supplier returns recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="erp-card overflow-x-auto p-5">
        <h3 className="mb-3 font-semibold">Ledger</h3>
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Date</th><th>Type</th><th>Description</th><th>Method</th><th>Debit</th><th>Credit</th></tr></thead>
          <tbody>
            {(data?.transactions || []).map((row: any, index: number) => <tr key={`${row.type}-${index}`} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60"><td className="py-3">{new Date(row.date).toLocaleDateString()}</td><td>{row.type}</td><td>{row.description}</td><td>{row.paymentMethod || '-'}</td><td>{row.debit ? pkr(row.debit) : '-'}</td><td>{row.credit ? pkr(row.credit) : '-'}</td></tr>)}
            <tr className="border-t border-[#0f615d] font-bold"><td className="py-3" colSpan={4}>Totals</td><td>{pkr(data?.totalDebit || 0)}</td><td>{pkr(data?.totalCredit || 0)}</td></tr>
          </tbody>
        </table>
      </div>
      <Modal isOpen={returnOpen} onClose={() => setReturnOpen(false)} title="Return to Supplier" size="lg">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm"><span>Linked Purchase Order</span><select className="erp-input" value={returnForm.purchaseOrderId} onChange={(event) => setReturnForm({ ...returnForm, purchaseOrderId: event.target.value })}><option value="">No linked PO</option>{(data?.purchaseOrders || []).map((po: any) => <option key={po.id} value={po.id}>PO {po.id.slice(-6).toUpperCase()} - {pkr(po.totalAmount)}</option>)}</select></label>
            <label className="grid gap-1 text-sm"><span>Reason *</span><input className="erp-input" placeholder="Damaged, excess, wrong material" value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} /></label>
          </div>
          <div className="space-y-2">
            {returnForm.items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-xl bg-[#fff4df] p-3 md:grid-cols-[1fr_100px_120px_120px_90px_auto]">
                <select className="erp-input" value={item.rawMaterialId} onChange={(event) => {
                  const material = rawMaterials.data?.find((row) => row.id === event.target.value);
                  setReturnForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, rawMaterialId: event.target.value, unit: material?.unit || row.unit, rate: String(material?.costPerUnit || material?.avgCost || row.rate || '') } : row) }));
                }}><option value="">Raw Material</option>{rawMaterials.data?.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select>
                <input className="erp-input" type="number" min="0" step="0.001" placeholder="Qty" value={item.quantity} onChange={(event) => setReturnForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row) }))} />
                <select className="erp-input" value={item.unit} onChange={(event) => setReturnForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row) }))}>{ALL_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select>
                <input className="erp-input" type="number" min="0" step="0.001" placeholder="Rate" value={item.rate} onChange={(event) => setReturnForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, rate: event.target.value } : row) }))} />
                <div className="flex items-center font-bold">{pkr(Number(item.quantity || 0) * Number(item.rate || 0))}</div>
                <button className="btn-secondary" type="button" onClick={() => setReturnForm((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index) || current.items }))}>x</button>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => setReturnForm((current) => ({ ...current, items: [...current.items, { rawMaterialId: '', quantity: '', unit: 'KG', rate: '' }] }))}>+ Add Item</button>
          </div>
          <div className="flex items-center justify-between border-t border-[#ead8bb] pt-3">
            <b>Total Return Amount: {pkr(returnTotal)}</b>
            <div className="flex gap-2"><button className="btn-secondary" type="button" onClick={() => setReturnOpen(false)}>Cancel</button><button className="btn-primary" type="button" disabled={createReturn.isPending || returnTotal <= 0 || !returnForm.reason} onClick={() => createReturn.mutate()}>{createReturn.isPending ? 'Saving...' : 'Submit Return'}</button></div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="erp-card p-5"><p className="text-sm text-[#6b7d78]">{label}</p><b className={danger ? 'text-red-700' : ''}>{value}</b></div>;
}
