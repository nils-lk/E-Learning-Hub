import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, SlidersHorizontal, BookOpen, TrendingUp, Users, Award } from 'lucide-react';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'free' | 'paid'

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
    </div>
  );
};

export default Home;
