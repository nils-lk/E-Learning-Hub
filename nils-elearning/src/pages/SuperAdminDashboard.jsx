import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Shield, Users, Search, RefreshCw, BookOpen,
  X, Save, Clock, CheckCircle, XCircle, Eye, ExternalLink, TrendingUp, Edit3,
  FileText, Download, BarChart2, Award, Type, Image as ImageIcon, Settings2, Maximize2, CheckSquare, AlignCenter,
  Plus, Pencil, Trash2, Video, GripVertical, HelpCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ROLES = ['user', 'lecturer', 'admin', 'superadmin'];
const roleColors = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  lecturer: 'bg-emerald-100 text-emerald-700',
  user: 'bg-gray-100 text-gray-700',
};

const TABS = ['User Management', 'Manage Courses', 'Course Approvals', 'Pending Slips', 'All Enrollments', 'Reports', 'Server Settings', 'Certificates'];

const emptyForm = { title: '', description: '', is_paid: false, price: '', thumbnail_url: '', issues_certificate: false };
const emptyLesson = { title: '', description: '', video_url: '', lesson_order: 1, is_free_preview: false };

const SuperAdminDashboard = () => {
  const { user: me, profile } = useAuth();
  const [tab, setTab] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState({});
  const [stats, setStats] = useState({});

  const [pendingSlips, setPendingSlips] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [processing, setProcessing] = useState({});

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [courseForm, setCourseForm] = useState(emptyForm);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [saving, setSaving] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({ question: '', correct_answer: '', wrong_answer1: '', wrong_answer2: '', wrong_answer3: '' });

  const [slipUrls, setSlipUrls] = useState({});
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletePin, setDeletePin] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const [certSettings, setCertSettings] = useState({
    cert_org_name: 'National Institute of Labour Studies',
    cert_org_sub: 'Ministry of Labour - Sri Lanka',
    cert_title_1: 'Assistant Director (Training)',
    cert_sig_1: '',
    cert_org_1: 'NILS',
    cert_title_2: 'Director General',
    cert_sig_2: '',
    cert_org_2: 'NILS',
    cert_bg_url: '',
    cert_logo_left: '',
    cert_logo_right: '',
    cert_logo_1_x: '0', cert_logo_1_y: '0', cert_logo_1_size: '100',
    cert_logo_2_x: '0', cert_logo_2_y: '0', cert_logo_2_size: '100',
    cert_content_x: '0', cert_content_y: '0',
    cert_title_size: '44', cert_name_size: '64', cert_nic_size: '18',
    cert_nic_x: '0', cert_nic_y: '0',
    cert_tagline_y: '0', cert_tagline_size: '16',
    cert_sig_1_x: '0', cert_sig_1_y: '0', cert_sig_1_size: '100',
    cert_sig_2_x: '0', cert_sig_2_y: '0', cert_sig_2_size: '100',
    cert_sig_img_1_x: '0', cert_sig_img_1_y: '0',
    cert_sig_img_2_x: '0', cert_sig_img_2_y: '0',
    cert_seal_x: '0', cert_seal_y: '0', cert_seal_size: '100',
    cert_seal_url: '',
    cert_main_title: 'Certificate of Completion',
    cert_certify_text: 'This is to certify that',
    cert_success_text: 'has successfully completed the course in',
    cert_tagline: 'offered by the National Institute of Labour Studies E-Learning Hub',
    cert_bg_x: '0', cert_bg_y: '0', cert_bg_size: '100'
  });
  const [savingCert, setSavingCert] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);
  const [base64Assets, setBase64Assets] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profs }, { data: slips }, { data: courses }, { data: enrolAll }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('*, profiles:user_id(email, full_name, phone), courses(title, price)').eq('status', 'pending').not('payment_slip_url', 'is', null),
        supabase.from('courses').select('*, profiles:lecturer_id(email, full_name), lessons(id)').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('*, profiles:user_id(email, full_name, phone), courses(title, price)').order('created_at', { ascending: false }).limit(200)
      ]);
      setProfiles(profs ?? []); setPendingSlips(slips ?? []); setAllCourses(courses ?? []); setAllEnrollments(enrolAll ?? []);
      const counts = {}; ROLES.forEach(r => { counts[r] = (profs ?? []).filter(p => p.role === r).length; });
      setStats(counts);
      const { data: settings } = await supabase.from('system_settings').select('*');
      if (settings) {
        const sObj = {}; settings.forEach(s => { if (s.key) sObj[s.key] = s.value; });
        setCertSettings(prev => ({ ...prev, ...sObj }));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadLessons = async (courseId) => {
    const { data } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('lesson_order');
    setLessons(data ?? []);
  };
  const loadQuiz = async (courseId) => {
    const { data } = await supabase.from('quiz_questions').select('*').eq('course_id', courseId);
    setQuestions(data ?? []);
  };
  const openCourseManager = (course) => {
    setActiveCourse(course);
    loadLessons(course.id);
    loadQuiz(course.id);
  };
  const saveCourse = async () => {
    setSaving(true);
    const payload = {
      title: courseForm.title,
      description: courseForm.description,
      is_paid: courseForm.is_paid,
      price: courseForm.is_paid ? Number(courseForm.price) : 0,
      thumbnail_url: courseForm.thumbnail_url,
      issues_certificate: courseForm.issues_certificate,
      lecturer_id: editingCourse ? editingCourse.lecturer_id : me.id,
      is_approved: true,
    };
    try {
      if (editingCourse) await supabase.from('courses').update(payload).eq('id', editingCourse.id);
      else await supabase.from('courses').insert([payload]);
      setShowCourseModal(false); load();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const handleApproveCourse = async (courseId) => {
    setProcessing(prev => ({ ...prev, [courseId]: true }));
    const { error } = await supabase.from('courses').update({ is_approved: true }).eq('id', courseId);
    if (!error) load(); else alert(error.message);
    setProcessing(prev => ({ ...prev, [courseId]: false }));
  };
  const deleteCourse = async (id) => {
    if (!confirm('Delete course?')) return;
    await supabase.from('courses').delete().eq('id', id);
    load(); if (activeCourse?.id === id) setActiveCourse(null);
  };

  const saveLesson = async () => {
    setSaving(true);
    try {
      if (editingLesson) {
        await supabase.from('lessons').update({
          title: lessonForm.title,
          description: lessonForm.description,
          video_url: lessonForm.video_url,
          lesson_order: Number(lessonForm.lesson_order),
          is_free_preview: lessonForm.is_free_preview,
        }).eq('id', editingLesson.id);
      } else {
        await supabase.from('lessons').insert([{
          title: lessonForm.title,
          description: lessonForm.description,
          video_url: lessonForm.video_url,
          course_id: activeCourse.id,
          lesson_order: Number(lessonForm.lesson_order),
          is_free_preview: lessonForm.is_free_preview
        }]);
      }
      setShowLessonModal(false); loadLessons(activeCourse.id);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const deleteLesson = async (id) => {
    await supabase.from('lessons').delete().eq('id', id);
    loadLessons(activeCourse.id);
  };

  const saveQuestion = async () => {
    setSaving(true);
    const payload = { ...questionForm, course_id: activeCourse.id };
    try {
      if (editingQuestion) await supabase.from('quiz_questions').update(payload).eq('id', editingQuestion.id);
      else await supabase.from('quiz_questions').insert([payload]);
      setShowQuizModal(false); loadQuiz(activeCourse.id);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const deleteQuestion = async (id) => {
    await supabase.from('quiz_questions').delete().eq('id', id);
    loadQuiz(activeCourse.id);
  };

  const handleUpdateRole = async (userId, newRole) => {
    setUpdating(prev => ({ ...prev, [userId]: true }));
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) load(); else alert(error.message);
    setUpdating(prev => ({ ...prev, [userId]: false }));
  };

  const handleApproveSlip = async (enrollId) => {
    setProcessing(prev => ({ ...prev, [enrollId]: true }));
    const { error } = await supabase.from('enrollments').update({ status: 'approved' }).eq('id', enrollId);
    if (!error) load(); else alert(error.message);
    setProcessing(prev => ({ ...prev, [enrollId]: false }));
  };

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

  const updateCourseApproval = async (id, is_approved) => {
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
    if (error) { alert('Error: ' + error.message); }
    else { setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...payload } : p)); setEditingProfile(null); alert('Profile updated!'); }
  };

  const handleDeleteUser = async () => {
    if (deletePin !== '456789') { alert('Incorrect PIN!'); return; }
    setProcessing(p => ({ ...p, [deletingUser.id]: true }));
    const { error } = await supabase.from('profiles').delete().eq('id', deletingUser.id);
    setProcessing(p => ({ ...p, [deletingUser.id]: false }));
    if (error) { alert('Error: ' + error.message); }
    else { setProfiles(prev => prev.filter(p => p.id !== deletingUser.id)); setDeletingUser(null); setDeletePin(''); alert('User removed!'); }
  };

  const downloadEnrollmentReport = () => {
    const uniqueMap = new Map();
    allEnrollments.forEach(en => { const key = `${en.user_id}-${en.course_id}`; if (!uniqueMap.has(key)) uniqueMap.set(key, en); });
    // Exclude admins and superadmins from the report
    const rows = Array.from(uniqueMap.values())
      .filter(en => { const p = profiles.find(p => p.id === en.user_id); return !p || (p.role !== 'admin' && p.role !== 'superadmin'); })
      .map(en => [`"${en.profiles?.full_name || 'N/A'}"`, en.profiles?.email || 'N/A', en.profiles?.phone || 'N/A', `"${en.courses?.title || 'N/A'}"`, en.status, en.courses?.price || '0', new Date(en.created_at).toLocaleDateString()]);
    const csv = "data:text/csv;charset=utf-8,\uFEFF" + ['Student Name', 'Email', 'Phone', 'Course', 'Status', 'Paid Amount', 'Date'].join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(csv)); link.setAttribute('download', `NILS_Enrollment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getMonthlyStats = () => {
    const months = {};
    allEnrollments.forEach(en => { const d = new Date(en.created_at); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; months[key] = (months[key] || 0) + 1; });
    return Object.entries(months).sort().slice(-6);
  };

  const getCourseStats = () => {
    const courses = {};
    allEnrollments.forEach(en => { const t = en.courses?.title || 'Unknown'; courses[t] = (courses[t] || 0) + 1; });
    return Object.entries(courses).sort((a, b) => b[1] - a[1]);
  };


  const saveCertSettings = async () => {
    setSavingCert(true);
    try {
      const entries = Object.entries(certSettings);
      for (const [key, value] of entries) {
        await supabase.from('system_settings').upsert({ key, value }, { onConflict: 'key' });
      }
      alert('Certificate settings saved!');
    } catch (e) { alert(e.message); } finally { setSavingCert(false); }
  };

  const transformDriveUrl = (url) => {
    if (!url) return url;
    const idMatch = url.match(/[-\w]{25,50}/);
    if (idMatch && (url.includes('drive.google') || url.includes('google.com') || url.includes('docs.google'))) {
      return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
    }
    return url;
  };

  const toBase64 = async (url) => {
    return new Promise((resolve) => {
      if (!url) { resolve(null); return; }
      const idMatch = url.match(/[-\w]{25,50}/);
      if (!idMatch) { resolve(url); return; }
      const gId = idMatch[0];
      const tryLoad = (src, phase) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try { resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(url); }
        };
        img.onerror = () => {
          if (phase === 'LH3') tryLoad(`https://drive.google.com/uc?id=${gId}`, 'UC');
          else if (phase === 'UC') tryLoad(`https://drive.google.com/thumbnail?id=${gId}&sz=w2500`, 'THUMB');
          else resolve(url);
        };
        img.src = src;
      };
      tryLoad(`https://lh3.googleusercontent.com/d/${gId}`, 'LH3');
    });
  };

  const syncInstitutionalAssets = async () => {
    setIsSyncingAssets(true);
    const assets = {};
    const keys = ['cert_bg_url', 'cert_logo_left', 'cert_logo_right', 'cert_sig_1', 'cert_sig_2', 'cert_seal_url'];
    try {
      await Promise.all(keys.map(async (k) => {
        if (certSettings[k]) assets[k] = await toBase64(certSettings[k]);
      }));
      setBase64Assets(assets);
      return true;
    } catch (e) { return false; } finally { setIsSyncingAssets(false); }
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingCert) return;
    setIsGeneratingCert(true);
    const original = document.getElementById('master-admin-preview');
    if (!original) { setIsGeneratingCert(false); return; }
    
    const shadow = document.createElement('div');
    shadow.style.position = 'fixed'; shadow.style.left = '-9999px'; shadow.style.top = '-9999px';
    shadow.style.width = '1123px'; shadow.style.height = '794px';
    shadow.style.background = '#ffffff';
    shadow.innerHTML = original.outerHTML;
    document.body.appendChild(shadow);
    
    const clone = shadow.firstChild;
    clone.style.transform = 'none'; 
    clone.style.width = '1123px'; 
    clone.style.height = '794px';
    
    try {
      await new Promise(res => setTimeout(res, 6000));
      const canvas = await html2canvas(clone, { 
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
        width: 1123, height: 794, windowWidth: 1123, windowHeight: 794, logging: false
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1123, 794], compress: true });
      pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794, undefined, 'FAST');
      pdf.save(`NILS_ADMIN_PREVIEW_CERTIFICATE.pdf`);
    } catch (e) { console.error(e); } finally {
      document.body.removeChild(shadow);
      setIsGeneratingCert(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.nic?.toLowerCase().includes(search.toLowerCase())
  );
  const pendingCourses = allCourses.filter(c => !c.is_approved);
  const filteredCourses = allCourses.filter(c =>
    c.title?.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.profiles?.full_name?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-nilsBlue-600" /> Super Admin Studio
          </h1>
          <div className="flex gap-4">
            <button onClick={() => { setTab(1); setCourseForm(emptyForm); setEditingCourse(null); setShowCourseModal(true); }} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
              <Plus className="w-4 h-4" /> New Course
            </button>
            <button onClick={load} className="btn-outline px-4 py-2 font-bold text-xs bg-white border">Refresh System</button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-8 w-fit overflow-x-auto max-w-full">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${tab === i ? 'bg-white dark:bg-gray-700 text-nilsBlue-700 dark:text-nilsBlue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {tab === 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search users..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-xl border-none text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="flex gap-4">
                    {ROLES.map(r => <div key={r} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${roleColors[r]}`}>{stats[r] || 0} {r}s</div>)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                      <tr className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-8 py-5">User</th>
                        <th className="px-8 py-5">Role</th>
                        <th className="px-8 py-5 text-right">Change Role</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {filteredProfiles.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                          <td className="px-8 py-5">
                            <div><p className="font-bold text-gray-900 dark:text-white">{p.full_name || '—'}</p><p className="text-xs text-gray-500">{p.email}</p>{p.nic && <p className="text-[10px] text-gray-400">NIC: {p.nic}</p>}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${roleColors[p.role]}`}>{p.role}</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              {ROLES.map(r => <button key={r} onClick={() => handleUpdateRole(p.id, r)} disabled={updating[p.id] || p.role === r || p.id === me?.id} className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase ${p.role === r ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{r}</button>)}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditProfile(p)} className="text-nilsBlue-600 hover:text-nilsBlue-800 text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-nilsBlue-50 dark:hover:bg-nilsBlue-900/20">
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              {p.id !== me?.id && (
                                <button onClick={() => setDeletingUser(p)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
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

            {tab === 1 && (
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">All Courses ({allCourses.length})</h2>
                    <button onClick={() => { setCourseForm(emptyForm); setEditingCourse(null); setShowCourseModal(true); }} className="btn-primary text-xs py-2 px-4 shadow-md">
                      <Plus className="w-4 h-4 mr-1" /> New Course
                    </button>
                  </div>
                  <div className="space-y-3">
                    {allCourses.map(c => (
                      <div key={c.id} onClick={() => openCourseManager(c)} className={`dash-card cursor-pointer border-2 transition-all ${activeCourse?.id === c.id ? 'border-nilsBlue-500 ring-2 ring-nilsBlue-50' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <div className="flex flex-col">
                                <p className="font-bold text-gray-900 dark:text-white truncate">{c.title}</p>
                                <p className="text-[10px] text-gray-400">By {c.profiles?.full_name || 'N/A'}</p>
                              </div>
                              <span className={c.is_approved ? 'badge-approved' : 'badge-pending'}>{c.is_approved ? 'Approved' : 'Pending'}</span>
                              {c.is_paid ? <span className="badge-paid">Rs. {Number(c.price).toLocaleString()}</span> : <span className="badge-free">Free</span>}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{c.description}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{c.lessons?.length || 0} lessons</p>
                          </div>
                          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setCourseForm(c); setEditingCourse(c); setShowCourseModal(true); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-nilsBlue-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteCourse(c.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  {activeCourse ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-900 dark:text-white text-sm">{activeCourse.title} — Lessons</h2>
                        <button onClick={() => { setEditingLesson(null); setLessonForm({ ...emptyLesson, lesson_order: lessons.length + 1 }); setShowLessonModal(true); }} className="btn-outline text-xs py-2 px-4 shadow-sm bg-white"><Plus className="w-4 h-4 mr-1" /> Add Lesson</button>
                      </div>
                      <div className="space-y-3">
                        {lessons.map((l, idx) => (
                          <div key={l.id} className="dash-card flex items-center gap-3 py-3">
                            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            <div className="w-7 h-7 rounded-full bg-nilsBlue-100 dark:bg-nilsBlue-900/40 flex items-center justify-center text-xs font-bold text-nilsBlue-700 dark:text-nilsBlue-400 shrink-0">{idx + 1}</div>
                            <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 dark:text-white truncate text-sm">{l.title}</p><p className="text-[10px] text-gray-400 truncate">{l.video_url}</p></div>
                            {l.is_free_preview && <Eye className="w-4 h-4 text-emerald-500 shrink-0" title="Free preview" />}
                            <div className="flex items-center gap-1 shrink-0"><button onClick={() => { setEditingLesson(l); setLessonForm(l); setShowLessonModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-nilsBlue-600 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => deleteLesson(l.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm"><HelpCircle className="w-5 h-5 text-nilsGold" /> Final Quiz Questions</h2>
                            <p className="text-[10px] text-gray-500">Add questions to enable the final exam</p>
                          </div>
                          <button onClick={() => { setEditingQuestion(null); setQuestionForm({ question: '', correct_answer: '', wrong_answer1: '', wrong_answer2: '', wrong_answer3: '' }); setShowQuizModal(true); }} className="btn-outline text-xs py-2 px-4 shadow-sm bg-white"><Plus className="w-4 h-4 mr-1" /> Add Question</button>
                        </div>
                        <div className="space-y-3">
                          {questions.map((q, idx) => (
                            <div key={q.id} className="dash-card">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Question {idx + 1}</p>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingQuestion(q); setQuestionForm(q); setShowQuizModal(true); }} className="p-1 hover:text-nilsBlue-600"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => deleteQuestion(q.id)} className="p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-xs mb-3">{q.question}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-400"><span className="font-bold">Correct:</span> {q.correct_answer}</div>
                                <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-[10px] text-red-600 dark:text-red-400"><span className="font-bold">Wrong:</span> {q.wrong_answer1}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : <div className="dash-card text-center py-20 text-gray-400 bg-white border-dashed border-2"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-xs font-bold uppercase tracking-widest">Select a course to manage lessons</p></div>}
                </div>
              </div>
            )}

            {tab === 2 && (
              <div className="dash-card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Course Moderation</h3>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search courses or lecturers..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)} className="form-input pl-9 py-1.5 text-xs" />
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
                      {filteredCourses.length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center text-gray-400">No matching courses found.</td></tr>
                      ) : filteredCourses.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900 dark:text-white">{c.title}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{c.description}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.profiles?.full_name || c.profiles?.email}</td>
                          <td className="px-4 py-3 text-center">
                            {c.is_approved ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Approved</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {c.is_approved ? (
                                <button disabled={processing[c.id]} onClick={() => updateCourseApproval(c.id, false)} className="btn-danger text-[10px] py-1 px-2">Unapprove</button>
                              ) : (
                                <button disabled={processing[c.id]} onClick={() => updateCourseApproval(c.id, true)} className="btn-success text-[10px] py-1 px-2">Approve</button>
                              )}
                              <button onClick={() => deleteCourse(c.id)} className="btn-danger text-[10px] py-1 px-2">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {tab === 3 && (
              <div className="space-y-4">
                {pendingSlips.length === 0 && (
                  <div className="dash-card text-center py-14 text-gray-400">All caught up — no pending slips.</div>
                )}
                {pendingSlips.map(s => (
                  <div key={s.id} className="dash-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{s.courses?.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">Student: {s.profiles?.full_name || s.profiles?.email}</p>
                        <p className="text-sm text-gray-500">Fee: Rs. {Number(s.courses?.price).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {s.payment_slip_url && (
                          <button onClick={() => getSlipUrl(s.payment_slip_url, s.id)} className="btn-outline text-sm py-2">
                            <Eye className="w-4 h-4" /> View Slip
                          </button>
                        )}
                        {slipUrls[s.id] && (
                          <a href={slipUrls[s.id]} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm py-2">
                            <ExternalLink className="w-4 h-4" /> Open
                          </a>
                        )}
                        <button disabled={processing[s.id]} onClick={() => updateEnrollment(s.id, 'approved')} className="btn-success text-sm py-2">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button disabled={processing[s.id]} onClick={() => updateEnrollment(s.id, 'rejected')} className="btn-danger text-sm py-2">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 4 && (
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
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Change</th>
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
                          <td className="px-4 py-3"><span className={`badge-${en.status}`}>{en.status}</span></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{new Date(en.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <select value={en.status} onChange={e => updateEnrollment(en.id, e.target.value)} disabled={processing[en.id]} className="form-input py-1 px-2 text-[10px] w-28 bg-transparent">
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

            {tab === 5 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dash-card">
                  <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-nilsBlue-600" /><h3 className="font-bold text-gray-900 dark:text-white">Enrollment Trends</h3></div>
                  <div className="space-y-4">
                    {getMonthlyStats().map(([month, count]) => (
                      <div key={month}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-gray-600 dark:text-gray-400">{month}</span><span className="font-bold text-nilsBlue-600">{count} Enrollments</span></div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-nilsBlue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (count / (allEnrollments.length || 1)) * 500)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dash-card">
                  <div className="flex items-center gap-2 mb-6"><BarChart2 className="w-5 h-5 text-emerald-600" /><h3 className="font-bold text-gray-900 dark:text-white">By Course</h3></div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {getCourseStats().map(([title, count]) => (
                      <div key={title} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{title}</span>
                        <span className="shrink-0 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 dash-card flex items-center justify-between py-6">
                  <div><h4 className="font-bold text-gray-900 dark:text-white">Export Enrollment Data</h4><p className="text-sm text-gray-500">Download the full list of students and their courses as CSV (excludes admin accounts).</p></div>
                  <button onClick={downloadEnrollmentReport} className="btn-primary flex items-center gap-2"><FileText className="w-4 h-4" /> Download Report (.csv)</button>
                </div>
              </div>
            )}

            {tab === 6 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar-smooth">
                  <div className="dash-card space-y-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><Settings2 className="w-4 h-4 text-nilsBlue-600" /> Organization & Text</h3>
                    {[['cert_main_title', 'Certificate Main Title'], ['cert_certify_text', 'Certify Text'], ['cert_success_text', 'Success Text'], ['cert_tagline', 'Tagline'], ['cert_org_name', 'Organization Name'], ['cert_org_sub', 'Organization Sub']].map(([k, l]) => (
                      <div key={k}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{l}</label><input value={certSettings[k]} onChange={e => setCertSettings(p => ({ ...p, [k]: e.target.value }))} className="form-input text-sm" /></div>
                    ))}
                  </div>
                  <div className="dash-card space-y-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><ImageIcon className="w-4 h-4 text-nilsBlue-600" /> Images (Google Drive URLs)</h3>
                    {[['cert_bg_url', 'Background Image URL'], ['cert_logo_left', 'Left Logo URL'], ['cert_logo_right', 'Right Logo URL'], ['cert_sig_1', 'Signature 1 URL'], ['cert_sig_2', 'Signature 2 URL'], ['cert_seal_url', 'Seal URL']].map(([k, l]) => (
                      <div key={k}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{l}</label><input value={certSettings[k]} onChange={e => setCertSettings(p => ({ ...p, [k]: e.target.value }))} className="form-input text-xs" placeholder="https://drive.google.com/..." /></div>
                    ))}
                  </div>
                  <div className="dash-card space-y-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><Type className="w-4 h-4 text-nilsBlue-600" /> Signatures & Titles</h3>
                    {[['cert_title_1', 'Signatory 1 Title'], ['cert_org_1', 'Signatory 1 Org'], ['cert_title_2', 'Signatory 2 Title'], ['cert_org_2', 'Signatory 2 Org']].map(([k, l]) => (
                      <div key={k}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{l}</label><input value={certSettings[k]} onChange={e => setCertSettings(p => ({ ...p, [k]: e.target.value }))} className="form-input text-sm" /></div>
                    ))}
                  </div>
                  <div className="dash-card space-y-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><AlignCenter className="w-4 h-4 text-nilsBlue-600" /> Font Sizes</h3>
                    {[['cert_title_size', 'Title Size (px)', 20, 120], ['cert_name_size', 'Name Size (px)', 20, 120], ['cert_nic_size', 'NIC Size (px)', 10, 40], ['cert_tagline_size', 'Tagline Size (px)', 10, 40]].map(([k, l, mn, mx]) => (
                      <div key={k}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{l}: <span className="text-nilsBlue-600">{certSettings[k]}px</span></label>
                        <div className="flex gap-4 items-center">
                          <input type="range" min={mn} max={mx} value={certSettings[k]} onChange={e => setCertSettings(p => ({ ...p, [k]: e.target.value }))} className="smooth-slider flex-1" />
                          <input type="number" value={certSettings[k]} onChange={e => setCertSettings(p => ({ ...p, [k]: e.target.value }))} className="form-input w-16 py-1 px-2 text-center text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dash-card space-y-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><Maximize2 className="w-4 h-4 text-nilsBlue-600" /> Element Positions & Sizes</h3>
                    <p className="text-[10px] text-gray-500">Adjust X/Y offset (px) and size (%) for each element.</p>
                    {[
                      ['cert_content_x', 'cert_content_y', null, 'Content Block X/Y'],
                      ['cert_nic_x', 'cert_nic_y', null, 'NIC Text X/Y'],
                      ['cert_tagline_y', null, null, 'Tagline Y Offset'],
                      ['cert_logo_1_x', 'cert_logo_1_y', 'cert_logo_1_size', 'Logo Left X/Y/Size'],
                      ['cert_logo_2_x', 'cert_logo_2_y', 'cert_logo_2_size', 'Logo Right X/Y/Size'],
                      ['cert_sig_1_x', 'cert_sig_1_y', 'cert_sig_1_size', 'Sig 1 X/Y/Size'],
                      ['cert_sig_img_1_x', 'cert_sig_img_1_y', null, 'Sig 1 Image X/Y'],
                      ['cert_sig_2_x', 'cert_sig_2_y', 'cert_sig_2_size', 'Sig 2 X/Y/Size'],
                      ['cert_sig_img_2_x', 'cert_sig_img_2_y', null, 'Sig 2 Image X/Y'],
                      ['cert_seal_x', 'cert_seal_y', 'cert_seal_size', 'Seal X/Y/Size'],
                      ['cert_bg_x', 'cert_bg_y', 'cert_bg_size', 'Background X/Y/Size'],
                    ].map(([kx, ky, ks, label]) => (
                      <div key={kx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
                        <div className="flex gap-2 flex-wrap">
                          {kx && <div className="flex-1 min-w-[80px]"><label className="text-[9px] text-gray-400 block mb-1">X ({certSettings[kx]}px)</label><div className="flex gap-1 items-center"><input type="range" min="-300" max="300" value={certSettings[kx]} onChange={e => setCertSettings(p => ({ ...p, [kx]: e.target.value }))} className="smooth-slider flex-1" /><input type="number" value={certSettings[kx]} onChange={e => setCertSettings(p => ({ ...p, [kx]: e.target.value }))} className="form-input w-12 p-0.5 text-center text-[10px]" /></div></div>}
                          {ky && <div className="flex-1 min-w-[80px]"><label className="text-[9px] text-gray-400 block mb-1">Y ({certSettings[ky]}px)</label><div className="flex gap-1 items-center"><input type="range" min="-300" max="300" value={certSettings[ky]} onChange={e => setCertSettings(p => ({ ...p, [ky]: e.target.value }))} className="smooth-slider flex-1" /><input type="number" value={certSettings[ky]} onChange={e => setCertSettings(p => ({ ...p, [ky]: e.target.value }))} className="form-input w-12 p-0.5 text-center text-[10px]" /></div></div>}
                          {ks && <div className="flex-1 min-w-[80px]"><label className="text-[9px] text-gray-400 block mb-1">Size ({certSettings[ks]}%)</label><div className="flex gap-1 items-center"><input type="range" min="10" max="300" value={certSettings[ks]} onChange={e => setCertSettings(p => ({ ...p, [ks]: e.target.value }))} className="smooth-slider flex-1" /><input type="number" value={certSettings[ks]} onChange={e => setCertSettings(p => ({ ...p, [ks]: e.target.value }))} className="form-input w-12 p-0.5 text-center text-[10px]" /></div></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveCertSettings} disabled={savingCert} className="btn-primary w-full justify-center py-3">
                    <Save className="w-4 h-4 mr-2" />{savingCert ? 'Saving...' : 'Save Certificate Settings'}
                  </button>
                </div>
                <div className="sticky top-24">
                  <div className="bg-gray-300 dark:bg-gray-800 rounded-[48px] flex justify-center items-center p-8 min-h-[600px] border-[12px] border-white dark:border-gray-900 relative overflow-hidden shadow-2xl">
                    <div style={{ transform: 'scale(0.47)', transformOrigin: 'center center', width: '1123px', height: '794px' }}>
                      <div id="master-admin-preview" style={{ width: '1123px', height: '794px', background: '#fff', position: 'relative', color: '#000', fontFamily: "'Times New Roman', serif", boxShadow: '0 80px 160px -40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, transform: `translate(${(parseInt(certSettings.cert_bg_x) || 0)}px, ${(parseInt(certSettings.cert_bg_y) || 0)}px) scale(${(parseInt(certSettings.cert_bg_size) || 100) / 100})` }}>
                          <img id="cert-bg-image" src={transformDriveUrl(certSettings.cert_bg_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Background" />
                        </div>
                        <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px', border: '2px solid #1e3a8a', padding: '5px', zIndex: 1 }}>
                          <div style={{ border: '8px double #1e3a8a', height: '100%' }}></div>
                        </div>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                          <div style={{ position: 'absolute', top: '70px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                            <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_1_x) || 0)}px, ${(parseInt(certSettings.cert_logo_1_y) || 0)}px)` }}>
                              <img src={transformDriveUrl(certSettings.cert_logo_left)} className="logo-left" style={{ height: `${100 * ((parseInt(certSettings.cert_logo_1_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} alt="Logo Left" />
                            </div>
                            <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_2_x) || 0)}px, ${(parseInt(certSettings.cert_logo_2_y) || 0)}px)` }}>
                              <img src={transformDriveUrl(certSettings.cert_logo_right)} className="logo-right" style={{ height: `${100 * ((parseInt(certSettings.cert_logo_2_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} alt="Logo Right" />
                            </div>
                          </div>
                          <div style={{ position: 'absolute', top: `${270 + (parseInt(certSettings.cert_content_y) || 0)}px`, left: `${(parseInt(certSettings.cert_content_x) || 0)}px`, width: '100%', textAlign: 'center', padding: '0 50px', boxSizing: 'border-box' }}>
                            <h2 style={{ fontSize: `${parseInt(certSettings.cert_title_size) || 44}px`, color: '#854d0e', margin: '0', fontStyle: 'italic', fontWeight: 'bold' }}>{certSettings.cert_main_title}</h2>
                            <p style={{ fontSize: '20px', margin: '15px 0', color: '#333' }}>{certSettings.cert_certify_text}</p>
                            <h3 style={{ fontSize: `${parseInt(certSettings.cert_name_size) || 64}px`, margin: '10px 0', color: '#1e3a8a', fontWeight: 'bold', fontFamily: "'Dancing Script', cursive" }}>STUDENT NAME</h3>
                            <div style={{ width: '350px', height: '2px', background: '#1e3a8a', opacity: 0.3, margin: '10px auto' }}></div>
                            <div style={{ transform: `translateY(${(parseInt(certSettings.cert_nic_y) || 0)}px)` }}>
                              <p style={{ fontSize: `${parseInt(certSettings.cert_nic_size) || 18}px`, margin: '0', color: '#444' }}>NIC No: <strong>000000000V</strong></p>
                            </div>
                            <p style={{ fontSize: '20px', margin: '20px 0', color: '#333' }}>{certSettings.cert_success_text}</p>
                            <h4 style={{ fontSize: '42px', color: '#1e3a8a', margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>COURSE TITLE</h4>
                            <div style={{ transform: `translateY(${(parseInt(certSettings.cert_tagline_y) || 0)}px)` }}>
                              <p style={{ fontSize: `${parseInt(certSettings.cert_tagline_size) || 16}px`, color: '#555', fontStyle: 'italic', maxWidth: '850px', margin: '40px auto 0 auto' }}>{certSettings.cert_tagline}</p>
                            </div>
                          </div>
                          <div style={{ position: 'absolute', bottom: '75px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box' }}>
                            <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_1_y) || 0)}px)` }}>
                              <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_1_y) || 0)}px)` }}>
                                <img src={transformDriveUrl(certSettings.cert_sig_1)} className="sig-left" style={{ height: `${90 * ((parseInt(certSettings.cert_sig_1_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} alt="Signature 1" />
                              </div>
                              <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_1?.toUpperCase()}</p></div>
                            </div>
                            <div style={{ textAlign: 'center', transform: `translate(${(parseInt(certSettings.cert_seal_x) || 0)}px, ${(parseInt(certSettings.cert_seal_y) || 0)}px)`, minWidth: '170px' }}>
                              <div style={{ width: '100px', height: '100px', border: '1px solid rgba(30, 58, 138, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                                <img src={transformDriveUrl(certSettings.cert_seal_url) || "https://nils.gov.lk/wp-content/uploads/2021/05/cropped-NILS-Logo.png"} className="seal-img" style={{ width: `${65 * ((parseInt(certSettings.cert_seal_size) || 100) / 100)}px`, opacity: 0.8 }} alt="Seal" />
                              </div>
                              <div style={{ color: '#1e3a8a', lineHeight: '1.2', fontWeight: 'bold' }}>
                                <p style={{ margin: 0, fontSize: '12px', letterSpacing: '1px', fontWeight: '900' }}>VERIFIED DOCUMENT</p>
                                <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>ID: NILS-CERT-2026-0001</p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_2_y) || 0)}px)` }}>
                              <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_2_y) || 0)}px)` }}>
                                <img src={transformDriveUrl(certSettings.cert_sig_2)} className="sig-right" style={{ height: `${90 * ((parseInt(certSettings.cert_sig_2_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} alt="Signature 2" />
                              </div>
                              <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_2?.toUpperCase()}</p></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 7 && (
              <div className="lg:col-span-7 sticky top-24">
                <div className="bg-gray-300 dark:bg-gray-800 rounded-[48px] flex justify-center items-center p-12 min-h-[850px] border-[12px] border-white dark:border-gray-900 relative overflow-hidden shadow-2xl">
                  <div style={{ transform: 'scale(0.6)', transformOrigin: 'center center', width: '1123px', height: '794px' }}>
                    <div id="master-admin-preview" style={{ width: '1123px', height: '794px', background: '#fff', position: 'relative', color: '#000', fontFamily: "'Times New Roman', serif", boxShadow: '0 80px 160px -40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, transform: `translate(${(parseInt(certSettings.cert_bg_x) || 0)}px, ${(parseInt(certSettings.cert_bg_y) || 0)}px) scale(${(parseInt(certSettings.cert_bg_size) || 100) / 100})` }}>
                        <img id="cert-bg-image" src={transformDriveUrl(certSettings.cert_bg_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Background" />
                      </div>
                      <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px', border: '2px solid #1e3a8a', padding: '5px', zIndex: 1 }}>
                        <div style={{ border: '8px double #1e3a8a', height: '100%' }}></div>
                      </div>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                        <div style={{ position: 'absolute', top: '70px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                          <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_1_x) || 0)}px, ${(parseInt(certSettings.cert_logo_1_y) || 0)}px)` }}>
                            <img src={transformDriveUrl(certSettings.cert_logo_left)} className="logo-left" style={{ height: `${100 * ((parseInt(certSettings.cert_logo_1_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} alt="Logo Left" />
                          </div>
                          <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_2_x) || 0)}px, ${(parseInt(certSettings.cert_logo_2_y) || 0)}px)` }}>
                            <img src={transformDriveUrl(certSettings.cert_logo_right)} className="logo-right" style={{ height: `${100 * ((parseInt(certSettings.cert_logo_2_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} alt="Logo Right" />
                          </div>
                        </div>
                        <div style={{ position: 'absolute', top: `${270 + (parseInt(certSettings.cert_content_y) || 0)}px`, left: `${(parseInt(certSettings.cert_content_x) || 0)}px`, width: '100%', textAlign: 'center', padding: '0 50px', boxSizing: 'border-box' }}>
                          <h2 style={{ fontSize: `${parseInt(certSettings.cert_title_size) || 44}px`, color: '#854d0e', margin: '0', fontStyle: 'italic', fontWeight: 'bold' }}>{certSettings.cert_main_title}</h2>
                          <p style={{ fontSize: '20px', margin: '15px 0', color: '#333' }}>{certSettings.cert_certify_text}</p>
                          <h3 style={{ fontSize: `${parseInt(certSettings.cert_name_size) || 64}px`, margin: '10px 0', color: '#1e3a8a', fontWeight: 'bold', fontFamily: "'Dancing Script', cursive" }}>STUDENT NAME</h3>
                          <div style={{ width: '350px', height: '2px', background: '#1e3a8a', opacity: 0.3, margin: '10px auto' }}></div>
                          <div style={{ transform: `translateY(${(parseInt(certSettings.cert_nic_y) || 0)}px)` }}>
                            <p style={{ fontSize: `${parseInt(certSettings.cert_nic_size) || 18}px`, margin: '0', color: '#444' }}>NIC No: <strong>000000000V</strong></p>
                          </div>
                          <p style={{ fontSize: '20px', margin: '20px 0', color: '#333' }}>{certSettings.cert_success_text}</p>
                          <h4 style={{ fontSize: '42px', color: '#1e3a8a', margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>COURSE TITLE</h4>
                          <div style={{ transform: `translateY(${(parseInt(certSettings.cert_tagline_y) || 0)}px)` }}>
                            <p style={{ fontSize: `${parseInt(certSettings.cert_tagline_size) || 16}px`, color: '#555', fontStyle: 'italic', maxWidth: '850px', margin: '40px auto 0 auto' }}>{certSettings.cert_tagline}</p>
                          </div>
                        </div>
                        <div style={{ position: 'absolute', bottom: '75px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box' }}>
                          <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_1_y) || 0)}px)` }}>
                            <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_1_y) || 0)}px)` }}>
                              <img src={transformDriveUrl(certSettings.cert_sig_1)} className="sig-left" style={{ height: `${90 * ((parseInt(certSettings.cert_sig_1_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} alt="Signature 1" />
                            </div>
                            <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}>
                              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_1?.toUpperCase()}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', transform: `translate(${(parseInt(certSettings.cert_seal_x) || 0)}px, ${(parseInt(certSettings.cert_seal_y) || 0)}px)`, minWidth: '170px' }}>
                            <div style={{ width: '100px', height: '100px', border: '1px solid rgba(30, 58, 138, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                              <img src={transformDriveUrl(certSettings.cert_seal_url) || "https://nils.gov.lk/wp-content/uploads/2021/05/cropped-NILS-Logo.png"} className="seal-img" style={{ width: `${65 * ((parseInt(certSettings.cert_seal_size) || 100) / 100)}px`, opacity: 0.8 }} alt="Seal" />
                            </div>
                            <div style={{ color: '#1e3a8a', lineHeight: '1.2', fontWeight: 'bold' }}>
                              <p style={{ margin: 0, fontSize: '12px', letterSpacing: '1px', fontWeight: '900' }}>VERIFIED DOCUMENT</p>
                              <p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>ID: NILS-CERT-2026-0001</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_2_y) || 0)}px)` }}>
                            <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_2_y) || 0)}px)` }}>
                              <img src={transformDriveUrl(certSettings.cert_sig_2)} className="sig-right" style={{ height: `${90 * ((parseInt(certSettings.cert_sig_2_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} alt="Signature 2" />
                            </div>
                            <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}>
                              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_2?.toUpperCase()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        )}
      </div>

      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
              <div className="flex items-center gap-2"><Edit3 className="w-5 h-5 text-nilsBlue-600" /><h3 className="font-bold text-gray-900 dark:text-white text-lg">Edit User Details</h3></div>
              <button onClick={() => setEditingProfile(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label><input value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} className="form-input" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name with Initials</label><input value={profileForm.name_with_initials} onChange={e => setProfileForm({ ...profileForm, name_with_initials: e.target.value })} className="form-input" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIC Number</label><input value={profileForm.nic} onChange={e => setProfileForm({ ...profileForm, nic: e.target.value.toUpperCase() })} className="form-input uppercase" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label><input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="form-input" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label><input type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} className="form-input" /></div>
                <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permanent Address</label><textarea value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} rows={2} className="form-input resize-none" /></div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setEditingProfile(null)} className="btn-outline py-2 text-sm">Cancel</button>
              <button onClick={saveUserProfile} disabled={savingProfile} className="btn-primary py-2 text-sm px-6">{savingProfile ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up border-2 border-red-500/20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-red-600 dark:text-red-400 text-lg">Remove User</h3>
              <button onClick={() => { setDeletingUser(null); setDeletePin(''); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">You are about to remove <strong>{deletingUser.full_name || deletingUser.email}</strong> from the system.</p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-xs text-red-700 dark:text-red-400">⚠ Warning: This action cannot be undone.</div>
              <input type="password" maxLength={6} value={deletePin} onChange={e => setDeletePin(e.target.value)} placeholder="Enter PIN: 456789" className="form-input text-center text-lg tracking-widest border-red-200 focus:border-red-500 focus:ring-red-500/20" autoFocus />
              <button onClick={handleDeleteUser} disabled={deletePin.length < 4 || (deletingUser && processing[deletingUser.id])} className="btn-primary w-full justify-center py-3 bg-red-600 hover:bg-red-700 text-white">
                {deletingUser && processing[deletingUser.id] ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCourseModal && (

        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{editingCourse ? 'Edit Course' : 'New Studio Course'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course Title *</label><input value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Title..." className="form-input" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label><textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} className="form-input resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Thumbnail URL</label><input value={courseForm.thumbnail_url} onChange={e => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })} className="form-input" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pricing Type</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!courseForm.is_paid} onChange={() => setCourseForm({ ...courseForm, is_paid: false, price: 0 })} className="w-4 h-4 accent-nilsBlue-700" /> <span className="text-sm">Free</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={courseForm.is_paid} onChange={() => setCourseForm({ ...courseForm, is_paid: true })} className="w-4 h-4 accent-nilsBlue-700" /> <span className="text-sm">Paid</span></label>
                </div>
                {courseForm.is_paid && <input type="number" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} className="form-input mt-3 max-w-[150px]" placeholder="Price..." />}
              </div>
              <label className="flex items-center gap-3 cursor-pointer pt-4 border-t border-gray-100 dark:border-gray-700">
                <input type="checkbox" checked={courseForm.issues_certificate} onChange={e => setCourseForm({ ...courseForm, issues_certificate: e.target.checked })} className="w-5 h-5 accent-nilsGold" />
                <span className="text-sm font-bold flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Award className="w-4 h-4 text-nilsGold" /> Issue Certificate</span>
              </label>
              <button onClick={saveCourse} disabled={saving || !courseForm.title} className="btn-primary w-full justify-center py-3 mt-4">{saving ? 'SAVING...' : 'SAVE COURSE'}</button>
            </div>
          </div>
        </div>
      )}

      {showLessonModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</h3>
              <button onClick={() => setShowLessonModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lesson Title *</label><input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} className="form-input" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">YouTube URL *</label><input value={lessonForm.video_url} onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })} className="form-input" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order</label><input type="number" value={lessonForm.lesson_order} onChange={e => setLessonForm({ ...lessonForm, lesson_order: e.target.value })} className="form-input max-w-[120px]" /></div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={lessonForm.is_free_preview} onChange={e => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium">Free Preview</span>
              </label>
              <button onClick={saveLesson} disabled={saving || !lessonForm.title || !lessonForm.video_url} className="btn-primary w-full justify-center py-3 mt-4">SAVE LESSON</button>
            </div>
          </div>
        </div>
      )}

      {showQuizModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Exam Question Editor</h3>
              <button onClick={() => setShowQuizModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <textarea value={questionForm.question} onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="Question..." className="form-input" rows={2} />
              <div className="space-y-3">
                <input value={questionForm.correct_answer} onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} placeholder="Correct Answer" className="form-input border-emerald-200" />
                <input value={questionForm.wrong_answer1} onChange={e => setQuestionForm({ ...questionForm, wrong_answer1: e.target.value })} placeholder="Wrong 1" className="form-input border-red-100" />
                <input value={questionForm.wrong_answer2} onChange={e => setQuestionForm({ ...questionForm, wrong_answer2: e.target.value })} placeholder="Wrong 2" className="form-input border-red-100" />
                <input value={questionForm.wrong_answer3} onChange={e => setQuestionForm({ ...questionForm, wrong_answer3: e.target.value })} placeholder="Wrong 3" className="form-input border-red-100" />
              </div>
              <button onClick={saveQuestion} disabled={saving || !questionForm.question} className="btn-primary w-full justify-center py-3 mt-4">SAVE QUESTION</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar-smooth::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-smooth::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #fff; }
        .smooth-slider { -webkit-appearance: none; width: 100%; height: 6px; background: #e2e8f0; border-radius: 10px; outline: none; }
        .smooth-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: #1e3a8a; border-radius: 50%; cursor: pointer; border: 3px solid #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      `}} />
    </div>
  );
};

export default SuperAdminDashboard;