import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { formatCurrency } from '../../utils/format';

export default function ChartOfAccounts() {
  const accounts = useQuery({ queryKey: ['chart-of-accounts'], queryFn: () => unwrap<any[]>(api.get('/api/accounting/chart-of-accounts')) });
  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Accounting</p><h2 className="erp-title">Chart of Accounts</h2></div></div>
      <div className="erp-card overflow-x-auto p-5">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Code</th><th>Name</th><th>Type</th><th>Sub Type</th><th>Status</th><th>Balance</th></tr></thead>
          <tbody>{(accounts.data || []).map((account) => (
            <tr key={account.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]">
              <td className="py-3 font-semibold">{account.code}</td><td>{account.name}</td><td>{account.type}</td><td>{account.subType || '-'}</td><td>{account.isActive ? 'Active' : 'Inactive'}</td><td>{formatCurrency(account.balance || 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
