import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, unwrap } from '../api/client';
import { useUiStore } from '../store/ui';
import type { RawMaterial, Supplier } from '../types';
import { date, pkr } from '../utils/format';

export default function Purchases() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { supplierId: '', rawMaterialId: '', quantity: 1, unitCost: 0, notes: '' } });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => unwrap<Supplier[]>(api.get('/api/suppliers')) });
  const raw = useQuery({ queryKey: ['raw-materials'], queryFn: () => unwrap<RawMaterial[]>(api.get('/api/raw-materials')) });
  const purchases = useQuery({ queryKey: ['purchases'], queryFn: () => unwrap<any[]>(api.get('/api/purchase-orders')) });
  const create = useMutation({
    mutationFn: (data: any) => unwrap<any>(api.post('/api/purchase-orders', { supplierId: data.supplierId, notes: data.notes, items: [{ rawMaterialId: data.rawMaterialId, quantity: Number(data.quantity), unitCost: Number(data.unitCost) }] })),
    onSuccess: () => {
      toast('Purchase received and stock updated');
      reset();
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
    }
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Purchase Orders</h2>
        <div className="space-y-3">
          {purchases.data?.map((po) => (
            <div key={po.id} className="flex min-h-14 items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800">
              <div><div className="font-medium">{po.supplier?.name}</div><div className="text-slate-500">{date(po.createdAt)} · {po.status}</div></div>
              <div className="font-semibold">{pkr(po.totalAmount)}</div>
            </div>
          ))}
        </div>
      </section>
      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Receive Stock</h2>
        <div className="grid gap-3">
          <select className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" {...register('supplierId', { required: true })}><option value="">Supplier</option>{suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" {...register('rawMaterialId', { required: true })}><option value="">Raw material</option>{raw.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="number" step="0.01" placeholder="Quantity" {...register('quantity')} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="number" step="0.01" placeholder="Unit cost" {...register('unitCost')} />
          <textarea className="rounded-md border bg-transparent p-3 dark:border-slate-700" placeholder="Notes" {...register('notes')} />
          <button className="touch rounded-md bg-orange-600 font-semibold text-white">Receive Stock</button>
        </div>
      </form>
    </div>
  );
}
