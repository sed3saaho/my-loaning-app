import React, { useState, useEffect } from 'react';
import { X, CreditCard, ArrowRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate } from '../utils/formatters';

export const RecordPaymentModal = ({ isOpen, onClose, onPaymentRecorded, preselectedLoanId = null }) => {
  const [loans, setLoans] = useState([]);
  const [formData, setFormData] = useState({
    loan_id: preselectedLoanId || '',
    amount_received: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'M-Pesa',
    external_transaction_reference: '',
    notes: ''
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch loans that have outstanding balances
      api.getLoans().then(allLoans => {
        const payable = allLoans.filter(l =>
          ['ACTIVE', 'PARTIALLY_PAID', 'MATURED', 'AWAITING_ROLLOVER'].includes(l.loan_status) &&
          (parseFloat(l.outstanding_principal) + parseFloat(l.outstanding_interest)) > 0
        );
        setLoans(payable);
        if (preselectedLoanId) {
          setFormData(prev => ({ ...prev, loan_id: preselectedLoanId }));
        }
      }).catch(console.error);

      setError(null);
    }
  }, [isOpen, preselectedLoanId]);

  // Selected Loan
  const selectedLoan = loans.find(l => String(l.id) === String(formData.loan_id));

  // Live Allocation Preview Calculation
  useEffect(() => {
    if (!selectedLoan || !formData.amount_received) {
      setPreview(null);
      return;
    }

    const amt = parseFloat(formData.amount_received);
    if (isNaN(amt) || amt <= 0) {
      setPreview(null);
      return;
    }

    const outInterest = parseFloat(selectedLoan.outstanding_interest);
    const outPrincipal = parseFloat(selectedLoan.outstanding_principal);
    const totalDue = outInterest + outPrincipal;

    // 1. Interest first
    const interestPaid = Math.min(amt, outInterest);
    const remaining = amt - interestPaid;

    // 2. Principal second
    const principalPaid = Math.min(remaining, outPrincipal);
    const excess = remaining - principalPaid;

    const newInterest = Math.max(0, outInterest - interestPaid);
    const newPrincipal = Math.max(0, outPrincipal - principalPaid);

    let resultingStatus = 'PARTIALLY_PAID';
    if (newInterest === 0 && newPrincipal === 0) {
      resultingStatus = 'FULLY_PAID';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (today > selectedLoan.maturity_date) {
        resultingStatus = 'MATURED';
      }
    }

    setPreview({
      amount: amt,
      totalDue,
      interestPaid,
      principalPaid,
      excess,
      newInterest,
      newPrincipal,
      resultingStatus
    });
  }, [formData.loan_id, formData.amount_received, selectedLoan]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.loan_id) {
        throw new Error('Please select an active loan');
      }
      if (preview && preview.excess > 0) {
        throw new Error(`Amount exceeds total outstanding balance by KES ${preview.excess.toFixed(2)}. Overpayment is not permitted without credit approval.`);
      }

      const payload = {
        loan_id: parseInt(formData.loan_id),
        amount_received: parseFloat(formData.amount_received),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        external_transaction_reference: formData.external_transaction_reference || null,
        notes: formData.notes || null
      };

      const payment = await api.recordPayment(payload);
      if (onPaymentRecorded) onPaymentRecorded(payment);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Record Repayment</h2>
              <p className="text-xs text-slate-500">Interest-first allocation engine • Immutable ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Select Loan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Loan Cycle <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.loan_id}
              onChange={e => setFormData({ ...formData, loan_id: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select an outstanding loan —</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>
                  {l.loan_reference} — {l.client_name} (Total Due: {formatKES(parseFloat(l.outstanding_principal) + parseFloat(l.outstanding_interest))})
                </option>
              ))}
            </select>
          </div>

          {/* Current Loan Balance Breakdown Pill */}
          {selectedLoan && (
            <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500">Borrower:</span>
                <p className="font-bold text-slate-800">{selectedLoan.client_name}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Outstanding Interest:</span>
                <p className="font-semibold text-amber-700">{formatKES(selectedLoan.outstanding_interest)}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Outstanding Principal:</span>
                <p className="font-semibold text-blue-700">{formatKES(selectedLoan.outstanding_principal)}</p>
              </div>
            </div>
          )}

          {/* Payment Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (KES) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="10"
                step="10"
                placeholder="e.g. 2000"
                value={formData.amount_received}
                onChange={e => setFormData({ ...formData, amount_received: e.target.value })}
                className="w-full text-base font-bold px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Interactive Interest-First Allocation Preview */}
          {preview && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 shadow-xs ${
              preview.excess > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                <div className="flex items-center space-x-1.5">
                  <Info size={15} className="text-blue-600" />
                  <span>Payment Allocation Preview (Interest First Engine)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  preview.resultingStatus === 'FULLY_PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {preview.resultingStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-blue-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">To Interest:</span>
                  <p className="font-bold text-amber-700 text-sm">{formatKES(preview.interestPaid)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">To Principal:</span>
                  <p className="font-bold text-blue-700 text-sm">{formatKES(preview.principalPaid)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Remaining Int:</span>
                  <p className="font-semibold text-slate-700 text-sm">{formatKES(preview.newInterest)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Remaining Princ:</span>
                  <p className="font-semibold text-slate-700 text-sm">{formatKES(preview.newPrincipal)}</p>
                </div>
              </div>

              {preview.excess > 0 && (
                <div className="flex items-center space-x-1.5 text-rose-700 text-[11px] font-semibold mt-1 bg-rose-100/70 p-2 rounded-lg">
                  <AlertCircle size={15} />
                  <span>Overpayment of {formatKES(preview.excess)} detected. Cannot exceed total outstanding balance.</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Method & External Transaction Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.payment_method === 'M-Pesa' ? 'M-Pesa Transaction Code' : 'Reference / Receipt No.'}
              </label>
              <input
                type="text"
                placeholder={formData.payment_method === 'M-Pesa' ? 'e.g. QHX129AK4M' : 'Optional ref'}
                value={formData.external_transaction_reference}
                onChange={e => setFormData({ ...formData, external_transaction_reference: e.target.value.toUpperCase() })}
                className="w-full text-sm font-mono px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
            <input
              type="text"
              placeholder="e.g. 2nd partial installment"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
              type="submit"
              disabled={loading || !formData.loan_id || !formData.amount_received || (preview && preview.excess > 0)}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <span>Posting Payment...</span> : <span>Confirm & Post Payment</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

