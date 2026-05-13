import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, SlidersHorizontal, BookOpen, TrendingUp, Users, Award, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'free' | 'paid'

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyId, setVerifyId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const handleVerify = async () => {
    if (!verifyId.trim()) return;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      // 1. Try the secure RPC first (Best for Public/Unregistered users)
      const { data, error } = await supabase.rpc('verify_certificate', { input_id: verifyId.trim() });

      if (!error && data && data.length > 0 && data[0].valid) {
        setVerifyResult({
          valid: true,
          studentName: data[0].student_name,
          courseTitle: data[0].course_title,
          date: data[0].issued_date
        });
        setIsVerifying(false);
        return;
      }

      // 2. Fallback: Direct Query (Works for logged-in students if RPC isn't set up yet)
      const parts = verifyId.trim().toUpperCase().split('-');
      const extractedId = parts.length >= 3 ? (parts[2].length === 8 ? parts[2] : parts[1]) : verifyId.trim();
      const targetId = extractedId.toLowerCase();

      if (targetId.length >= 8) {
        const prefix = targetId.slice(0, 8);
        const minUuid = `${prefix}-0000-0000-0000-000000000000`;
        const maxUuid = `${prefix}-ffff-ffff-ffff-ffffffffffff`;

        const { data: directData, error: directError } = await supabase
          .from('enrollments')
          .select('*, courses(title), profiles(full_name, name_with_initials)')
          .gte('id', minUuid)
          .lte('id', maxUuid)
          .in('status', ['approved', 'completed']);

        if (!directError && directData && directData.length > 0) {
          const en = directData[0];
          setVerifyResult({
            valid: true,
            studentName: en.profiles?.name_with_initials || en.profiles?.full_name || 'N/A',
            courseTitle: en.courses?.title || 'N/A',
            date: new Date(en.updated_at || en.created_at || Date.now()).toLocaleDateString('en-GB')
          });
          setIsVerifying(false);
          return;
        }
      }

      setVerifyResult({ valid: false });
    } catch (err) {
      console.error(err);
      setVerifyResult({ valid: false });
    }
    setIsVerifying(false);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*, profiles:lecturer_id(full_name, email), lessons(id)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(c => ({
          ...c,
          lecturer_name: c.profiles?.full_name || c.profiles?.email?.split('@')[0],
          lesson_count: c.lessons?.length ?? 0,
        }));
        setCourses(mapped);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const filtered = courses.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'free' ? !c.is_paid : c.is_paid);
    return matchSearch && matchFilter;
  });

  const stats = [
    { icon: BookOpen, label: 'Courses', value: courses.length },
    { icon: Users, label: 'Learners', value: '500+' },
    { icon: TrendingUp, label: 'Free Courses', value: courses.filter(c => !c.is_paid).length },
    { icon: Award, label: 'Certificates', value: 'Yes' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-nilsBlue-900 via-nilsBlue-800 to-nilsBlue-700 pt-24 pb-20">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-nilsGold/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-nilsGold/20 text-nilsGold-300 border border-nilsGold/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
            <Award className="w-4 h-4" /> Official NILS Learning Platform
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight animate-slide-up">
            Advance Your Career with<br />
            <span className="text-nilsGold">NILS</span>
          </h1>
          <p className="text-lg text-nilsBlue-200 max-w-2xl mx-auto mb-8 animate-fade-in">
            Professionally curated courses on Labour Law, HR Management, Workplace Relations and more — taught by experienced NILS faculty.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative animate-slide-up">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="course-search"
              type="text"
              placeholder="Search courses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl shadow-xl text-sm focus:outline-none focus:ring-2 focus:ring-nilsGold"
            />
          </div>

          <div className="mt-8 flex justify-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <button 
              onClick={() => setShowVerifyModal(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm tracking-wide transition-all flex items-center gap-2 border border-white/10 backdrop-blur-md"
            >
              <ShieldCheck className="w-5 h-5 text-nilsGold" />
              Verify a Certificate
            </button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-nilsBlue-50 dark:bg-nilsBlue-900/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-nilsBlue-700 dark:text-nilsBlue-400" />
                </div>
                <div>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filter row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="section-title">
            {search ? `Results for "${search}"` : 'All Courses'}
            <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">({filtered.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {['all', 'free', 'paid'].map(f => (
                <button
                  key={f}
                  id={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f
                    ? 'bg-white dark:bg-gray-700 text-nilsBlue-700 dark:text-nilsBlue-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No courses found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-tighter text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                Verify Certificate
              </h3>
              <button onClick={() => { setShowVerifyModal(false); setVerifyResult(null); setVerifyId(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificate ID</label>
                <input 
                  type="text" 
                  value={verifyId} 
                  onChange={e => setVerifyId(e.target.value)} 
                  placeholder="e.g. NILS-CERT-1A2B3C4D-2026"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-nilsBlue-500 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 uppercase"
                />
              </div>

              <button 
                onClick={handleVerify} 
                disabled={isVerifying || !verifyId.trim()} 
                className="w-full py-4 bg-nilsBlue-600 hover:bg-nilsBlue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-nilsBlue-200 dark:shadow-none transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? <LoadingSpinner size="sm" /> : 'Verify'}
              </button>

              {verifyResult && (
                <div className={`p-5 rounded-2xl border ${verifyResult.valid ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                  {verifyResult.valid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        Valid Certificate Found
                      </div>
                      <div className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                        <p><span className="text-slate-400 font-semibold text-xs uppercase">Student:</span> <br/>{verifyResult.studentName}</p>
                        <p><span className="text-slate-400 font-semibold text-xs uppercase">Course:</span> <br/>{verifyResult.courseTitle}</p>
                        <p><span className="text-slate-400 font-semibold text-xs uppercase">Issued:</span> <br/>{verifyResult.date}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-700 dark:text-red-400 font-bold flex items-center gap-2">
                      <X className="w-5 h-5" />
                      Invalid or Not Found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
