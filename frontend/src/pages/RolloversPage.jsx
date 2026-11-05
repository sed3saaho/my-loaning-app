import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate } from '../utils/formatters';

export const RolloversPage = ({ onOpenRollover }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingRollovers();
      setLoans(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Rollover Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Roll matured cycles forward to a new 30-day period • Only eligible principal is rolled • Unpaid interest tracked separately
        </p>
      </div>

      {/* Policy Reminder Banner */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start space-x-3">
        <Info size={18} className="text-purple-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">SRS Rollover Principles (Section 5.5 & 13.2)</p>
          <p className="text-purple-800">
            1. Fresh cycle interest is calculated on <strong>eligible outstanding principal only</strong> (at 20%).<br />
            2. Unpaid prior interest is <strong>never silently capitalised</strong> into principal—it remains tracked in the client's historical ledger.<br />
            3. Each new rollover cycle is atomically linked to its parent cycle to maintain an unbroken audit trail.
          </p>
        </div>
      </div>

      {/* Pending Rollovers Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw size={16} className="text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Matured Accounts Awaiting Rollover Decision ({loans.length})
            </h2>
          </div>
          <button
            onClick={fetchPending}
            className="text-xs text-purple-700 hover:underline font-semibold"
          >
            Refresh Queue
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Cycle Ref</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Eligible Principal</th>
                <th className="py-3 px-4">Unpaid Prior Interest</th>
                <th className="py-3 px-4">New Cycle Projection (20%)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Checking rollover queue...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No loans currently awaiting rollover. All cycles are active or fully settled.
                  </td>
                </tr>
              ) : (
                loans.map(loan => {
                  const eligiblePrinc = parseFloat(loan.outstanding_principal);
                  const unpaidInt = parseFloat(loan.outstanding_interest);
                  const newInt = Math.round(eligiblePrinc * 0.20 * 100) / 100;
                  const newScheduledTotal = eligiblePrinc + newInt;

                  return (
                    <tr key={loan.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {loan.loan_reference}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{loan.client_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{loan.client_number}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{formatDate(loan.maturity_date)}</div>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          {loan.days_overdue} days past maturity
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {formatKES(eligiblePrinc)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-amber-800">
                        {formatKES(unpaidInt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-purple-900">{formatKES(newScheduledTotal)}</div>
                        <div className="text-[10px] text-slate-500">
                          (Princ {formatKES(eligiblePrinc)} + Int {formatKES(newInt)})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenRollover(loan.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-2xs transition-colors"
                        >
                          Process Rollover &rarr;
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

