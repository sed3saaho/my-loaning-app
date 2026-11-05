import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Shield, User, Database } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    business_name: '',
    currency: 'KES',
    default_duration_days: 30,
    default_interest_rate: '20.00',
    rollover_mode: 'MANUAL',
    require_mfa: false
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSettings().then(res => {
      setSettings({
        business_name: res.business_name || 'Keith Capital Lending',
        currency: res.currency || 'KES',
        default_duration_days: res.default_duration_days || 30,
        default_interest_rate: res.default_interest_rate || '20.00',
        rollover_mode: res.rollover_mode || 'MANUAL',
        require_mfa: res.require_mfa || false
      });
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await api.updateSettings({
        business_name: settings.business_name,
        currency: settings.currency,
        default_duration_days: parseInt(settings.default_duration_days),
        default_interest_rate: parseFloat(settings.default_interest_rate),
        rollover_mode: settings.rollover_mode,
        require_mfa: settings.require_mfa
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Lending Policy Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business rules, default interest rates, duration, and authentication policies
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Business settings updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Section 1: Business Identity */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
            Business Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.business_name}
                onChange={e => setSettings({ ...settings, business_name: e.target.value })}
                className="w-full p-2.5 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Currency</label>
              <input
                type="text"
                value={settings.currency}
                disabled
                className="w-full p-2.5 border rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Default Lending Rules */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
            Default Lending Rules & Interest (SRS Section 5)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Duration (Days)</label>
              <input
                type="number"
                value={settings.default_duration_days}
                onChange={e => setSettings({ ...settings, default_duration_days: e.target.value })}
                className="w-full p-2.5 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Interest Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.default_interest_rate}
                onChange={e => setSettings({ ...settings, default_interest_rate: e.target.value })}
                className="w-full p-2.5 border rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rollover Mode</label>
              <select
                value={settings.rollover_mode}
                onChange={e => setSettings({ ...settings, rollover_mode: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-white"
              >
                <option value="MANUAL">Manual Approval (Recommended)</option>
                <option value="AUTOMATIC">Authorised Automatic</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            * Note: Changes to default rules apply to future loan cycles. Existing active loan cycles preserve their original snapshot terms.
          </p>
        </div>

        {/* Section 3: Security & Verification */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
            Security & Authentication (SRS 22.1)
          </h3>
          <div className="flex items-center space-x-3 text-xs">
            <input
              type="checkbox"
              id="mfa"
              checked={settings.require_mfa}
              onChange={e => setSettings({ ...settings, require_mfa: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="mfa" className="font-semibold text-slate-700 cursor-pointer">
              Require Second-Factor PIN Code for Administrator Login
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Save size={15} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Admin Account Metadata Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
        <h4 className="font-bold text-slate-800">Current Administrator Account</h4>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Username:</span>
          <span className="font-mono font-bold text-slate-800">{user?.username || 'admin'}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Role:</span>
          <span className="capitalize font-semibold text-emerald-700">{user?.role || 'admin'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Default PIN:</span>
          <span className="font-mono text-slate-600">1234</span>
        </div>
      </div>
    </div>
  );
};

