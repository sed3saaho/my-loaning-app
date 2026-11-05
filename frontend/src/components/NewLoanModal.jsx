import React, { useState, useEffect } from 'react';
import { X, Banknote, Calendar, Calculator, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate } from '../utils/formatters';

export const NewLoanModal = ({ isOpen, onClose, onLoanCreated, preselectedClientId = null }) => {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    principal_amount: '',
    interest_rate: '20.00',
    loan_duration_days: '30',
    disbursement_date: new Date().toISOString().split('T')[0],
    disbursement_method: 'M-Pesa',
    book_number: '',
    page_number: '',
    notes: ''
  });

  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      api.getClients({ status: 'ACTIVE' }).then(setClients).catch(console.error);
      if (preselectedClientId) {
        setFormData(prev => ({ ...prev, client_id: preselectedClientId }));
      }
      setError(null);
    }
  }, [isOpen, preselectedClientId]);

  // Recalculate terms live
  useEffect(() => {
    const principal = parseFloat(formData.principal_amount);
    const rate = parseFloat(formData.interest_rate) || 20;
    const duration = parseInt(formData.loan_duration_days) || 30;

    if (principal > 0 && formData.disbursement_date) {
      const interest = Math.round(principal * (rate / 100) * 100) / 100;
      const scheduledTotal = Math.round((principal + interest) * 100) / 100;
      const d = new Date(formData.disbursement_date);
      d.setDate(d.getDate() + duration);
      const maturity = d.toISOString().split('T')[0];

      setCalculation({
        interest,
        scheduledTotal,
        maturity
      });
    } else {
      setCalculation(null);
    }
  }, [formData.principal_amount, formData.interest_rate, formData.loan_duration_days, formData.disbursement_date]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.client_id) {
        throw new Error('Please select a borrower');
      }
      const payload = {
        client_id: parseInt(formData.client_id),
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate),
        loan_duration_days: parseInt(formData.loan_duration_days),
        disbursement_date: formData.disbursement_date,
        disbursement_method: formData.disbursement_method,
        book_number: formData.book_number || null,
        page_number: formData.page_number || null,
        notes: formData.notes || null
      };

      const loan = await api.createLoan(payload);
      if (onLoanCreated) onLoanCreated(loan);
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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Issue New Loan Cycle</h2>
              <p className="text-xs text-slate-500">Default 30 days • 20% flat cycle interest</p>
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

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Borrower <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.client_id}
              onChange={e => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">— Select an active client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.client_number}) — Phone: {c.primary_phone}
                </option>
              ))}
            </select>
          </div>

          {/* Principal & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal (KES) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="100"
                step="50"
                placeholder="e.g. 10000"
                value={formData.principal_amount}
                onChange={e => setFormData({ ...formData, principal_amount: e.target.value })}
                className="w-full text-sm font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.interest_rate}
                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                value={formData.loan_duration_days}
                onChange={e => setFormData({ ...formData, loan_duration_days: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          {calculation && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-xs space-y-2 shadow-xs">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-900 text-xs">
                <Calculator size={15} />
                <span>Calculated Loan Schedule (SRS Flat Interest)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60">
                <div>
                  <span className="text-[11px] text-emerald-700 font-medium">Principal:</span>
                  <p className="font-bold text-slate-800 text-sm">{formatKES(formData.principal_amount)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-medium">Interest ({formData.interest_rate}%):</span>
                  <p className="font-bold text-emerald-700 text-sm">+{formatKES(calculation.interest)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-medium">Scheduled Total:</span>
                  <p className="font-bold text-slate-900 text-sm">{formatKES(calculation.scheduledTotal)}</p>
                </div>
              </div>
              <div className="pt-1.5 flex items-center justify-between text-[11px] text-emerald-800">
                <span>Disbursed: <strong>{formatDate(formData.disbursement_date)}</strong></span>
                <span>Matures on: <strong>{formatDate(calculation.maturity)}</strong> ({formData.loan_duration_days} days)</span>
              </div>
            </div>
          )}

          {/* Disbursement Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Date</label>
              <input
                type="date"
                required
                value={formData.disbursement_date}
                onChange={e => setFormData({ ...formData, disbursement_date: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Method</label>
              <select
                value={formData.disbursement_method}
                onChange={e => setFormData({ ...formData, disbursement_method: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Handwritten Book Reference */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Physical Book Entry (Handwritten Reference)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Book Number</label>
                <input
                  type="text"
                  placeholder="e.g. Book 01"
                  value={formData.book_number}
                  onChange={e => setFormData({ ...formData, book_number: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Page Number</label>
                <input
                  type="text"
                  placeholder="e.g. Page 52"
                  value={formData.page_number}
                  onChange={e => setFormData({ ...formData, page_number: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Emergency inventory purchase"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
              disabled={loading || !formData.principal_amount || !formData.client_id}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <span>Disbursing...</span> : <span>Confirm & Disburse</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

