import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, Banknote, CreditCard,
  RefreshCw, BookOpen, Wallet, BarChart3, History, Settings,
  LogOut, Bell, PlusCircle, Search, Menu, X, CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatDateTime } from '../utils/formatters';

export const Layout = ({ onOpenNewLoan, onOpenRecordPayment, onOpenNewClient }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (e) {
      // ignore in background
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/guarantors', label: 'Guarantors', icon: ShieldCheck },
    { to: '/loans', label: 'Loans', icon: Banknote },
    { to: '/repayments', label: 'Repayments', icon: CreditCard },
    { to: '/rollovers', label: 'Rollovers', icon: RefreshCw },
    { to: '/loan-books', label: 'Book Records', icon: BookOpen },
    { to: '/cashbook', label: 'Cashbook & Capital', icon: Wallet },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/audit-logs', label: 'Activity Logs', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            K
          </div>
          <span className="font-bold text-lg tracking-tight">Keith Capital LMS</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-extrabold text-white shadow-md text-lg">
              K
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-tight">Keith Capital</h1>
              <p className="text-xs text-emerald-400 font-medium">Loan Management System</p>
            </div>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
            KES
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-emerald-400 text-xs">
                {user?.full_name ? user.full_name.charAt(0) : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        {/* Top Action Header */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Live Ledger • KES Default
            </span>
          </div>

          {/* Quick Actions & Notifications */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenNewClient}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 shadow-xs"
            >
              <PlusCircle size={14} className="text-slate-600" />
              <span>Register Client</span>
            </button>

            <button
              onClick={onOpenNewLoan}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
            >
              <Banknote size={14} />
              <span>New Loan</span>
            </button>

            <button
              onClick={onOpenRecordPayment}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
            >
              <CreditCard size={14} />
              <span>Record Payment</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-emerald-600 hover:underline flex items-center space-x-1"
                      >
                        <CheckCheck size={14} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`p-3 text-xs ${n.is_read ? 'bg-white' : 'bg-emerald-50/50'}`}>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-600 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="p-4 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

