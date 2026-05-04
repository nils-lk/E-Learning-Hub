import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { HelpCircle, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, ArrowLeft } from 'lucide-react';

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0); // 0: Start, 1: Quiz, 2: Result
  const [userAnswers, setUserAnswers] = useState({});
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from('courses').select('*').eq('id', id).single();
      const { data: q } = await supabase.from('quiz_questions').select('*').eq('course_id', id);
      
      setCourse(c);
      setQuestions(q ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  const startQuiz = () => {
    // Shuffle questions and their answers
    const shuffled = [...questions].sort(() => Math.random() - 0.5).map(q => {
      const answers = [
        { text: q.correct_answer, isCorrect: true },
        { text: q.wrong_answer1, isCorrect: false },
        { text: q.wrong_answer2, isCorrect: false },
        { text: q.wrong_answer3, isCorrect: false },
      ].sort(() => Math.random() - 0.5);
      return { ...q, options: answers };
    });
    
    setShuffledQuestions(shuffled);
    setCurrentStep(1);
    setUserAnswers({});
  };

  const handleAnswer = (questionId, optionIndex) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    let correctCount = 0;
    
    shuffledQuestions.forEach(q => {
      const selectedOptionIndex = userAnswers[q.id];
      if (selectedOptionIndex !== undefined && q.options[selectedOptionIndex].isCorrect) {
        correctCount++;
      }
    });

    const finalScore = (correctCount / shuffledQuestions.length) * 100;
    const isPassed = finalScore >= 80;

    setScore(finalScore);
    setPassed(isPassed);

    // Save attempt
    await supabase.from('quiz_attempts').insert([{
      user_id: user.id,
      course_id: id,
      score: finalScore,
      passed: isPassed
    }]);

    // If passed, update enrollment status to 'completed'
    if (isPassed) {
      await supabase.from('enrollments')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .eq('course_id', id);
    }

    setSubmitting(false);
    setCurrentStep(2);
  };

  if (loading) return <div className="pt-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!course || questions.length === 0) return (
    <div className="pt-24 text-center text-gray-500 py-20">
      <p>Quiz not available for this course.</p>
      <Link to={`/course/${id}`} className="btn-primary mt-4 inline-flex">Back to Course</Link>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-950 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Progress Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to={`/course/${id}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Exit Quiz
          </Link>
          <div className="text-sm font-bold text-nilsBlue-600 dark:text-nilsBlue-400">
            {course.title}
          </div>
        </div>

        {/* Step 0: Welcome / Start */}
        {currentStep === 0 && (
          <div className="glass-card p-10 text-center animate-slide-up">
            <div className="w-20 h-20 bg-nilsBlue-50 dark:bg-nilsBlue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-nilsBlue-600 dark:text-nilsBlue-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Final Course Exam</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Test your knowledge on <strong>{course.title}</strong>. You need to score at least <strong>80%</strong> to {course.issues_certificate ? 'receive your certificate' : 'pass the course'}.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm max-w-sm mx-auto">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 mb-1">Total Questions</p>
                <p className="font-bold text-gray-900 dark:text-white">{questions.length}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 mb-1">Pass Mark</p>
                <p className="font-bold text-emerald-600">80%</p>
              </div>
            </div>

            <button onClick={startQuiz} className="btn-primary w-full py-4 text-lg justify-center shadow-xl shadow-nilsBlue-500/20">
              Start Exam Now <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Active Quiz */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fade-in">
            {shuffledQuestions.map((q, qIdx) => (
              <div key={q.id} className="glass-card p-6 border-l-4 border-nilsBlue-500">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Question {qIdx + 1} of {shuffledQuestions.length}</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">{q.question}</h3>
                
                <div className="space-y-3">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleAnswer(q.id, oIdx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                        userAnswers[q.id] === oIdx 
                          ? 'border-nilsBlue-500 bg-nilsBlue-50 dark:bg-nilsBlue-900/20 text-nilsBlue-700 dark:text-nilsBlue-300' 
                          : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/50'
                      }`}
                    >
                      <span className="font-medium">{opt.text}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        userAnswers[q.id] === oIdx ? 'border-nilsBlue-500 bg-nilsBlue-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {userAnswers[q.id] === oIdx && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="sticky bottom-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl flex items-center justify-between gap-4">
              <div className="text-sm text-gray-500 hidden sm:block">
                Answered {Object.keys(userAnswers).length} of {shuffledQuestions.length}
              </div>
              <button 
                onClick={submitQuiz} 
                disabled={submitting || Object.keys(userAnswers).length < shuffledQuestions.length}
                className="btn-success w-full sm:w-auto px-10 py-3 text-base justify-center disabled:opacity-50"
              >
                {submitting ? 'Calculating Result...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Result */}
        {currentStep === 2 && (
          <div className="glass-card p-10 text-center animate-slide-up">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'
            }`}>
              {passed ? (
                <CheckCircle className="w-14 h-14 text-emerald-500" />
              ) : (
                <XCircle className="w-14 h-14 text-red-500" />
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {passed 
                ? 'You have successfully passed the exam with an excellent score.' 
                : 'Unfortunately, you didn\'t reach the 80% passing mark this time.'}
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Final Score</p>
              <p className={`text-5xl font-black ${passed ? 'text-emerald-500' : 'text-red-500'}`}>
                {Math.round(score)}%
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} 
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {passed ? (
                <>
                  {course.issues_certificate && (
                    <Link to={`/course/${id}`} className="btn-success flex-1 py-4 justify-center shadow-lg shadow-emerald-500/20">
                      <Award className="w-5 h-5" /> Get Certificate
                    </Link>
                  )}
                  <Link to={`/course/${id}`} className="btn-primary flex-1 py-4 justify-center">
                    Back to Course
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={startQuiz} className="btn-primary flex-1 py-4 justify-center">
                    <RefreshCw className="w-5 h-5" /> Re-attempt Now
                  </button>
                  <Link to={`/course/${id}`} className="btn-outline flex-1 py-4 justify-center">
                    Go Back & Review
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Quiz;
