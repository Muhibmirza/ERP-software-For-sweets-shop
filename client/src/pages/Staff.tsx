import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api, unwrap } from '../api/client';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Modal } from '../components/ui/Modal';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Employee } from '../types';
import { date, pkr } from '../utils/format';
import { canEditDelete } from '../utils/permissions';

export default function Staff() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((state) => state.user);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const defaultEmployeeForm = { name: '', fatherName: '', phone: '', cnic: '', department: '', designation: 'Helper', role: 'Helper', salaryType: 'MONTHLY', dailyWage: '', basicSalary: 18000, joiningDate: new Date().toISOString().slice(0, 10) };
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: defaultEmployeeForm });
  const editForm = useForm({
    values: editing ? { ...editing, designation: editing.designation || editing.role, salaryType: editing.salaryType || 'MONTHLY', joiningDate: editing.joiningDate.slice(0, 10) } : defaultEmployeeForm
  });
  const salaryType = watch('salaryType');
  const editingSalaryType = editForm.watch('salaryType');
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => unwrap<Employee[]>(api.get('/api/employees')) });
  const create = useMutation({
    mutationFn: (data: any) => unwrap<Employee>(api.post('/api/employees', data)),
    onSuccess: () => {
      toast('Employee saved');
      reset(defaultEmployeeForm);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });
  const update = useMutation({
    mutationFn: (data: any) => unwrap<Employee>(api.put(`/api/employees/${editing!.id}`, data)),
    onSuccess: () => {
      toast('Employee updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast('Could not update employee', 'error')
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => unwrap<Employee>(api.patch(`/api/employees/${id}/status`, { status: 'LEFT', leavingDate: new Date().toISOString().slice(0, 10) })),
    onSuccess: () => {
      toast('Employee deactivated');
      setDeactivating(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast('Could not deactivate employee', 'error')
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/employees/${id}`)),
    onSuccess: () => {
      toast('Employee deleted permanently');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not delete employee', 'error')
  });
  const mark = useMutation({
    mutationFn: ({ employeeId, status }: { employeeId: string; status: string }) => unwrap<any>(api.post('/api/attendance', { employeeId, status, date: attendanceDate })),
    onSuccess: () => {
      toast('Attendance marked');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Employees</h2>
            <p className="text-sm text-slate-500">Attendance Date: {date(attendanceDate)}</p>
          </div>
          <input className="erp-input max-w-56" type="date" value={attendanceDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setAttendanceDate(event.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {employees.data?.map((employee) => (
            <div key={employee.id} className="rounded-md border p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-medium">{employee.name}</div><div className="text-sm text-slate-500">{employee.designation || employee.role} {employee.department ? `- ${employee.department}` : ''}</div></div>
                <span className={`rounded-md px-2 py-1 text-xs ${employee.status !== 'LEFT' && employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{employee.status || (employee.isActive ? 'ACTIVE' : 'LEFT')}</span>
              </div>
              <div className="mt-2 text-sm">{employee.salaryType === 'DAILY' ? `${pkr(employee.dailyWage || 0)} / day` : pkr(employee.basicSalary)} - Joined {date(employee.joiningDate)}</div>
              <div className="mt-3 flex justify-end gap-2">
                <Link className="grid h-8 place-items-center rounded-md border border-slate-200 px-3 text-xs text-slate-700" to={`/hr/employees/${employee.id}`}>View</Link>
                <Link className="grid h-8 place-items-center rounded-md border border-emerald-200 px-3 text-xs text-emerald-700" to={`/leave?employeeId=${employee.id}`}>Leave</Link>
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => setEditing(employee)}><Edit size={15} /></button>}
                {canEditDelete(user?.role) && employee.isActive && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Deactivate" onClick={() => setDeactivating(employee)}><UserX size={15} /></button>}
                {canEditDelete(user?.role) && <button className="grid h-8 w-8 place-items-center rounded-md border border-red-300 text-red-800" title="Delete permanently" onClick={() => setDeleting(employee)}><Trash2 size={15} /></button>}
              </div>
              <div className="mt-3 rounded-md bg-[#fff4df] px-2 py-1 text-xs font-semibold text-[#0f615d]">
                Mark attendance for {date(attendanceDate)}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'].map((status) => <button key={status} className="touch rounded-md border text-[11px] dark:border-slate-700" onClick={() => mark.mutate({ employeeId: employee.id, status })}>{status.replace('_', ' ')}</button>)}
              </div>
            </div>
          ))}
          {!employees.data?.length && <div className="rounded-md border border-dashed p-5 text-center text-sm text-slate-500">No employees found.</div>}
        </div>
      </section>
      <form onSubmit={handleSubmit((data) => create.mutate(data))} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Employee</h2>
        <div className="grid gap-3">
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Name" {...register('name', { required: true })} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Father name" {...register('fatherName')} />
          <label className="grid gap-1 text-sm">
            <span>Phone <small className="text-slate-500">(Optional)</small></span>
            <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Phone" {...register('phone')} />
          </label>
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="CNIC" {...register('cnic')} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Department" {...register('department')} />
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" placeholder="Designation" {...register('designation')} />
          <select className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" {...register('salaryType')}><option value="MONTHLY">Monthly salary</option><option value="DAILY">Daily wage</option></select>
          {salaryType === 'DAILY'
            ? <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="number" placeholder="Daily wage" {...register('dailyWage')} />
            : <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="number" placeholder="Basic salary" {...register('basicSalary', { valueAsNumber: true })} />}
          <input className="touch rounded-md border bg-transparent px-3 dark:border-slate-700" type="date" {...register('joiningDate')} />
          <button className="touch rounded-md bg-orange-600 font-semibold text-white" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Employee'}</button>
        </div>
      </form>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing?.name || 'Employee'}`}>
        <form className="grid gap-3" onSubmit={editForm.handleSubmit((data) => update.mutate(data))}>
          <input className="erp-input" placeholder="Name" {...editForm.register('name', { required: true })} />
          <input className="erp-input" placeholder="Father name" {...editForm.register('fatherName')} />
          <label className="grid gap-1 text-sm"><span>Phone <small className="text-slate-500">(Optional)</small></span><input className="erp-input" placeholder="Phone" {...editForm.register('phone')} /></label>
          <input className="erp-input" placeholder="CNIC" {...editForm.register('cnic')} />
          <input className="erp-input" placeholder="Department" {...editForm.register('department')} />
          <input className="erp-input" placeholder="Designation" {...editForm.register('designation')} />
          <select className="erp-input" {...editForm.register('salaryType')}><option value="MONTHLY">Monthly salary</option><option value="DAILY">Daily wage</option></select>
          {editingSalaryType === 'DAILY'
            ? <input className="erp-input" type="number" placeholder="Daily wage" {...editForm.register('dailyWage')} />
            : <input className="erp-input" type="number" placeholder="Basic salary" {...editForm.register('basicSalary', { valueAsNumber: true })} />}
          <input className="erp-input" type="date" {...editForm.register('joiningDate')} />
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={Boolean(deactivating)} onClose={() => setDeactivating(null)} onConfirm={() => deactivating && deactivate.mutate(deactivating.id)} title={`Deactivate ${deactivating?.name || 'Employee'}?`} message="This employee will be marked inactive." confirmLabel="Deactivate" isLoading={deactivate.isPending} />
      <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} title={`Delete Employee: ${deleting?.name || ''}?`} message="This will permanently remove the employee record. Attendance, salary, advances, loans, fines, leaves, and revisions will also be deleted. This action cannot be undone." confirmLabel="Delete Permanently" isLoading={remove.isPending} />
    </div>
  );
}
