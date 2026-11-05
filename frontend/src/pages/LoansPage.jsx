import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Banknote, Search, PlusCircle, CreditCard, RefreshCw, FileSpreadsheet, AlertTriangle, Calendar } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, getStatusBadge, exportToCSV } from '../utils/formatters';

export const LoansPage = ({ onOpenNewLoan, onOpenRecordPayment, onOpenRollover }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || searchParams.get('due_filter') || 'ALL');
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      let params = { search };

      if (['ACTIVE', 'MATURED', 'AWAITING_ROLLOVER', 'ROLLED_OVER', 'FULLY_PAID'].includes(activeTab)) {
        params.status = activeTab;
      } else if (['due_today', 'overdue', 'due_soon'].includes(activeTab)) {
        params.due_filter = activeTab;
      }

      const data = await api.getLoans(params);
      setLoans(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLoans, 200);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const handleExport = () => {
    const exportData = loans.map(l => ({
      'Loan Reference': l.loan_reference,
      'Borrower': l.client_name,
      'Client Number': l.client_number,
      'Principal': l.principal_amount,
      'Interest Rate': `${l.interest_rate}%`,
      'Interest Amount': l.interest_amount,
      'Scheduled Total': l.scheduled_total,
      'Outstanding Principal': l.outstanding_principal,
      'Outstanding Interest': l.outstanding_interest,
      'Total Due': parseFloat(l.outstanding_principal) + parseFloat(l.outstanding_interest),
      'Disbursed Date': l.disbursement_date,
      'Maturity Date': l.maturity_date,
      'Days Overdue': l.days_overdue,
      'Status': l.loan_status,
      'Book Number': l.book_number || '',
      'Page Number': l.page_number || ''
    }));
    exportToCSV(exportData, `loans_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const tabs = [
    { id: 'ALL', label: 'All Cycles' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'due_today', label: 'Due Today' },
    { id: 'due_soon', label: 'Due Soon (5 Days)' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'MATURED', label: 'Matured' },
    { id: 'ROLLED_OVER', label: 'Rolled Over' },
    { id: 'FULLY_PAID', label: 'Fully Settled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Flat 20% interest cycles • 30 calendar days duration • Strict ledger allocation
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
            onClick={() => onOpenNewLoan()}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <PlusCircle size={15} />
            <span>Issue Loan</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams(tab.id === 'ALL' ? {} : { filter: tab.id });
              }}
              className={`px-3.5 py-2 font-semibold whitespace-nowrap rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white border-t border-x border-slate-200 text-emerald-700 shadow-2xs -mb-px'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by loan ref, borrower name, book or page..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Loan Reference</th>
                <th className="py-3 px-4">Borrower Details</th>
                <th className="py-3 px-4">Terms</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Scheduled Total</th>
                <th className="py-3 px-4">Remaining Balances</th>
                <th className="py-3 px-4">Book/Page</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading loan records...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No loans found matching the current filter.
                  </td>
                </tr>
              ) : (
                loans.map(loan => {
                  const badge = getStatusBadge(loan.loan_status);
                  const totalRemaining = parseFloat(loan.outstanding_principal) + parseFloat(loan.outstanding_interest);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {loan.loan_reference}
                        {loan.parent_loan_id && (
                          <span className="block text-[10px] text-purple-600 font-normal">
                            (Rollover Cycle)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div
                          onClick={() => navigate(`/clients/${loan.client_id}`)}
                          className="font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer"
                        >
                          {loan.client_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{loan.client_number}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{formatKES(loan.principal_amount)}</div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          {loan.interest_rate}% ({formatKES(loan.interest_amount)})
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div>Due: <strong className="text-slate-800">{formatDate(loan.maturity_date)}</strong></div>
                        <div className="text-[10px] text-slate-400">Disbursed: {formatDate(loan.disbursement_date)}</div>
                        {loan.days_overdue > 0 && totalRemaining > 0 && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 mt-0.5">
                            {loan.days_overdue}d overdue
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatKES(loan.scheduled_total)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{formatKES(totalRemaining)}</div>
                        <div className="text-[10px] text-slate-500">
                          Princ: {formatKES(loan.outstanding_principal)} • Int: {formatKES(loan.outstanding_interest)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {loan.book_number || loan.page_number ? (
                          <span>{loan.book_number || '—'} / {loan.page_number || '—'}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {totalRemaining > 0 && (
                          <button
                            onClick={() => onOpenRecordPayment(loan.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs"
                          >
                            Pay
                          </button>
                        )}
                        {['MATURED', 'AWAITING_ROLLOVER'].includes(loan.loan_status) && parseFloat(loan.outstanding_principal) > 0 && (
                          <button
                            onClick={() => onOpenRollover(loan.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-2xs"
                          >
                            Rollover
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

