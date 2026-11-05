import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Phone, MapPin, Calendar, Banknote, CreditCard,
  ShieldCheck, BookOpen, MessageSquare, Plus, ArrowLeft,
  Clock, AlertTriangle, FileText
} from 'lucide-react';
import { api } from '../api/client';
import { formatKES, formatDate, formatDateTime, getStatusBadge } from '../utils/formatters';

export const ClientProfilePage = ({ onOpenNewLoan, onOpenRecordPayment }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Note modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ note_type: 'Call', description: '', next_action_date: '' });

  // Book reference modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({ book_number: '', page_number: '', notes: '' });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getClient(id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await api.createNote({
        client_id: parseInt(id),
        note_type: noteForm.note_type,
        description: noteForm.description,
        next_action_date: noteForm.next_action_date || null
      });
      setIsNoteModalOpen(false);
      setNoteForm({ note_type: 'Call', description: '', next_action_date: '' });
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddBookRef = async (e) => {
    e.preventDefault();
    try {
      await api.createBookReference({
        client_id: parseInt(id),
        book_number: bookForm.book_number,
        page_number: bookForm.page_number,
        notes: bookForm.notes || null
      });
      setIsBookModalOpen(false);
      setBookForm({ book_number: '', page_number: '', notes: '' });
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading client profile...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        {error || 'Client not found'}
      </div>
    );
  }

  const { client, loans, guarantors, book_references, follow_up_notes } = data;

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{client.full_name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {client.client_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered on {formatDate(client.registration_date)} • Status: <strong className="text-emerald-700">{client.client_status}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenNewLoan(client.id)}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Plus size={15} />
            <span>Issue New Loan</span>
          </button>
        </div>
      </div>

      {/* Profile Overview & Balances Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Borrower Profile
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">National ID:</span>
              <span className="font-semibold text-slate-800">{client.identification_number || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Year of Birth:</span>
              <span className="font-semibold text-slate-800">{client.year_of_birth || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Primary Phone:</span>
              <span className="font-semibold text-slate-800">{client.primary_phone}</span>
            </div>
            {client.alternative_phone && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Alt Phone:</span>
                <span className="font-semibold text-slate-800">{client.alternative_phone}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold text-slate-800">{client.town ? `${client.town}, ${client.county}` : client.county || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Physical Address:</span>
              <span className="font-semibold text-slate-800 text-right">{client.physical_address || '—'}</span>
            </div>
            {client.notes && (
              <div className="pt-2">
                <span className="text-slate-500 block mb-0.5">Notes:</span>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 italic">
                  "{client.notes}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Current Outstanding Balances Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Current Outstanding Balances
          </h3>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-blue-700 font-medium">Outstanding Principal:</span>
                <p className="text-xl font-bold text-blue-950 mt-0.5">
                  {formatKES(client.total_outstanding_principal)}
                </p>
              </div>
              <Banknote size={24} className="text-blue-500" />
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-amber-800 font-medium">Outstanding Interest:</span>
                <p className="text-xl font-bold text-amber-950 mt-0.5">
                  {formatKES(client.total_outstanding_interest)}
                </p>
              </div>
              <Clock size={24} className="text-amber-500" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-600 font-semibold">Total Amount Due:</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatKES(parseFloat(client.total_outstanding_principal) + parseFloat(client.total_outstanding_interest))}
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-300 text-slate-700">
                {client.active_loans_count} Active
              </span>
            </div>
          </div>
        </div>

        {/* Guarantors & Handwritten Books Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Guarantors</span>
              </h3>
            </div>
            <div className="mt-2 space-y-2 text-xs">
              {guarantors.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">No guarantors attached yet.</p>
              ) : (
                guarantors.map(g => (
                  <div key={g.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-bold text-slate-900">{g.full_name}</p>
                    <p className="text-slate-500 text-[11px]">Phone: {g.phone_number} • {g.relationship}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen size={14} className="text-blue-600" />
                <span>Handwritten Book References</span>
              </h3>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                + Add Reference
              </button>
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              {book_references.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">No physical book entries recorded.</p>
              ) : (
                book_references.map(b => (
                  <div key={b.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{b.book_number} &bull; {b.page_number}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(b.date_recorded)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loans History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Banknote size={16} className="text-emerald-600" />
            <span>Complete Loan & Cycle History</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Loan Reference</th>
                <th className="py-3 px-4">Disbursed</th>
                <th className="py-3 px-4">Maturity</th>
                <th className="py-3 px-4">Principal</th>
                <th className="py-3 px-4">Interest (20%)</th>
                <th className="py-3 px-4">Scheduled Total</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No loans issued to this borrower yet.
                  </td>
                </tr>
              ) : (
                loans.map(loan => {
                  const badge = getStatusBadge(loan.loan_status);
                  const totalRemaining = loan.outstanding_principal + loan.outstanding_interest;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {loan.loan_reference}
                        {loan.parent_loan_id && (
                          <span className="block text-[10px] text-purple-600 font-normal">
                            (Rolled forward from parent)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(loan.disbursement_date)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(loan.maturity_date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{formatKES(loan.principal_amount)}</td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">+{formatKES(loan.interest_amount)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatKES(loan.scheduled_total)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{formatKES(totalRemaining)}</div>
                        <div className="text-[10px] text-slate-500">
                          Princ: {formatKES(loan.outstanding_principal)} • Int: {formatKES(loan.outstanding_interest)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {totalRemaining > 0 && (
                          <button
                            onClick={() => onOpenRecordPayment(loan.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          View &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up Notes & Promises to Pay */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Follow-up Notes & Promises to Pay</h3>
          </div>
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
          >
            + Add Note
          </button>
        </div>

        {follow_up_notes.length === 0 ? (
          <p className="text-slate-400 text-xs py-4 text-center">No follow-up notes recorded yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {follow_up_notes.map(note => (
              <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    [{note.note_type}] By {note.recorded_by}
                  </span>
                  <span className="text-[11px] text-slate-400">{note.created_at}</span>
                </div>
                <p className="text-slate-700">{note.description}</p>
                {note.next_action_date && (
                  <p className="text-[11px] text-amber-700 font-semibold pt-1">
                    Next Action Due: {formatDate(note.next_action_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Record Follow-up Communication</h3>
            <form onSubmit={handleAddNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Interaction Type</label>
                <select
                  value={noteForm.note_type}
                  onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="Call">Phone Call</option>
                  <option value="Office Visit">Office Visit</option>
                  <option value="Promise to Pay">Promise to Pay</option>
                  <option value="Demand Notice">Demand Notice</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Description / Arrangement</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Borrower visited office, agreed to pay KES 2,000 this Friday"
                  value={noteForm.description}
                  onChange={e => setNoteForm({ ...noteForm, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Next Action Date (Optional)</label>
                <input
                  type="date"
                  value={noteForm.next_action_date}
                  onChange={e => setNoteForm({ ...noteForm, next_action_date: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Book Reference Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add Handwritten Book Reference</h3>
            <form onSubmit={handleAddBookRef} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Book Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Book 01"
                    value={bookForm.book_number}
                    onChange={e => setBookForm({ ...bookForm, book_number: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Page Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Page 42"
                    value={bookForm.page_number}
                    onChange={e => setBookForm({ ...bookForm, page_number: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Handwritten signature present"
                  value={bookForm.notes}
                  onChange={e => setBookForm({ ...bookForm, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Save Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

