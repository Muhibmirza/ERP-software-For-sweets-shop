import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { useUiStore } from '../../store/ui';
import { date, dateTime, pkr } from '../../utils/format';

const tabs = ['Profile', 'Attendance', 'Salary', 'Short Term Advance (Kharchi)', 'Long Term Advance / Loan', 'Fines', 'Revisions', 'Ledger'];

export default function EmployeeDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useUiStore((state) => state.toast);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({ totalAmount: '', monthlyDeduction: '', startDate: new Date().toISOString().slice(0, 10), reason: '' });
  const employee = useQuery({ queryKey: ['employee-detail', id], queryFn: () => unwrap<any>(api.get(`/api/employees/${id}`)), enabled: Boolean(id) });
  const ledger = useQuery({ queryKey: ['employee-ledger', id], queryFn: () => unwrap<any>(api.get(`/api/employees/${id}/ledger`)), enabled: Boolean(id) });
  const data = employee.data;
  const createLoan = useMutation({
    mutationFn: () => unwrap(api.post('/api/loans', {
      employeeId: id,
      totalAmount: Number(loanForm.totalAmount || 0),
      monthlyDeduction: Number(loanForm.monthlyDeduction || 0),
      startDate: loanForm.startDate,
      reason: loanForm.reason
    })),
    onSuccess: () => {
      toast('Long term loan saved');
      setLoanOpen(false);
      setLoanForm({ totalAmount: '', monthlyDeduction: '', startDate: new Date().toISOString().slice(0, 10), reason: '' });
      queryClient.invalidateQueries({ queryKey: ['employee-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['employee-ledger', id] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not save loan', 'error')
  });

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-sm text-[#0f615d]" to="/staff"><ArrowLeft size={16} /> Back to Staff</Link>
          <p className="erp-eyebrow">HR</p>
          <h2 className="erp-title">{data?.name || 'Employee Detail'}</h2>
          {id && <Link className="mt-3 inline-flex rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700" to={`/hr/leave?employeeId=${id}`}>View / Manage Leaves</Link>}
        </div>
      </div>

      {employee.isLoading && <div className="erp-card p-5 text-sm text-[#6b7d78]">Loading employee...</div>}
      {data && (
        <div className="space-y-4">
          <div className="erp-card grid gap-3 p-5 md:grid-cols-4">
            <Info label="Father" value={data.fatherName || '-'} />
            <Info label="Department" value={data.department || '-'} />
            <Info label="Designation" value={data.designation || data.role || '-'} />
            <Info label="Status" value={data.status || (data.isActive ? 'ACTIVE' : 'LEFT')} />
          </div>

          <div className="grid gap-4">
            {tabs.map((tab) => (
              <div key={tab} className="erp-card p-5">
                <h3 className="mb-3 font-serif text-xl font-semibold text-[#0f615d]">{tab}</h3>
                {tab === 'Profile' && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Info label="Phone" value={data.phone || '-'} />
                    <Info label="CNIC" value={data.cnic || '-'} />
                    <Info label="Address" value={data.address || '-'} />
                    <Info label="Salary Type" value={data.salaryType || 'MONTHLY'} />
                    <Info label="Daily Wage" value={data.salaryType === 'DAILY' ? pkr(data.dailyWage || 0) : '-'} />
                    <Info label="Basic Salary" value={pkr(data.basicSalary || 0)} />
                    <Info label="Joining Date" value={date(data.joiningDate)} />
                    <Info label="Leaving Date" value={date(data.leavingDate)} />
                  </div>
                )}
                {tab === 'Attendance' && <SimpleTable rows={data.attendance || []} columns={[['Date', (r: any) => date(r.date)], ['Status', (r: any) => r.status], ['Check In', (r: any) => r.checkIn || '-'], ['Check Out', (r: any) => r.checkOut || '-']]} empty="No attendance marked." />}
                {tab === 'Salary' && <SimpleTable rows={data.salaries || []} columns={[['Month', (r: any) => `${r.month}/${r.year}`], ['Gross', (r: any) => pkr(r.grossWage || r.basicSalary || 0)], ['Net', (r: any) => pkr(r.netSalary || 0)], ['Status', (r: any) => r.isPaid ? 'Paid' : 'Unpaid']]} empty="No salaries generated." />}
                {tab === 'Short Term Advance (Kharchi)' && <><p className="mb-3 text-sm text-[#6b7d78]">Fully deducted from monthly salary.</p><SimpleTable rows={data.advances || []} columns={[['Date', (r: any) => date(r.advanceDate || r.date)], ['Amount', (r: any) => pkr(r.amount || 0)], ['Deducted', (r: any) => pkr(r.deductedAmount || r.recoveredAmount || 0)], ['Remaining', (r: any) => pkr(r.remainingBalance || 0)]]} empty="No short term advances." /></>}
                {tab === 'Long Term Advance / Loan' && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-[#6b7d78]">Fixed monthly deduction until cleared.</p>
                      <button className="btn-primary" type="button" onClick={() => setLoanOpen(true)}><Plus size={16} /> New Loan</button>
                    </div>
                    <LoanTable rows={data.loans || []} />
                  </div>
                )}
                {tab === 'Fines' && <SimpleTable rows={data.fines || []} columns={[['Date', (r: any) => date(r.date)], ['Amount', (r: any) => pkr(r.amount || 0)], ['Reason', (r: any) => r.reason || '-']]} empty="No fines." />}
                {tab === 'Revisions' && <SimpleTable rows={data.salaryRevisions || []} columns={[['Effective', (r: any) => date(r.effectiveDate)], ['Old Salary', (r: any) => pkr(r.oldSalary || 0)], ['New Salary', (r: any) => pkr(r.newSalary || 0)], ['Reason', (r: any) => r.reason || '-']]} empty="No revisions." />}
                {tab === 'Ledger' && (
                  <div>
                    <SimpleTable rows={ledger.data?.transactions || []} columns={[['Date', (r: any) => dateTime(r.date)], ['Description', (r: any) => r.description], ['Type', (r: any) => r.type], ['Amount', (r: any) => pkr(r.amount || 0)]]} empty="No ledger transactions." />
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                      <b>Total Debit: {pkr(ledger.data?.totalDebit || 0)}</b>
                      <b>Total Credit: {pkr(ledger.data?.totalCredit || 0)}</b>
                      <b>Balance: {pkr(ledger.data?.balance || 0)}</b>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Modal isOpen={loanOpen} onClose={() => setLoanOpen(false)} title="New Long Term Loan">
        <div className="space-y-3">
          <label className="grid gap-1 text-sm"><span>Total Loan Amount *</span><input className="erp-input" type="number" min="0" step="0.001" placeholder="Rs. 0.00" value={loanForm.totalAmount} onChange={(event) => setLoanForm({ ...loanForm, totalAmount: event.target.value })} /></label>
          <label className="grid gap-1 text-sm"><span>Monthly Deduction *</span><input className="erp-input" type="number" min="0" step="0.001" placeholder="Fixed amount deducted each month" value={loanForm.monthlyDeduction} onChange={(event) => setLoanForm({ ...loanForm, monthlyDeduction: event.target.value })} /></label>
          <label className="grid gap-1 text-sm"><span>Start Date *</span><input className="erp-input" type="date" value={loanForm.startDate} onChange={(event) => setLoanForm({ ...loanForm, startDate: event.target.value })} /></label>
          <label className="grid gap-1 text-sm"><span>Reason</span><input className="erp-input" placeholder="Reason" value={loanForm.reason} onChange={(event) => setLoanForm({ ...loanForm, reason: event.target.value })} /></label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" type="button" onClick={() => setLoanOpen(false)}>Cancel</button>
            <button className="btn-primary" type="button" disabled={createLoan.isPending || Number(loanForm.totalAmount || 0) <= 0 || Number(loanForm.monthlyDeduction || 0) <= 0} onClick={() => createLoan.mutate()}>{createLoan.isPending ? 'Saving...' : 'Add Loan'}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-[#6b7d78]">{label}</p><p className="font-semibold text-[#263c38]">{value}</p></div>;
}

function SimpleTable({ rows, columns, empty }: { rows: any[]; columns: [string, (row: any) => string][]; empty: string }) {
  if (!rows.length) return <div className="rounded-md border border-dashed border-[#dac197] p-4 text-center text-sm text-[#6b7d78]">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="text-left text-[#6b7d78]">{columns.map(([label]) => <th className="py-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60" key={row.id || index}>{columns.map(([label, render]) => <td className="py-2" key={label}>{render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function LoanTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <div className="rounded-md border border-dashed border-[#dac197] p-4 text-center text-sm text-[#6b7d78]">No long term advances or loans.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="text-left text-[#6b7d78]"><th className="py-2">Start</th><th>Total</th><th>Monthly Deduction</th><th>Remaining</th><th>Status</th><th>Progress</th></tr></thead>
        <tbody>
          {rows.map((row: any) => {
            const total = Number(row.totalAmount || 0);
            const remaining = Number(row.remainingBalance || 0);
            const paid = Math.max(total - remaining, 0);
            const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            return (
              <tr className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60" key={row.id}>
                <td className="py-2">{date(row.startDate)}</td>
                <td>{pkr(total)}</td>
                <td>{pkr(row.monthlyDeduction || 0)}</td>
                <td className="font-bold">{pkr(remaining)}</td>
                <td>{row.isCleared || remaining <= 0 ? 'Cleared' : 'Open'}</td>
                <td>
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-[#ead8bb]">
                    <div className="h-full rounded-full bg-[#0f615d]" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-xs text-[#6b7d78]">{percent}% recovered</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
