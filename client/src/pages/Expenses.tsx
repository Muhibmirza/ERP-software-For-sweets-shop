import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, unwrap } from '../api/client';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Modal } from '../components/ui/Modal';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import { date, pkr } from '../utils/format';
import { canEditDelete } from '../utils/permissions';

export default function Expenses() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((state) => state.user);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { category: 'electricity', amount: 0, description: '' } });
  const editForm = useForm({ values: editing || { category: 'electricity', amount: 0, description: '' } });
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: () => unwrap<any[]>(api.get('/api/expenses')) });

  const create = useMutation({
    mutationFn: (data: any) => unwrap<any>(api.post('/api/expenses', data)),
    onSuccess: () => {
      toast('Expense recorded');
      reset();
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });
  const update = useMutation({
    mutationFn: (data: any) => unwrap<any>(api.put(`/api/expenses/${editing.id}`, data)),
    onSuccess: () => {
      toast('Expense updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast('Could not update expense', 'error')
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/expenses/${id}`)),
    onSuccess: () => {
      toast('Expense deleted');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast('Could not delete expense', 'error')
  });
  const total = expenses.data?.reduce((sum, row) => sum + row.amount, 0) || 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Daily Expenses</h2><b>{pkr(total)}</b></div>
        <div className="space-y-2">
          {expenses.data?.map((expense) => (
            <div key={expense.id} className="flex min-h-14 items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800">
              <div><div className="font-medium capitalize">{expense.category}</div><div className="text-slate-500">{expense.description || 'No description'} - {date(expense.date)}</div></div>
              <div className="flex items-center gap-2">
                <b>{pkr(expense.amount)}</b>
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => setEditing(expense)}><Edit size={15} /></button>}
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Delete" onClick={() => setDeleting(expense)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
          {!expenses.data?.length && <div className="rounded-md border border-dashed p-5 text-center text-sm text-slate-500">No expenses found.</div>}
        </div>
      </section>
      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Expense</h2>
        <div className="grid gap-3">
          <select className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" {...register('category')}><option value="rent">Rent</option><option value="electricity">Electricity</option><option value="gas">Gas</option><option value="fuel">Fuel</option><option value="repairs">Repairs</option><option value="maintenance">Maintenance</option><option value="misc">Misc</option></select>
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="number" placeholder="Amount" {...register('amount', { valueAsNumber: true })} />
          <textarea className="rounded-md border bg-transparent p-3 dark:border-slate-700" placeholder="Description" {...register('description')} />
          <button className="touch rounded-md bg-orange-600 font-semibold text-white" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Record Expense'}</button>
        </div>
      </form>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Expense">
        <form className="grid gap-3" onSubmit={editForm.handleSubmit((data) => update.mutate(data))}>
          <select className="erp-input" {...editForm.register('category')}><option value="rent">Rent</option><option value="electricity">Electricity</option><option value="gas">Gas</option><option value="fuel">Fuel</option><option value="repairs">Repairs</option><option value="maintenance">Maintenance</option><option value="misc">Misc</option></select>
          <input className="erp-input" type="number" {...editForm.register('amount', { valueAsNumber: true })} />
          <textarea className="erp-input" {...editForm.register('description')} />
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} title={`Delete ${deleting?.category || 'Expense'}?`} isLoading={remove.isPending} />
    </div>
  );
}
