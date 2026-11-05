import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Banknote, AlertTriangle, Clock, Calendar, CheckCircle,
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
  RefreshCw, PlusCircle, ChevronRight, BookOpen
} from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, getStatusBadge } from '../utils/formatters';

export const DashboardPage = ({ onOpenNewLoan, onOpenRecordPayment, onOpenNewClient }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <RefreshCw size={20} className="animate-spin mr-2 text-emerald-600" />
        <span>Loading dashboard & calculating balances...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Business Overview & Cashbook</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Default 30-Day Cycle • 20% Flat Interest • Kenyan Shillings (KES)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewClient}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300 flex items-center space-x-1.5"
          >
            <Users size={15} />
            <span>New Client</span>
          </button>
          <button
            onClick={onOpenNewLoan}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Banknote size={15} />
            <span>Issue Loan</span>
          </button>
          <button
            onClick={onOpenRecordPayment}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <CreditCard size={15} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Available Capital */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Available Lending Capital</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatKES(data?.available_capital)}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center">
            <ArrowUpRight size={13} className="mr-0.5" />
            Liquid cash on hand to disburse
          </p>
        </div>

        {/* Outstanding Principal */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Principal</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2">{formatKES(data?.total_outstanding_principal)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Active borrowed capital in field
          </p>
        </div>

        {/* Outstanding Interest */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Interest</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-800 mt-2">{formatKES(data?.total_outstanding_interest)}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Interest due from active cycles
          </p>
        </div>

        {/* Total Repayments Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Collections</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatKES(data?.total_repayments_received)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Principal + Interest collected
          </p>
        </div>
      </div>

      {/* Operational Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div
          onClick={() => navigate('/clients')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
        >
          <span className="text-[11px] font-medium text-slate-500 block">Total Borrowers</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{data?.total_clients || 0}</p>
        </div>

        <div
          onClick={() => navigate('/loans?status=ACTIVE')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
        >
          <span className="text-[11px] font-medium text-slate-500 block">Active Cycles</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{data?.active_loans_count || 0}</p>
        </div>

        <div
          onClick={() => navigate('/loans?due_filter=due_today')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-2xs hover:shadow-xs ${
            (data?.loans_due_today_count || 0) > 0 ? 'bg-amber-50/70 border-amber-300 text-amber-900' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block">Due Today</span>
          <p className="text-xl font-bold text-amber-700 mt-1">{data?.loans_due_today_count || 0}</p>
        </div>

        <div
          onClick={() => navigate('/loans?due_filter=overdue')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-2xs hover:shadow-xs ${
            (data?.overdue_loans_count || 0) > 0 ? 'bg-rose-50/70 border-rose-300 text-rose-900' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block">Overdue Loans</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{data?.overdue_loans_count || 0}</p>
        </div>

        <div
          onClick={() => navigate('/rollovers')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
        >
          <span className="text-[11px] font-medium text-slate-500 block">Awaiting Rollover</span>
          <p className="text-xl font-bold text-purple-600 mt-1">{data?.loans_awaiting_rollover_count || 0}</p>
        </div>

        <div
          onClick={() => navigate('/loans')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
        >
          <span className="text-[11px] font-medium text-slate-500 block">Lifetime Disbursed</span>
          <p className="text-sm font-bold text-slate-800 mt-2 truncate">{formatKES(data?.total_principal_disbursed)}</p>
        </div>
      </div>

      {/* Two Column Section: Action Lists & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Overdue & Due Today Column */}
        <div className="space-y-4">
          {/* Urgent Overdue */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Overdue Accounts Requiring Action</h3>
              </div>
              <button
                onClick={() => navigate('/loans?due_filter=overdue')}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center"
              >
                <span>View all ({data?.overdue_loans_count})</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {data?.urgent_overdue_loans?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No overdue accounts at this time 🎉</p>
            ) : (
              <div className="space-y-2">
                {data?.urgent_overdue_loans?.map(loan => (
                  <div
                    key={loan.id}
                    className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{loan.client_name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({loan.loan_reference})</span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                        {loan.days_overdue} days overdue • Total Due: {formatKES(parseFloat(loan.outstanding_principal) + parseFloat(loan.outstanding_interest))}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Book: {loan.book_number || '—'} / Page: {loan.page_number || '—'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onOpenRecordPayment(loan.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => navigate(`/clients/${loan.client_id}`)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loans Due Today */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Calendar size={18} className="text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Loans Reaching Maturity Today</h3>
              </div>
              <button
                onClick={() => navigate('/loans?due_filter=due_today')}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center"
              >
                <span>View all ({data?.loans_due_today_count})</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {data?.due_today_loans?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No loans maturing today</p>
            ) : (
              <div className="space-y-2">
                {data?.due_today_loans?.map(loan => (
                  <div
                    key={loan.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{loan.client_name}</span>
                      <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                        Balance: {formatKES(parseFloat(loan.outstanding_principal) + parseFloat(loan.outstanding_interest))}
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenRecordPayment(loan.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                    >
                      Receive Payment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activity Log */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock size={18} className="text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent System Activity (Audit Trail)</h3>
              </div>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center"
              >
                <span>Full Audit Log</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data?.recent_activities?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recent activity recorded</p>
              ) : (
                data?.recent_activities?.map(item => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 uppercase">
                          {item.action.replace('_', ' ')}
                        </span>
                        <span className="text-slate-700 font-medium">{item.entity_type}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.details || '—'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{item.created_at}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Central Relational Database • ACID Compliant</span>
            <button
              onClick={() => navigate('/cashbook')}
              className="text-emerald-600 hover:underline font-semibold"
            >
              Open Cashbook &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

