import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Lock, Unlock, Upload, CheckCircle, Clock, ChevronRight,
  Play, AlertCircle, FileText, X, BookOpen, Award, HelpCircle, XCircle, Download, Shield, Loader2, Image as ImageIcon, UserCircle
} from 'lucide-react';

const CourseDetails = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment & Cert state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizAttempt, setQuizAttempt] = useState(null);

  // v32.0 Engine state
  const [certSettings, setCertSettings] = useState({});
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [showCertPreview, setShowCertPreview] = useState(false);
  const [activeCertData, setActiveCertData] = useState(null);
  const [base64Assets, setBase64Assets] = useState({});

  // World-class dynamic scaling state
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from('courses')
        .select('*, profiles:lecturer_id(full_name, email)')
        .eq('id', id)
        .single();
      const { data: l } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('lesson_order');

      setCourse(c);
      setLessons(l ?? []);
      if (l?.length) setActiveLesson(l[0]);

      if (user) {
        const queryId = isNaN(id) ? id : parseInt(id);
        const { data: en } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', queryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setEnrollment(en);

        const { data: q } = await supabase.from('quiz_questions').select('id').eq('course_id', queryId).limit(1);
        setHasQuiz(q?.length > 0);

        const { data: attempt } = await supabase.from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', queryId)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle();
        setQuizAttempt(attempt);

        const { data: settings } = await supabase.from('system_settings').select('*');
        if (settings) {
          const sObj = {};
          settings.forEach(s => sObj[s.key] = s.value);
          setCertSettings(sObj);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  // Dynamic Scale Effect for perfect Mobile/Desktop fit
  useEffect(() => {
    if (!showCertPreview) return;

    const updateScale = () => {
      // Calculate available space dynamically
      const paddingX = window.innerWidth >= 768 ? 96 : 48; // Left/Right spacing
      const paddingY = window.innerWidth >= 768 ? 200 : 220; // Top header + Bottom spacing

      const availableWidth = window.innerWidth - paddingX;
      const availableHeight = window.innerHeight - paddingY;

      // Calculate scale factors for both dimensions
      const scaleX = availableWidth / 1123;
      const scaleY = availableHeight / 794;

      // Pick the smallest scale so it perfectly fits on the screen without scrolling
      const optimalScale = Math.min(1, scaleX, scaleY);

      setPreviewScale(Math.max(0.15, optimalScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [showCertPreview]);

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

  const handleOpenCert = async () => {
    if (!profile?.nic || (!profile?.full_name && !profile?.name_with_initials)) {
      alert('Please update your Profile first.');
      return;
    }
    const synced = await syncInstitutionalAssets();
    if (!synced) { alert('Sync failed.'); return; }

    const studentName = profile?.name_with_initials || profile?.full_name || 'STUDENT';
    const studentNic = profile?.nic || '000000000V';
    const courseTitle = course.title?.toUpperCase() || 'COURSE TITLE';
    const certId = `NILS-CERT-${enrollment.id.slice(0, 8).toUpperCase()}-${new Date(enrollment.updated_at || Date.now()).getFullYear()}`;
    const certDate = new Date(enrollment.updated_at || enrollment.created_at || Date.now()).toLocaleDateString('en-GB');

    setActiveCertData({ studentName, studentNic, courseTitle, certId, certDate });
    setShowCertPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingCert) return;
    setIsGeneratingCert(true);
    const original = document.getElementById('master-inst-replica-course');
    if (!original) { setIsGeneratingCert(false); return; }
    const shadow = document.createElement('div');
    shadow.style.position = 'fixed'; shadow.style.left = '-9999px'; shadow.style.top = '-9999px';
    shadow.style.width = '1123px'; shadow.style.height = '794px';
    shadow.style.background = '#ffffff';
    shadow.innerHTML = original.outerHTML;
    document.body.appendChild(shadow);
    const clone = shadow.firstChild;
    clone.style.transform = 'none'; clone.style.width = '1123px'; clone.style.height = '794px';
    try {
      await new Promise(res => setTimeout(res, 6000));
      const canvas = await html2canvas(clone, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
        width: 1123, height: 794, windowWidth: 1123, windowHeight: 794, logging: false
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1123, 794], compress: true });
      pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794, undefined, 'FAST');
      pdf.save(`NILS_CERTIFICATE_${activeCertData.studentName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { console.error(e); } finally {
      document.body.removeChild(shadow);
      setIsGeneratingCert(false);
    }
  };

  const isEnrolled = enrollment?.status === 'approved' || enrollment?.status === 'completed';
  const isPending = enrollment?.status === 'pending';
  const isRejected = enrollment?.status === 'rejected';

  const canWatch = (l) => {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') return true;
    if (l?.is_free_preview) return true;
    return isEnrolled;
  };

  const handleSlipUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `slips/${user.id}-${id}-${Date.now()}.${ext}`;
      await supabase.storage.from('payment_slips').upload(filePath, file);
      if (enrollment) await supabase.from('enrollments').update({ payment_slip_url: filePath, status: 'pending', created_at: new Date().toISOString() }).eq('id', enrollment.id);
      else await supabase.from('enrollments').insert([{ user_id: user.id, course_id: id, payment_slip_url: filePath, status: 'pending' }]);
      setEnrollment({ status: 'pending' });
      setShowPayModal(false);
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  };

  if (loading) return <div className="pt-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!course) return <div className="pt-24 text-center">Course not found.</div>;

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-nilsBlue-900 to-nilsBlue-700 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-nilsBlue-300 hover:text-white text-sm flex items-center gap-1 mb-4"><ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard</Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{course.title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          {activeLesson ? (canWatch(activeLesson) ? <VideoPlayer videoUrl={activeLesson.video_url} title={activeLesson.title} /> : <div className="aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 border border-white/5 shadow-2xl"><Lock className="w-10 h-10 text-gray-700" /><p className="font-bold">Lesson Locked</p><p className="text-sm opacity-50">Enroll to unlock full course content.</p></div>) : <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center text-gray-500 border border-white/5">No lessons</div>}

          {activeLesson && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-900 dark:text-white text-xl tracking-tight">{activeLesson.title}</h2>
                {activeLesson.is_free_preview && <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-widest">Free Preview</span>}
              </div>
            </div>
          )}

          {/* AUTH & ENROLLMENT CTA */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-l-4 border-nilsGold shadow-sm">
            {!user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center"><UserCircle className="w-6 h-6 text-slate-400" /></div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Login to Enroll</p>
                    <p className="text-sm text-slate-500">Please sign in to access lessons and earn your certificate.</p>
                  </div>
                </div>
                <Link to="/login" className="px-8 py-3.5 bg-nilsBlue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-nilsBlue-100 transition-all text-center">Login Now</Link>
              </div>
            ) : (
              <>
                {isEnrolled && <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-5 h-5 shrink-0" /><p className="font-bold text-sm text-emerald-600">Enrollment Verified — Enjoy your course!</p></div>}
                {isPending && <div className="flex items-center gap-4 text-yellow-600"><Clock className="w-6 h-6 shrink-0" /><div><p className="font-black uppercase tracking-tight">Payment Under Review</p><p className="text-sm opacity-70">Your slip has been submitted. An admin will approve it soon.</p></div></div>}
                {isRejected && <div className="flex items-start gap-4 text-red-600"><AlertCircle className="w-6 h-6 shrink-0 mt-1" /><div><p className="font-black uppercase tracking-tight">Enrollment Rejected</p><p className="text-sm opacity-70 mb-3">Please re-submit a valid slip.</p><button onClick={() => setShowPayModal(true)} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-100">Re-upload Slip</button></div></div>}
                {!enrollment && (course.is_paid ? <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Enroll in this course</p><p className="text-sm text-slate-500">Pay via GovPay and submit your slip.</p></div><button onClick={() => setShowPayModal(true)} className="px-8 py-3.5 bg-nilsBlue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-nilsBlue-100 transition-all">Pay & Enroll</button></div> : <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">This course is free!</p></div><button onClick={async () => { const { error } = await supabase.from('enrollments').insert([{ user_id: user.id, course_id: id, status: 'approved' }]); if (!error) setEnrollment({ status: 'approved' }); }} className="px-8 py-3.5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 transition-all">Enroll Free</button></div>)}
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden sticky top-20">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5"><h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">Course Content</h3></div>
            <div className="max-h-[60vh] overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const accessible = canWatch(lesson);
                return (
                  <button key={lesson.id} onClick={() => setActiveLesson(lesson)} className={`w-full text-left flex items-center gap-4 px-6 py-4 border-b border-slate-50 dark:border-white/5 ${activeLesson?.id === lesson.id ? 'bg-nilsBlue-50 dark:bg-nilsBlue-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${activeLesson?.id === lesson.id ? 'bg-nilsBlue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                      {accessible ? (activeLesson?.id === lesson.id ? <Play className="w-3 h-3 fill-current" /> : idx + 1) : <Lock className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${activeLesson?.id === lesson.id ? 'text-nilsBlue-700 dark:text-nilsBlue-400' : 'text-slate-700 dark:text-slate-300'}`}>{lesson.title}</p>
                      {lesson.is_free_preview && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Free Preview</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {isEnrolled && (hasQuiz || course.issues_certificate) && (
              <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                {quizAttempt?.passed ? <button onClick={handleOpenCert} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"><Award className="w-4 h-4" /> Download Certificate</button> : <Link to={`/quiz/${id}`} className="w-full py-4 bg-nilsBlue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-nilsBlue-100">Start Final Exam</Link>}
              </div>
            )}
          </div>
        </div>
      </div>

      {isSyncingAssets && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-6"><div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><h4 className="text-white font-black text-xl uppercase tracking-tighter">Syncing Institutional Engine...</h4></div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-10 py-7 border-b border-slate-100 dark:border-white/5 flex items-center justify-between"><h3 className="font-black uppercase tracking-tight text-xl text-slate-800 dark:text-white">GovPay Enrollment</h3><button onClick={() => setShowPayModal(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="p-10 space-y-8">
              <div className="bg-slate-50 dark:bg-white/5 p-7 rounded-[2rem] border border-slate-100 dark:border-white/5"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bank Details</p><div className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300"><p className="flex justify-between">Fee: <span className="text-nilsBlue-600 font-black">Rs. {Number(course.price).toLocaleString()}</span></p><p className="pt-2 border-t border-slate-200 dark:border-white/5 mt-2">Bank: Bank of Ceylon</p><p>Account: 0123456789</p></div></div>
              <div className="space-y-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Slip</p><label className={`relative group flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-[2rem] transition-all cursor-pointer ${file ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 dark:border-white/10'}`}>{file ? <div className="text-center"><CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" /><p className="text-sm font-black text-slate-800 dark:text-white">{file.name}</p></div> : <div className="text-center"><ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-2" /><p className="text-sm font-black">Choose Slip Image</p></div>}<input type="file" onChange={e => setFile(e.target.files[0])} className="hidden" accept="image/*,.pdf" /></label></div>
              <button onClick={handleSlipUpload} disabled={!file || uploading} className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 transition-all">{uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Payment Slip'}</button>
            </div>
          </div>
        </div>
      )}

      {showCertPreview && activeCertData && (
        <div className="fixed inset-0 z-[110] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center overflow-hidden">

          {/* Header section optimized for mobile readability */}
          <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center px-6 md:px-10 py-6 md:py-8 gap-4 md:gap-0 shrink-0 z-10">
            <div className="w-full md:w-auto mt-6 md:mt-0">
              <div className="flex items-center gap-3 md:gap-4">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 shrink-0" />
                <h3 className="text-white font-black text-2xl md:text-4xl uppercase tracking-tighter">Official Certification</h3>
              </div>
              <p className="text-white/30 text-[9px] md:text-[11px] font-black uppercase tracking-widest mt-2 ml-11 md:ml-14">Institutional Master Design v32.0 Sync Enabled</p>
            </div>

            <div className="flex w-full md:w-auto items-center gap-4 md:gap-6 mt-2 md:mt-0">
              <button onClick={handleDownloadPDF} disabled={isGeneratingCert} className="flex-1 md:flex-none px-6 md:px-14 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl md:rounded-[2rem] font-black uppercase tracking-widest text-xs md:text-sm shadow-2xl flex items-center justify-center gap-2 md:gap-4 transition-all active:scale-95 disabled:opacity-50">
                {isGeneratingCert ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
                {isGeneratingCert ? 'Exporting...' : 'Download Master PDF'}
              </button>
              <button onClick={() => setShowCertPreview(false)} className="absolute top-4 right-4 md:static w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-20">
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>
          </div>

          {/* Dynamic Scaling Certificate Container */}
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden">
            <div
              className="relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 rounded-md transition-all duration-300 ease-out"
              style={{
                width: `${1123 * previewScale}px`,
                height: `${794 * previewScale}px`
              }}
            >
              <div id="master-inst-replica-course" style={{
                width: '1123px',
                height: '794px',
                background: '#fff',
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#000',
                fontFamily: "'Times New Roman', serif",
                overflow: 'hidden',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left'
              }}>
                <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, transform: `translate(${(parseInt(certSettings.cert_bg_x) || 0)}px, ${(parseInt(certSettings.cert_bg_y) || 0)}px) scale(${(parseInt(certSettings.cert_bg_size) || 100) / 100})` }}>
                  <img src={base64Assets.cert_bg_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px', border: '2px solid #1e3a8a', padding: '5px', zIndex: 1 }}><div style={{ border: '8px double #1e3a8a', height: '100%' }}></div></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                  <div style={{ position: 'absolute', top: '70px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_1_x) || 0)}px, ${(parseInt(certSettings.cert_logo_1_y) || 0)}px)` }}><img src={base64Assets.cert_logo_left} style={{ height: `${100 * ((parseInt(certSettings.cert_logo_1_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} /></div>
                    <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_2_x) || 0)}px, ${(parseInt(certSettings.cert_logo_2_y) || 0)}px)` }}><img src={base64Assets.cert_logo_right} style={{ height: `${100 * ((parseInt(certSettings.cert_logo_2_size) || 100) / 100)}px`, maxWidth: '350px', objectFit: 'contain' }} /></div>
                  </div>
                  <div style={{ position: 'absolute', top: `${270 + (parseInt(certSettings.cert_content_y) || 0)}px`, left: `${(parseInt(certSettings.cert_content_x) || 0)}px`, width: '100%', textAlign: 'center', padding: '0 50px', boxSizing: 'border-box' }}>
                    <h2 style={{ fontSize: `${parseInt(certSettings.cert_title_size) || 44}px`, color: '#854d0e', margin: '0', fontStyle: 'italic', fontWeight: 'bold' }}>{certSettings.cert_main_title}</h2>
                    <p style={{ fontSize: '20px', margin: '15px 0', color: '#333' }}>{certSettings.cert_certify_text}</p>
                    <h3 style={{ fontSize: `${parseInt(certSettings.cert_name_size) || 64}px`, margin: '10px 0', color: '#1e3a8a', fontWeight: 'bold', fontFamily: "'Dancing Script', cursive" }}>{activeCertData.studentName}</h3>
                    <div style={{ width: '350px', height: '2px', background: '#1e3a8a', opacity: 0.3, margin: '10px auto' }}></div>
                    <div style={{ transform: `translateY(${(parseInt(certSettings.cert_nic_y) || 0)}px)` }}><p style={{ fontSize: `${parseInt(certSettings.cert_nic_size) || 18}px`, margin: '0', color: '#444' }}>National Identity Card No: <strong>{activeCertData.studentNic}</strong></p></div>
                    <p style={{ fontSize: '20px', margin: '20px 0', color: '#333' }}>{certSettings.cert_success_text}</p>
                    <h4 style={{ fontSize: '42px', color: '#1e3a8a', margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>{activeCertData.courseTitle}</h4>
                    <p style={{ fontSize: '16px', color: '#555', fontStyle: 'italic', maxWidth: '850px', margin: '40px auto 0 auto' }}>{certSettings.cert_tagline}</p>
                  </div>
                  <div style={{ position: 'absolute', bottom: '75px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box' }}>
                    <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_1_y) || 0)}px)` }}>
                      <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_1_y) || 0)}px)` }}><img src={base64Assets.cert_sig_1} style={{ height: `${90 * ((parseInt(certSettings.cert_sig_1_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} /></div>
                      <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_1?.toUpperCase()}</p></div>
                    </div>
                    <div style={{ textAlign: 'center', transform: `translate(${(parseInt(certSettings.cert_seal_x) || 0)}px, ${(parseInt(certSettings.cert_seal_y) || 0)}px)`, minWidth: '170px' }}>
                      <div style={{ width: '100px', height: '100px', border: '1px solid rgba(30, 58, 138, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}><img src={base64Assets.cert_seal_url || "https://nils.gov.lk/wp-content/uploads/2021/05/cropped-NILS-Logo.png"} style={{ width: `${65 * ((parseInt(certSettings.cert_seal_size) || 100) / 100)}px`, opacity: 0.8 }} /></div>
                      <div style={{ color: '#1e3a8a', lineHeight: '1.2', fontWeight: 'bold' }}><p style={{ margin: 0, fontSize: '12px', letterSpacing: '1px', fontWeight: '900' }}>VERIFIED DOCUMENT</p><p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>ID: {activeCertData.certId}</p><p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>Date: {activeCertData.certDate}</p></div>
                    </div>
                    <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_2_y) || 0)}px)` }}>
                      <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_2_y) || 0)}px)` }}><img src={base64Assets.cert_sig_2} style={{ height: `${90 * ((parseInt(certSettings.cert_sig_2_size) || 100) / 100)}px`, maxWidth: '350px', marginBottom: '10px' }} /></div>
                      <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_2?.toUpperCase()}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;