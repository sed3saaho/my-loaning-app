import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate } from '../utils/formatters';

export const RolloverModal = ({ isOpen, onClose, loanId, onRolloverComplete }) => {
  const [proposal, setProposal] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && loanId) {
      setLoading(true);
      setError(null);
      api.getRolloverProposal(loanId)
        .then(setProposal)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, loanId]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const newLoan = await api.executeRollover({
        loan_id: loanId,
        notes: notes || null
      });
      if (onRolloverComplete) onRolloverComplete(newLoan);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <RefreshCw size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Process Loan Rollover</h2>
              <p className="text-xs text-slate-500">Roll eligible principal forward to a new 30-day cycle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {loading && !proposal ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Generating rollover proposal...
            </div>
          ) : proposal ? (
            <div className="space-y-4">
              {/* Proposal Details Card */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                  <div>
                    <span className="text-[11px] text-purple-700">Borrower:</span>
                    <p className="font-bold text-slate-900 text-sm">{proposal.client_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-purple-700">Closing Cycle:</span>
                    <p className="font-mono font-bold text-slate-800">{proposal.previous_loan_reference}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Eligible Principal:</span>
                    <p className="text-base font-bold text-slate-900">{formatKES(proposal.eligible_principal)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Unpaid Prior Interest:</span>
                    <p className="text-base font-bold text-amber-700">
                      {formatKES(proposal.unpaid_previous_interest)}
                      <span className="text-[10px] font-normal text-slate-400 block">(Tracked separately in history)</span>
                    </p>
                  </div>
                </div>

                {/* New Cycle Projection */}
                <div className="p-3 rounded-lg bg-white border border-purple-200/80 space-y-1.5 shadow-xs">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">
                    New Linked Cycle Projection
                  </span>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-600">New Principal:</span>
                    <span className="font-semibold">{formatKES(proposal.eligible_principal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">New Interest (20% flat):</span>
                    <span className="font-semibold text-emerald-700">+{formatKES(proposal.new_interest_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-100 text-slate-900">
                    <span>New Scheduled Total:</span>
                    <span className="text-emerald-800">{formatKES(proposal.new_scheduled_total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>New Maturity Date:</span>
                    <span className="font-medium text-slate-700">{formatDate(proposal.proposed_maturity_date)} (30 days)</span>
                  </div>
                </div>
              </div>

              {!proposal.can_rollover && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cannot Rollover This Loan</p>
                    <p>{proposal.reason_if_not}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rollover Authorization / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved extension by client request"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={loading || !proposal.can_rollover}
                  className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {loading ? <span>Executing...</span> : <span>Approve & Rollover</span>}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

