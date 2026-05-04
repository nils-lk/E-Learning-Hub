import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, BookOpen, Pencil, Trash2, Video, X, Save, Eye, EyeOff, GripVertical, Award, HelpCircle } from 'lucide-react';

const emptyForm = { title: '', description: '', is_paid: false, price: '', thumbnail_url: '', issues_certificate: false };
const emptyLesson = { title: '', description: '', video_url: '', lesson_order: 1, is_free_preview: false };

const LecturerDashboard = () => {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const loadCourses = async () => {
    let query = supabase
      .from('courses')
      .select('*, lessons(id), profiles:lecturer_id(full_name)')
      .order('created_at', { ascending: false });
      
    if (profile?.role === 'lecturer' || profile?.role === 'user') {
      query = query.eq('lecturer_id', user.id);
    }
    
    const { data } = await query;
    setCourses(data ?? []);
    setLoading(false);
  };

  const loadLessons = async (courseId) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_order');
    setLessons(data ?? []);
  };

  useEffect(() => { loadCourses(); }, []);

  const openLessons = (course) => {
    setActiveCourse(course);
    loadLessons(course.id);
    loadQuiz(course.id);
  };

  const loadQuiz = async (courseId) => {
    const { data } = await supabase.from('quiz_questions').select('*').eq('course_id', courseId);
    setQuestions(data ?? []);
  };

  const saveQuestion = async () => {
    setSaving(true);
    const payload = { ...questionForm, course_id: activeCourse.id };
    try {
      if (editingQuestion) {
        await supabase.from('quiz_questions').update(payload).eq('id', editingQuestion.id);
      } else {
        await supabase.from('quiz_questions').insert([payload]);
      }
      setShowQuizModal(false);
      loadQuiz(activeCourse.id);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('quiz_questions').delete().eq('id', id);
    loadQuiz(activeCourse.id);
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
      lecturer_id: editingCourse ? editingCourse.lecturer_id : user.id,
      is_approved: profile?.role === 'admin' || profile?.role === 'superadmin' ? true : (editingCourse ? editingCourse.is_approved : false),
    };

    try {
      let result;
      if (editingCourse) {
        result = await supabase.from('courses').update(payload).eq('id', editingCourse.id);
      } else {
        result = await supabase.from('courses').insert([payload]);
      }

      if (result.error) throw result.error;

      setShowCourseModal(false);
      setEditingCourse(null);
      setCourseForm(emptyForm);
      await loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course and all its lessons?')) return;
    await supabase.from('courses').delete().eq('id', id);
    loadCourses();
    if (activeCourse?.id === id) setActiveCourse(null);
  };

  const saveLesson = async () => {
    setSaving(true);
    try {
      let result;
      if (editingLesson) {
        result = await supabase.from('lessons').update({
          title: lessonForm.title,
          description: lessonForm.description,
          video_url: lessonForm.video_url,
          lesson_order: Number(lessonForm.lesson_order),
          is_free_preview: lessonForm.is_free_preview,
        }).eq('id', editingLesson.id);
      } else {
        // Ensure we don't send the 'id' if lessonForm was repurposed from an edit
        const { id, created_at, ...lessonData } = lessonForm;
        result = await supabase.from('lessons').insert([{ 
          ...lessonData, 
          course_id: activeCourse.id,
          lesson_order: Number(lessonForm.lesson_order) 
        }]);
      }

      if (result.error) throw result.error;

      setShowLessonModal(false);
      setEditingLesson(null);
      setLessonForm(emptyLesson);
      await loadLessons(activeCourse.id);
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    await supabase.from('lessons').delete().eq('id', lessonId);
    loadLessons(activeCourse.id);
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Lecturer Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your courses and lessons</p>
          </div>
          <button
            id="add-course-btn"
            onClick={() => { setCourseForm(emptyForm); setEditingCourse(null); setShowCourseModal(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> New Course
          </button>
        </div>

        {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Course list */}
            <div className="space-y-4">
              <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Your Courses ({courses.length})</h2>
              {courses.length === 0 && (
                <div className="dash-card text-center py-12 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  No courses yet. Create your first one!
                </div>
              )}
              {courses.map(c => (
                <div
                  key={c.id}
                  onClick={() => openLessons(c)}
                  className={`dash-card cursor-pointer border-2 transition-all ${
                    activeCourse?.id === c.id
                      ? 'border-nilsBlue-500 dark:border-nilsBlue-500'
                      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="flex flex-col">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{c.title}</p>
                          {(profile?.role === 'admin' || profile?.role === 'superadmin') && c.lecturer_id !== user.id && (
                            <p className="text-[10px] text-gray-400">By {c.profiles?.full_name || 'Another user'}</p>
                          )}
                        </div>
                        <span className={c.is_approved ? 'badge-approved' : 'badge-pending'}>
                          {c.is_approved ? 'Approved' : 'Pending'}
                        </span>
                        {c.is_paid ? (
                          <span className="badge-paid">Rs. {Number(c.price).toLocaleString()}</span>
                        ) : (
                          <span className="badge-free">Free</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{c.lessons?.length ?? 0} lessons</p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setCourseForm(c); setEditingCourse(c); setShowCourseModal(true); }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-nilsBlue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCourse(c.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lesson list */}
            <div>
              {activeCourse ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">{activeCourse.title} — Lessons</h2>
                    <button
                      id="add-lesson-btn"
                      onClick={() => { setEditingLesson(null); setLessonForm({ ...emptyLesson, lesson_order: lessons.length + 1 }); setShowLessonModal(true); }}
                      className="btn-outline text-sm py-2"
                    >
                      <Plus className="w-4 h-4" /> Add Lesson
                    </button>
                  </div>
                  {lessons.length === 0 ? (
                    <div className="dash-card text-center py-10 text-gray-400">
                      <Video className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      No lessons yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson, idx) => (
                        <div key={lesson.id} className="dash-card flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                          <div className="w-7 h-7 rounded-full bg-nilsBlue-100 dark:bg-nilsBlue-900/40 flex items-center justify-center text-xs font-bold text-nilsBlue-700 dark:text-nilsBlue-400 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{lesson.title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{lesson.video_url}</p>
                          </div>
                          {lesson.is_free_preview && (
                            <Eye className="w-4 h-4 text-emerald-500 shrink-0" title="Free preview" />
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingLesson(lesson); setLessonForm(lesson); setShowLessonModal(true); }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-nilsBlue-600 rounded-lg transition-colors"
                              title="Edit Lesson"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quiz Section */}
                  <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-nilsGold" /> Final Quiz Questions
                        </h2>
                        <p className="text-xs text-gray-500">Students must score 80%+ to pass</p>
                      </div>
                      <button
                        onClick={() => { setEditingQuestion(null); setQuestionForm({ question: '', correct_answer: '', wrong_answer1: '', wrong_answer2: '', wrong_answer3: '' }); setShowQuizModal(true); }}
                        className="btn-outline text-xs py-2"
                      >
                        <Plus className="w-4 h-4" /> Add Question
                      </button>
                    </div>

                    {questions.length === 0 ? (
                      <div className="dash-card text-center py-10 text-gray-400 bg-gray-50/50">
                        No quiz questions yet. Add some to enable the final exam.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {questions.map((q, idx) => (
                          <div key={q.id} className="dash-card">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {idx + 1}</p>
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingQuestion(q); setQuestionForm(q); setShowQuizModal(true); }} className="p-1 hover:text-nilsBlue-600"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteQuestion(q.id)} className="p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm mb-3">{q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-400">
                                <span className="font-bold">Correct:</span> {q.correct_answer}
                              </div>
                              <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-[11px] text-red-600 dark:text-red-400">
                                <span className="font-bold">Wrong:</span> {q.wrong_answer1}
                              </div>
                              <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-[11px] text-red-600 dark:text-red-400">
                                <span className="font-bold">Wrong:</span> {q.wrong_answer2}
                              </div>
                              <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-[11px] text-red-600 dark:text-red-400">
                                <span className="font-bold">Wrong:</span> {q.wrong_answer3}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="dash-card text-center py-16 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">Select a course to manage its lessons</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course Title *</label>
                <input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Labour Law Fundamentals" className="form-input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief overview of the course…" rows={3} className="form-input resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Thumbnail URL</label>
                <input value={courseForm.thumbnail_url} onChange={e => setCourseForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="https://…" className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pricing Type</label>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pricing" checked={!courseForm.is_paid}
                      onChange={() => setCourseForm(f => ({ ...f, is_paid: false, price: 0 }))}
                      className="w-4 h-4 rounded accent-nilsBlue-700" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free Course</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pricing" checked={courseForm.is_paid}
                      onChange={() => setCourseForm(f => ({ ...f, is_paid: true }))}
                      className="w-4 h-4 rounded accent-nilsBlue-700" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid Course</span>
                  </label>
                </div>
                {courseForm.is_paid && (
                  <div className="mt-3">
                    <input type="number" value={courseForm.price}
                      onChange={e => setCourseForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="Course Price (Rs.)" className="form-input max-w-[150px]" min="0" />
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${courseForm.issues_certificate ? 'bg-nilsBlue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${courseForm.issues_certificate ? 'translate-x-4' : ''}`} />
                  </div>
                  <input type="checkbox" className="sr-only" checked={courseForm.issues_certificate} onChange={e => setCourseForm({...courseForm, issues_certificate: e.target.checked})} />
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
                    <Award className={`w-4 h-4 ${courseForm.issues_certificate ? 'text-nilsGold' : 'text-gray-400'}`} />
                    Issue Official Certificate
                  </div>
                </label>
                <p className="text-[11px] text-gray-400 mt-2 ml-13">If enabled, students who pass the final quiz will receive a verifiable NILS certificate.</p>
              </div>
              {profile?.role !== 'admin' && profile?.role !== 'superadmin' && (
                <div className="text-xs text-gray-400 dark:text-gray-500 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-2.5">
                  ⚠ New courses require Admin approval before going live.
                </div>
              )}
              <button onClick={saveCourse} disabled={saving || !courseForm.title} className="btn-primary w-full justify-center py-3">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> {editingCourse ? 'Save Changes' : 'Submit for Approval'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {editingLesson ? 'Edit Lesson' : 'Add Lesson'}
              </h3>
              <button onClick={() => setShowLessonModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lesson Title *</label>
                <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Introduction to Labour Act" className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lesson Notes / Download Links</label>
                <textarea value={lessonForm.description} onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add notes, PDF links, Google Drive links, or reading material..." rows={3} className="form-input resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">YouTube Video URL *</label>
                <input value={lessonForm.video_url} onChange={e => setLessonForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://youtu.be/xxxxx (unlisted OK)" className="form-input" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Paste any YouTube link — unlisted videos are supported. Students see a custom player, not YouTube.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order</label>
                <input type="number" value={lessonForm.lesson_order}
                  onChange={e => setLessonForm(f => ({ ...f, lesson_order: Number(e.target.value) }))}
                  min="1" className="form-input max-w-[120px]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={lessonForm.is_free_preview}
                  onChange={e => setLessonForm(f => ({ ...f, is_free_preview: e.target.checked }))}
                  className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free Preview (visible without enrollment)</span>
              </label>
              <button onClick={saveLesson} disabled={saving || !lessonForm.title || !lessonForm.video_url}
                className="btn-primary w-full justify-center py-3">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Lesson</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Question Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {editingQuestion ? 'Edit Question' : 'Add Quiz Question'}
              </h3>
              <button onClick={() => setShowQuizModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question Text</label>
                <textarea value={questionForm.question} onChange={e => setQuestionForm({...questionForm, question: e.target.value})} className="form-input" rows={2} placeholder="e.g. What is the maximum working hours per week under the Labour Act?" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Correct Answer</label>
                  <input value={questionForm.correct_answer} onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="form-input border-emerald-200 focus:border-emerald-500" placeholder="The right answer" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-500 uppercase mb-1">Wrong Answer 1</label>
                  <input value={questionForm.wrong_answer1} onChange={e => setQuestionForm({...questionForm, wrong_answer1: e.target.value})} className="form-input border-red-100 focus:border-red-500" placeholder="Distractor 1" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-500 uppercase mb-1">Wrong Answer 2</label>
                  <input value={questionForm.wrong_answer2} onChange={e => setQuestionForm({...questionForm, wrong_answer2: e.target.value})} className="form-input border-red-100 focus:border-red-500" placeholder="Distractor 2" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-500 uppercase mb-1">Wrong Answer 3</label>
                  <input value={questionForm.wrong_answer3} onChange={e => setQuestionForm({...questionForm, wrong_answer3: e.target.value})} className="form-input border-red-100 focus:border-red-500" placeholder="Distractor 3" />
                </div>
              </div>
              <button onClick={saveQuestion} disabled={saving || !questionForm.question || !questionForm.correct_answer} className="btn-primary w-full justify-center py-3">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Question</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerDashboard;
