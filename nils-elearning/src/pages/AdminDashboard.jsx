import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  CheckCircle, XCircle, Eye, BookOpen, Clock, FileText,
  Users, TrendingUp, AlertCircle, ExternalLink, Search, Edit3, User, X, Save,
  Download, BarChart2
} from 'lucide-react';

const TABS = ['Pending Slips', 'Course Approvals', 'All Enrollments', 'User Registry', 'Reports'];
const ROLES = ['user', 'lecturer', 'admin'];

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState(0);
  const [pendingSlips, setPendingSlips] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slipUrls, setSlipUrls] = useState({});
  const [processing, setProcessing] = useState({});
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // User Action States
  const [updatingRole, setUpdatingRole] = useState({});
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletePin, setDeletePin] = useState('');

  // Course Search
  const [courseSearch, setCourseSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [
      { data: slips }, 
      { data: courses }, 
      { data: enrolAll }, 
      { data: allProfiles }
    ] = await Promise.all([
      supabase.from('enrollments').select('*, profiles:user_id(email, full_name, phone), courses(title, price)')
        .eq('status', 'pending').not('payment_slip_url', 'is', null),
      supabase.from('courses').select('*, profiles:lecturer_id(email, full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('enrollments').select('*, profiles:user_id(email, full_name, phone), courses(title, price)')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
    ]);
    
    setPendingSlips(slips ?? []);
    setPendingCourses(courses ?? []);
    setAllEnrollments(enrolAll ?? []);
    // Admins can see all profiles EXCEPT Super Admins
    setProfiles((allProfiles ?? []).filter(p => p.role !== 'superadmin'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getSlipUrl = async (path, id) => {
    if (slipUrls[id]) return;
    const { data } = await supabase.storage.from('payment_slips').createSignedUrl(path, 3600);
    if (data?.signedUrl) setSlipUrls(prev => ({ ...prev, [id]: data.signedUrl }));
  };

  const updateEnrollment = async (id, status) => {
    setProcessing(p => ({ ...p, [id]: true }));
    await supabase.from('enrollments').update({ status }).eq('id', id);
    await load();
    setProcessing(p => ({ ...p, [id]: false }));
  };

  const updateCourse = async (id, is_approved) => {
    setProcessing(p => ({ ...p, [id]: true }));
    await supabase.from('courses').update({ is_approved }).eq('id', id);
    await load();
    setProcessing(p => ({ ...p, [id]: false }));
  };

  const handleEditProfile = (p) => {
    setEditingProfile(p);
    setProfileForm({
      full_name: p.full_name || '',
      name_with_initials: p.name_with_initials || '',
      nic: p.nic || '',
      gender: p.gender || 'male',
      phone: p.phone || '',
      address: p.address || '',
      date_of_birth: p.date_of_birth || ''
    });
  };

  const saveUserProfile = async () => {
    setSavingProfile(true);
    const payload = { ...profileForm };
    Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });

    const { error } = await supabase.from('profiles').update(payload).eq('id', editingProfile.id);
    setSavingProfile(false);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...payload } : p));
      setEditingProfile(null);
      alert('Profile updated!');
    }
  };

  const changeRole = async (profileId, newRole) => {
    if (profileId === profile.id) return alert("You can't change your own role.");
    setUpdatingRole(u => ({ ...u, [profileId]: true }));
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    setUpdatingRole(u => ({ ...u, [profileId]: false }));

    if (error) {
      alert("Error updating role: " + error.message);
    } else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
      alert('Role updated to ' + newRole);
    }
  };

  const handleDeleteUser = async () => {
    if (deletePin !== '456789') {
      alert('Incorrect PIN!');
      return;
    }
    
    setProcessing(p => ({ ...p, [deletingUser.id]: true }));
    const { error } = await supabase.from('profiles').delete().eq('id', deletingUser.id);
    setProcessing(p => ({ ...p, [deletingUser.id]: false }));
    
    if (error) {
      alert('Error deleting user: ' + error.message);
    } else {
      setProfiles(prev => prev.filter(p => p.id !== deletingUser.id));
      alert('User account removed successfully!');
      setDeletingUser(null);
      setDeletePin('');
    }
  };

  const downloadEnrollmentReport = () => {
    // Filter unique (latest) enrollments per user per course
    const uniqueMap = new Map();
    allEnrollments.forEach(en => {
      const key = `${en.user_id}-${en.course_id}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, en);
    });
    const uniqueEnrollments = Array.from(uniqueMap.values());

    const headers = ['Student Name', 'Email', 'Phone', 'Course', 'Status', 'Paid Amount', 'Date'];
    const rows = uniqueEnrollments.map(en => [
      `"${en.profiles?.full_name || 'N/A'}"`,
      en.profiles?.email || 'N/A',
      en.profiles?.phone || 'N/A',
      `"${en.courses?.title || 'N/A'}"`,
      en.status,
      en.courses?.price || '0',
      new Date(en.created_at).toLocaleDateString()
    ]);

    // Adding \uFEFF BOM for Excel to recognize UTF-8 (Sinhala characters)
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NILS_Enrollment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMonthlyStats = () => {
    const months = {};
    allEnrollments.forEach(en => {
      const date = new Date(en.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).sort().slice(-6);
  };

  const getCourseStats = () => {
    const courses = {};
    allEnrollments.forEach(en => {
      const title = en.courses?.title || 'Unknown';
      courses[title] = (courses[title] || 0) + 1;
    });
    return Object.entries(courses).sort((a,b) => b[1] - a[1]);
  };

  const filteredUsers = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.nic?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: Clock, label: 'Pending Slips', value: pendingSlips.length, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
    { icon: BookOpen, label: 'Courses to Review', value: pendingCourses.length, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { icon: Users, label: 'Total Enrollments', value: allEnrollments.length, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
    { icon: TrendingUp, label: 'Approved', value: allEnrollments.filter(e => e.status === 'approved').length, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome, {profile?.full_name || 'Admin'}</p>
          </div>
          <Link to="/manage-courses" className="btn-primary text-sm py-2 px-4">
            <BookOpen className="w-4 h-4 mr-1" /> Add / Manage Courses
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="dash-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t, i) => (
            <button
              key={t}
              id={`admin-tab-${i}`}
              onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === i
                  ? 'bg-white dark:bg-gray-700 text-nilsBlue-700 dark:text-nilsBlue-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t}
              {i === 0 && pendingSlips.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full">{pendingSlips.length}</span>
              )}
              {i === 1 && pendingCourses.filter(c => !c.is_approved).length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-orange-500 text-white rounded-full">
                  {pendingCourses.filter(c => !c.is_approved).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : (
          <>
            {/* --- Tab 0: Pending Slips --- */}
            {tab === 0 && (
              <div className="space-y-4">
                {pendingSlips.length === 0 && (
                  <div className="dash-card text-center py-14 text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    All caught up — no pending slips.
                  </div>
                )}
                {pendingSlips.map(en => (
                  <div key={en.id} className="dash-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{en.courses?.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Student: {en.profiles?.full_name || en.profiles?.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Fee: Rs. {Number(en.courses?.price).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* View slip */}
                        {en.payment_slip_url && (
                          <button
                            onClick={() => getSlipUrl(en.payment_slip_url, en.id)}
                            className="btn-outline text-sm py-2"
                          >
                            <Eye className="w-4 h-4" /> View Slip
                          </button>
                        )}
                        {slipUrls[en.id] && (
                          <a href={slipUrls[en.id]} target="_blank" rel="noopener noreferrer"
                            className="btn-outline text-sm py-2">
                            <ExternalLink className="w-4 h-4" /> Open
                          </a>
                        )}
                        <button
                          disabled={processing[en.id]}
                          onClick={() => updateEnrollment(en.id, 'approved')}
                          className="btn-success text-sm py-2">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          disabled={processing[en.id]}
                          onClick={() => updateEnrollment(en.id, 'rejected')}
                          className="btn-danger text-sm py-2">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- Tab 1: Course Approvals --- */}
            {tab === 1 && (
              <div className="dash-card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Course Moderation</h3>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search courses or lecturers..." 
                      value={courseSearch}
                      onChange={e => setCourseSearch(e.target.value)}
                      className="form-input pl-9 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Course Info</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Lecturer</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {pendingCourses.filter(c => 
                        c.title.toLowerCase().includes(courseSearch.toLowerCase()) || 
                        c.profiles?.full_name?.toLowerCase().includes(courseSearch.toLowerCase()) ||
                        c.profiles?.email?.toLowerCase().includes(courseSearch.toLowerCase())
                      ).length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center text-gray-400">No matching courses found.</td></tr>
                      ) : pendingCourses.filter(c => 
                        c.title.toLowerCase().includes(courseSearch.toLowerCase()) || 
                        c.profiles?.full_name?.toLowerCase().includes(courseSearch.toLowerCase()) ||
                        c.profiles?.email?.toLowerCase().includes(courseSearch.toLowerCase())
                      ).map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{c.title}</p>
                                <p className="text-[10px] text-gray-500 line-clamp-1">{c.description}</p>
                              </div>
                              <Link to={`/course/${c.id}`} target="_blank" className="text-nilsBlue-600 hover:text-nilsBlue-800 p-1 bg-nilsBlue-50 dark:bg-nilsBlue-900/20 rounded shrink-0">
                                <ExternalLink className="w-3 h-3" title="Preview Course" />
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {c.profiles?.full_name || c.profiles?.email}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.is_approved ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Approved</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">Pending Approval</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {c.is_approved ? (
                                <button
                                  disabled={processing[c.id]}
                                  onClick={() => updateCourse(c.id, false)}
                                  className="btn-danger text-[10px] py-1 px-2">
                                  Unapprove
                                </button>
                              ) : (
                                <button
                                  disabled={processing[c.id]}
                                  onClick={() => updateCourse(c.id, true)}
                                  className="btn-success text-[10px] py-1 px-2">
                                  Approve Course
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- Tab 2: All Enrollments --- */}
            {tab === 2 && (
              <div className="dash-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">All Enrollments</h3>
                  <button onClick={downloadEnrollmentReport} className="btn-outline text-xs py-1.5 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Course</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Undo/Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {allEnrollments.map(en => (
                        <tr key={en.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-700 dark:text-gray-300">{en.profiles?.full_name || en.profiles?.email}</p>
                            <p className="text-[10px] text-gray-500">{en.profiles?.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{en.courses?.title}</td>
                          <td className="px-4 py-3">
                            <span className={`badge-${en.status}`}>{en.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                            {new Date(en.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={en.status}
                              onChange={(e) => updateEnrollment(en.id, e.target.value)}
                              disabled={processing[en.id]}
                              className="form-input py-1 px-2 text-[10px] w-28 bg-transparent"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* --- Tab 3: User Registry --- */}
            {tab === 3 && (
              <div className="dash-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-gray-900 dark:text-white">Student & Staff Registry</h3>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, email or NIC..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="form-input pl-9 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Name / Email</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">NIC</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Role</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Change Role</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="py-10 text-center text-gray-400">No users found.</td></tr>
                      ) : filteredUsers.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 dark:text-white">{p.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{p.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.nic || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                              {p.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.id !== profile?.id && (
                              <select
                                value={p.role}
                                disabled={updatingRole[p.id]}
                                onChange={e => changeRole(p.id, e.target.value)}
                                className="form-input py-1 text-xs w-32"
                              >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => handleEditProfile(p)} className="text-nilsBlue-600 hover:text-nilsBlue-800 text-xs font-semibold flex items-center gap-1">
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              {p.id !== profile?.id && (
                                <button onClick={() => setDeletingUser(p)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* --- Tab 4: Reports --- */}
            {tab === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dash-card">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-nilsBlue-600" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Enrollment Trends</h3>
                  </div>
                  <div className="space-y-4">
                    {getMonthlyStats().map(([month, count]) => (
                      <div key={month}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-gray-600 dark:text-gray-400">{month}</span>
                          <span className="font-bold text-nilsBlue-600">{count} Enrollments</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-nilsBlue-600 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (count / (allEnrollments.length || 1)) * 500)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dash-card">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-gray-900 dark:text-white">By Course</h3>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {getCourseStats().map(([title, count]) => (
                      <div key={title} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{title}</span>
                        <span className="shrink-0 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 dash-card flex items-center justify-between py-6">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Export Enrollment Data</h4>
                    <p className="text-sm text-gray-500">Download the full list of students and their courses as a CSV file.</p>
                  </div>
                  <button onClick={downloadEnrollmentReport} className="btn-primary flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Download Report (.csv)
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-nilsBlue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Edit User Details</h3>
              </div>
              <button onClick={() => setEditingProfile(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name with Initials</label>
                  <input value={profileForm.name_with_initials} onChange={e => setProfileForm({...profileForm, name_with_initials: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIC Number</label>
                  <input value={profileForm.nic} onChange={e => setProfileForm({...profileForm, nic: e.target.value.toUpperCase()})} className="form-input uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                  <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                  <input type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({...profileForm, date_of_birth: e.target.value})} className="form-input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permanent Address</label>
                  <textarea value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} rows={2} className="form-input resize-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setEditingProfile(null)} className="btn-outline py-2 text-sm">Cancel</button>
              <button onClick={saveUserProfile} disabled={savingProfile} className="btn-primary py-2 text-sm px-6">
                {savingProfile ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Delete Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up border-2 border-red-500/20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-red-600 dark:text-red-400 text-lg">Remove User</h3>
              <button onClick={() => { setDeletingUser(null); setDeletePin(''); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You are about to completely remove <strong>{deletingUser.full_name || deletingUser.email}</strong> from the system.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-xs text-red-700 dark:text-red-400">
                ⚠ Warning: This action cannot be undone. All related records may be affected.
              </div>
              <input
                type="password"
                maxLength={6}
                value={deletePin}
                onChange={e => setDeletePin(e.target.value)}
                placeholder="Enter 456789 PIN"
                className="form-input text-center text-lg tracking-widest border-red-200 focus:border-red-500 focus:ring-red-500/20"
                autoFocus
              />
              <button 
                onClick={handleDeleteUser} 
                disabled={deletePin.length < 4 || (deletingUser && processing[deletingUser.id])} 
                className="btn-primary w-full justify-center py-3 bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingUser && processing[deletingUser.id] ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
