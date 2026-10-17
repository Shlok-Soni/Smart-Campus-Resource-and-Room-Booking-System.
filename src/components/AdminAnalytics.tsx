import React, { useState } from 'react';
import { Booking, Resource, User } from '../types';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  Users,
  ArrowUpRight
} from 'lucide-react';

interface AdminAnalyticsProps {
  bookings: Booking[];
  resources: Resource[];
  users: User[];
  onBackToApprovals: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  bookings,
  resources,
  users,
  onBackToApprovals,
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'approved_only'>('all');

  const filteredBookings = bookings.filter((b) => {
    if (timeFilter === 'approved_only') return b.status === 'Approved';
    return true;
  });

  // 1. Metric: Resource Popularity / Frequency
  const resourceCounts = resources.map((res) => {
    const count = bookings.filter((b) => b.resource_id === res.id).length;
    const approvedCount = bookings.filter((b) => b.resource_id === res.id && b.status === 'Approved').length;
    return {
      resource: res,
      totalCount: count,
      approvedCount,
    };
  }).sort((a, b) => b.totalCount - a.totalCount);

  const maxResourceCount = Math.max(...resourceCounts.map((r) => r.totalCount), 1);

  // 2. Metric: Booking Status Breakdown
  const statusCounts = {
    Approved: bookings.filter((b) => b.status === 'Approved').length,
    Pending: bookings.filter((b) => b.status === 'Pending').length,
    Rejected: bookings.filter((b) => b.status === 'Rejected').length,
    Cancelled: bookings.filter((b) => b.status === 'Cancelled').length,
  };

  const totalBookings = bookings.length;
  const approvalRate = totalBookings > 0
    ? Math.round((statusCounts.Approved / totalBookings) * 100)
    : 0;

  // 3. Metric: Peak Hours Distribution (8 AM to 8 PM)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8, 9, 10, ..., 19
  const hourCounts = hours.map((hour) => {
    const count = filteredBookings.filter((b) => {
      try {
        const startHour = new Date(b.start_time).getHours();
        const endHour = new Date(b.end_time).getHours();
        return hour >= startHour && hour < endHour;
      } catch {
        return false;
      }
    }).length;
    return {
      hour,
      label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
      count,
    };
  });

  const maxHourCount = Math.max(...hourCounts.map((h) => h.count), 1);
  const peakHour = [...hourCounts].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Campus Facility Analytics Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              Real-time Metrics
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Visualized booking frequencies, approval pipeline breakdown, and peak campus utilization hours.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToApprovals}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            &larr; Admin Approvals Queue
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Reservations
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {totalBookings}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Across {resources.length} campus assets
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Approval Success Rate
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
              {approvalRate}%
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              {statusCounts.Approved} slots confirmed
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Peak Traffic Slot
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {peakHour?.label || '10:00 AM'}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              {peakHour?.count || 0} overlapping reservations
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pending Decisions
            </span>
            <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
              {statusCounts.Pending}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Awaiting admin approval
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Resource Popularity (Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Resource Booking Frequency & Popularity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of request demand across lecture halls, compute clusters, and labs
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total Bookings</span>
          </div>

          <div className="space-y-4 pt-2">
            {resourceCounts.map(({ resource, totalCount, approvedCount }) => {
              const percentage = Math.round((totalCount / maxResourceCount) * 100);

              return (
                <div key={resource.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{resource.name}</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                        {resource.category}
                      </span>
                      {resource.requiresProof && (
                        <span className="text-[9px] font-semibold px-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Proof Req.
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-600 font-semibold">
                      {totalCount} bookings ({approvedCount} approved)
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden flex">
                    <div
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                      className="bg-indigo-600 hover:bg-indigo-700 transition-all rounded-lg flex items-center justify-end pr-2 text-white text-[10px] font-mono font-bold shadow-xs"
                    >
                      {totalCount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Status Breakdown (Doughnut / Distribution Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                Status Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolution distribution of all requests
              </p>
            </div>

            {/* Visual Donut Ring Representation */}
            <div className="pt-6 pb-4 flex flex-col items-center justify-center">
              <div className="w-36 h-36 rounded-full border-12 border-indigo-600 border-t-amber-400 border-r-emerald-500 border-l-rose-500 flex flex-col items-center justify-center bg-slate-50 shadow-inner">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {totalBookings}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total
                </span>
              </div>
            </div>

            {/* Legend & Percentages */}
            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="flex items-center gap-2 font-medium text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Approved
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {statusCounts.Approved} ({totalBookings > 0 ? Math.round((statusCounts.Approved / totalBookings) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="flex items-center gap-2 font-medium text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  Pending Review
                </span>
                <span className="font-mono font-bold text-amber-800">
                  {statusCounts.Pending} ({totalBookings > 0 ? Math.round((statusCounts.Pending / totalBookings) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-100">
                <span className="flex items-center gap-2 font-medium text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Rejected
                </span>
                <span className="font-mono font-bold text-rose-800">
                  {statusCounts.Rejected} ({totalBookings > 0 ? Math.round((statusCounts.Rejected / totalBookings) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  Cancelled
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {statusCounts.Cancelled} ({totalBookings > 0 ? Math.round((statusCounts.Cancelled / totalBookings) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 3: Peak Hours Distribution (Bar Histogram across 08:00 AM - 08:00 PM) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Peak Campus Facility Utilization Hours (08:00 AM – 08:00 PM)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hourly occupancy distribution across all campus facilities
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Filter:</span>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Bookings
            </button>
            <button
              onClick={() => setTimeFilter('approved_only')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                timeFilter === 'approved_only'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Approved Only
            </button>
          </div>
        </div>

        {/* Histogram Bars */}
        <div className="pt-4">
          <div className="grid grid-cols-12 gap-2 h-44 items-end pb-2 border-b border-slate-200">
            {hourCounts.map((item) => {
              const heightPercent = Math.max(12, Math.round((item.count / maxHourCount) * 100));
              const isPeak = item.count === maxHourCount && item.count > 0;

              return (
                <div key={item.hour} className="flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-mono font-bold text-slate-600 mb-1 opacity-80 group-hover:opacity-100">
                    {item.count}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all cursor-pointer ${
                      isPeak
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-xs'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                    title={`${item.label}: ${item.count} reservations plotted`}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* Hour Labels */}
          <div className="grid grid-cols-12 gap-2 pt-2 text-center">
            {hourCounts.map((item) => (
              <span key={item.hour} className="text-[10px] font-mono text-slate-400 block truncate">
                {item.hour > 12 ? `${item.hour - 12}p` : `${item.hour}a`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
