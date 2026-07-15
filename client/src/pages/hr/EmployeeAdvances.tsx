import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap } from '../../api/client';
import { queryClient } from '../../queryClient';
import { formatCurrency } from '../../utils/format';

export default function EmployeeAdvances() {
  const [form, setForm] = useState({ employeeId: '', amount: 0, reason: '' });
  const advances = useQuery({ queryKey: ['employee-advances'], queryFn: () => unwrap<any[]>(api.get('/api/advances')) });
  const employees = useQuery({ queryKey: ['employees-for-advance'], queryFn: () => unwrap<any[]>(api.get('/api/employees')) });
  const create = useMutation({ mutationFn: () => unwrap(api.post('/api/advances', form)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-advances'] }) });
  const recover = useMutation({ mutationFn: (advance: any) => unwrap(api.patch(`/api/advances/${advance.id}/recover`, { recoveredAmount: advance.amount })), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-advances'] }) });
  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">HR Finance</p><h2 className="erp-title">Employee Advances</h2></div></div>
      <div className="erp-card grid gap-3 p-5 md:grid-cols-5">
        <select className="erp-input md:col-span-2" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Employee</option>{(employees.data || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <input className="erp-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Amount" />
        <input className="erp-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason" />
        <button className="btn-primary" onClick={() => create.mutate()}>Give Advance</button>
      </div>
      <div className="erp-card overflow-x-auto p-5"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Employee</th><th>Amount</th><th>Recovered</th><th>Date</th><th>Action</th></tr></thead><tbody>
        {(advances.data || []).map((advance) => <tr key={advance.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]"><td className="py-3 font-semibold">{advance.employee?.name}</td><td>{formatCurrency(advance.amount)}</td><td>{advance.isRecovered ? formatCurrency(advance.recoveredAmount) : 'Pending'}</td><td>{new Date(advance.date).toLocaleDateString()}</td><td><button className="btn-secondary" onClick={() => recover.mutate(advance)}>Recover</button></td></tr>)}
      </tbody></table></div>
    </section>
  );
}
