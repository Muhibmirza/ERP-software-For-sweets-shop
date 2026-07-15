import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap } from '../../api/client';
import { queryClient } from '../../queryClient';
import { formatCurrency } from '../../utils/format';

export default function JournalEntries() {
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([{ code: '1001', debit: 0, credit: 0, description: '' }, { code: '3002', debit: 0, credit: 0, description: '' }]);
  const entries = useQuery({ queryKey: ['journal-entries'], queryFn: () => unwrap<any[]>(api.get('/api/accounting/journal-entries')) });
  const create = useMutation({
    mutationFn: () => unwrap(api.post('/api/accounting/journal-entries', { description, lines })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
  });
  const updateLine = (index: number, key: string, value: string) => setLines((prev) => prev.map((line, i) => i === index ? { ...line, [key]: key === 'debit' || key === 'credit' ? Number(value) : value } : line));

  return (
    <section className="page-fade space-y-5">
      <div className="erp-page-header"><div><p className="erp-eyebrow">Accounting</p><h2 className="erp-title">Journal Entries</h2></div></div>
      <div className="erp-card p-5">
        <h3 className="mb-4 font-semibold">Manual Entry</h3>
        <input className="erp-input mb-3" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid gap-3">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-4">
              <input className="erp-input" value={line.code} onChange={(e) => updateLine(index, 'code', e.target.value)} placeholder="Account code" />
              <input className="erp-input" type="number" value={line.debit} onChange={(e) => updateLine(index, 'debit', e.target.value)} placeholder="Debit" />
              <input className="erp-input" type="number" value={line.credit} onChange={(e) => updateLine(index, 'credit', e.target.value)} placeholder="Credit" />
              <input className="erp-input" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} placeholder="Line note" />
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={() => create.mutate()} disabled={create.isPending}>Post Entry</button>
      </div>
      <div className="erp-card overflow-x-auto p-5">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="text-left text-[#6b7d78]"><th className="py-3">Entry No</th><th>Date</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
          <tbody>{(entries.data || []).map((entry) => (
            <tr key={entry.id} className="border-t border-[#ead8bb] odd:bg-[#fffaf0]/60 hover:bg-[#f7ead5]">
              <td className="py-3 font-semibold">{entry.entryNo}</td><td>{new Date(entry.date).toLocaleDateString()}</td><td>{entry.description}</td><td>{entry.referenceType}</td>
              <td>{formatCurrency(entry.lines.reduce((s: number, l: any) => s + l.debit, 0))}</td><td>{formatCurrency(entry.lines.reduce((s: number, l: any) => s + l.credit, 0))}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
