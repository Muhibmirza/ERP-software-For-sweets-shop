import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { queryClient } from '../../queryClient';

export default function LeaveManagement() {
  const [searchParams] = useSearchParams();
  const selectedEmployeeId = searchParams.get('employeeId') || '';
  const [form, setForm] = useState({ employeeId: '', leaveType: 'CASUAL', startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), reason: '' });
  const leaves = useQuery({ queryKey: ['leave-requests'], queryFn: () => unwrap<any[]>(api.get('/api/leave')) });
  const employees = useQuery({ queryKey: ['employees-for-leave'], queryFn: () => unwrap<any[]>(api.get('/api/employees')) });
  const create = useMutation({ mutationFn: () => unwrap(api.post('/api/leave', form)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }) });
  const update = useMutation({ mutationFn: ({ id, action }: any) => unwrap(api.patch(`/api/leave/${id}/${action}`, {})), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }) });
  useEffect(() => {
    if (selectedEmployeeId) setForm((current) => ({ ...current, employeeId: selectedEmployeeId }));
  }, [selectedEmployeeId]);
  const visibleLeaves = useMemo(() => selectedEmployeeId ? (leaves.data || []).filter((leave) => leave.employeeId === selectedEmployeeId) : (leaves.data || []), [leaves.data, selectedEmployeeId]);
  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">HR</p><h2 className="erp-title">Leave Management</h2></div></div>
      <div className="erp-card grid gap-3 p-5 md:grid-cols-6">
        <select className="erp-input md:col-span-2" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Employee</option>{(employees.data || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <select className="erp-input" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}><option>CASUAL</option><option>SICK</option><option>ANNUAL</option></select>
        <input className="erp-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input className="erp-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <button className="btn-primary" onClick={() => create.mutate()}>Request</button>
      </div>
      <div className="erp-card overflow-x-auto p-5"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {visibleLeaves.map((leave) => <tr key={leave.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]"><td className="py-3 font-semibold">{leave.employee?.name}</td><td>{leave.leaveType}</td><td>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</td><td>{leave.totalDays}</td><td>{leave.status}</td><td className="space-x-2"><button className="btn-secondary" onClick={() => update.mutate({ id: leave.id, action: 'approve' })}>Approve</button><button className="btn-secondary" onClick={() => update.mutate({ id: leave.id, action: 'reject' })}>Reject</button></td></tr>)}
      </tbody></table></div>
    </section>
  );
}
