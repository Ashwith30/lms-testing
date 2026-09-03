import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Calendar, Clock, Award, Play, CheckCircle2,
  FileText, Database, Code, Cpu, Binary, Network, Check, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
    id: 'test-cn-2',
    title: 'Computer Networks – Module 2',
    subject: 'Computer Networks',
    difficulty: 'MEDIUM',
    questionsCount: 20,
    durationMinutes: 30,
    totalMarks: 50,
    deadlineText: 'Available until Sep 10, 2024',
    status: 'in_progress',
    progress: 70,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 'test-dbms-norm',
    title: 'DBMS – Normalization',
    subject: 'Database Management',
    difficulty: 'EASY',
    questionsCount: 15,
    durationMinutes: 20,
    totalMarks: 30,
    deadlineText: 'Available until Sep 8, 2024',
    status: 'available',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'test-web-basics',
    title: 'HTML & CSS Basics',
    subject: 'Web Technologies',
    difficulty: 'EASY',
    questionsCount: 15,
    durationMinutes: 15,
    totalMarks: 20,
    deadlineText: 'Available until Sep 12, 2024',
    status: 'available',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    id: 'test-os-cpu',
    title: 'Operating Systems – CPU Scheduling',
    subject: 'Operating Systems',
    difficulty: 'MEDIUM',
    questionsCount: 25,
    durationMinutes: 30,
    totalMarks: 50,
    deadlineText: 'Available until Sep 11, 2024',
    status: 'available',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    id: 'test-dsa-arrays',
    title: 'Data Structures – Arrays',
    subject: 'Data Structures',
    difficulty: 'HARD',
    questionsCount: 25,
    durationMinutes: 35,
    totalMarks: 50,
    deadlineText: 'Available until Sep 18, 2024',
    status: 'available',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    id: 'test-cn-1',
    title: 'Computer Networks – Module 1',
    subject: 'Computer Networks',
    difficulty: 'EASY',
    questionsCount: 15,
    durationMinutes: 20,
    totalMarks: 30,
    deadlineText: 'Completed on May 5, 2024',
    status: 'completed',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
];

export const StudentTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestCardItem[]>(defaultTests);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
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
                subject: (item.test as any).category || 'General',
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

  // Filtering
  const filteredTests = tests.filter((t) => {
    // Tab filter
    if (activeTab === 'upcoming' && t.status === 'completed') return false;
    if (activeTab === 'completed' && t.status !== 'completed') return false;

    // Search query
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.subject.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Subject filter
    if (selectedSubject !== 'all' && t.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
      return false;
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all' && t.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1d23]">My Tests</h1>
        <p className="text-[#9099a8] text-sm mt-0.5">Find and attempt tests to improve your skills.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-[#e2e5ea] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9099a8]" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f7f8fa] border border-[#e2e5ea] rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Subject Dropdown */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs bg-[#f7f8fa] border border-[#e2e5ea] text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            <option value="Computer Networks">Computer Networks</option>
            <option value="Database Management">Database Management</option>
            <option value="Operating Systems">Operating Systems</option>
            <option value="Data Structures">Data Structures</option>
            <option value="Web Technologies">Web Technologies</option>
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="text-xs bg-[#f7f8fa] border border-[#e2e5ea] text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center bg-[#f0f2f5] p-1 rounded-lg self-start md:self-auto">
          {(['all', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
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
              {/* Header: Icon, Title & Difficulty Badge */}
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

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
                  test.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  test.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {test.difficulty}
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
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  Completed
                </span>
              ) : test.status === 'in_progress' ? (
                <Link to={`/student/tests/${test.id}`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs px-4">
                    Continue Test
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Link to={`/student/tests/${test.id}`}>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-4">
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
