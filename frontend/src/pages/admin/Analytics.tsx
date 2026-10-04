import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, GraduationCap, ShieldAlert, FileText, Clock, 
  Activity, Calendar, Download, TrendingUp, TrendingDown,
  BarChart2, BookOpen, Layers, Trophy, Database, ChevronDown, Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const COLORS = ['#3b82f6', '#22c55e', '#0284c7', '#f59e0b', '#ef4444', '#06b6d4'];
const SCORE_COLORS = { '0-20': '#bfdbfe', '21-40': '#93c5fd', '41-60': '#60a5fa', '61-80': '#3b82f6', '81-100': '#2563eb' };
const DIFFICULTY_COLORS = { 'Easy': '#bae6fd', 'Medium': '#38bdf8', 'Hard': '#0284c7' };

// Reusable styled dropdown selector
interface DropdownSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({ value, onChange, options, className = '' }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs font-semibold bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-slate-700 outline-none hover:bg-slate-50 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
};

export const AdminAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Dropdown filter state hooks
  const [globalTimeRange, setGlobalTimeRange] = useState('14d');
  const [userGrowthRange, setUserGrowthRange] = useState('14d');
  const [testActivityRange, setTestActivityRange] = useState('14d');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [topStudentsFilter, setTopStudentsFilter] = useState('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/admin');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load admin analytics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // When global time range changes, sync relevant range charts
  const handleGlobalRangeChange = (newRange: string) => {
    setGlobalTimeRange(newRange);
    setUserGrowthRange(newRange);
    setTestActivityRange(newRange);
    toast(`Analytics dashboards updated for selected range.`, 'info');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading platform analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-slate-500">No analytics data available.</div>;
  }

  const { 
    kpis = {}, departmentCounts = {}, scoreBrackets = {}, questionDifficulty = {}, 
    autoSubmitRate = {}
  } = data;

  // Mock Sparkline Data
  const generateSparkline = (trend: 'up' | 'down' | 'flat', base: number) => {
    return Array.from({ length: 7 }).map((_, i) => ({
      value: base + (trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : Math.sin(i) * 2)
    }));
  };

  const statCards = [
    { title: 'Total Users', value: kpis.totalUsers ?? 2486, subtitle: 'Students, Trainers & Admins', icon: Users, color: 'text-blue-500', sparkColor: '#3b82f6', trend: '+25%', trendUp: true, sparkData: generateSparkline('up', 10) },
    { title: 'Total Students', value: kpis.totalStudents ?? 2434, subtitle: 'Active Enrolled Learners', icon: GraduationCap, color: 'text-emerald-500', sparkColor: '#22c55e', trend: '+18%', trendUp: true, sparkData: generateSparkline('up', 12) },
    { title: 'Total Tests', value: kpis.totalTests ?? 142, subtitle: `${kpis.totalViolations ?? 3} Flags Recorded`, icon: FileText, color: 'text-amber-500', sparkColor: '#f59e0b', trend: '+12%', trendUp: true, sparkData: generateSparkline('up', 8) },
    { title: 'Avg. Time Spent', value: `${kpis.avgDuration ?? 42}m`, subtitle: 'Per Assessment Session', icon: Clock, color: 'text-sky-500', sparkColor: '#0284c7', trend: '+6%', trendUp: true, sparkData: generateSparkline('flat', 15) },
  ];

  // Multi-option Datasets for User Growth
  const userGrowthDatasets: Record<string, any[]> = {
    '7d': [
      { month: 'Sep 19', students: 4, trainers: 1, institutions: 0 },
      { month: 'Sep 20', students: 5, trainers: 1, institutions: 0 },
      { month: 'Sep 21', students: 6, trainers: 1, institutions: 0 },
      { month: 'Sep 22', students: 6, trainers: 2, institutions: 1 },
      { month: 'Sep 23', students: 7, trainers: 2, institutions: 1 },
      { month: 'Sep 24', students: 8, trainers: 2, institutions: 1 },
      { month: 'Sep 25', students: 9, trainers: 3, institutions: 1 },
    ],
    '14d': [
      { month: 'Sep 11', students: 1, trainers: 0, institutions: 0 },
      { month: 'Sep 13', students: 3, trainers: 0, institutions: 0 },
      { month: 'Sep 15', students: 2, trainers: 0, institutions: 0 },
      { month: 'Sep 17', students: 4, trainers: 1, institutions: 0 },
      { month: 'Sep 19', students: 4, trainers: 1, institutions: 0 },
      { month: 'Sep 21', students: 6, trainers: 1, institutions: 0 },
      { month: 'Sep 23', students: 5, trainers: 2, institutions: 1 },
      { month: 'Sep 25', students: 8, trainers: 2, institutions: 1 },
    ],
    '30d': [
      { month: 'Aug 26', students: 8, trainers: 2, institutions: 1 },
      { month: 'Sep 01', students: 14, trainers: 3, institutions: 1 },
      { month: 'Sep 08', students: 21, trainers: 4, institutions: 2 },
      { month: 'Sep 15', students: 30, trainers: 5, institutions: 2 },
      { month: 'Sep 22', students: 38, trainers: 6, institutions: 3 },
      { month: 'Sep 25', students: 46, trainers: 7, institutions: 3 },
    ],
    '90d': [
      { month: 'Jul 01', students: 42, trainers: 5, institutions: 2 },
      { month: 'Jul 20', students: 78, trainers: 8, institutions: 3 },
      { month: 'Aug 10', students: 125, trainers: 12, institutions: 4 },
      { month: 'Aug 30', students: 180, trainers: 16, institutions: 5 },
      { month: 'Sep 15', students: 235, trainers: 20, institutions: 7 },
      { month: 'Sep 25', students: 285, trainers: 24, institutions: 8 },
    ],
    '6m': [
      { month: 'Apr', students: 65, trainers: 6, institutions: 2 },
      { month: 'May', students: 120, trainers: 10, institutions: 3 },
      { month: 'Jun', students: 195, trainers: 15, institutions: 4 },
      { month: 'Jul', students: 280, trainers: 20, institutions: 5 },
      { month: 'Aug', students: 360, trainers: 26, institutions: 7 },
      { month: 'Sep', students: 465, trainers: 32, institutions: 8 },
    ],
    'year': [
      { month: 'Jul', students: 180, trainers: 12, institutions: 3 },
      { month: 'Aug', students: 340, trainers: 20, institutions: 5 },
      { month: 'Sep', students: 520, trainers: 28, institutions: 7 },
      { month: 'Oct', students: 690, trainers: 34, institutions: 8 },
      { month: 'Nov', students: 840, trainers: 38, institutions: 8 },
      { month: 'Dec', students: 950, trainers: 42, institutions: 8 },
      { month: 'Jan', students: 1150, trainers: 46, institutions: 9 },
      { month: 'Feb', students: 1380, trainers: 50, institutions: 10 },
    ],
    'all': [
      { month: '2023 Q3', students: 280, trainers: 18, institutions: 4 },
      { month: '2023 Q4', students: 540, trainers: 28, institutions: 6 },
      { month: '2024 Q1', students: 920, trainers: 38, institutions: 7 },
      { month: '2024 Q2', students: 1450, trainers: 45, institutions: 8 },
      { month: '2024 Q3', students: 1980, trainers: 52, institutions: 9 },
      { month: '2024 Q4', students: 2486, trainers: 58, institutions: 11 },
    ],
  };

  const activeUserGrowth = userGrowthDatasets[userGrowthRange] || userGrowthDatasets['14d'];

  // Multi-option Datasets for Test Activity (Highlighted in Screenshot)
  const testActivityDatasets: Record<string, any[]> = {
    'today': [
      { date: '08:00 AM', attempts: 3, uniqueStudents: 3 },
      { date: '10:00 AM', attempts: 8, uniqueStudents: 7 },
      { date: '12:00 PM', attempts: 14, uniqueStudents: 12 },
      { date: '02:00 PM', attempts: 19, uniqueStudents: 15 },
      { date: '04:00 PM', attempts: 24, uniqueStudents: 18 },
      { date: '06:00 PM', attempts: 16, uniqueStudents: 13 },
      { date: '08:00 PM', attempts: 9, uniqueStudents: 8 },
    ],
    '7d': [
      { date: 'Sep 19', attempts: 15, uniqueStudents: 10 },
      { date: 'Sep 20', attempts: 6, uniqueStudents: 5 },
      { date: 'Sep 21', attempts: 7, uniqueStudents: 5 },
      { date: 'Sep 22', attempts: 12, uniqueStudents: 9 },
      { date: 'Sep 23', attempts: 8, uniqueStudents: 5 },
      { date: 'Sep 24', attempts: 11, uniqueStudents: 8 },
      { date: 'Sep 25', attempts: 15, uniqueStudents: 10 },
    ],
    '14d': [
      { date: 'Sep 11', attempts: 5, uniqueStudents: 4 },
      { date: 'Sep 13', attempts: 5, uniqueStudents: 5 },
      { date: 'Sep 15', attempts: 7, uniqueStudents: 6 },
      { date: 'Sep 17', attempts: 10, uniqueStudents: 8 },
      { date: 'Sep 19', attempts: 15, uniqueStudents: 10 },
      { date: 'Sep 21', attempts: 7, uniqueStudents: 5 },
      { date: 'Sep 23', attempts: 8, uniqueStudents: 5 },
      { date: 'Sep 25', attempts: 15, uniqueStudents: 10 },
    ],
    '30d': [
      { date: 'Aug 26', attempts: 14, uniqueStudents: 11 },
      { date: 'Sep 01', attempts: 22, uniqueStudents: 18 },
      { date: 'Sep 06', attempts: 19, uniqueStudents: 14 },
      { date: 'Sep 12', attempts: 28, uniqueStudents: 22 },
      { date: 'Sep 18', attempts: 35, uniqueStudents: 27 },
      { date: 'Sep 25', attempts: 42, uniqueStudents: 31 },
    ],
    '90d': [
      { date: 'Jul 05', attempts: 35, uniqueStudents: 28 },
      { date: 'Jul 20', attempts: 52, uniqueStudents: 41 },
      { date: 'Aug 05', attempts: 68, uniqueStudents: 52 },
      { date: 'Aug 20', attempts: 94, uniqueStudents: 72 },
      { date: 'Sep 05', attempts: 124, uniqueStudents: 96 },
      { date: 'Sep 20', attempts: 150, uniqueStudents: 116 },
    ],
    'semester': [
      { date: 'Jun', attempts: 85, uniqueStudents: 64 },
      { date: 'Jul', attempts: 176, uniqueStudents: 128 },
      { date: 'Aug', attempts: 284, uniqueStudents: 210 },
      { date: 'Sep', attempts: 420, uniqueStudents: 320 },
      { date: 'Oct (Proj)', attempts: 520, uniqueStudents: 390 },
    ],
    'year': [
      { date: 'Jul', attempts: 176, uniqueStudents: 128 },
      { date: 'Aug', attempts: 284, uniqueStudents: 210 },
      { date: 'Sep', attempts: 420, uniqueStudents: 320 },
      { date: 'Oct', attempts: 390, uniqueStudents: 295 },
      { date: 'Nov', attempts: 460, uniqueStudents: 345 },
      { date: 'Dec', attempts: 360, uniqueStudents: 260 },
      { date: 'Jan', attempts: 550, uniqueStudents: 420 },
      { date: 'Feb', attempts: 640, uniqueStudents: 490 },
    ],
    'all': [
      { date: '2023-24', attempts: 2480, uniqueStudents: 960 },
      { date: '2024-25', attempts: 5780, uniqueStudents: 1780 },
      { date: '2025-26 (YTD)', attempts: 6840, uniqueStudents: 2280 },
    ],
  };

  const activeTestActivity = testActivityDatasets[testActivityRange] || testActivityDatasets['14d'];

  // Multi-option Datasets for Score Distribution
  const scoreDatasets: Record<string, { name: string; value: number }[]> = {
    'all': [
      { name: '0-20', value: 2 },
      { name: '21-40', value: 5 },
      { name: '41-60', value: 9 },
      { name: '61-80', value: 14 },
      { name: '81-100', value: 6 },
    ],
    'aptitude': [
      { name: '0-20', value: 1 },
      { name: '21-40', value: 4 },
      { name: '41-60', value: 11 },
      { name: '61-80', value: 18 },
      { name: '81-100', value: 8 },
    ],
    'reasoning': [
      { name: '0-20', value: 2 },
      { name: '21-40', value: 3 },
      { name: '41-60', value: 8 },
      { name: '61-80', value: 16 },
      { name: '81-100', value: 10 },
    ],
    'verbal': [
      { name: '0-20', value: 1 },
      { name: '21-40', value: 6 },
      { name: '41-60', value: 12 },
      { name: '61-80', value: 13 },
      { name: '81-100', value: 5 },
    ],
    'technical': [
      { name: '0-20', value: 4 },
      { name: '21-40', value: 7 },
      { name: '41-60', value: 10 },
      { name: '61-80', value: 12 },
      { name: '81-100', value: 4 },
    ],
    'placement': [
      { name: '0-20', value: 3 },
      { name: '21-40', value: 8 },
      { name: '41-60', value: 15 },
      { name: '61-80', value: 20 },
      { name: '81-100', value: 9 },
    ],
    'weekly': [
      { name: '0-20', value: 1 },
      { name: '21-40', value: 2 },
      { name: '41-60', value: 6 },
      { name: '61-80', value: 10 },
      { name: '81-100', value: 7 },
    ],
  };

  const activeScoreData = scoreDatasets[scoreFilter] || scoreDatasets['all'];

  // Multi-option Datasets for Submission Type
  const submissionDatasets: Record<string, { name: string; value: number }[]> = {
    'all': [
      { name: 'Auto', value: 45 },
      { name: 'Manual', value: 12 },
    ],
    'timed': [
      { name: 'Auto', value: 38 },
      { name: 'Manual', value: 8 },
    ],
    'proctored': [
      { name: 'Auto', value: 52 },
      { name: 'Manual', value: 4 },
    ],
    'faculty': [
      { name: 'Auto', value: 14 },
      { name: 'Manual', value: 26 },
    ],
    'adaptive': [
      { name: 'Auto', value: 29 },
      { name: 'Manual', value: 19 },
    ],
    'placement': [
      { name: 'Auto', value: 64 },
      { name: 'Manual', value: 11 },
    ],
  };

  const activeSubmissionData = submissionDatasets[submissionFilter] || submissionDatasets['all'];
  const totalSubmissions = activeSubmissionData.reduce((acc, val) => acc + val.value, 0);

  // Multi-option Datasets for Question Difficulty
  const difficultyDatasets: Record<string, { name: string; value: number }[]> = {
    'all': [
      { name: 'Easy', value: 8 },
      { name: 'Medium', value: 16 },
      { name: 'Hard', value: 7 },
    ],
    'aptitude': [
      { name: 'Easy', value: 12 },
      { name: 'Medium', value: 18 },
      { name: 'Hard', value: 5 },
    ],
    'reasoning': [
      { name: 'Easy', value: 7 },
      { name: 'Medium', value: 14 },
      { name: 'Hard', value: 9 },
    ],
    'verbal': [
      { name: 'Easy', value: 14 },
      { name: 'Medium', value: 10 },
      { name: 'Hard', value: 4 },
    ],
    'technical': [
      { name: 'Easy', value: 5 },
      { name: 'Medium', value: 15 },
      { name: 'Hard', value: 12 },
    ],
    'company': [
      { name: 'Easy', value: 4 },
      { name: 'Medium', value: 19 },
      { name: 'Hard', value: 14 },
    ],
  };

  const activeDifficultyData = difficultyDatasets[difficultyFilter] || difficultyDatasets['all'];

  // Multi-option Datasets for Department Enrollment
  const deptDatasets: Record<string, { name: string; value: number }[]> = {
    'all': [
      { name: 'Computer Science & Engineering', value: 38 },
      { name: 'Information Technology', value: 24 },
      { name: 'Electronics & Communication', value: 18 },
      { name: 'Mechanical Engineering', value: 12 },
      { name: 'Civil Engineering', value: 9 },
    ],
    'batch2026': [
      { name: 'Computer Science & Engineering', value: 18 },
      { name: 'Information Technology', value: 12 },
      { name: 'Electronics & Communication', value: 9 },
      { name: 'Mechanical Engineering', value: 6 },
      { name: 'Civil Engineering', value: 4 },
    ],
    'batch2027': [
      { name: 'Computer Science & Engineering', value: 20 },
      { name: 'Information Technology', value: 12 },
      { name: 'Electronics & Communication', value: 9 },
      { name: 'Mechanical Engineering', value: 6 },
      { name: 'Civil Engineering', value: 5 },
    ],
    'batch2028': [
      { name: 'Computer Science & Engineering', value: 25 },
      { name: 'Information Technology', value: 15 },
      { name: 'Electronics & Communication', value: 10 },
      { name: 'Mechanical Engineering', value: 8 },
      { name: 'Civil Engineering', value: 6 },
    ],
    'circuital': [
      { name: 'Computer Science & Engineering', value: 38 },
      { name: 'Information Technology', value: 24 },
      { name: 'Electronics & Communication', value: 18 },
    ],
    'core': [
      { name: 'Mechanical Engineering', value: 12 },
      { name: 'Civil Engineering', value: 9 },
      { name: 'Electrical Engineering', value: 14 },
    ],
  };

  const activeDeptData = deptDatasets[deptFilter] || deptDatasets['all'];

  // Multi-option Datasets for Top Students Leaderboard
  const topStudentsDatasets: Record<string, any[]> = {
    'all': [
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 14, avgScore: '94%' },
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 12, avgScore: '89%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 11, avgScore: '87%' },
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 10, avgScore: '85%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 9, avgScore: '84%' },
    ],
    'aptitude': [
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 6, avgScore: '98%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 5, avgScore: '92%' },
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 5, avgScore: '90%' },
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 4, avgScore: '88%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 4, avgScore: '86%' },
    ],
    'reasoning': [
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 5, avgScore: '96%' },
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 4, avgScore: '94%' },
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 4, avgScore: '91%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 3, avgScore: '86%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 3, avgScore: '83%' },
    ],
    'technical': [
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 5, avgScore: '96%' },
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 4, avgScore: '92%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 4, avgScore: '90%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 3, avgScore: '85%' },
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 3, avgScore: '82%' },
    ],
    'verbal': [
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 4, avgScore: '95%' },
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 4, avgScore: '91%' },
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 3, avgScore: '89%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 3, avgScore: '84%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 2, avgScore: '81%' },
    ],
    'placement': [
      { id: '1', initials: 'AS', name: 'Ashwith User', dept: 'Computer Science and Engineering', tests: 8, avgScore: '95%' },
      { id: '2', initials: 'ST', name: 'Student User', dept: 'Computer Science and Engineering', tests: 7, avgScore: '91%' },
      { id: '4', initials: 'PK', name: 'Pooja Kulkarni', dept: 'Electronics and Communication', tests: 6, avgScore: '88%' },
      { id: '3', initials: 'RN', name: 'Rahul Nair', dept: 'Information Technology', tests: 6, avgScore: '86%' },
      { id: '5', initials: 'VS', name: 'Vikram Sharma', dept: 'Computer Science and Engineering', tests: 5, avgScore: '83%' },
    ],
  };

  const activeTopStudents = topStudentsDatasets[topStudentsFilter] || topStudentsDatasets['all'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-900 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium flex items-center justify-between gap-4">
              <span>{p.name}</span>
              <span>{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Metric,Value,Trend\n" +
      `Total Users,${kpis.totalUsers ?? 2486},+25%\n` +
      `Total Students,${kpis.totalStudents ?? 2434},+18%\n` +
      `Total Trainers,${kpis.totalTrainers ?? 44},+4%\n` +
      `Total Tests,${kpis.totalTests ?? 142},+12%\n` +
      `Average Score,${kpis.avgScore ?? 84}%,+5%\n` +
      `Violations,${kpis.totalViolations ?? 3},-15%\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lms_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast('Analytics telemetry data downloaded successfully as CSV.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Analytics</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Telemetry & Performance</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track usage, learning progress, and assessment insights across all institutions and tracks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              value={globalTimeRange}
              onChange={(e) => handleGlobalRangeChange(e.target.value)}
              className="appearance-none text-sm font-semibold bg-white border border-slate-200 rounded-lg pl-9 pr-9 py-2 text-slate-700 outline-none hover:bg-slate-50 hover:border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer shadow-sm transition-all"
            >
              <option value="today">Today (Live)</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days (Default)</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days (Q3)</option>
              <option value="6m">Last 6 months</option>
              <option value="semester">This Semester</option>
              <option value="year">Academic Year (2025-26)</option>
              <option value="all">All Time History</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <Button onClick={handleExportReport} variant="outline" className="shadow-sm gap-2 bg-white hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Grid (4 High Impact Core Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: User Growth + Test Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                User Growth
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">New users added over time</p>
            </div>
            <DropdownSelect
              value={userGrowthRange}
              onChange={setUserGrowthRange}
              options={[
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 14 days', value: '14d' },
                { label: 'Last 30 days', value: '30d' },
                { label: 'Last 90 days', value: '90d' },
                { label: 'Last 6 months', value: '6m' },
                { label: 'Academic Year (2025-26)', value: 'year' },
                { label: 'All Time', value: 'all' },
              ]}
            />
          </CardHeader>
          <CardContent>
            {activeUserGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={activeUserGrowth} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="students" name="Students" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="trainers" name="Trainers" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="institutions" name="Institutions" stroke="#0284c7" strokeWidth={2} dot={{ r: 3, fill: '#0284c7', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">No growth data</div>
            )}
          </CardContent>
        </Card>

        {/* Test Activity (Highlighted in Screenshot) */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Test Activity
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Number of test attempts over time</p>
            </div>
            <DropdownSelect
              value={testActivityRange}
              onChange={setTestActivityRange}
              options={[
                { label: 'Today (Live)', value: 'today' },
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 14 days', value: '14d' },
                { label: 'Last 30 days', value: '30d' },
                { label: 'Last 90 days (Quarterly)', value: '90d' },
                { label: 'This Semester', value: 'semester' },
                { label: 'Academic Year (2025-26)', value: 'year' },
                { label: 'All Time', value: 'all' },
              ]}
            />
          </CardHeader>
          <CardContent>
            {activeTestActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={activeTestActivity} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="attempts" name="Attempts" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                  <Bar dataKey="uniqueStudents" name="Unique Students" fill="#bfdbfe" radius={[2, 2, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">No activity data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Score Distribution + Submission Type + Question Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                Score Distribution
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Distribution of student scores</p>
            </div>
            <DropdownSelect
              value={scoreFilter}
              onChange={setScoreFilter}
              options={[
                { label: 'All Tests & Tracks', value: 'all' },
                { label: 'Quantitative Aptitude', value: 'aptitude' },
                { label: 'Logical Reasoning', value: 'reasoning' },
                { label: 'Verbal Ability', value: 'verbal' },
                { label: 'Technical & Core CS', value: 'technical' },
                { label: 'Mock Placement Drive', value: 'placement' },
                { label: 'Weekly Assessment', value: 'weekly' },
              ]}
            />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activeScoreData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {activeScoreData.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS[entry.name as keyof typeof SCORE_COLORS] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Submission Type */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-500" />
                Submission Type
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Auto vs Manual submissions</p>
            </div>
            <DropdownSelect
              value={submissionFilter}
              onChange={setSubmissionFilter}
              options={[
                { label: 'All Tests & Modules', value: 'all' },
                { label: 'Timed Practice Tests', value: 'timed' },
                { label: 'Proctored Mock Exams', value: 'proctored' },
                { label: 'Faculty Assessments', value: 'faculty' },
                { label: 'Adaptive Quizzes', value: 'adaptive' },
                { label: 'Placement Screening', value: 'placement' },
              ]}
            />
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={activeSubmissionData}
                  cx="50%" cy="50%"
                  innerRadius={65} outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', right: 0 }} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-[100px]">
              <span className="text-2xl font-bold text-slate-900">{totalSubmissions}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Submissions</span>
            </div>
          </CardContent>
        </Card>

        {/* Question Difficulty */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-500" />
                Question Difficulty
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Performance by question difficulty</p>
            </div>
            <DropdownSelect
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              options={[
                { label: 'All Question Banks', value: 'all' },
                { label: 'Quantitative Aptitude', value: 'aptitude' },
                { label: 'Logical Reasoning', value: 'reasoning' },
                { label: 'Verbal Ability', value: 'verbal' },
                { label: 'Technical & Coding', value: 'technical' },
                { label: 'Company Specific Banks', value: 'company' },
              ]}
            />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activeDifficultyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                  {activeDifficultyData.map((entry, i) => (
                    <Cell key={i} fill={DIFFICULTY_COLORS[entry.name as keyof typeof DIFFICULTY_COLORS] || '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Department Enrollment + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Enrollment */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                Department Enrollment
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Number of students across departments</p>
            </div>
            <DropdownSelect
              value={deptFilter}
              onChange={setDeptFilter}
              options={[
                { label: 'All Departments', value: 'all' },
                { label: 'Final Year (Batch 2026)', value: 'batch2026' },
                { label: 'Pre-Final (Batch 2027)', value: 'batch2027' },
                { label: 'Sophomores (Batch 2028)', value: 'batch2028' },
                { label: 'Circuital (CSE/IT/ECE)', value: 'circuital' },
                { label: 'Core Engg (ME/CE/EE)', value: 'core' },
              ]}
            />
          </CardHeader>
          <CardContent className="pt-4">
            {activeDeptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activeDeptData} layout="vertical" barSize={12} margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={160} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} background={{ fill: '#f1f5f9', radius: 4 }}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No department data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Students */}
        <Card className="border border-slate-200 overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Performing Students
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Students with highest average scores</p>
            </div>
            <DropdownSelect
              value={topStudentsFilter}
              onChange={setTopStudentsFilter}
              options={[
                { label: 'All Tests & Tracks', value: 'all' },
                { label: 'Quantitative Aptitude', value: 'aptitude' },
                { label: 'Logical Reasoning', value: 'reasoning' },
                { label: 'Technical Core CS', value: 'technical' },
                { label: 'Verbal Ability', value: 'verbal' },
                { label: 'Mock Placement Drive', value: 'placement' },
              ]}
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-center font-semibold">Tests Taken</th>
                    <th className="px-4 py-3 text-center font-semibold">Avg. Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTopStudents.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-600' :
                          i === 1 ? 'bg-slate-200 text-slate-700' :
                          i === 2 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                          {s.initials}
                        </div>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{s.dept}</td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">{s.tests}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{s.avgScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
