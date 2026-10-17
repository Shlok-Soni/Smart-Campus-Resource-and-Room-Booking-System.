import React, { useState } from 'react';
import { Resource, ResourceCategory, Booking } from '../types';
import { Search, Users, Cpu, ShieldAlert, Sparkles, Plus, Calendar, CalendarDays } from 'lucide-react';

interface ResourceDirectoryProps {
  resources: Resource[];
  bookings: Booking[];
  onOpenBooking: (resource: Resource) => void;
  onViewCalendar?: () => void;
}

export const ResourceDirectory: React.FC<ResourceDirectoryProps> = ({
  resources,
  bookings,
  onOpenBooking,
  onViewCalendar,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredResources = resources.filter((res) => {
    const matchesCategory =
      selectedCategory === 'All' || res.category === selectedCategory;
    const matchesSearch =
      res.name.toLowerCase().includes(search.toLowerCase()) ||
      res.specs.toLowerCase().includes(search.toLowerCase()) ||
      res.guidelines.toLowerCase().includes(search.toLowerCase()) ||
      (res.location && res.location.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const categories: string[] = ['All', 'Room', 'Lab Gear', 'Hardware'];

  const getActiveReservationsCount = (resourceId: number) => {
    return bookings.filter(
      (b) => b.resource_id === resourceId && (b.status === 'Approved' || b.status === 'Pending')
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Campus Resource Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and reserve university lecture halls, AI compute clusters, and IoT hardware benches.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onViewCalendar && (
            <button
              onClick={onViewCalendar}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              View Weekly Calendar
            </button>
          )}
          <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900">{resources.length}</span> Resources Available
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by resource name, hardware specs, or location..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs (Segmented Buttons with item count) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
          {categories.map((cat) => {
            const count =
              cat === 'All'
                ? resources.length
                : resources.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === cat
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

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => {
          const activeCount = getActiveReservationsCount(resource.id);

          return (
            <div
              key={resource.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all group"
            >
              {/* Media Thumbnail */}
              <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                {resource.imageUrl ? (
                  <img
                    src={resource.imageUrl}
                    alt={resource.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Robotics+Lab';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-400">
                    <Cpu className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium">{resource.name}</span>
                  </div>
                )}
                
                {/* Category & Status Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                    {resource.category}
                  </div>
                  {resource.requiresProof && (
                    <div className="bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow-xs flex items-center gap-1">
                      <span>Proof Req.</span>
                    </div>
                  )}
                </div>

                {activeCount > 0 && (
                  <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs font-mono">
                    {activeCount} Reserved
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {resource.name}
                    </h3>
                  </div>

                  {resource.location && (
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {resource.location}
                    </span>
                  )}

                  {/* Metadata Row (Unboxed metadata with typographic separators) */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    {resource.capacity ? (
                      <span className="flex items-center gap-1 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Cap: <strong className="text-slate-700">{resource.capacity}</strong>
                      </span>
                    ) : (
                      <span>Equipment Unit</span>
                    )}
                    <span aria-hidden="true">&bull;</span>
                    <span>Status: Available</span>
                  </div>

                  {/* Technical Specifications */}
                  <div className="mt-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Specifications
                    </span>
                    <p className="text-xs text-slate-700 font-mono leading-relaxed line-clamp-2">
                      {resource.specs}
                    </p>
                  </div>

                  {/* Guidelines */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Usage Guidelines
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {resource.guidelines}
                    </p>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenBooking(resource)}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Reserve Slot &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-medium text-sm">
            No campus resources matched your search filter.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Try adjusting your search keywords or switching category filters.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
