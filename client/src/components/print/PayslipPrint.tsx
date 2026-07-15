import { DARBAR_SWEETS_LOGO_BASE64 } from '../../constants/logo';
import { pkr } from '../../utils/format';

export function PayslipPrint({ salary }: { salary: any }) {
  const employee = salary?.employee || {};
  const totalEarnings = (salary?.grossWage || 0) + (salary?.arrears || 0) + (salary?.bonus || salary?.bonuses || 0);
  const totalDeductions = (salary?.advanceDeduction || salary?.advances || 0) + (salary?.loanDeduction || 0) + (salary?.fineDeduction || 0) + (salary?.otherDeductions || salary?.deductions || 0);
  return (
    <div className="thermal-print">
      <div className="print-center"><img src={DARBAR_SWEETS_LOGO_BASE64} alt="Darbar Sweets" style={{ width: 64, height: 64, objectFit: 'contain' }} /><h2>SALARY SLIP</h2></div>
      <div className="print-line" />
      <div>Employee: {employee.name || '-'}</div>
      <div>CNIC: {employee.cnic || '-'}</div>
      <div>Father: {employee.fatherName || '-'}</div>
      <div>Dept: {employee.department || '-'}</div>
      <div>Desig: {employee.designation || employee.role || '-'}</div>
      <div>Month: {salary?.month}/{salary?.year}</div>
      <div className="print-line" />
      <div>Salary Type: {salary?.salaryType || employee.salaryType || 'MONTHLY'}</div>
      <div>Working Days: {salary?.workingDays || '-'}</div>
      <div>Daily Rate: {salary?.dailyWage ? pkr(salary.dailyWage) : '-'}</div>
      <div className="print-line" />
      <h3>EARNINGS</h3>
      <div className="print-row"><span>Gross Wage</span><span>{pkr(salary?.grossWage || salary?.basicSalary || 0)}</span></div>
      <div className="print-row"><span>Arrears</span><span>{pkr(salary?.arrears || 0)}</span></div>
      <div className="print-row"><span>Bonus</span><span>{pkr(salary?.bonus || salary?.bonuses || 0)}</span></div>
      <div className="print-row"><b>Total Earnings</b><b>{pkr(totalEarnings)}</b></div>
      <div className="print-line" />
      <h3>DEDUCTIONS</h3>
      <div className="print-row"><span>Advance</span><span>{pkr(salary?.advanceDeduction || salary?.advances || 0)}</span></div>
      <div className="print-row"><span>Loan</span><span>{pkr(salary?.loanDeduction || 0)}</span></div>
      <div className="print-row"><span>Fine</span><span>{pkr(salary?.fineDeduction || 0)}</span></div>
      <div className="print-row"><span>Other</span><span>{pkr(salary?.otherDeductions || salary?.deductions || 0)}</span></div>
      <div className="print-row"><b>Total Deductions</b><b>{pkr(totalDeductions)}</b></div>
      <div className="print-line" />
      <div className="print-row print-total"><span>NET PAYABLE</span><span>{pkr(salary?.netSalary || 0)}</span></div>
      <div>Payment Method: {salary?.paymentMethod || '-'}</div>
      <div>Remarks: {salary?.remarks || '-'}</div>
      <div className="print-line" />
      <div>Authorized: ______________</div>
    </div>
  );
}
