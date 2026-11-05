import React, { useState, useEffect } from 'react';
import { ShieldCheck, PlusCircle, Search, Phone, User, CheckCircle2, X } from 'lucide-react';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';

export const GuarantorsPage = () => {
  const [guarantors, setGuarantors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    identification_type: 'National ID',
    identification_number: '',
    phone_number: '',
    alternative_phone: '',
    residential_address: '',
    relationship: 'Brother',
    consent_status: 'CONFIRMED',
    notes: ''
  });

  const fetchGuarantors = async () => {
    try {
      setLoading(true);
      const data = await api.getGuarantors({ search });
      setGuarantors(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchGuarantors, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createGuarantor(formData);
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        identification_type: 'National ID',
        identification_number: '',
        phone_number: '',
        alternative_phone: '',
        residential_address: '',
        relationship: 'Brother',
        consent_status: 'CONFIRMED',
        notes: ''
      });
      fetchGuarantors();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Guarantor Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage guarantor contacts, consent records, and borrower relationships
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <PlusCircle size={15} />
          <span>Register Guarantor</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guarantors by name, ID, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Guarantors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading guarantors...</div>
        ) : guarantors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">No guarantors found.</div>
        ) : (
          guarantors.map(g => (
            <div key={g.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{g.full_name}</h3>
                  <span className="text-[11px] text-emerald-700 font-medium">{g.relationship || 'Guarantor'}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {g.consent_status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                <div className="flex items-center space-x-1.5">
                  <Phone size={13} className="text-slate-400" />
                  <span>{g.phone_number}</span>
                  {g.alternative_phone && <span className="text-slate-400">({g.alternative_phone})</span>}
                </div>
                <div className="text-[11px] text-slate-500">
                  {g.identification_type}: {g.identification_number || '—'}
                </div>
                {g.residential_address && (
                  <div className="text-[11px] text-slate-500 truncate">
                    Address: {g.residential_address}
                  </div>
                )}
                {g.notes && (
                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg mt-1">
                    "{g.notes}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Guarantor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Register New Guarantor</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Names *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joseph Mwangi"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0722334455"
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Alt Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    value={formData.alternative_phone}
                    onChange={e => setFormData({ ...formData, alternative_phone: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">National ID</label>
                  <input
                    type="text"
                    placeholder="ID number"
                    value={formData.identification_number}
                    onChange={e => setFormData({ ...formData, identification_number: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Brother, Colleague"
                    value={formData.relationship}
                    onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Residential / Business Address</label>
                <input
                  type="text"
                  placeholder="e.g. Pangani, Nairobi"
                  value={formData.residential_address}
                  onChange={e => setFormData({ ...formData, residential_address: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Business stall verified at Gikomba"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
                  Save Guarantor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

