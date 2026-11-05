import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, ArrowUpRight, ArrowDownRight, DollarSign, FileSpreadsheet, X, Filter } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, exportToCSV } from '../utils/formatters';

export const CashbookPage = () => {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    entry_type: 'CAPITAL_IN',
    category: 'Owner Capital',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entriesRes, summaryRes] = await Promise.all([
        api.getCashbookEntries({ entry_type: entryTypeFilter }),
        api.getCashbookSummary()
      ]);
      setEntries(entriesRes || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [entryTypeFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.addCashbookEntry({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setIsModalOpen(false);
      setFormData({
        entry_type: 'CAPITAL_IN',
        category: 'Owner Capital',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = () => {
    const exportData = entries.map(e => ({
      'Date': e.entry_date,
      'Type': e.entry_type,
      'Category': e.category || '',
      'Amount': e.amount,
      'Description': e.description,
      'Reference ID': e.reference_id || '',
      'Recorded By': e.recorded_by
    }));
    exportToCSV(exportData, `cashbook_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cashbook & Capital Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time liquid cash calculation • Capital introduced, disbursements, collections, and expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300 flex items-center space-x-1.5"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <PlusCircle size={15} />
            <span>Add Cash Entry</span>
          </button>
        </div>
      </div>

      {/* Financial Position Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-emerald-300 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Available Liquid Cash</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{formatKES(summary.available_cash)}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready for new disbursements</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Total Capital Injected</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatKES(summary.total_capital_introduced)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Owner equity & funding</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Total Disbursements</span>
            <p className="text-xl font-bold text-purple-900 mt-1">{formatKES(summary.total_loan_disbursements)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Loans issued</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Total Expenses</span>
            <p className="text-xl font-bold text-rose-700 mt-1">{formatKES(summary.total_expenses)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Operational outflows</p>
          </div>
        </div>
      )}

      {/* Filter by Type */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter size={15} className="text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Entries:</span>
        </div>
        <select
          value={entryTypeFilter}
          onChange={e => setEntryTypeFilter(e.target.value)}
          className="p-1.5 border rounded-lg bg-white"
        >
          <option value="ALL">All Movements</option>
          <option value="CAPITAL_IN">Capital In</option>
          <option value="LOAN_REPAYMENT">Loan Repayment (Collections)</option>
          <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
          <option value="EXPENSE">Expenses & Reversals</option>
          <option value="OTHER_INCOME">Other Income</option>
          <option value="CAPITAL_WITHDRAWAL">Capital Withdrawals</option>
        </select>
      </div>

      {/* Cashbook Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Cash Inflow</th>
                <th className="py-3 px-4">Cash Outflow</th>
                <th className="py-3 px-4">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">Loading cashbook...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No cashbook movements found.</td>
                </tr>
              ) : (
                entries.map(e => {
                  const isInflow = ['CAPITAL_IN', 'LOAN_REPAYMENT', 'OTHER_INCOME'].includes(e.entry_type);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600">{formatDate(e.entry_date)}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isInflow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {e.entry_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{e.category || '—'}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{e.description}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {isInflow ? `+${formatKES(e.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-700">
                        {!isInflow ? `-${formatKES(e.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {e.reference_id || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cashbook Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Cashbook Entry</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Movement Type</label>
                <select
                  value={formData.entry_type}
                  onChange={e => setFormData({ ...formData, entry_type: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="CAPITAL_IN">Capital In (Owner Injection)</option>
                  <option value="EXPENSE">Business Expense</option>
                  <option value="OTHER_INCOME">Other Income</option>
                  <option value="CAPITAL_WITHDRAWAL">Capital Withdrawal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Rent, Airtime, Utilities, Capital"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Amount (KES) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.entry_date}
                    onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Office internet bundle for March"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

