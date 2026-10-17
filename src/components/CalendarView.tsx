import React, { useState } from 'react';
import { Booking, Resource, User } from '../types';
import { formatTime12h } from '../utils/bookingEngine';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Layers,
  MapPin,
  Check
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
  resources: Resource[];
  currentUser: User;
  onOpenBookingSlot: (resourceId: number, dateStr: string, timeStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  bookings,
  resources,
  currentUser,
  onOpenBookingSlot,
}) => {
  // Current reference date (defaults to Monday of the current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    // Calculate difference to Monday (if Sunday (0), go back 6 days)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [selectedResourceId, setSelectedResourceId] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPending, setShowPending] = useState<boolean>(false);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);

  // Generate 7 days for the active week (Mon - Sun)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    return day;
  });

  // Operating Hours: 08:00 AM to 08:00 PM (8 to 19 inclusive for 1-hour slots)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8, 9, 10, ..., 19

  // Navigate weeks
  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Helper to get resource
  const getResource = (id: number) => resources.find((r) => r.id === id);

  // Filter resources by category if specified
  const filteredResourceList = resources.filter((r) => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    return true;
  });

  // Filter bookings based on selected resource and status
  const filteredBookings = bookings.filter((b) => {
    if (selectedResourceId !== 'all' && b.resource_id !== selectedResourceId) {
      return false;
    }
    if (selectedCategory !== 'all') {
      const res = getResource(b.resource_id);
      if (res && res.category !== selectedCategory) return false;
    }
    if (b.status === 'Approved') return true;
    if (showPending && b.status === 'Pending') return true;
    return false;
  });

  // Calculate statistics for the active week
  const weekStartStr = weekDays[0].toISOString().split('T')[0];
  const weekEndStr = weekDays[6].toISOString().split('T')[0];
  const activeWeekBookings = filteredBookings.filter((b) => {
    const bDate = b.start_time.split('T')[0];
    return bDate >= weekStartStr && bDate <= weekEndStr;
  });

  const totalPossibleSlotHours =
    (selectedResourceId === 'all' ? filteredResourceList.length : 1) * 7 * 12;

  // Count occupied hours in this week
  let occupiedSlotHours = 0;
  activeWeekBookings.forEach((b) => {
    const s = new Date(b.start_time).getTime();
    const e = new Date(b.end_time).getTime();
    const durationHours = Math.max(1, Math.round((e - s) / (1000 * 60 * 60)));
    occupiedSlotHours += durationHours;
  });

  const availableSlotHours = Math.max(0, totalPossibleSlotHours - occupiedSlotHours);
  const utilizationPercent =
    totalPossibleSlotHours > 0
      ? Math.min(100, Math.round((occupiedSlotHours / totalPossibleSlotHours) * 100))
      : 0;

  // Resource color theme mapping
  const getResourceColorClass = (resourceId: number, status: string) => {
    if (status === 'Pending') {
      return 'bg-amber-50 border-amber-300 text-amber-900 border-dashed hover:bg-amber-100/90 shadow-2xs';
    }
    const themes = [
      'bg-indigo-50/90 border-indigo-200 text-indigo-950 hover:bg-indigo-100 shadow-2xs',
      'bg-emerald-50/90 border-emerald-200 text-emerald-950 hover:bg-emerald-100 shadow-2xs',
      'bg-sky-50/90 border-sky-200 text-sky-950 hover:bg-sky-100 shadow-2xs',
      'bg-purple-50/90 border-purple-200 text-purple-950 hover:bg-purple-100 shadow-2xs',
    ];
    return themes[resourceId % themes.length];
  };

  const getDayDateStr = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Campus Weekly Calendar View
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              08:00 AM – 08:00 PM Daily
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3" /> Approved Bookings Displayed
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Interactive weekly schedule grid. All approved reservations are plotted below to help students quickly spot open slots and book immediately.
          </p>
        </div>

        {/* Week Switcher & Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              This Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Room">Rooms Only</option>
              <option value="Lab Gear">Lab Gear Only</option>
              <option value="Hardware">Hardware Only</option>
            </select>
          </div>

          {/* Pending Toggle */}
          <button
            onClick={() => setShowPending(!showPending)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showPending
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Toggle to view pending bookings awaiting campus manager approval"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                showPending ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            ></span>
            {showPending ? 'Showing Pending' : 'Include Pending'}
          </button>
        </div>
      </div>

      {/* Resource Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Resource:
        </span>
        <button
          onClick={() => setSelectedResourceId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
            selectedResourceId === 'all'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Resources ({resources.length})
        </button>
        {resources.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedResourceId(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedResourceId === r.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{r.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded ${
                selectedResourceId === r.id
                  ? 'bg-indigo-700 text-indigo-100'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {r.category}
            </span>
          </button>
        ))}
      </div>

      {/* Week Date Range & Availability Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Date Range Display */}
        <div className="flex items-center gap-3 md:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Week
            </span>
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              {weekDays[0].toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              &ndash;{' '}
              {weekDays[6].toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Availability Metric 1: Open Hours */}
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4 pt-2 md:pt-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Available Slot Hours
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                {availableSlotHours}
              </span>
              <span className="text-xs text-slate-500">hrs open to book</span>
            </div>
          </div>
        </div>

        {/* Availability Metric 2: Approved Bookings */}
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4 pt-2 md:pt-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Reservations Plotted
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                {activeWeekBookings.length}
              </span>
              <span className="text-xs text-slate-500">
                ({utilizationPercent}% booked)
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-start md:justify-end gap-3 text-[11px] border-t md:border-t-0 md:border-l border-slate-100 md:pl-4 pt-2 md:pt-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-600 shrink-0"></span>
            <span className="text-slate-700 font-medium">Approved</span>
          </div>
          {showPending && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 border-dashed shrink-0"></span>
              <span className="text-slate-700 font-medium">Pending</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300 border-dashed shrink-0"></span>
            <span className="text-emerald-700 font-medium">Free Slot</span>
          </div>
        </div>
      </div>

      {/* Main Weekly CSS Grid Viewport */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            {/* Header: Days of the Week */}
            <div
              className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-10"
              style={{ gridTemplateColumns: '76px repeat(7, minmax(115px, 1fr))' }}
            >
              <div className="p-3 text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider border-r border-slate-200 flex items-center justify-center font-mono">
                Hour
              </div>

              {weekDays.map((date, idx) => {
                const dateStr = getDayDateStr(date);
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={idx}
                    className={`p-3 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                      isToday ? 'bg-indigo-50/70' : ''
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-sm font-bold font-mono mt-0.5 inline-block px-2.5 py-0.5 rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-900'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour Rows */}
            <div className="divide-y divide-slate-100">
              {hours.map((hour) => {
                const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                const displayHour = formatTime12h(`2026-01-01T${hourStr}`);

                return (
                  <div
                    key={hour}
                    className="grid min-h-[64px]"
                    style={{
                      gridTemplateColumns: '76px repeat(7, minmax(115px, 1fr))',
                    }}
                  >
                    {/* Time Label on Left */}
                    <div className="p-2 text-[11px] font-mono text-slate-400 border-r border-slate-200 text-center select-none flex items-start justify-center pt-3 font-semibold bg-slate-50/40">
                      {displayHour}
                    </div>

                    {/* 7 Day Slot Columns */}
                    {weekDays.map((dayDate, dayIdx) => {
                      const dayStr = getDayDateStr(dayDate);
                      const slotStartIso = `${dayStr}T${hourStr}`;
                      const nextHour = (hour + 1).toString().padStart(2, '0') + ':00';
                      const slotEndIso = `${dayStr}T${nextHour}`;

                      // Find bookings that cover or start in this hour slot
                      const slotBookings = filteredBookings.filter((b) => {
                        if (!b.start_time.startsWith(dayStr)) return false;
                        // Overlaps with this hour block: (b.start_time < slotEndIso) AND (b.end_time > slotStartIso)
                        return b.start_time < slotEndIso && b.end_time > slotStartIso;
                      });

                      const isFirstHourOfBooking = (b: Booking) => {
                        const bStartHour = new Date(b.start_time).getHours();
                        return bStartHour === hour;
                      };

                      // Count how many resources are free in this slot
                      const targetResources =
                        selectedResourceId !== 'all'
                          ? resources.filter((r) => r.id === selectedResourceId)
                          : filteredResourceList;

                      const bookedResourceIds = new Set(slotBookings.map((b) => b.resource_id));
                      const unbookedResources = targetResources.filter(
                        (r) => !bookedResourceIds.has(r.id)
                      );

                      const hasBookings = slotBookings.length > 0;
                      const hasAvailable = unbookedResources.length > 0;

                      return (
                        <div
                          key={dayIdx}
                          className="border-r border-slate-200 last:border-r-0 relative p-1 group hover:bg-slate-50/80 transition-colors flex flex-col justify-between"
                        >
                          {/* Slot Content */}
                          {!hasBookings ? (
                            // Completely Free Slot
                            <button
                              type="button"
                              onClick={() => {
                                const targetRes =
                                  selectedResourceId !== 'all'
                                    ? selectedResourceId
                                    : unbookedResources[0]?.id || resources[0].id;
                                onOpenBookingSlot(targetRes, dayStr, hourStr);
                              }}
                              className="w-full h-full min-h-[54px] rounded-lg border border-transparent hover:border-dashed hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-400 hover:text-emerald-700 transition-all flex flex-col items-center justify-center gap-1 text-[11px] cursor-pointer p-1"
                              title={`Available slot at ${displayHour} on ${dayStr} - Click to book`}
                            >
                              <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-3.5 h-3.5" /> Book Slot
                              </span>
                              <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-mono">
                                Available
                              </span>
                            </button>
                          ) : (
                            // Render Bookings inside this slot
                            <div className="space-y-1 w-full">
                              {slotBookings.map((b) => {
                                const res = getResource(b.resource_id);
                                const isStart = isFirstHourOfBooking(b);
                                const colorClass = getResourceColorClass(
                                  b.resource_id,
                                  b.status
                                );

                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setInspectedBooking(b)}
                                    className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${colorClass} ${
                                      !isStart ? 'opacity-90' : ''
                                    }`}
                                    title={`Click to view reservation details (#${b.id})`}
                                  >
                                    <div className="flex items-center justify-between gap-1 leading-tight">
                                      <span className="font-bold truncate text-[11px] text-slate-900">
                                        {res?.name}
                                      </span>
                                      <span
                                        className={`font-mono text-[9px] uppercase px-1 rounded shrink-0 font-semibold ${
                                          b.status === 'Approved'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {b.status}
                                      </span>
                                    </div>

                                    {isStart && (
                                      <div className="mt-1">
                                        <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>
                                            {formatTime12h(b.start_time)} -{' '}
                                            {formatTime12h(b.end_time)}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-700 truncate mt-0.5">
                                          {b.purpose}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* If in "All Resources" mode and some resources are still free in this hour */}
                              {selectedResourceId === 'all' && hasAvailable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetRes = unbookedResources[0]?.id || resources[0].id;
                                    onOpenBookingSlot(targetRes, dayStr, hourStr);
                                  }}
                                  className="w-full py-1 px-1.5 rounded border border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/80 text-[10px] font-semibold text-emerald-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title={`Book one of the remaining ${unbookedResources.length} available resources`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{unbookedResources.length} free &bull; Book</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Details Drawer/Modal */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    inspectedBooking.status === 'Approved'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                ></span>
                <h3 className="text-base font-bold text-slate-900">
                  Reservation #{inspectedBooking.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Campus Resource
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {getResource(inspectedBooking.resource_id)?.name}
                </p>
                <span className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                    {getResource(inspectedBooking.resource_id)?.category}
                  </span>
                  <span>&bull;</span>
                  <span>{getResource(inspectedBooking.resource_id)?.location}</span>
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-900">
                    {inspectedBooking.start_time.split('T')[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Range:</span>
                  <span className="font-semibold text-slate-900">
                    {formatTime12h(inspectedBooking.start_time)} &rarr;{' '}
                    {formatTime12h(inspectedBooking.end_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Approval Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                      inspectedBooking.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {inspectedBooking.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Stated Purpose / Project
                </span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {inspectedBooking.purpose}
                </p>
              </div>

              {inspectedBooking.admin_notes && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Administrator Review Notes
                  </span>
                  <p className="text-slate-700 italic bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                    "{inspectedBooking.admin_notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectedBooking(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
