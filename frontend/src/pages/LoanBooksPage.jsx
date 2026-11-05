import React, { useState, useEffect } from 'react';
import { BookOpen, Search, PlusCircle, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';

export const LoanBooksPage = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getBookReferences({ search });
      setRecords(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchRecords, 200);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Physical Loan Book Records</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Cross-reference digital records with original handwritten office books & pages
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Book # (e.g. Book 01), Page #, or Client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Book Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Book Number</th>
                <th className="py-3 px-4">Page Number</th>
                <th className="py-3 px-4">Linked Borrower</th>
                <th className="py-3 px-4">Linked Loan</th>
                <th className="py-3 px-4">Date Recorded</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading book index...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">No physical book references found.</td>
                </tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{rec.book_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{rec.page_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{rec.client_name}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700">{rec.loan_reference || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(rec.date_recorded)}</td>
                    <td className="py-3 px-4 text-slate-500">{rec.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

