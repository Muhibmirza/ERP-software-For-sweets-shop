import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, PackageMinus, PackagePlus, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { api, unwrap } from '../../api/client';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Modal } from '../../components/ui/Modal';
import { useUiStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import type { RawMaterial, Supplier, Unit } from '../../types';
import { pkr } from '../../utils/format';
import { canEditDelete } from '../../utils/permissions';
import { ALL_UNITS } from '../../constants/units';

type MaterialForm = {
  name: string;
  unit: Unit;
  currentStock: number | string;
  minStockLevel: number | string;
  costPerUnit: number | string;
  supplierId: string;
};

type StockForm = {
  quantity: number | string;
  reason: string;
  batchNumber?: string;
  expiryDate?: string;
  date?: string;
};

const blankMaterial: MaterialForm = {
  name: '',
  unit: 'KG',
  currentStock: '',
  minStockLevel: '',
  costPerUnit: '',
  supplierId: ''
};

const datetimeLocalNow = () => new Date().toISOString().slice(0, 16);

export default function RawMaterials() {
  const queryClient = useQueryClient();
  const toast = useUiStore((state) => state.toast);
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);
  const [stockTarget, setStockTarget] = useState<{ material: RawMaterial; mode: 'in' | 'out' } | null>(null);

  const materials = useQuery({
    queryKey: ['raw-materials', search, lowOnly],
    queryFn: () => unwrap<RawMaterial[]>(api.get('/api/raw-materials', { params: { search, lowStock: lowOnly || undefined } }))
  });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => unwrap<Supplier[]>(api.get('/api/suppliers')) });

  const materialForm = useForm<MaterialForm>({ defaultValues: blankMaterial });
  const stockForm = useForm<StockForm>({ defaultValues: { quantity: '', reason: '', batchNumber: '', expiryDate: '', date: datetimeLocalNow() } });
  const isEdit = Boolean(editing?.id);

  const closeMaterialModal = () => {
    setEditing(null);
    materialForm.reset(blankMaterial);
  };

  const openCreate = () => {
    setEditing({ id: '', name: '', unit: 'KG', currentStock: 0, minStockLevel: 10, costPerUnit: 0 } as RawMaterial);
    materialForm.reset(blankMaterial);
  };

  const openEdit = (material: RawMaterial) => {
    setEditing(material);
    materialForm.reset({
      name: material.name,
      unit: material.unit,
      currentStock: material.currentStock,
      minStockLevel: material.minStockLevel,
      costPerUnit: material.costPerUnit,
      supplierId: material.supplier?.id || ''
    });
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['raw-materials'] });

  const saveMaterial = useMutation({
    mutationFn: (data: MaterialForm) => {
      const payload = { ...data, supplierId: data.supplierId || null };
      return editing?.id
        ? unwrap<RawMaterial>(api.put(`/api/raw-materials/${editing.id}`, payload))
        : unwrap<RawMaterial>(api.post('/api/raw-materials', payload));
    },
    onSuccess: () => {
      toast(editing?.id ? 'Raw material updated' : 'Raw material added');
      closeMaterialModal();
      refresh();
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not save raw material', 'error')
  });

  const deleteMaterial = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/raw-materials/${id}`)),
    onSuccess: (data: any) => {
      toast(data?.message || 'Raw material deleted');
      setDeleteTarget(null);
      refresh();
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not delete raw material', 'error')
  });

  const saveStock = useMutation({
    mutationFn: (data: StockForm) => unwrap(api.post(`/api/raw-materials/${stockTarget!.material.id}/stock-${stockTarget!.mode}`, data)),
    onSuccess: () => {
      toast(stockTarget?.mode === 'in' ? 'Stock added' : 'Stock deducted');
      setStockTarget(null);
      stockForm.reset({ quantity: '', reason: '', batchNumber: '', expiryDate: '', date: datetimeLocalNow() });
      refresh();
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not update stock', 'error')
  });

  const rows = useMemo(() => materials.data || [], [materials.data]);

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header">
        <div>
          <p className="erp-eyebrow">Inventory</p>
          <h2 className="erp-title">Raw Materials</h2>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Material</button>
      </div>

      <div className="erp-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[#dac197] bg-white/75 px-3">
            <Search size={18} />
            <input className="w-full bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by material name or supplier..." />
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dac197] bg-white/75 px-3 text-sm font-semibold text-[#0f615d]">
            <input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />
            Low stock only
          </label>
        </div>
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-[#fff4df] text-left text-[#6b7d78]">
                <th className="px-4 py-3">Name</th>
                <th>Unit</th>
                <th>Current Stock</th>
                <th>Min Level</th>
                <th>Cost/Unit</th>
                <th>Supplier</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.isLoading ? Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-t border-[#ead8bb]"><td className="px-4 py-4" colSpan={8}><div className="h-4 animate-pulse rounded bg-[#ead8bb]" /></td></tr>
              )) : rows.length ? rows.map((material) => (
                <tr key={material.id} className={`border-t border-[#ead8bb] ${material.isLow ? 'bg-red-50/70' : 'odd:bg-[#fffaf0]/60'} hover:bg-[#f7ead5]`}>
                  <td className="px-4 py-3 font-semibold">{material.name}</td>
                  <td>{material.unit}</td>
                  <td>{material.currentStock}</td>
                  <td>{material.minStockLevel}</td>
                  <td>{pkr(material.costPerUnit)}</td>
                  <td>{material.supplier?.name || '-'}</td>
                  <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${material.isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{material.isLow ? 'Low' : 'OK'}</span></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => openEdit(material)}><Edit size={15} /></button>}
                      <button className="grid h-8 w-8 place-items-center rounded-md border border-emerald-200 text-emerald-700" title="Stock in" onClick={() => { stockForm.reset({ quantity: '', reason: '', batchNumber: '', expiryDate: '', date: datetimeLocalNow() }); setStockTarget({ material, mode: 'in' }); }}><PackagePlus size={15} /></button>
                      <button className="grid h-8 w-8 place-items-center rounded-md border border-amber-200 text-amber-700" title="Stock out" onClick={() => { stockForm.reset({ quantity: '', reason: '', batchNumber: '', expiryDate: '', date: datetimeLocalNow() }); setStockTarget({ material, mode: 'out' }); }}><PackageMinus size={15} /></button>
                      {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Delete" onClick={() => setDeleteTarget(material)}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-4 py-12 text-center text-[#6b7d78]" colSpan={8}>{search ? `No results for "${search}"` : 'No raw materials found'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={Boolean(editing)} onClose={closeMaterialModal} title={isEdit ? 'Edit Raw Material' : 'Add Raw Material'} size="lg">
        <form className="grid gap-4" onSubmit={materialForm.handleSubmit((data) => saveMaterial.mutate(data))}>
          <Field label="Name" required error={materialForm.formState.errors.name?.message}>
            <input className="erp-input" {...materialForm.register('name', { required: 'Name is required' })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Unit" required>
              <select className="erp-input" {...materialForm.register('unit', { required: true })}>{ALL_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select>
            </Field>
            <Field label="Current Stock" error={materialForm.formState.errors.currentStock?.message}>
              <input className="erp-input" type="number" step="0.001" min="0" disabled={isEdit} {...materialForm.register('currentStock', { valueAsNumber: true })} />
            </Field>
            <Field label="Min Stock Level" required>
              <input className="erp-input" type="number" step="0.001" min="0" {...materialForm.register('minStockLevel', { valueAsNumber: true, min: 0 })} />
            </Field>
            <Field label="Cost Per Unit (PKR)" required error={materialForm.formState.errors.costPerUnit?.message}>
              <input className="erp-input" type="number" {...materialForm.register('costPerUnit', { valueAsNumber: true, min: { value: 1, message: 'Cost must be greater than 0' } })} />
            </Field>
          </div>
          <Field label="Supplier">
            <select className="erp-input" {...materialForm.register('supplierId')}>
              <option value="">No supplier</option>
              {suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={closeMaterialModal}>Cancel</button>
            <button className="btn-primary" disabled={saveMaterial.isPending}>{saveMaterial.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMaterial.mutate(deleteTarget.id)}
        title={`Delete ${deleteTarget?.name || 'Raw Material'}?`}
        message="This action cannot be undone. The material will be hidden from active lists."
        isLoading={deleteMaterial.isPending}
      />

      <Modal isOpen={Boolean(stockTarget)} onClose={() => setStockTarget(null)} title={`${stockTarget?.mode === 'in' ? 'Stock In' : 'Stock Out'} - ${stockTarget?.material.name || ''}`} size="md">
        <form className="grid gap-4" onSubmit={stockForm.handleSubmit((data) => saveStock.mutate(data))}>
          <Field label="Quantity" required error={stockForm.formState.errors.quantity?.message}>
            <input className="erp-input" type="number" step="0.001" min="0" max={stockTarget?.mode === 'out' ? stockTarget.material.currentStock : undefined} {...stockForm.register('quantity', { valueAsNumber: true, min: { value: 0.001, message: 'Quantity is required' } })} />
          </Field>
          <Field label="Reason" required={stockTarget?.mode === 'out'} error={stockForm.formState.errors.reason?.message}>
            <input className="erp-input" {...stockForm.register('reason', { required: stockTarget?.mode === 'out' ? 'Reason is required' : false })} />
          </Field>
          {stockTarget?.mode === 'in' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Batch Number"><input className="erp-input" {...stockForm.register('batchNumber')} /></Field>
              <Field label="Expiry Date"><input className="erp-input" type="date" {...stockForm.register('expiryDate')} /></Field>
            </div>
          )}
          <Field label="Date & Time">
            <input className="erp-input" type="datetime-local" {...stockForm.register('date')} />
            <span className="mt-1 block text-xs text-slate-500">Defaults to now.</span>
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStockTarget(null)}>Cancel</button>
            <button className="btn-primary" disabled={saveStock.isPending}>{saveStock.isPending ? 'Saving...' : 'Submit'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#184b48]">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
