import React, { useState, useEffect } from 'react';
import { UserRole, User, Resource, Booking, AuditLog } from './types';
import {
  SEED_USERS,
  SEED_RESOURCES,
  getInitialBookings,
  getInitialAuditLogs,
} from './data/seedData';
import { validateBookingRequest } from './utils/bookingEngine';
import { Navbar } from './components/Navbar';
import { ResourceDirectory } from './components/ResourceDirectory';
import { BookingModal } from './components/BookingModal';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditLogView } from './components/AuditLogView';
import { PythonCodeInspector } from './components/PythonCodeInspector';
import { ConflictSimulator } from './components/ConflictSimulator';
import { CalendarView } from './components/CalendarView';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AuthModal } from './components/AuthModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  // Registered users state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('scb_users_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return SEED_USERS;
  });

  // Current logged in user (null = Guest mode)
  const [currentUser, setCurrentUser] = useState<User | null>(() => users[0]);

  // Current active role
  const [currentRole, setCurrentRole] = useState<UserRole>(() => users[0]?.role || 'Student');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'directory' | 'calendar' | 'student' | 'admin' | 'audit' | 'python' | 'conflict_lab' | 'analytics'>('directory');

  // Resources state
  const [resources] = useState<Resource[]>(SEED_RESOURCES);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('scb_bookings_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialBookings();
  });

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('scb_audit_logs_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialAuditLogs();
  });

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState<Resource | null>(null);
  const [bookingInitialDate, setBookingInitialDate] = useState<string | undefined>(undefined);
  const [bookingInitialTime, setBookingInitialTime] = useState<string | undefined>(undefined);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Global Alert / Notification Toast
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('scb_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('scb_bookings_v2', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('scb_audit_logs_v2', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Handle Role Switch
  const handleRoleSwitch = (newRole: UserRole) => {
    setCurrentRole(newRole);
    // Find matching user or fallback
    const matched = users.find((u) => u.role === newRole);
    if (matched) {
      setCurrentUser(matched);
    }
    if (newRole === 'Admin' && activeTab === 'student') {
      setActiveTab('admin');
    } else if (newRole === 'Student' && (activeTab === 'admin' || activeTab === 'audit' || activeTab === 'analytics')) {
      setActiveTab('student');
    }
    showAlert('info', 'Role Switched', `Switched active profile to ${newRole === 'Student' ? 'Alex Chen (STU102)' : 'Dr. Marcus Smith (Campus Manager)'}`);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'Admin' && activeTab === 'student') {
      setActiveTab('admin');
    }
    showAlert('success', 'Institutional Login Successful', `Welcome back, ${user.name} (${user.role === 'Student' ? (user.studentId || 'Student') : 'Campus Operations Admin'}).`);
  };

  const handleRegister = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setCurrentRole(newUser.role);
    showAlert('success', 'Campus Account Created', `Institutional account registered for ${newUser.name}. Signed in as ${newUser.role}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (activeTab === 'student' || activeTab === 'admin' || activeTab === 'audit' || activeTab === 'analytics') {
      setActiveTab('directory');
    }
    showAlert('info', 'Signed Out', 'You have been signed out. You can continue browsing resources as a Guest or sign in anytime.');
  };

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertMessage({ type, title, message });
    setTimeout(() => {
      setAlertMessage((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const handleResetData = () => {
    if (confirm('Reset database to starter seed data? This will restore original resources and sample bookings.')) {
      const freshBookings = getInitialBookings();
      const freshAudit = getInitialAuditLogs();
      setBookings(freshBookings);
      setAuditLogs(freshAudit);
      setUsers(SEED_USERS);
      setCurrentUser(SEED_USERS[0]);
      setCurrentRole('Student');
      localStorage.removeItem('scb_bookings_v2');
      localStorage.removeItem('scb_audit_logs_v2');
      localStorage.removeItem('scb_users_v2');
      showAlert('info', 'Database Reset', 'Campus database successfully reset to default seed records.');
    }
  };

  // Open booking modal (with optional initial resource, date, and start time)
  const handleOpenBookingModal = (res?: Resource, date?: string, time?: string) => {
    if (!currentUser) {
      showAlert('info', 'Authentication Required', 'Please log in or register a campus account before submitting facility reservations.');
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedResourceForBooking(res || null);
    setBookingInitialDate(date);
    setBookingInitialTime(time);
    setIsBookingModalOpen(true);
  };

  // Conflict Prevention Engine: Submit new booking request
  const handleSubmitBooking = (
    resourceId: number,
    startTime: string,
    endTime: string,
    purpose: string,
    proofFile?: string,
    proofFileName?: string
  ) => {
    if (!currentUser) {
      showAlert('error', 'Authentication Error', 'Session expired. Please sign in again.');
      setIsAuthModalOpen(true);
      return;
    }

    // 1. Conflict validation check with quota and business rules
    const validation = validateBookingRequest(resourceId, startTime, endTime, bookings, currentUser.id);
    if (!validation.isValid) {
      showAlert('error', 'Booking Validation Alert', validation.errorMessage || 'Invalid booking timeframe.');
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const newId = bookings.length > 0 ? Math.max(...bookings.map((b) => b.id)) + 1 : 1;
    const newBooking: Booking = {
      id: newId,
      resource_id: resourceId,
      user_id: currentUser.id,
      start_time: startTime,
      end_time: endTime,
      purpose,
      status: 'Pending',
      created_at: timestamp,
      proofFile,
      proofFileName,
    };

    const newLogId = auditLogs.length > 0 ? Math.max(...auditLogs.map((l) => l.id)) + 1 : 1;
    const proofDetail = proofFileName ? ` with proof document '${proofFileName}' attached` : '';
    const newAuditLog: AuditLog = {
      id: newLogId,
      booking_id: newId,
      action: 'Created',
      performed_by: `${currentUser.name} (${currentUser.studentId ? currentUser.studentId : currentUser.role})`,
      timestamp,
      details: `Initial reservation submission for purpose: "${purpose}"${proofDetail}`,
    };

    setBookings((prev) => [newBooking, ...prev]);
    setAuditLogs((prev) => [newAuditLog, ...prev]);

    showAlert(
      'success',
      'Booking Request Submitted',
      `Reservation #${newId} has been submitted with status 'Pending'. Awaiting campus facility administrator approval.`
    );
  };

  // Student Cancel Request
  const handleCancelBooking = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'Cancelled' } : b))
    );

    const newLogId = auditLogs.length > 0 ? Math.max(...auditLogs.map((l) => l.id)) + 1 : 1;
    const newAuditLog: AuditLog = {
      id: newLogId,
      booking_id: bookingId,
      action: 'Cancelled',
      performed_by: `${currentUser?.name || 'User'} (${currentUser?.studentId || 'Student'})`,
      timestamp,
      details: `Reservation cancelled by user before event start.`,
    };

    setAuditLogs((prev) => [newAuditLog, ...prev]);
    showAlert('info', 'Booking Cancelled', `Reservation #${bookingId} has been marked as Cancelled.`);
  };

  // Admin Approve request
  const handleApproveBooking = (bookingId: number, adminNote: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Double check conflict before final approval
    const validation = validateBookingRequest(
      booking.resource_id,
      booking.start_time,
      booking.end_time,
      bookings,
      booking.user_id,
      bookingId
    );

    if (!validation.isValid && validation.conflictingBooking?.status === 'Approved') {
      showAlert(
        'error',
        'Cannot Approve Overlap',
        `This slot collides with approved reservation #${validation.conflictingBooking.id}. Reject or reschedule first.`
      );
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'Approved', admin_notes: adminNote } : b
      )
    );

    const newLogId = auditLogs.length > 0 ? Math.max(...auditLogs.map((l) => l.id)) + 1 : 1;
    const newAuditLog: AuditLog = {
      id: newLogId,
      booking_id: bookingId,
      action: 'Approved',
      performed_by: `${currentUser?.name || 'Dr. Marcus Smith'} (Admin)`,
      timestamp,
      details: `Decision Note: "${adminNote}"`,
    };

    setAuditLogs((prev) => [newAuditLog, ...prev]);
    showAlert('success', 'Booking Approved', `Reservation #${bookingId} has been approved.`);
  };

  // Admin Reject request
  const handleRejectBooking = (bookingId: number, adminNote: string) => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'Rejected', admin_notes: adminNote } : b
      )
    );

    const newLogId = auditLogs.length > 0 ? Math.max(...auditLogs.map((l) => l.id)) + 1 : 1;
    const newAuditLog: AuditLog = {
      id: newLogId,
      booking_id: bookingId,
      action: 'Rejected',
      performed_by: `${currentUser?.name || 'Dr. Marcus Smith'} (Admin)`,
      timestamp,
      details: `Rejection Reason: "${adminNote}"`,
    };

    setAuditLogs((prev) => [newAuditLog, ...prev]);
    showAlert('info', 'Booking Rejected', `Reservation #${bookingId} was rejected.`);
  };

  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleSwitch={handleRoleSwitch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
        onResetData={handleResetData}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Alert Banner / Notification */}
      {alertMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full animate-fadeIn">
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs ${
              alertMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : alertMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {alertMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : alertMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="block text-sm font-semibold">{alertMessage.title}</strong>
                <p className="text-xs mt-0.5 leading-relaxed">{alertMessage.message}</p>
              </div>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {activeTab === 'directory' && (
          <ResourceDirectory
            resources={resources}
            bookings={bookings}
            onOpenBooking={handleOpenBookingModal}
            onViewCalendar={() => setActiveTab('calendar')}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            bookings={bookings}
            resources={resources}
            currentUser={currentUser || users[0]}
            onOpenBookingSlot={(resourceId, dateStr, timeStr) => {
              const res = resources.find((r) => r.id === resourceId) || resources[0];
              handleOpenBookingModal(res, dateStr, timeStr);
            }}
          />
        )}

        {activeTab === 'student' && (
          <StudentDashboard
            bookings={bookings}
            resources={resources}
            currentUser={currentUser || users[0]}
            onCancelBooking={handleCancelBooking}
            onOpenNewBooking={() => handleOpenBookingModal()}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            bookings={bookings}
            resources={resources}
            users={users}
            currentUser={currentUser || users[1]}
            onApproveBooking={handleApproveBooking}
            onRejectBooking={handleRejectBooking}
            onViewAuditLogs={() => setActiveTab('audit')}
            onViewAnalytics={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'analytics' && (
          <AdminAnalytics
            bookings={bookings}
            resources={resources}
            users={users}
            onBackToApprovals={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogView
            auditLogs={auditLogs}
            bookings={bookings}
            resources={resources}
            onBackToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'conflict_lab' && (
          <ConflictSimulator
            resources={resources}
            bookings={bookings}
            currentUser={currentUser || users[0]}
            onSimulateInject={(injected) => {
              setBookings((prev) => [...injected, ...prev]);
            }}
          />
        )}

        {activeTab === 'python' && <PythonCodeInspector />}
      </main>

      {/* Booking Modal with Slot Selector, Conflict Prevention & Proof Upload */}
      {currentUser && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setBookingInitialDate(undefined);
            setBookingInitialTime(undefined);
          }}
          resources={resources}
          selectedResource={selectedResourceForBooking}
          initialDate={bookingInitialDate}
          initialStartTime={bookingInitialTime}
          existingBookings={bookings}
          currentUser={currentUser}
          onSubmitBooking={handleSubmitBooking}
        />
      )}

      {/* Auth Modal for Login / Signup / Role Management */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Smart Campus Resource & Room Booking System &bull; Embedded SQLite Architecture</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('python')}
              className="text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              View Python app.py
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-slate-600 hover:underline font-mono"
            >
              {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Sign In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
