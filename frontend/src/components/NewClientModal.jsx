import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, UserPlus } from 'lucide-react';
import { api } from '../api/client';

export const NewClientModal = ({ isOpen, onClose, onClientCreated }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    identification_type: 'National ID',
    identification_number: '',
    year_of_birth: '',
    primary_phone: '',
    alternative_phone: '',
    county: 'Nairobi',
    town: '',
    physical_address: '',
    initial_book_number: '',
    initial_page_number: '',
    guarantor_ids: [],
    notes: ''
  });

  const [guarantors, setGuarantors] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      api.getGuarantors().then(setGuarantors).catch(console.error);
      setDuplicateWarning(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDuplicateCheck = async () => {
    if (!formData.full_name || !formData.primary_phone) return;
    try {
      const res = await api.checkDuplicateClient({
        full_name: formData.full_name,
        primary_phone: formData.primary_phone,
        identification_number: formData.identification_number || ''
      });
      if (res.has_duplicates) {
        setDuplicateWarning(res.matching_clients);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      // non-blocking
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        year_of_birth: formData.year_of_birth ? parseInt(formData.year_of_birth) : null
      };
      const newClient = await api.createClient(payload);
      if (onClientCreated) onClientCreated(newClient);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Register New Client</h2>
              <p className="text-xs text-slate-500">Digitise borrower profile and record guarantor references</p>
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

          {duplicateWarning && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-amber-900">
                <AlertTriangle size={15} />
                <span>Possible Duplicate Client Found!</span>
              </div>
              <p>Existing record found with matching phone, ID, or name:</p>
              <ul className="list-disc list-inside font-mono text-[11px] text-amber-900 mt-1">
                {duplicateWarning.map(c => (
                  <li key={c.id}>
                    {c.full_name} ({c.client_number}) - Phone: {c.primary_phone} - ID: {c.identification_number || 'N/A'}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 mt-1">You may still proceed if this is a legitimate distinct client.</p>
            </div>
          )}

          {/* Section 1: Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Names <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wanjiku Kamau"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                onBlur={handleDuplicateCheck}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 0712345678"
                value={formData.primary_phone}
                onChange={e => setFormData({ ...formData, primary_phone: e.target.value })}
                onBlur={handleDuplicateCheck}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ID Document Type</label>
              <select
                value={formData.identification_type}
                onChange={e => setFormData({ ...formData, identification_type: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="National ID">National ID</option>
                <option value="Passport">Passport</option>
                <option value="Military ID">Military ID</option>
                <option value="Alien Card">Alien Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ID / Document Number</label>
              <input
                type="text"
                placeholder="e.g. 29182736"
                value={formData.identification_number}
                onChange={e => setFormData({ ...formData, identification_number: e.target.value })}
                onBlur={handleDuplicateCheck}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Birth</label>
              <input
                type="number"
                placeholder="e.g. 1988"
                min="1940"
                max="2010"
                value={formData.year_of_birth}
                onChange={e => setFormData({ ...formData, year_of_birth: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternative Phone</label>
              <input
                type="tel"
                placeholder="Optional secondary phone"
                value={formData.alternative_phone}
                onChange={e => setFormData({ ...formData, alternative_phone: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">County & Town</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="County"
                  value={formData.county}
                  onChange={e => setFormData({ ...formData, county: e.target.value })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Town/Area"
                  value={formData.town}
                  onChange={e => setFormData({ ...formData, town: e.target.value })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential / Stall Address</label>
              <input
                type="text"
                placeholder="e.g. Eastleigh 3rd Ave, Flat 4B"
                value={formData.physical_address}
                onChange={e => setFormData({ ...formData, physical_address: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section 2: Physical Handwritten Book Reference */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Physical Book Opening Reference (For Migration / Ledger Tracking)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Book Number / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Book 01"
                  value={formData.initial_book_number}
                  onChange={e => setFormData({ ...formData, initial_book_number: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Page Number</label>
                <input
                  type="text"
                  placeholder="e.g. Page 42"
                  value={formData.initial_page_number}
                  onChange={e => setFormData({ ...formData, initial_page_number: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Guarantor Assignment */}
          {guarantors.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Guarantor(s)</label>
              <select
                multiple
                value={formData.guarantor_ids.map(String)}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setFormData({ ...formData, guarantor_ids: selected });
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white h-20"
              >
                {guarantors.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} ({g.phone_number}) — {g.relationship || 'Guarantor'}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Hold Ctrl / Cmd to select multiple guarantors.</p>
            </div>
          )}

          {/* Section 4: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Business Context</label>
            <textarea
              rows={2}
              placeholder="e.g. Runs boutique in Nairobi CBD, recommended by James"
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
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <span>Saving...</span> : <span>Complete Registration</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

