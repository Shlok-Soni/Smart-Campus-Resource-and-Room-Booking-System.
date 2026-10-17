import React from 'react';
import { UserRole, User } from '../types';
import {
  Building2,
  CalendarCheck,
  ShieldCheck,
  FileText,
  Code2,
  RotateCcw,
  CalendarDays,
  BarChart3,
  LogOut,
  LogIn,
  User as UserIcon
} from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  currentUser: User | null;
  onRoleSwitch: (role: UserRole) => void;
  activeTab: 'directory' | 'calendar' | 'student' | 'admin' | 'audit' | 'python' | 'conflict_lab' | 'analytics';
  onTabChange: (tab: 'directory' | 'calendar' | 'student' | 'admin' | 'audit' | 'python' | 'conflict_lab' | 'analytics') => void;
  pendingCount: number;
  onResetData: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentUser,
  onRoleSwitch,
  activeTab,
  onTabChange,
  pendingCount,
  onResetData,
  onOpenAuthModal,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <div
          onClick={() => onTabChange('directory')}
          className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-base tracking-tight whitespace-nowrap leading-tight">
              Smart Campus Booking
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap leading-none mt-0.5">
              Resource & Room Allocation System
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium text-slate-600">
          <button
            onClick={() => onTabChange('directory')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'directory'
                ? 'text-indigo-600 bg-indigo-50 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Directory
          </button>

          <button
            onClick={() => onTabChange('calendar')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'calendar'
                ? 'text-indigo-600 bg-indigo-50 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Weekly visual calendar view of approved bookings & available slots"
          >
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Calendar View
          </button>

          {currentRole === 'Student' && (
            <button
              onClick={() => onTabChange('student')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'student'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              My Reservations
            </button>
          )}

          {currentRole === 'Admin' && (
            <>
              <button
                onClick={() => onTabChange('admin')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-indigo-600 bg-indigo-50 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Approvals
                {pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white font-mono">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'text-indigo-600 bg-indigo-50 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="View booking analytics, resource popularity, and peak hours"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Analytics
              </button>

              <button
                onClick={() => onTabChange('audit')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'text-indigo-600 bg-indigo-50 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Audit Logs
              </button>
            </>
          )}

          <button
            onClick={() => onTabChange('conflict_lab')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'conflict_lab'
                ? 'text-rose-700 bg-rose-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Inspect what happens with multiple overlapping bookings"
          >
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            Conflict Lab
          </button>

          <button
            onClick={() => onTabChange('python')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'python'
                ? 'text-indigo-600 bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Inspect & download the Python/Flask backend"
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            Python app.py
          </button>
        </nav>

        {/* Zone 3: Authentication & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser ? (
            <>
              {/* Fast Role Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => onRoleSwitch('Student')}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap font-medium cursor-pointer ${
                    currentRole === 'Student'
                      ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Student
                </button>
                <button
                  onClick={() => onRoleSwitch('Admin')}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap font-medium cursor-pointer ${
                    currentRole === 'Admin'
                      ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin
                </button>
              </div>

              {/* Active User Indicator */}
              <div
                onClick={onOpenAuthModal}
                className="hidden lg:flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to switch user or inspect authentication"
              >
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  {currentUser.role === 'Student' ? `ID: ${currentUser.studentId || 'STU102'}` : (currentUser.title || 'Campus Manager')}
                </span>
              </div>

              {/* Sign out button */}
              <button
                onClick={onLogout}
                title="Log out of institutional portal"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In / Register
            </button>
          )}

          {/* Reset Seed Data Button */}
          <button
            onClick={onResetData}
            title="Reset to default seed data"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
