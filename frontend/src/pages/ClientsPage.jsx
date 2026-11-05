import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, PlusCircle, UserCheck, Phone, MapPin, Banknote, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, exportToCSV } from '../utils/formatters';

export const ClientsPage = ({ onOpenNewClient, onOpenNewLoan }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients({ search, status: statusFilter });
      setClients(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchClients, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleExport = () => {
    const exportData = clients.map(c => ({
      'Client Number': c.client_number,
      'Full Name': c.full_name,
      'National ID': c.identification_number || 'N/A',
      'Primary Phone': c.primary_phone,
      'County': c.county || '',
      'Town': c.town || '',
      'Active Loans': c.active_loans_count,
      'Outstanding Principal': c.total_outstanding_principal,
      'Outstanding Interest': c.total_outstanding_interest,
      'Status': c.client_status,
      'Registered Date': c.registration_date
    }));
    exportToCSV(exportData, `clients_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Digitised borrower profiles, loan books, and guarantor relationships
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300 flex items-center space-x-1.5"
            title="Export to CSV"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenNewClient}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <PlusCircle size={15} />
            <span>Register Client</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, client number, ID, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Client Number</th>
                <th className="py-3 px-4">Full Names & ID</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Active Loans</th>
                <th className="py-3 px-4">Outstanding Balances</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading clients...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No clients found matching the search criteria.
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {client.client_number}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{client.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {client.identification_type}: {client.identification_number || '—'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 text-slate-800 font-medium">
                        <Phone size={12} className="text-slate-400" />
                        <span>{client.primary_phone}</span>
                      </div>
                      {client.alternative_phone && (
                        <div className="text-[10px] text-slate-400">Alt: {client.alternative_phone}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div>{client.town || client.county || '—'}</div>
                      {client.county && client.town && (
                        <div className="text-[10px] text-slate-400">{client.county}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        client.active_loans_count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {client.active_loans_count}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-semibold">
                        Princ: {formatKES(client.total_outstanding_principal)}
                      </div>
                      <div className="text-amber-700 text-[11px]">
                        Int: {formatKES(client.total_outstanding_interest)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        client.client_status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {client.client_status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onOpenNewLoan(client.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                        title="Issue Loan to this client"
                      >
                        + Loan
                      </button>
                      <button
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        Profile &rarr;
                      </button>
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

