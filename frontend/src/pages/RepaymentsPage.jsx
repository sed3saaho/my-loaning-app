import React, { useState, useEffect } from 'react';
import { CreditCard, Search, PlusCircle, AlertOctagon, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, exportToCSV } from '../utils/formatters';

export const RepaymentsPage = ({ onOpenRecordPayment, onOpenReversal }) => {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPayments({ search, status: statusFilter });
      setPayments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchPayments, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleExport = () => {
    const exportData = payments.map(p => {
      const intAlloc = p.allocations.find(a => a.allocation_type === 'INTEREST')?.amount_allocated || 0;
      const princAlloc = p.allocations.find(a => a.allocation_type === 'PRINCIPAL')?.amount_allocated || 0;
      return {
        'Payment Reference': p.payment_reference,
        'Borrower': p.client_name,
        'Loan Reference': p.loan_reference,
        'Amount Received': p.amount_received,
        'Payment Date': p.payment_date,
        'Method': p.payment_method,
        'External Ref / M-Pesa Code': p.external_transaction_reference || '',
        'Interest Portion': intAlloc,
        'Principal Portion': princAlloc,
        'Status': p.reversal_status,
        'Recorded By': p.recorded_by
      };
    });
    exportToCSV(exportData, `payments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Repayment Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interest-first allocation • Immutable ledger • Audited corrections & reversals
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
            onClick={() => onOpenRecordPayment()}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <PlusCircle size={15} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment ref, client, or M-Pesa code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Payments</option>
            <option value="ACTIVE">Active (Valid)</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Borrower & Loan</th>
                <th className="py-3 px-4">Method & Code</th>
                <th className="py-3 px-4">Amount Received</th>
                <th className="py-3 px-4">Interest Portion</th>
                <th className="py-3 px-4">Principal Portion</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map(payment => {
                  const intAlloc = payment.allocations.find(a => a.allocation_type === 'INTEREST')?.amount_allocated || 0;
                  const princAlloc = payment.allocations.find(a => a.allocation_type === 'PRINCIPAL')?.amount_allocated || 0;
                  const isReversed = payment.reversal_status === 'REVERSED';

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isReversed ? 'opacity-60 bg-rose-50/20' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {payment.payment_reference}
                      </td>

                      <td className="py-3 px-4 text-slate-600">{formatDate(payment.payment_date)}</td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{payment.client_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{payment.loan_reference}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{payment.payment_method}</div>
                        {payment.external_transaction_reference ? (
                          <span className="font-mono text-[10px] text-slate-500 block">
                            Code: {payment.external_transaction_reference}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {formatKES(payment.amount_received)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-amber-700">
                        {formatKES(intAlloc)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-blue-700">
                        {formatKES(princAlloc)}
                      </td>

                      <td className="py-3 px-4">
                        {isReversed ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            REVERSED
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            POSTED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isReversed && (
                          <button
                            onClick={() => onOpenReversal(payment)}
                            className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1 ml-auto"
                            title="Reverse payment with reason"
                          >
                            <RotateCcw size={12} />
                            <span>Reverse</span>
                          </button>
                        )}
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

