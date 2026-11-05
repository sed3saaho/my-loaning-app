import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate } from '../utils/formatters';

export const PaymentReversalModal = ({ isOpen, onClose, payment, onReversalComplete }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !payment) return null;

  const handleReverse = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for this reversal');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const reversed = await api.reversePayment(payment.id, reason.trim());
      if (onReversalComplete) onReversalComplete(reversed);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Reverse Payment</h2>
              <p className="text-xs text-rose-600 font-medium">Traceable correction with audit trail</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleReverse} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Reference:</span>
              <span className="font-mono font-bold text-slate-800">{payment.payment_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Received:</span>
              <span className="font-bold text-slate-900">{formatKES(payment.amount_received)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date Received:</span>
              <span>{formatDate(payment.payment_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Method / Code:</span>
              <span>{payment.payment_method} {payment.external_transaction_reference ? `(${payment.external_transaction_reference})` : ''}</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
            Reversing this payment will restore the previously allocated interest and principal balances back onto loan <strong>{payment.loan_reference}</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Reversal <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. M-Pesa transaction reversed by Safaricom or entered against wrong client"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
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
              disabled={loading || !reason.trim()}
              className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <span>Processing Reversal...</span> : <span>Confirm Reversal</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

