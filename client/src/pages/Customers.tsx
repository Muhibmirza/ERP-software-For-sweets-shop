import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Modal } from '../components/ui/Modal';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Customer } from '../types';
import { canEditDelete } from '../utils/permissions';

export default function Customers() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', phone: '', city: '', address: '' } });
  const editForm = useForm({ values: editing || { name: '', phone: '', city: '', address: '' } });
  const customers = useQuery({
    queryKey: ['customers', search],
    queryFn: () => unwrap<Customer[]>(api.get('/api/customers', { params: { search: search || undefined, limit: 200 } }))
  });

  const create = useMutation({
    mutationFn: (data: any) => unwrap<Customer>(api.post('/api/customers', data)),
    onSuccess: () => {
      toast('Customer added');
      reset();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });
  const update = useMutation({
    mutationFn: (data: any) => unwrap<Customer>(api.put(`/api/customers/${editing!.id}`, data)),
    onSuccess: () => {
      toast('Customer updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: () => toast('Could not update customer', 'error')
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/customers/${id}`)),
    onSuccess: () => {
      toast('Customer deleted');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not delete customer', 'error')
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Customers</h2>
          <input
            className="erp-input max-w-sm"
            placeholder="Search customer name or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers.data?.map((customer) => (
            <div key={customer.id} className="rounded-md border p-3 dark:border-slate-800">
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-slate-500">{customer.phone}</div>
              <div className="text-xs text-slate-500">{customer.city || 'City not set'}</div>
              <div className="mt-2 text-sm">Orders: {customer.totalOrders}</div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="grid h-8 w-8 place-items-center rounded-md border border-emerald-200 text-emerald-700" title="Profile" onClick={() => navigate(`/customers/${customer.id}`)}><Eye size={15} /></button>
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => setEditing(customer)}><Edit size={15} /></button>}
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Delete" onClick={() => setDeleting(customer)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
          {!customers.data?.length && <div className="rounded-md border border-dashed p-5 text-center text-sm text-slate-500">No customers found.</div>}
        </div>
      </section>
      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Customer</h2>
        <div className="grid gap-3">
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Name" {...register('name', { required: true })} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Phone" {...register('phone', { required: true })} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="City" {...register('city')} />
          <textarea className="min-h-24 rounded-md border bg-transparent p-3 dark:border-slate-700" placeholder="Address" {...register('address')} />
          <button className="touch rounded-md bg-orange-600 font-semibold text-white" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Customer'}</button>
        </div>
      </form>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing?.name || 'Customer'}`}>
        <form className="grid gap-3" onSubmit={editForm.handleSubmit((data) => update.mutate(data))}>
          <label><span className="mb-1 block text-sm font-semibold">Name *</span><input className="erp-input" {...editForm.register('name', { required: true })} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Phone *</span><input className="erp-input" {...editForm.register('phone', { required: true })} /></label>
          <label><span className="mb-1 block text-sm font-semibold">City</span><input className="erp-input" {...editForm.register('city')} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Address</span><textarea className="erp-input" {...editForm.register('address')} /></label>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} title={`Delete ${deleting?.name || 'Customer'}?`} isLoading={remove.isPending} />
    </div>
  );
}
