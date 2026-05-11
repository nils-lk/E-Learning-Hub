import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { BookOpen, Clock, CheckCircle, XCircle, ArrowRight, User, X, Save, Award, Download, Shield, Loader2, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    name_with_initials: '',
    nic: '',
    gender: 'male'
  });

  // Certificate Engine state (v31.0 Beautified)
  const [certSettings, setCertSettings] = useState({
    cert_org_1: 'NILS', cert_org_2: 'NILS',
    cert_title_1: 'Assistant Director (Training)', cert_title_2: 'Director General',
    cert_main_title: 'Certificate of Completion',
    cert_certify_text: 'This is to certify that',
    cert_success_text: 'has successfully completed the course in',
    cert_tagline: 'offered by the National Institute of Labour Studies E-Learning Hub',
    cert_title_size: '44', cert_name_size: '64', cert_nic_size: '18',
  });
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [showCertPreview, setShowCertPreview] = useState(false);
  const [activeCertData, setActiveCertData] = useState(null);
  const [base64Assets, setBase64Assets] = useState({});
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        name_with_initials: profile.name_with_initials || '',
        nic: profile.nic || '',
        gender: profile.gender || 'male'
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetch = async () => {
      const { data: enData } = await supabase
        .from('enrollments')
        .select('*, courses(id, title, thumbnail_url, is_paid)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setEnrollments(enData ?? []);

      const { data: settings } = await supabase.from('system_settings').select('*');
      if (settings) {
        const sObj = {};
        settings.forEach(s => { if (s.key) sObj[s.key] = s.value; });
        setCertSettings(prev => ({ ...prev, ...sObj }));
      }
      setLoading(false);
    };
    fetch();
  }, [user.id]);

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

  // --- OMNI-REVOLVER v31.0 (MASTER SYNC ENGINE) ---
  const toBase64 = async (url) => {
    return new Promise((resolve) => {
      if (!url) { resolve(null); return; }
      if (url.startsWith('data:')) { resolve(url); return; }
      
      // Robust Google Drive ID extraction
      const idMatch = url.match(/(?:id=|\/d\/|folders\/|file\/d\/)([-\w]{25,50})/);
      if (!idMatch) { resolve(url); return; }
      const id = idMatch[1];
      
      const tryLoad = (src, phaseName) => {
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
          if (phaseName === 'LH3') tryLoad(`https://drive.google.com/uc?id=${id}`, 'UC');
          else if (phaseName === 'UC') tryLoad(`https://drive.google.com/thumbnail?id=${id}&sz=w2500`, 'THUMB');
          else resolve(url);
        };
        img.src = src;
      };
      tryLoad(`https://lh3.googleusercontent.com/d/${id}`, 'LH3');
    });
  };

  const syncInstitutionalAssets = async () => {
    setIsSyncingAssets(true);
    const assets = {};
    const keys = ['cert_bg_url', 'cert_logo_left', 'cert_logo_right', 'cert_sig_1', 'cert_sig_2', 'cert_seal_url'];
    
    try {
      await Promise.all(keys.map(async (key) => {
        if (certSettings[key]) {
          assets[key] = await toBase64(certSettings[key]);
        }
      }));
      setBase64Assets(assets);
      return true;
    } catch (e) {
      console.error('Asset Sync Failed', e);
      return false;
    } finally {
      setIsSyncingAssets(false);
    }
  };

  const handleOpenCert = async (en) => {
    if (!profile?.nic || (!profile?.full_name && !profile?.name_with_initials)) {
      alert('Please update your Profile (Name & NIC) to generate a certificate.');
      return;
    }

    const success = await syncInstitutionalAssets();
    if (!success) {
      alert('Institutional asset synchronization failed. Please check your internet or try again.');
      return;
    }

    const studentName = profile?.name_with_initials || profile?.full_name || 'STUDENT';
    const studentNic = profile?.nic || '000000000V';
    const courseTitle = en.courses?.title?.toUpperCase() || 'COURSE TITLE';
    const certId = `NILS-CERT-${en.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
    
    // Robust Date Fallback
    const rawDate = en.updated_at || en.created_at || new Date().toISOString();
    const certDate = new Date(rawDate).toLocaleDateString('en-GB');

    setActiveCertData({ studentName, studentNic, courseTitle, certId, certDate });
    setShowCertPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingCert) return;
    setIsGeneratingCert(true);

    const originalPreview = document.getElementById('master-student-replica');
    if (!originalPreview) { setIsGeneratingCert(false); return; }

    const shadowContainer = document.createElement('div');
    shadowContainer.style.position = 'fixed'; shadowContainer.style.left = '-9999px'; shadowContainer.style.top = '-9999px';
    shadowContainer.style.width = '1123px'; shadowContainer.style.height = '794px';
    shadowContainer.style.background = '#ffffff';
    
    shadowContainer.innerHTML = originalPreview.outerHTML;
    document.body.appendChild(shadowContainer);
    
    const clone = shadowContainer.firstChild;
    clone.style.transform = 'none'; 
    clone.style.width = '1123px'; clone.style.height = '794px';

    try {
      // 6-Second Institutional Delay
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const canvas = await html2canvas(clone, { 
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
        width: 1123, height: 794, windowWidth: 1123, windowHeight: 794, logging: false
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1123, 794], compress: true });
      pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794, undefined, 'FAST');
      pdf.save(`NILS_CERTIFICATE_${activeCertData.studentName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Export failed. Please try again.');
    } finally {
      document.body.removeChild(shadowContainer);
      setIsGeneratingCert(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id);
    setSavingProfile(false);
    if (error) alert(error.message);
    else { alert('Profile updated!'); setShowProfile(false); window.location.reload(); }
  };

  const statusIcon = { approved: CheckCircle, pending: Clock, rejected: XCircle, completed: Award };
  const statusClass = { approved: 'text-emerald-500', pending: 'text-yellow-500', rejected: 'text-red-500', completed: 'text-blue-500' };

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Student Dashboard</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium tracking-tight">Manage your institutional profile and certifications.</p>
          </div>

        </div>

        {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : enrollments.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-slate-400">No active course enrollments found.</p>
            <Link to="/" className="btn-primary mt-4 inline-flex px-8">Find a Course</Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {enrollments.map(en => {
              const Icon = statusIcon[en.status] ?? Clock;
              const isEligible = en.status === 'completed' || en.status === 'active' || en.status === 'approved'; 
              return (
                <div key={en.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 flex flex-col gap-4 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-14 rounded-2xl bg-nilsBlue-50 dark:bg-nilsBlue-900/20 overflow-hidden border border-slate-100 dark:border-white/10 shrink-0">
                      {en.courses?.thumbnail_url ? <img src={en.courses.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-nilsBlue-300 font-black">NILS</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 dark:text-white truncate leading-tight">{en.courses?.title}</p>
                      <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mt-1.5 ${statusClass[en.status]}`}><Icon className="w-3.5 h-3.5" />{en.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <Link to={`/course/${en.courses?.id}`} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/5">Course View</Link>
                    {isEligible && (
                      <button onClick={() => handleOpenCert(en)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center rounded-xl bg-nilsBlue-600 text-white shadow-lg shadow-nilsBlue-100 dark:shadow-none hover:bg-nilsBlue-700 transition-all flex items-center justify-center gap-2">
                        <Award className="w-3.5 h-3.5" /> Get Certificate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Syncing Overlay */}
      {isSyncingAssets && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-2xl shadow-emerald-500/20"></div>
            <div className="text-center">
              <h4 className="text-white font-black text-xl uppercase tracking-tighter">Synchronizing Institutional Engine</h4>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2 animate-pulse">Applying Triple-Phase Failover Protocols...</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 dark:border-white/5">
              <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">Student Profile</h3>
              <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="px-8 py-8 space-y-6">
              <div className="bg-nilsBlue-50 dark:bg-nilsBlue-900/20 p-4 rounded-2xl text-[11px] font-bold text-nilsBlue-700 dark:text-nilsBlue-300 border border-nilsBlue-100 dark:border-nilsBlue-900/40 italic tracking-tight">Your full name and NIC will be printed on the official NILS certificate exactly as entered here.</div>
              <div className="space-y-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input value={profileForm.full_name} onChange={e => setProfileForm(f => ({...f, full_name: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-nilsBlue-500 dark:text-white" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name with Initials</label><input value={profileForm.name_with_initials} onChange={e => setProfileForm(f => ({...f, name_with_initials: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-nilsBlue-500 dark:text-white" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIC Number</label><input value={profileForm.nic} onChange={e => setProfileForm(f => ({...f, nic: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-none rounded-2xl text-sm font-bold uppercase focus:ring-2 focus:ring-nilsBlue-500 dark:text-white" /></div>
              </div>
              <button onClick={saveProfile} disabled={savingProfile} className="w-full py-5 bg-nilsBlue-600 hover:bg-nilsBlue-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-nilsBlue-200 dark:shadow-none transition-all">{savingProfile ? 'Updating Profile...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* INSTITUTIONAL PREVIEW MODAL (v31.0 BEAUTIFIED & RESPONSIVE) */}
      {showCertPreview && activeCertData && (
        <div className="fixed inset-0 z-[110] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center overflow-hidden">
          {/* Header section optimized for mobile readability */}
          <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center px-6 md:px-10 py-6 md:py-8 gap-4 md:gap-0 shrink-0 z-10">
            <div className="w-full md:w-auto mt-6 md:mt-0">
              <div className="flex items-center gap-3 md:gap-4">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 shrink-0" />
                <h3 className="text-white font-black text-2xl md:text-4xl uppercase tracking-tighter leading-none">Official Certification</h3>
              </div>
              <p className="text-white/30 text-[9px] md:text-[11px] font-black uppercase tracking-widest mt-2 ml-11 md:ml-14">Institutional Master Design v31.0 Sync Enabled</p>
            </div>
            <div className="flex w-full md:w-auto items-center gap-4 md:gap-6 mt-2 md:mt-0">
              <button onClick={handleDownloadPDF} disabled={isGeneratingCert} className="flex-1 md:flex-none px-6 md:px-14 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl md:rounded-[2rem] font-black uppercase tracking-widest text-xs md:text-sm shadow-2xl flex items-center justify-center gap-2 md:gap-4 transition-all active:scale-95 disabled:opacity-50">
                {isGeneratingCert ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
                {isGeneratingCert ? 'Exporting...' : 'Download your E-Certificate'}
              </button>
              <button onClick={() => setShowCertPreview(false)} className="absolute top-4 right-4 md:static w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-20 active:scale-90">
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>
          </div>

          {/* Modal Main Content (Scrollable Container) */}
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto custom-scrollbar-smooth">
            <div className="bg-slate-900/50 p-6 md:p-20 rounded-[5rem] shadow-2xl border-4 border-white/5 flex items-center justify-center relative min-h-fit" style={{ minHeight: `${794 * previewScale + 100}px` }}>
              <div className="relative" style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center', width: '1123px', height: '794px' }}>
                <div id="master-student-replica" style={{ width: '1123px', height: '794px', background: '#fff', position: 'relative', color: '#000', fontFamily: "'Times New Roman', serif", overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)' }}>
                  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, transform: `translate(${(parseInt(certSettings.cert_bg_x) || 0)}px, ${(parseInt(certSettings.cert_bg_y) || 0)}px) scale(${(parseInt(certSettings.cert_bg_size) || 100)/100})` }}>
                    <img src={base64Assets.cert_bg_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Background" />
                  </div>
                  <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px', border: '2px solid #1e3a8a', padding: '5px', zIndex: 1 }}><div style={{ border: '8px double #1e3a8a', height: '100%' }}></div></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                    <div style={{ position: 'absolute', top: '70px', left: 0, width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                      <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_1_x) || 0)}px, ${(parseInt(certSettings.cert_logo_1_y) || 0)}px)` }}><img src={base64Assets.cert_logo_left} style={{ height: `${100 * ((parseInt(certSettings.cert_logo_1_size) || 100)/100)}px`, maxWidth: '350px', objectFit: 'contain' }} /></div>
                      <div style={{ transform: `translate(${(parseInt(certSettings.cert_logo_2_x) || 0)}px, ${(parseInt(certSettings.cert_logo_2_y) || 0)}px)` }}><img src={base64Assets.cert_logo_right} style={{ height: `${100 * ((parseInt(certSettings.cert_logo_2_size) || 100)/100)}px`, maxWidth: '350px', objectFit: 'contain' }} /></div>
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
                        <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_1_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_1_y) || 0)}px)` }}><img src={base64Assets.cert_sig_1} style={{ height: `${90 * ((parseInt(certSettings.cert_sig_1_size) || 100)/100)}px`, maxWidth: '350px', marginBottom: '10px' }} /></div>
                        <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_1?.toUpperCase()}</p><p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#555', fontWeight: 'normal' }}>{certSettings.cert_org_1}</p></div>
                      </div>
                      <div style={{ textAlign: 'center', transform: `translate(${(parseInt(certSettings.cert_seal_x) || 0)}px, ${(parseInt(certSettings.cert_seal_y) || 0)}px)`, minWidth: '170px' }}>
                        <div style={{ width: '100px', height: '100px', border: '1px solid rgba(30, 58, 138, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}><img src={base64Assets.cert_seal_url || "https://nils.gov.lk/wp-content/uploads/2021/05/cropped-NILS-Logo.png"} style={{ width: `${65 * ((parseInt(certSettings.cert_seal_size) || 100)/100)}px`, opacity: 0.8 }} /></div>
                        <div style={{ color: '#1e3a8a', lineHeight: '1.2', fontWeight: 'bold' }}><p style={{ margin: 0, fontSize: '12px', letterSpacing: '1px', fontWeight: '900' }}>VERIFIED DOCUMENT</p><p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>ID: {activeCertData.certId}</p><p style={{ margin: 0, fontSize: '10px', opacity: 0.8 }}>Date: {activeCertData.certDate}</p></div>
                      </div>
                      <div style={{ textAlign: 'center', width: '340px', transform: `translate(${(parseInt(certSettings.cert_sig_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_2_y) || 0)}px)` }}>
                        <div style={{ transform: `translate(${(parseInt(certSettings.cert_sig_img_2_x) || 0)}px, ${(parseInt(certSettings.cert_sig_img_2_y) || 0)}px)` }}><img src={base64Assets.cert_sig_2} style={{ height: `${90 * ((parseInt(certSettings.cert_sig_2_size) || 100)/100)}px`, maxWidth: '350px', marginBottom: '10px' }} /></div>
                        <div style={{ borderTop: '2px solid #000', paddingTop: '8px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{certSettings.cert_title_2?.toUpperCase()}</p><p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#555', fontWeight: 'normal' }}>{certSettings.cert_org_2}</p></div>
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
  );
};

export default StudentDashboard;
