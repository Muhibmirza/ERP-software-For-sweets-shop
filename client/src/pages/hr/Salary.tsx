import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { api, unwrap } from '../../api/client';
import { PayslipPrint } from '../../components/print/PayslipPrint';
import { queryClient } from '../../queryClient';
import { useUiStore } from '../../store/ui';
import { pkr } from '../../utils/format';
import { silentPrint } from '../../utils/print';

const current = new Date();

export default function SalaryPage() {
  const toast = useUiStore((state) => state.toast);
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => unwrap<any[]>(api.get('/api/employees?isActive=true')) });
  const productionOrders = useQuery({ queryKey: ['production-orders-for-salary'], queryFn: () => unwrap<any[]>(api.get('/api/production')) });
  const salaries = useQuery({ queryKey: ['salaries'], queryFn: () => unwrap<any[]>(api.get('/api/salary')) });
  const [form, setForm] = useState<any>({
    employeeId: '',
    month: current.getMonth() + 1,
    year: current.getFullYear(),
    workingDays: '',
    arrears: '',
    bonus: '',
    advanceDeduction: '',
    loanDeduction: '',
    fineDeduction: '',
    otherDeductions: '',
    paymentMethod: 'Cash',
    remarks: '',
    linkedProductionOrderId: ''
  });
  const employee = (employees.data || []).find((item) => item.id === form.employeeId);
  const monthlyAttendance = useQuery({
    queryKey: ['monthly-attendance', form.employeeId, form.month, form.year],
    queryFn: () => unwrap<any>(api.get(`/api/attendance/monthly?employeeId=${form.employeeId}&month=${form.month}&year=${form.year}`)),
    enabled: Boolean(form.employeeId && form.month && form.year)
  });
  const advances = useQuery({
    queryKey: ['employee-advances-for-salary', form.employeeId],
    queryFn: () => unwrap<any[]>(api.get(`/api/advances/employee/${form.employeeId}`)),
    enabled: Boolean(form.employeeId)
  });
  const loans = useQuery({
    queryKey: ['employee-loans-for-salary', form.employeeId],
    queryFn: () => unwrap<any[]>(api.get(`/api/employees/${form.employeeId}/loans`)),
    enabled: Boolean(form.employeeId)
  });
  const outstandingAdvance = (advances.data || []).reduce((sum, advance) => sum + Number(advance.remainingBalance || 0), 0);
  const monthlyLoanDeduction = (loans.data || [])
    .filter((loan) => !loan.isCleared && Number(loan.remainingBalance || 0) > 0)
    .reduce((sum, loan) => sum + Math.min(Number(loan.remainingBalance || 0), Number(loan.monthlyDeduction || 0)), 0);

  useEffect(() => {
    const attendance = monthlyAttendance.data?.attendance || [];
    if (!attendance.length) return;
    const workingDays = attendance.reduce((sum: number, row: any) => {
      if (row.status === 'PRESENT' || row.status === 'LEAVE') return sum + 1;
      if (row.status === 'HALF_DAY') return sum + 0.5;
      return sum;
    }, 0);
    setForm((prev: any) => ({ ...prev, workingDays: String(workingDays) }));
  }, [monthlyAttendance.data]);

  useEffect(() => {
    if (!form.employeeId) return;
    setForm((prev: any) => ({ ...prev, advanceDeduction: outstandingAdvance ? String(outstandingAdvance) : '' }));
  }, [form.employeeId, outstandingAdvance]);
  useEffect(() => {
    if (!form.employeeId) return;
    setForm((prev: any) => ({ ...prev, loanDeduction: monthlyLoanDeduction ? String(monthlyLoanDeduction) : '' }));
  }, [form.employeeId, monthlyLoanDeduction]);
  const preview = useMemo(() => {
    if (!employee) return null;
    const grossWage = employee.salaryType === 'DAILY'
      ? Number(form.workingDays || 0) * Number(employee.dailyWage || 0)
      : Number(employee.basicSalary || 0);
    const netSalary = grossWage
      + Number(form.arrears || 0)
      + Number(form.bonus || 0)
      - Number(form.advanceDeduction || 0)
      - Number(form.loanDeduction || 0)
      - Number(form.fineDeduction || 0)
      - Number(form.otherDeductions || 0);
    return { employee, grossWage, netSalary };
  }, [employee, form]);

  const generate = useMutation({
    mutationFn: () => unwrap<any>(api.post('/api/salary/generate', form)),
    onSuccess: () => {
      toast('Salary generated');
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['employee-loans-for-salary', form.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail', form.employeeId] });
    },
    onError: (error: any) => toast(error?.response?.data?.message || 'Could not generate salary', 'error')
  });

  const set = (key: string, value: string) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const printPayslip = async (salaryId: string) => {
    try {
      const data = await unwrap<any>(api.get(`/api/salary/${salaryId}/payslip`));
      const printableSalary = { ...data.salary, employee: data.employee };
      silentPrint(renderToStaticMarkup(<PayslipPrint salary={printableSalary} employeeLoan={data.loan} />));
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Could not load payslip', 'error');
    }
  };

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">HR</p><h2 className="erp-title">Salary Generation</h2></div></div>
      <div className="erp-card p-4 text-sm text-[#6b7d78]">
        <b className="text-[#0f615d]">Salary formula:</b> Daily wage = Present Days x Daily Rate. Monthly = (Present Days + Approved Leave Days) x per-day rate. Net Payable = Gross + Arrears + Bonus - Short Term Advance (Kharchi) - Long Term Advance Deduction - Fine / Penalty - Other Deductions.
      </div>
      <div className="erp-card grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold text-[#0f615d]">Employee</span><select className="erp-input" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}><option value="">Select employee</option>{(employees.data || []).map((emp) => <option key={emp.id} value={emp.id}>{emp.name} - {emp.salaryType || 'MONTHLY'}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-semibold text-[#0f615d]">Month / Year</span><div className="grid grid-cols-2 gap-2"><input className="erp-input" type="number" min="1" max="12" value={form.month} onChange={(e) => set('month', e.target.value)} /><input className="erp-input" type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></div></label>
          {employee?.salaryType === 'DAILY' ? (
            <>
              <label><span className="mb-1 block text-sm font-semibold text-[#0f615d]">Working Days</span><input className="erp-input" type="number" step="0.5" min="0" value={form.workingDays} onChange={(e) => set('workingDays', e.target.value)} /></label>
              <Info label="Daily Wage Rate" value={pkr(employee?.dailyWage || 0)} />
            </>
          ) : (
            <>
              <Info label="Basic Salary" value={pkr(employee?.basicSalary || 0)} />
              <label><span className="mb-1 block text-sm font-semibold text-[#0f615d]">Present Days</span><input className="erp-input" type="number" step="0.5" min="0" value={form.workingDays} onChange={(e) => set('workingDays', e.target.value)} /></label>
            </>
          )}
          <input className="erp-input" type="number" placeholder="Arrears" value={form.arrears} onChange={(e) => set('arrears', e.target.value)} />
          <input className="erp-input" type="number" placeholder="Bonus" value={form.bonus} onChange={(e) => set('bonus', e.target.value)} />
          <input className="erp-input" type="number" placeholder="Short Term Advance (Kharchi)" value={form.advanceDeduction} onChange={(e) => set('advanceDeduction', e.target.value)} />
          {employee && <div className="rounded-lg border border-[#ead8bb] bg-white/70 px-3 py-2 text-sm text-[#6b7d78]">Outstanding advance: <b>{pkr(outstandingAdvance)}</b> — deducting <b>{pkr(Number(form.advanceDeduction || 0))}</b> this month</div>}
          <input className="erp-input" type="number" placeholder="Long Term Advance Deduction" value={form.loanDeduction} onChange={(e) => set('loanDeduction', e.target.value)} />
          {employee && <div className="rounded-lg border border-[#ead8bb] bg-white/70 px-3 py-2 text-sm text-[#6b7d78]">Long term monthly deduction: <b>{pkr(monthlyLoanDeduction)}</b> — deducting <b>{pkr(Number(form.loanDeduction || 0))}</b> this month</div>}
          <input className="erp-input" type="number" placeholder="Fine / penalty" value={form.fineDeduction} onChange={(e) => set('fineDeduction', e.target.value)} />
          <input className="erp-input" type="number" placeholder="Other deductions" value={form.otherDeductions} onChange={(e) => set('otherDeductions', e.target.value)} />
          <select className="erp-input" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}><option>Cash</option><option>Bank</option></select>
          <select className="erp-input" value={form.linkedProductionOrderId} onChange={(e) => set('linkedProductionOrderId', e.target.value)}><option value="">Link to Production Order (optional)</option>{(productionOrders.data || []).map((order) => <option key={order.id} value={order.id}>{order.product?.name} - {new Date(order.productionDate).toLocaleDateString()}</option>)}</select>
          <input className="erp-input md:col-span-2" placeholder="Remarks" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </div>
        <div className="rounded-lg border border-[#dac197] bg-[#fffaf0] p-4">
          <h3 className="font-serif text-xl font-semibold text-[#0f615d]">Live Preview</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Gross Wage</span><b>{pkr(preview?.grossWage || 0)}</b></div>
            <div className="flex justify-between text-[#0f615d]"><span>Net Payable</span><b className="text-lg">{pkr(preview?.netSalary || 0)}</b></div>
          </div>
          <button className="btn-primary mt-5 w-full" disabled={!form.employeeId || generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? 'Generating...' : 'Generate Salary'}</button>
        </div>
      </div>
      <div className="erp-card overflow-x-auto p-5">
        <table className="w-full min-w-[780px] text-sm"><thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Employee</th><th>Month</th><th>Gross</th><th>Net</th><th>Status</th><th className="text-right">Print</th></tr></thead><tbody>
          {(salaries.data || []).map((salary) => <tr key={salary.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60"><td className="py-3 font-semibold">{salary.employee?.name}</td><td>{salary.month}/{salary.year}</td><td>{pkr(salary.grossWage || salary.basicSalary || 0)}</td><td>{pkr(salary.netSalary || 0)}</td><td>{salary.isPaid ? 'Paid' : 'Unpaid'}</td><td className="text-right"><button className="btn-secondary" onClick={() => printPayslip(salary.id)}><Printer size={16} /> Print</button></td></tr>)}
        </tbody></table>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#ead8bb] bg-white/70 px-3 py-2"><span className="text-xs font-semibold uppercase text-[#6b7d78]">{label}</span><p className="font-semibold text-[#0f615d]">{value}</p></div>;
}
