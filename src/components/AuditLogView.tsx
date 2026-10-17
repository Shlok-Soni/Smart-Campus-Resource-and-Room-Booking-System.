import React, { useState } from 'react';
import { AuditLog, Booking, Resource } from '../types';
import { FileText, Search, Filter, ArrowLeft } from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
  bookings: Booking[];
  resources: Resource[];
  onBackToAdmin: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  bookings,
  resources,
  onBackToAdmin,
}) => {
  const [filterAction, setFilterAction] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const getResourceName = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    const resource = resources.find((r) => r.id === booking.resource_id);
    return resource?.name;
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = filterAction === 'All' || log.action === filterAction;
    const resourceName = getResourceName(log.booking_id) || '';
    const matchesSearch =
      log.performed_by.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
      resourceName.toLowerCase().includes(search.toLowerCase()) ||
      String(log.booking_id).includes(search);

    return matchesAction && matchesSearch;
  });

  const actions = ['All', 'Created', 'Approved', 'Rejected', 'Cancelled'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Audit Trail & History Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable operational event log recording all reservation lifecycle actions, decisions, and actor identities.
          </p>
        </div>
        <button
          onClick={onBackToAdmin}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 self-start cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Admin Queue
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, booking ID, resource, or note details..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {actions.map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                filterAction === act
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Event History Log</h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredLogs.length} event records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Booking ID</th>
                <th className="px-6 py-3">Target Resource</th>
                <th className="px-6 py-3">Performed By</th>
                <th className="px-6 py-3">Audit Details & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {filteredLogs.map((log) => {
                const resName = getResourceName(log.booking_id);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="px-6 py-4 font-sans whitespace-nowrap">
                      {log.action === 'Approved' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {log.action === 'Created' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Created
                        </span>
                      )}
                      {log.action === 'Rejected' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                      {log.action === 'Cancelled' && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-800">
                      #{log.booking_id}
                    </td>

                    <td className="px-6 py-4 font-sans font-medium text-slate-900">
                      {resName || '—'}
                    </td>

                    <td className="px-6 py-4 font-sans text-slate-700">
                      {log.performed_by}
                    </td>

                    <td className="px-6 py-4 font-sans text-slate-600 max-w-sm">
                      {log.details || '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
