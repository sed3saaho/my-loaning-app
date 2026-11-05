import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Banknote, Calendar, CreditCard, RefreshCw, ArrowLeft,
  Printer, CheckCircle2, AlertTriangle, ShieldCheck, User
} from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, formatDateTime, getStatusBadge } from '../utils/formatters';

export const LoanDetailPage = ({ onOpenRecordPayment, onOpenRollover }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const res = await api.getLoan(id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
  }, [id]);

  if (loading) return <div className="py-20 text-center text-xs text-slate-500">Loading loan statement...</div>;
  if (error || !data) return <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs">{error || 'Loan not found'}</div>;

  const { loan, client, payments, rollover_history } = data;
  const badge = getStatusBadge(loan.loan_status);
  const totalRemaining = parseFloat(loan.outstanding_principal) + parseFloat(loan.outstanding_interest);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/loans')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">{loan.loan_reference}</h1>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued to <strong>{client.full_name}</strong> ({client.client_number}) • Disbursed {formatDate(loan.disbursement_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300 flex items-center space-x-1.5"
          >
            <Printer size={15} />
            <span>Print Statement</span>
          </button>

          {totalRemaining > 0 && (
            <button
              onClick={() => onOpenRecordPayment(loan.id)}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CreditCard size={15} />
              <span>Record Payment</span>
            </button>
          )}

          {['MATURED', 'AWAITING_ROLLOVER'].includes(loan.loan_status) && parseFloat(loan.outstanding_principal) > 0 && (
            <button
              onClick={() => onOpenRollover(loan.id)}
              className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw size={15} />
              <span>Rollover Cycle</span>
            </button>
          )}
        </div>
      </div>

      {/* Loan Financial Parameters & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Scheduled Terms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Disbursement & Agreement Terms
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Principal Disbursed:</span>
              <span className="font-bold text-slate-900 text-sm">{formatKES(loan.principal_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Cycle Interest Rate:</span>
              <span className="font-semibold text-emerald-700">{loan.interest_rate}% flat</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Calculated Cycle Interest:</span>
              <span className="font-bold text-emerald-800">+{formatKES(loan.interest_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Total Scheduled Amount:</span>
              <span className="font-extrabold text-slate-900 text-sm">{formatKES(loan.scheduled_total)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Duration:</span>
              <span className="font-medium text-slate-700">{loan.loan_duration_days} Calendar Days</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Disbursement Method:</span>
              <span className="font-medium text-slate-700">{loan.disbursement_method}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Book / Page Reference:</span>
              <span className="font-mono font-medium text-slate-800">
                Book {loan.book_number || '—'} / Page {loan.page_number || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Outstanding Balances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Outstanding Balances (Ledger)
          </h3>
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-blue-700 font-medium">Unrecovered Principal:</span>
                <p className="text-lg font-bold text-blue-950 mt-0.5">{formatKES(loan.outstanding_principal)}</p>
              </div>
              <Banknote size={20} className="text-blue-500" />
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-amber-800 font-medium">Unpaid Cycle Interest:</span>
                <p className="text-lg font-bold text-amber-950 mt-0.5">{formatKES(loan.outstanding_interest)}</p>
              </div>
              <Calendar size={20} className="text-amber-500" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-300 font-semibold">Total Amount Due:</span>
                <p className="text-xl font-extrabold text-white mt-0.5">{formatKES(totalRemaining)}</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded text-emerald-400">
                Matures: {formatDate(loan.maturity_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Borrower & Rollover Lineage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Borrower Details
            </h3>
            <div className="mt-2 text-xs space-y-1">
              <p className="font-bold text-slate-900 text-sm">{client.full_name}</p>
              <p className="text-slate-600">Client No: <span className="font-mono">{client.client_number}</span></p>
              <p className="text-slate-600">Phone: {client.primary_phone}</p>
              <p className="text-slate-600">National ID: {client.identification_number || '—'}</p>
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-xs text-emerald-600 hover:underline font-semibold mt-1 inline-block"
              >
                View Client Profile &rarr;
              </button>
            </div>
          </div>

          {/* Rollover Lineage */}
          {rollover_history.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <RefreshCw size={13} className="text-purple-600" />
                <span>Linked Rollover Lineage</span>
              </h4>
              <div className="space-y-1.5 text-xs">
                {rollover_history.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/loans/${item.id}`)}
                    className="p-2 rounded-lg bg-purple-50/60 border border-purple-200 hover:bg-purple-100/60 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <span className="text-[10px] text-purple-700 font-bold block">{item.relation.replace('_', ' ')}</span>
                      <span className="font-mono font-bold text-slate-900">{item.loan_reference}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700">{formatKES(item.principal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Allocation Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard size={16} className="text-blue-600" />
              <span>Payments & Interest-First Allocation Ledger</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Interest cleared first, remaining reduces principal
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Method & Code</th>
                <th className="py-3 px-4">Amount Received</th>
                <th className="py-3 px-4">Interest Allocation</th>
                <th className="py-3 px-4">Principal Allocation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payments posted to this loan cycle yet.
                  </td>
                </tr>
              ) : (
                payments.map(p => {
                  const intAlloc = p.allocations.find(a => a.type === 'INTEREST')?.amount || 0;
                  const princAlloc = p.allocations.find(a => a.type === 'PRINCIPAL')?.amount || 0;
                  const isReversed = p.reversal_status === 'REVERSED';

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${isReversed ? 'opacity-60 bg-rose-50/20' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {p.payment_reference}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold">{p.payment_method}</span>
                        {p.external_reference && (
                          <span className="font-mono text-[10px] text-slate-500 block">
                            Code: {p.external_reference}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {formatKES(p.amount_received)}
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
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {p.notes || '—'}
                        {isReversed && (
                          <span className="block text-rose-600 font-semibold text-[10px]">
                            Reason: {p.reversal_reason}
                          </span>
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

