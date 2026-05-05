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

  const transformDriveUrl = (url) => {
    if (!url) return url;
    const idMatch = url.match(/[-\w]{25,50}/);
    if (idMatch && (url.includes('drive.google') || url.includes('google.com') || url.includes('docs.google'))) {
      return `https://googleusercontent.com/profile/picture/0${idMatch[0]}`;
    }
    return url;
  };

  const toBase64 = async (url) => {
    return new Promise((resolve) => {
      const idMatch = url.match(/[-\w]{25,50}/);
      if (!idMatch) { resolve(url); return; }
      const id = idMatch[0];
      const tryLoad = (src, phase) => {
        const img = new Image(); img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          try { resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(url); }
        };
        img.onerror = () => {
          if (phase === 'LH3') tryLoad(`https://drive.google.com/uc?id=${id}`, 'UC');
          else if (phase === 'UC') tryLoad(`https://drive.google.com/thumbnail?id=${id}&sz=w2500`, 'THUMB');
          else resolve(url);
        };
        img.src = src;
      };
      tryLoad(`https://googleusercontent.com/profile/picture/0${id}`, 'LH3');
    });
  };

  const filteredProfiles = profiles.filter(p => p.email?.toLowerCase().includes(search.toLowerCase()) || p.full_name?.toLowerCase().includes(search.toLowerCase()));
  const pendingCourses = allCourses.filter(c => !c.is_approved);

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
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {filteredProfiles.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                          <td className="px-8 py-5">
                            <div><p className="font-bold text-gray-900 dark:text-white">{p.full_name}</p><p className="text-xs text-gray-500">{p.email}</p></div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${roleColors[p.role]}`}>{p.role}</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              {ROLES.map(r => <button key={r} onClick={() => handleUpdateRole(p.id, r)} disabled={updating[p.id] || p.role === r} className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase ${p.role === r ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{r}</button>)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingCourses.length === 0 ? <div className="col-span-full py-20 text-center text-gray-400 font-bold">No courses pending approval.</div> : pendingCourses.map(c => (
                  <div key={c.id} className="dash-card space-y-4">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-bold"><BookOpen className="w-6 h-6" /></div><div><p className="font-bold text-gray-900 dark:text-white line-clamp-1">{c.title}</p><p className="text-xs text-gray-500">By {c.profiles?.full_name}</p></div></div>
                    <div className="flex gap-3"><button onClick={() => handleApproveCourse(c.id)} disabled={processing[c.id]} className="btn-primary flex-1 py-3 text-xs">{processing[c.id] ? '...' : 'APPROVE COURSE'}</button><button onClick={() => deleteCourse(c.id)} className="btn-danger flex-1 py-3 text-xs">REJECT</button></div>
                  </div>
                ))}
              </div>
            )}

            {tab === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingSlips.length === 0 ? <div className="col-span-full py-20 text-center text-gray-400 font-bold">No pending payment slips.</div> : pendingSlips.map(s => (
                  <div key={s.id} className="dash-card space-y-4">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-nilsBlue-50 rounded-2xl flex items-center justify-center text-nilsBlue-600 font-bold">{s.profiles?.full_name?.[0]}</div><div><p className="font-bold text-gray-900 dark:text-white">{s.profiles?.full_name}</p><p className="text-xs text-gray-500">{s.courses?.title}</p></div></div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 relative group"><img src={supabase.storage.from('payment_slips').getPublicUrl(s.payment_slip_url).data.publicUrl} className="w-full h-full object-cover" alt="slip" /><a href={supabase.storage.from('payment_slips').getPublicUrl(s.payment_slip_url).data.publicUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs"><Eye className="mr-2 w-4 h-4" /> View Slip</a></div>
                    <div className="flex gap-3"><button onClick={() => handleApproveSlip(s.id)} disabled={processing[s.id]} className="btn-success flex-1 py-3 text-xs">{processing[s.id] ? '...' : 'APPROVE'}</button><button className="btn-danger flex-1 py-3 text-xs">REJECT</button></div>
                  </div>
                ))}
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