import React, { useState } from 'react';
import { Booking, Resource, User, BookingStatus } from '../types';
import { formatFriendlyDateTime } from '../utils/bookingEngine';
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Ban, Plus, Search } from 'lucide-react';

interface StudentDashboardProps {
  bookings: Booking[];
  resources: Resource[];
  currentUser: User;
  onCancelBooking: (bookingId: number) => void;
  onOpenNewBooking: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  bookings,
  resources,
  currentUser,
  onCancelBooking,
  onOpenNewBooking,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const getResource = (resourceId: number) => {
    return resources.find((r) => r.id === resourceId);
  };

  const userBookings = bookings.filter((b) => b.user_id === currentUser.id);

  const filteredBookings = userBookings.filter((b) => {
    const res = getResource(b.resource_id);
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      b.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res && res.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(b.id).includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  const statuses = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

  const getStatusCount = (status: string) => {
    if (status === 'All') return userBookings.length;
    return userBookings.filter((b) => b.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Reservations Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your pending campus requests, approved reservation slots, and audit history.
          </p>
        </div>
        <button
          onClick={onOpenNewBooking}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Book New Resource
        </button>
      </div>

      {/* User Info Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm font-mono">
            AC
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{currentUser.name}</h4>
            <span className="text-slate-500">Student ID: <strong className="text-slate-700 font-mono">{currentUser.studentId}</strong> &bull; {currentUser.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-600 font-mono text-xs">
          <span>Active Bookings: <strong className="text-slate-900">{userBookings.filter(b => b.status === 'Approved' || b.status === 'Pending').length}</strong></span>
          <span>Total Requests: <strong className="text-slate-900">{userBookings.length}</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by resource, purpose, or booking ID..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
          {statuses.map((st) => {
            const count = getStatusCount(st);
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === st
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">My Reservations Queue</h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Showing {filteredBookings.length} of {userBookings.length} records
          </span>
        </div>

        {filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Campus Resource</th>
                  <th className="px-6 py-3.5">Requested Time Window</th>
                  <th className="px-6 py-3.5">Purpose</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Administrator Notes</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBookings.map((b) => {
                  const res = getResource(b.resource_id);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">
                        #{b.id}
                      </td>

                      {/* Resource */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">
                          {res?.name || `Resource #${b.resource_id}`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {res?.category} {res?.location ? `· ${res.location}` : ''}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.start_time.split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {b.start_time.split('T')[1]} &rarr; {b.end_time.split('T')[1]}
                          </span>
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="px-6 py-4 text-xs text-slate-700 max-w-xs truncate" title={b.purpose}>
                        {b.purpose}
                      </td>

                      {/* Status Badges: Pending (Yellow), Approved (Green), Rejected (Red), Cancelled (Gray) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {b.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {b.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                        {b.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rejected
                          </span>
                        )}
                        {b.status === 'Cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            <Ban className="w-3.5 h-3.5 text-slate-400" />
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Admin Notes */}
                      <td className="px-6 py-4 text-xs text-slate-600 italic max-w-xs">
                        {b.admin_notes ? (
                          <span className="text-slate-800 not-italic font-medium">{b.admin_notes}</span>
                        ) : (
                          <span className="text-slate-400">Awaiting review</span>
                        )}
                      </td>

                      {/* Cancel Action */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {b.status === 'Pending' || b.status === 'Approved' ? (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel reservation #${b.id} for ${res?.name}?`)) {
                                onCancelBooking(b.id);
                              }
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded transition-colors cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-slate-600 font-medium text-sm">You have no reservation requests yet.</p>
            <p className="text-slate-400 text-xs mt-1">Book lecture rooms, GPUs, or hardware kits from the directory.</p>
            <button
              onClick={onOpenNewBooking}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Explore Campus Directory
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
