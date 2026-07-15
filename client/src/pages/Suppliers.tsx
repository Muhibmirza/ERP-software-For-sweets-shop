import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, ScrollText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Modal } from '../components/ui/Modal';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Supplier } from '../types';
import { pkr } from '../utils/format';
import { canEditDelete } from '../utils/permissions';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<Supplier | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', phone: '', city: 'Sukkur', address: '' } });
  const editForm = useForm({ values: editing || { name: '', phone: '', city: 'Sukkur', address: '' } });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => unwrap<Supplier[]>(api.get('/api/suppliers')) });
  const ledgerQuery = useQuery({
    queryKey: ['supplier-ledger', ledger?.id],
    queryFn: () => unwrap<any>(api.get(`/api/suppliers/${ledger!.id}/ledger`)),
    enabled: Boolean(ledger?.id)
  });

  const create = useMutation({
    mutationFn: (data: any) => unwrap<Supplier>(api.post('/api/suppliers', data)),
    onSuccess: () => {
      toast('Supplier saved');
      reset();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
  const update = useMutation({
    mutationFn: (data: any) => unwrap<Supplier>(api.put(`/api/suppliers/${editing!.id}`, data)),
    onSuccess: () => {
      toast('Supplier updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: () => toast('Could not update supplier', 'error')
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/suppliers/${id}`)),
    onSuccess: () => {
      toast('Supplier deleted');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not delete supplier', 'error')
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Supplier Ledger</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.data?.map((supplier) => (
            <div key={supplier.id} className="rounded-md border p-3 dark:border-slate-800">
              <div className="font-medium">{supplier.name}</div>
              <div className="text-sm text-slate-500">{supplier.phone} - {supplier.city}</div>
              <div className="mt-2 text-sm">Balance {pkr(supplier.balance)}</div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="grid h-8 w-8 place-items-center rounded-md border border-emerald-200 text-emerald-700" title="View Profile" onClick={() => navigate(`/suppliers/${supplier.id}`)}><ScrollText size={15} /></button>
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => setEditing(supplier)}><Edit size={15} /></button>}
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Delete" onClick={() => setDeleting(supplier)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
          {!suppliers.data?.length && <div className="rounded-md border border-dashed p-5 text-center text-sm text-slate-500">No suppliers found.</div>}
        </div>
      </section>
      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Supplier</h2>
        <div className="grid gap-3">
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Name" {...register('name', { required: true })} />
          <label className="grid gap-1 text-sm">
            <span>Phone <small className="text-slate-500">(Optional)</small></span>
            <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Phone" {...register('phone')} />
          </label>
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="City" {...register('city')} />
          <textarea className="rounded-md border bg-transparent p-3 dark:border-slate-700" placeholder="Address" {...register('address')} />
          <button className="touch rounded-md bg-orange-600 font-semibold text-white" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Supplier'}</button>
        </div>
      </form>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing?.name || 'Supplier'}`}>
        <form className="grid gap-3" onSubmit={editForm.handleSubmit((data) => update.mutate(data))}>
          <label><span className="mb-1 block text-sm font-semibold">Name *</span><input className="erp-input" {...editForm.register('name', { required: true })} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Phone <small className="text-slate-500">(Optional)</small></span><input className="erp-input" {...editForm.register('phone')} /></label>
          <label><span className="mb-1 block text-sm font-semibold">City</span><input className="erp-input" {...editForm.register('city')} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Address</span><textarea className="erp-input" {...editForm.register('address')} /></label>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(ledger)} onClose={() => setLedger(null)} title={`${ledger?.name || 'Supplier'} Ledger`}>
        <div className="rounded-xl bg-[#fff4df] p-4 text-sm">
          <div className="font-semibold text-[#0f615d]">Current Balance</div>
          <div className="mt-1 text-2xl font-bold">{pkr(ledgerQuery.data?.balance ?? ledger?.balance ?? 0)}</div>
          <div className="mt-1 text-xs text-[#55716d]">
            Purchases: {ledgerQuery.data?.purchaseOrders?.length || 0} | Raw materials: {ledgerQuery.data?.rawMaterials?.length || 0}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 font-semibold text-[#0f615d]">Purchase Ledger</h3>
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-[#f6f0e7] text-left text-xs uppercase tracking-[0.12em] text-[#55716d]">
              <tr><th className="px-3 py-3">Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ledgerQuery.isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-[#55716d]">Loading ledger...</td></tr>}
              {(ledgerQuery.data?.purchaseOrders || []).map((purchase: any) => {
                const due = Number(purchase.totalAmount || 0) - Number(purchase.paidAmount || 0);
                return (
                  <tr key={purchase.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                    <td className="px-3 py-3">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                    <td>{(purchase.items || []).map((item: any) => `${item.rawMaterial?.name || 'Item'} (${item.quantity})`).join(', ') || '-'}</td>
                    <td>{pkr(purchase.totalAmount || 0)}</td>
                    <td>{pkr(purchase.paidAmount || 0)}</td>
                    <td className={due > 0 ? 'font-semibold text-red-700' : 'text-emerald-700'}>{pkr(due)}</td>
                    <td>{purchase.status}</td>
                  </tr>
                );
              })}
              {!ledgerQuery.isLoading && !ledgerQuery.data?.purchaseOrders?.length && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#55716d]">No purchases found for this supplier.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-5 overflow-x-auto">
          <h3 className="mb-2 font-semibold text-[#0f615d]">Raw Materials Supplied</h3>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#f6f0e7] text-left text-xs uppercase tracking-[0.12em] text-[#55716d]">
              <tr><th className="px-3 py-3">Material</th><th>Unit</th><th>Current Stock</th><th>Rate</th><th>Stock Value</th><th>Last Stock In</th></tr>
            </thead>
            <tbody>
              {(ledgerQuery.data?.rawMaterials || []).map((material: any) => {
                const lastStockIn = material.stockMovements?.[0];
                const value = Number(material.currentStock || 0) * Number(material.costPerUnit || 0);
                return (
                  <tr key={material.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60">
                    <td className="px-3 py-3 font-semibold">{material.name}</td>
                    <td>{material.unit}</td>
                    <td>{material.currentStock}</td>
                    <td>{pkr(material.costPerUnit || 0)}</td>
                    <td>{pkr(value)}</td>
                    <td>{lastStockIn ? `${lastStockIn.quantity} on ${new Date(lastStockIn.createdAt).toLocaleDateString()}` : '-'}</td>
                  </tr>
                );
              })}
              {!ledgerQuery.isLoading && !ledgerQuery.data?.rawMaterials?.length && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#55716d]">No raw materials linked to this supplier.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
      <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} title={`Delete ${deleting?.name || 'Supplier'}?`} isLoading={remove.isPending} />
    </div>
  );
}
