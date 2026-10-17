import React, { useState } from 'react';
import { Booking, Resource, User } from '../types';
import { formatFriendlyDateTime } from '../utils/bookingEngine';
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  User as UserIcon,
  Paperclip,
  BarChart3,
  ExternalLink,
  Download,
  CheckCircle2
} from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  resources: Resource[];
  users: User[];
  currentUser: User;
  onApproveBooking: (bookingId: number, note: string) => void;
  onRejectBooking: (bookingId: number, note: string) => void;
  onViewAuditLogs: () => void;
  onViewAnalytics?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  resources,
  users,
  currentUser,
  onApproveBooking,
  onRejectBooking,
  onViewAuditLogs,
  onViewAnalytics,
}) => {
  // Store admin note per booking id in local state
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [viewingProofBooking, setViewingProofBooking] = useState<{
    booking: Booking;
    resource?: Resource;
    user?: User;
  } | null>(null);

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');

  const getResource = (id: number) => resources.find((r) => r.id === id);
  const getUser = (id: number) => users.find((u) => u.id === id);

  const handleNoteChange = (bookingId: number, text: string) => {
    setAdminNotes((prev) => ({ ...prev, [bookingId]: text }));
  };

  const handleApprove = (bookingId: number) => {
    const note = adminNotes[bookingId]?.trim() || 'Approved for campus academic use.';
    onApproveBooking(bookingId, note);
  };

  const handleReject = (bookingId: number) => {
    const note = adminNotes[bookingId]?.trim() || 'Rejected due to campus schedule conflict or maintenance.';
    onRejectBooking(bookingId, note);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Administrator Review & Approval Console
            </h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold font-mono">
              {pendingBookings.length} Pending
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate student requests, inspect conflict status, review advisor proof documents, and issue approvals.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onViewAnalytics && (
            <button
              onClick={onViewAnalytics}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Facility Analytics &rarr;
            </button>
          )}
          <button
            onClick={onViewAuditLogs}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Trail History &rarr;
          </button>
        </div>
      </div>

      {/* Review Queue (Pending Requests) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h3 className="text-sm font-bold text-slate-900">Pending Review Queue</h3>
          </div>
          <span className="text-xs text-amber-800 font-medium">
            Requires Administrator Decision & Verification
          </span>
        </div>

        {pendingBookings.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {pendingBookings.map((b) => {
              const res = getResource(b.resource_id);
              const requester = getUser(b.user_id);
              const noteValue = adminNotes[b.id] ?? '';

              return (
                <div key={b.id} className="p-6 hover:bg-slate-50/40 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Booking Details */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          Request #{b.id}
                        </span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          {requester?.name || 'Alex Chen'}
                        </span>
                        <span className="text-slate-500 font-mono">({requester?.studentId || 'STU102'})</span>
                        <span>&bull;</span>
                        <span className="text-slate-500 font-mono">Submitted: {b.created_at}</span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                          {res?.name}
                        </h4>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {res?.category}
                        </span>
                        {res?.requiresProof && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            Proof Required Facility
                          </span>
                        )}
                        {res?.capacity && (
                          <span className="text-xs text-slate-500 font-mono">
                            Cap: {res.capacity}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 flex flex-wrap items-center gap-4">
                        <div>
                          <span className="text-slate-400 uppercase text-[10px] block font-sans">Date</span>
                          <strong className="text-slate-900">{b.start_time.split('T')[0]}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[10px] block font-sans">Time Slot</span>
                          <strong className="text-slate-900">{b.start_time.split('T')[1]} &rarr; {b.end_time.split('T')[1]}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[10px] block font-sans">Location</span>
                          <span>{res?.location || 'Campus Facilities'}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-900 block mb-1">Stated Purpose / Project:</span>
                        <p className="leading-relaxed">{b.purpose}</p>
                      </div>

                      {/* Attached Proof Document Component */}
                      {b.proofFileName ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-indigo-950 block truncate">
                                Attached Proof: {b.proofFileName}
                              </span>
                              <span className="text-[10px] text-indigo-700">
                                Advisor sign-off letter / Student clearance document verified
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingProofBooking({ booking: b, resource: res, user: requester })}
                            className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0 ml-3"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Inspect Proof
                          </button>
                        </div>
                      ) : res?.requiresProof ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Attention: This restricted facility was requested without an attached advisor clearance proof.</span>
                        </div>
                      ) : null}

                      {res?.guidelines && (
                        <div className="text-[11px] text-slate-500 italic">
                          Compliance guideline: {res.guidelines}
                        </div>
                      )}
                    </div>

                    {/* Review Decision Form */}
                    <div className="lg:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Administrator Decision Note / Instructions
                      </label>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Attach feedback or equipment pickup instructions for the student:
                      </p>
                      
                      {/* Quick preset chips */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => handleNoteChange(b.id, 'Approved for capstone project. Pick up keys at Tech Office.')}
                          className="px-2 py-0.5 text-[10px] rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors"
                        >
                          + Key Pickup Note
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNoteChange(b.id, 'Approved. Please bring physical student ID for badge swipe.')}
                          className="px-2 py-0.5 text-[10px] rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors"
                        >
                          + ID Swipe Note
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={noteValue}
                        onChange={(e) => handleNoteChange(b.id, e.target.value)}
                        placeholder="e.g. Approved. AV technician assigned to North Wing."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                      />

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(b.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(b.id)}
                          className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">All pending reservation requests have been reviewed!</p>
            <p className="text-xs text-slate-400 mt-1">New requests from students will appear here in real time.</p>
          </div>
        )}
      </div>

      {/* Master Booking Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Master Campus Reservations Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Complete historical record of all room and gear allocations</p>
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-1">
            {['All', 'Room', 'Lab Gear', 'Hardware'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Resource</th>
                <th className="px-6 py-3">Student Requester</th>
                <th className="px-6 py-3">Date & Time Range</th>
                <th className="px-6 py-3">Proof Document</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Admin Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {bookings.filter((b) => {
                if (filterCategory === 'All') return true;
                const r = getResource(b.resource_id);
                return r?.category === filterCategory;
              }).map((b) => {
                const res = getResource(b.resource_id);
                const requester = getUser(b.user_id);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-bold">#{b.id}</td>
                    <td className="px-6 py-4 font-sans font-medium text-slate-900">
                      {res?.name}
                      <span className="block text-[11px] text-slate-400 font-normal">{res?.category}</span>
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-700">
                      <div className="font-semibold">{requester?.name || 'Alex Chen'}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{requester?.studentId || 'STU102'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{b.start_time.split('T')[0]}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.start_time.split('T')[1]} &rarr; {b.end_time.split('T')[1]}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      {b.proofFileName ? (
                        <button
                          type="button"
                          onClick={() => setViewingProofBooking({ booking: b, resource: res, user: requester })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[120px] truncate">{b.proofFileName}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-sans whitespace-nowrap">
                      {b.status === 'Approved' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {b.status === 'Pending' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {b.status === 'Rejected' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                      {b.status === 'Cancelled' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-sans text-xs text-slate-600 italic">
                      {b.admin_notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Document Inspection Modal */}
      {viewingProofBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Proof Document Verification
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Reservation #{viewingProofBooking.booking.id} &bull; {viewingProofBooking.resource?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingProofBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Document:</span>
                  <span className="font-bold text-indigo-700">{viewingProofBooking.booking.proofFileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Requester:</span>
                  <span className="text-slate-900 font-sans font-medium">
                    {viewingProofBooking.user?.name || 'Alex Chen'} ({viewingProofBooking.user?.studentId || 'STU102'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Timeframe:</span>
                  <span className="text-slate-900">
                    {viewingProofBooking.booking.start_time.split('T')[0]} ({viewingProofBooking.booking.start_time.split('T')[1]} - {viewingProofBooking.booking.end_time.split('T')[1]})
                  </span>
                </div>
              </div>

              {/* Simulated Institutional Letter Preview Card */}
              <div className="border border-slate-200 rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/50 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Official Institutional Clearance Slip
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Signed & Verified
                  </span>
                </div>
                <div className="space-y-1 pt-1 text-slate-600 leading-relaxed text-[11px]">
                  <p>
                    <strong>Subject:</strong> Departmental facility access approval for research purpose.
                  </p>
                  <p className="italic text-slate-500 bg-white p-2.5 rounded border border-slate-100">
                    "{viewingProofBooking.booking.purpose}"
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1 font-mono">
                    Hash signature: SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingProofBooking(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
