import React, { useState, useEffect } from 'react';
import { History, Search, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { formatDateTime } from '../utils/formatters';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      l.entity_type.toLowerCase().includes(s) ||
      (l.details && l.details.toLowerCase().includes(s)) ||
      l.user_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Activity & Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable traceable history of all lending, repayment, reversal, and administrative operations
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Audit Details & Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading audit records...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">No activity logs recorded.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 uppercase font-bold tracking-wide">
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.user_name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

