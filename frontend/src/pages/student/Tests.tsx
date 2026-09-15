import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Calendar, Clock, Play, CheckCircle2,
  FileText, ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { Test, Schedule, Attempt } from '../../types';

interface TestCardItem {
  id: string;
  title: string;
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionsCount: number;
  durationMinutes: number;
  totalMarks: number;
  deadlineText: string;
  status: 'available' | 'in_progress' | 'completed';
  progress?: number;
  iconBg: string;
  iconColor: string;
}

const defaultTests: TestCardItem[] = [
  {
    id: 'test-quant-1',
    title: 'Quantitative Aptitude – Arithmetic & Speed Math',
    subject: 'Quantitative Aptitude',
    difficulty: 'MEDIUM',
    questionsCount: 25,
    durationMinutes: 35,
    totalMarks: 50,
    deadlineText: 'Available until Sep 14, 2024',
    status: 'in_progress',
    progress: 60,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 'test-lr-1',
    title: 'Logical Reasoning – Puzzles & Data Interpretation',
    subject: 'Logical Reasoning',
    difficulty: 'EASY',
    questionsCount: 20,
    durationMinutes: 30,
    totalMarks: 40,
    deadlineText: 'Available until Sep 12, 2024',
    status: 'available',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'test-verbal-1',
    title: 'Verbal Ability – Sentence Correction & Grammar',
    subject: 'Verbal Ability',
    difficulty: 'EASY',
    questionsCount: 20,
    durationMinutes: 25,
    totalMarks: 30,
    deadlineText: 'Available until Sep 15, 2024',
    status: 'available',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    id: 'test-tech-1',
    title: 'Technical Aptitude – Core CS & Output Prediction',
    subject: 'Technical Aptitude',
    difficulty: 'MEDIUM',
    questionsCount: 30,
    durationMinutes: 45,
    totalMarks: 60,
    deadlineText: 'Available until Sep 16, 2024',
    status: 'available',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    id: 'test-tcs-mock',
    title: 'Company Mock Test – TCS NQT National Qualifier',
    subject: 'Company Mock Test',
    difficulty: 'HARD',
    questionsCount: 40,
    durationMinutes: 60,
    totalMarks: 80,
    deadlineText: 'Available until Sep 20, 2024',
    status: 'available',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    id: 'test-infosys-mock',
    title: 'Company Mock Test – Infosys Placement Assessment',
    subject: 'Company Mock Test',
    difficulty: 'MEDIUM',
    questionsCount: 35,
    durationMinutes: 50,
    totalMarks: 70,
    deadlineText: 'Completed on May 10, 2024',
    status: 'completed',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    id: 'test-coding-logic',
    title: 'Coding & Pseudocode Logic Assessment',
    subject: 'Coding & Logic',
    difficulty: 'MEDIUM',
    questionsCount: 15,
    durationMinutes: 30,
    totalMarks: 40,
    deadlineText: 'Completed on May 4, 2024',
    status: 'completed',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

export const StudentTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestCardItem[]>(defaultTests);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    const fetchLiveTests = async () => {
      if (user?.id) {
        try {
          const upcoming = await testService.getStudentUpcomingTests(user.id);
          if (upcoming && upcoming.length > 0) {
            const dynamicList: TestCardItem[] = upcoming.map((item) => {
              const isCompleted = item.attempt?.status === 'submitted' || item.attempt?.status === 'auto_submitted';
              const isInProgress = item.attempt?.status === 'in_progress';
              return {
                id: item.test.id,
                title: item.test.title,
                subject: (item.test as any).category || 'Placement Assessment',
                difficulty: (((item.test as any).difficulty?.toUpperCase() as any) || 'MEDIUM'),
                questionsCount: item.test.questionIds?.length || 20,
                durationMinutes: item.test.settings?.duration || (item.test as any).durationMinutes || 30,
                totalMarks: item.test.totalMarks,
                deadlineText: `Available until ${new Date(item.schedule.endTime).toLocaleDateString()}`,
                status: isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'available',
                progress: isInProgress ? 50 : undefined,
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
              };
            });
            // Merge dynamic tests with default tests to ensure a rich list
            setTests([...dynamicList, ...defaultTests.filter(dt => !dynamicList.some(dl => dl.id === dt.id))]);
          }
        } catch (error) {
          console.error('Failed to load tests', error);
        }
      }
    };
    fetchLiveTests();
  }, [user]);

  // KPI Calculations
  const totalCount = tests.length;
  const availableCount = tests.filter(t => t.status === 'available').length;
  const inProgressCount = tests.filter(t => t.status === 'in_progress').length;
  const completedCount = tests.filter(t => t.status === 'completed').length;

  // Filtering
  const filteredTests = tests.filter((t) => {
    // Tab filter
    if (activeTab === 'upcoming' && t.status === 'completed') return false;
    if (activeTab === 'completed' && t.status !== 'completed') return false;

    // Search query
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.subject.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Track filter
    if (selectedTrack !== 'all' && t.subject.toLowerCase() !== selectedTrack.toLowerCase()) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in pb-10 font-sans text-slate-800">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Placement Tests</h1>
        <p className="text-slate-500 text-sm mt-0.5">Attempt placement mock tests, aptitude assessments, and company recruitment drills.</p>
      </div>

      {/* Top Test KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Tests */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tests</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalCount}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Placement curriculum</p>
          </div>
        </div>

        {/* Card 2: Available Now */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Now</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Play className="h-4 w-4 fill-emerald-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{availableCount}</div>
            <p className="text-xs text-emerald-600 mt-1 font-semibold">
              Ready to attempt
            </p>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{inProgressCount}</div>
            <p className="text-xs text-amber-600 mt-1 font-semibold">Resume pending</p>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{completedCount}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Evaluated mock tests</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9099a8]" />
            <input
              type="text"
              placeholder="Search placement tests, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f7f8fa] border border-[#e2e5ea] rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Placement Track Dropdown */}
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="text-xs bg-[#f7f8fa] border border-[#e2e5ea] text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Placement Tracks</option>
            <option value="Quantitative Aptitude">Quantitative Aptitude</option>
            <option value="Logical Reasoning">Logical Reasoning</option>
            <option value="Verbal Ability">Verbal Ability</option>
            <option value="Technical Aptitude">Technical Aptitude</option>
            <option value="Company Mock Test">Company Mock Tests</option>
            <option value="Coding & Logic">Coding & Logic</option>
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center bg-[#f0f2f5] p-1 rounded-lg self-start md:self-auto">
          {(['all', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#5a6170] hover:text-[#1a1d23]'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'upcoming' ? 'Upcoming' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Tests Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="bg-white rounded-xl border border-[#e2e5ea] p-5 shadow-xs hover:shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header: Icon, Title & Track Tag */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg ${test.iconBg} ${test.iconColor} flex items-center justify-center flex-shrink-0 font-bold`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1a1d23] text-sm leading-snug">{test.title}</h3>
                    <p className="text-xs text-[#9099a8] mt-0.5">
                      {test.questionsCount} Questions • {test.durationMinutes} mins • {test.totalMarks} Marks
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                  {test.subject}
                </span>
              </div>

              {/* Date / Status Information */}
              <div className="flex items-center gap-1.5 text-xs text-[#9099a8] my-3">
                <Calendar className="h-3.5 w-3.5 text-[#9099a8]" />
                <span>{test.deadlineText}</span>
              </div>

              {/* Progress bar for in-progress tests */}
              {test.status === 'in_progress' && (
                <div className="space-y-1 mb-4 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-blue-600">{test.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${test.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#f0f2f5] flex items-center justify-end">
              {test.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </span>
              ) : test.status === 'in_progress' ? (
                <Link to={`/student/tests/${test.id}`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                    Continue Test <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              ) : (
                <Link to={`/student/tests/${test.id}`}>
                  <Button size="sm" variant="outline" className="text-xs px-4 py-1.5 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer">
                    Start Test
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
