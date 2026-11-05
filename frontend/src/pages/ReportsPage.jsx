import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, FileSpreadsheet, Printer, Download, Filter } from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, exportToCSV } from '../utils/formatters';

export const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('aging'); // aging or collections
  const [agingData, setAgingData] = useState(null);
  const [collectionsData, setCollectionsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Collections filter
  const [collectionsFilter, setCollectionsFilter] = useState({
    start_date: '',
    end_date: '',
    payment_method: 'ALL'
  });

  const fetchAging = async () => {
    try {
      setLoading(true);
      const res = await api.getAgingReport();
      setAgingData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await api.getCollectionsReport(collectionsFilter);
      setCollectionsData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport === 'aging') {
      fetchAging();
    } else {
      fetchCollections();
    }
  }, [activeReport, collectionsFilter]);

  const exportAging = () => {
    if (!agingData) return;
    const all = [
      ...agingData.bucket_1_30.map(i => ({ ...i, bucket: '1-30 Days' })),
      ...agingData.bucket_31_60.map(i => ({ ...i, bucket: '31-60 Days' })),
      ...agingData.bucket_61_90.map(i => ({ ...i, bucket: '61-90 Days' })),
      ...agingData.bucket_90_plus.map(i => ({ ...i, bucket: '90+ Days' })),
    ];
    exportToCSV(all, `loan_aging_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportCollections = () => {
    if (!collectionsData) return;
    exportToCSV(collectionsData.payments, `collections_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Business Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aging analysis • Collections breakdown • Export to Excel & CSV
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300 flex items-center space-x-1.5"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button
            onClick={activeReport === 'aging' ? exportAging : exportCollections}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="no-print flex space-x-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveReport('aging')}
          className={`px-4 py-2 font-bold rounded-t-xl transition-colors ${
            activeReport === 'aging'
              ? 'bg-white border-t border-x border-slate-200 text-emerald-700 -mb-px'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Loan Aging Analysis (SRS 14.3)
        </button>
        <button
          onClick={() => setActiveReport('collections')}
          className={`px-4 py-2 font-bold rounded-t-xl transition-colors ${
            activeReport === 'collections'
              ? 'bg-white border-t border-x border-slate-200 text-emerald-700 -mb-px'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Collections & Repayments Report
        </button>
      </div>

      {/* REPORT 1: LOAN AGING */}
      {activeReport === 'aging' && agingData && (
        <div className="space-y-6">
          {/* Aging Summary Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-800">1 – 30 Days Overdue</span>
              <p className="text-xl font-black text-slate-900 mt-1">{formatKES(agingData.summary.bucket_1_30_amount)}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{agingData.summary.bucket_1_30_count} accounts</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-xs">
              <span className="text-[11px] font-bold text-orange-800">31 – 60 Days Overdue</span>
              <p className="text-xl font-black text-slate-900 mt-1">{formatKES(agingData.summary.bucket_31_60_amount)}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{agingData.summary.bucket_31_60_count} accounts</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-800">61 – 90 Days Overdue</span>
              <p className="text-xl font-black text-slate-900 mt-1">{formatKES(agingData.summary.bucket_61_90_amount)}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{agingData.summary.bucket_61_90_count} accounts</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-red-300 shadow-xs">
              <span className="text-[11px] font-bold text-red-900">Over 90 Days Overdue</span>
              <p className="text-xl font-black text-red-700 mt-1">{formatKES(agingData.summary.bucket_90_plus_amount)}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{agingData.summary.bucket_90_plus_count} accounts</p>
            </div>
          </div>

          {/* Aging Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Overdue Portfolio Age Schedule</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Cycle Ref</th>
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Maturity Date</th>
                    <th className="py-3 px-4">Days Overdue</th>
                    <th className="py-3 px-4">Unrecovered Principal</th>
                    <th className="py-3 px-4">Unpaid Interest</th>
                    <th className="py-3 px-4">Total Amount Due</th>
                    <th className="py-3 px-4">Ledger Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ...agingData.bucket_1_30,
                    ...agingData.bucket_31_60,
                    ...agingData.bucket_61_90,
                    ...agingData.bucket_90_plus
                  ].length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No overdue accounts in portfolio. All balances are up to date!
                      </td>
                    </tr>
                  ) : (
                    [
                      ...agingData.bucket_1_30,
                      ...agingData.bucket_31_60,
                      ...agingData.bucket_61_90,
                      ...agingData.bucket_90_plus
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.loan_reference}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{row.client_name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.client_phone}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(row.maturity_date)}</td>
                        <td className="py-3 px-4 font-bold text-rose-700">{row.days_overdue} days</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatKES(row.outstanding_principal)}</td>
                        <td className="py-3 px-4 font-semibold text-amber-700">{formatKES(row.outstanding_interest)}</td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">{formatKES(row.total_due)}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{row.book_page}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: COLLECTIONS & REPAYMENTS */}
      {activeReport === 'collections' && collectionsData && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Total Net Collections</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatKES(collectionsData.total_collected)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Excludes reversed entries</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-800">Interest Income Collected</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{formatKES(collectionsData.total_interest_recovered)}</p>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">Cleared interest obligations</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-800">Principal Capital Recovered</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{formatKES(collectionsData.total_principal_recovered)}</p>
              <p className="text-[10px] text-blue-600 font-medium mt-0.5">Returned to available capital</p>
            </div>
          </div>

          {/* Breakdown by Payment Method */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Collections by Payment Channel</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {Object.entries(collectionsData.by_method).map(([method, amt]) => (
                <div key={method} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium text-[11px]">{method}</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{formatKES(amt)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Loan Ref</th>
                    <th className="py-3 px-4">Method & Code</th>
                    <th className="py-3 px-4">Interest Allocation</th>
                    <th className="py-3 px-4">Principal Allocation</th>
                    <th className="py-3 px-4 font-bold">Total Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collectionsData.payments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_reference}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.client_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.loan_reference}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.payment_method} {p.external_reference ? `(${p.external_reference})` : ''}
                      </td>
                      <td className="py-3 px-4 font-semibold text-amber-700">{formatKES(p.interest_portion)}</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">{formatKES(p.principal_portion)}</td>
                      <td className="py-3 px-4 font-black text-slate-900 text-sm">{formatKES(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

