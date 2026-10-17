import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, UserCheck, Lock, Mail, User as UserIcon, X, Check, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLogin,
  onRegister,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Student');
  const [regStudentId, setRegStudentId] = useState('');
  const [regError, setRegError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const user = users.find((u) => u.email.toLowerCase() === loginEmail.trim().toLowerCase());
    if (!user) {
      setLoginError('No user account found with that email. Please check your email or create an account.');
      return;
    }

    if (user.password && user.password !== loginPassword) {
      setLoginError('Invalid password. For demo users, use password123 or admin123.');
      return;
    }

    onLogin(user);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Please complete all required fields.');
      return;
    }

    if (!regEmail.includes('@')) {
      setRegError('Please provide a valid institutional email address.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setRegError('An account with this institutional email already exists. Please log in.');
      return;
    }

    const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const newUser: User = {
      id: newId,
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      studentId: regRole === 'Student' ? (regStudentId.trim() || `STU${100 + newId}`) : undefined,
      title: regRole === 'Admin' ? 'Campus Department Officer' : undefined,
      password: regPassword,
    };

    onRegister(newUser);
    onClose();
  };

  const quickDemoLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    const u = users.find((user) => user.email === email);
    if (u) {
      onLogin(u);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? 'Institutional Portal Sign In' : 'Register New Campus Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure role-based access for students and facility administrators
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-1 m-4 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginError('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegError('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register Student / Admin
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 pt-2">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="alex.chen@campus.edu"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Log In to Campus Portal
              </button>

              {/* Fast Demo Accounts Helper */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
                  Quick Demo Accounts (1-Click Test)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('alex.chen@campus.edu', 'password123')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 block truncate">Alex Chen</span>
                    <span className="text-[10px] text-slate-500 font-mono">Student &bull; STU102</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('m.smith@campus.edu', 'admin123')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 block truncate">Dr. Marcus Smith</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Campus Admin</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {regError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="maya.lin@campus.edu"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="Student">Student</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {regRole === 'Student' ? 'Student ID' : 'Office Code'}
                  </label>
                  <input
                    type="text"
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder={regRole === 'Student' ? 'STU108' : 'ADMIN-OPS'}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer mt-2"
              >
                Register & Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
