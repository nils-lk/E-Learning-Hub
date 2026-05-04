import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, LogOut, LayoutDashboard, Moon, Sun, Menu, X, GraduationCap, ChevronDown, User
} from 'lucide-react';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const roleLabel = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    lecturer: 'Lecturer',
    user: 'Student',
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md'
        : 'bg-white dark:bg-gray-900'
    } border-b border-gray-100 dark:border-gray-800`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-nilsBlue-700 to-nilsBlue-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-nilsBlue-500/30 transition-all duration-300">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-nilsBlue-800 dark:text-nilsBlue-200 text-lg leading-none block">NILS</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">E-Learning Hub</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-nilsBlue-50 dark:bg-nilsBlue-900/30 text-nilsBlue-700 dark:text-nilsBlue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-nilsBlue-700 dark:hover:text-nilsBlue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />Courses</span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nilsBlue-600 to-nilsBlue-800 flex items-center justify-center text-white text-sm font-bold shadow">
                    {profile?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-none">
                      {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-nilsBlue-600 dark:text-nilsBlue-400 leading-none mt-0.5">
                      {roleLabel[profile?.role] || 'Student'}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 animate-fade-in">
                    <Link to="/dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link to="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-primary text-sm py-2 px-4">Sign In</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <BookOpen className="w-4 h-4" /> Courses
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <User className="w-4 h-4" /> My Profile
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="block px-3 py-2.5 text-sm font-medium text-nilsBlue-700 dark:text-nilsBlue-300">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
