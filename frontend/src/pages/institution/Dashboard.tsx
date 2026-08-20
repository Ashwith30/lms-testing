import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  BarChart3, 
  Calendar, 
  Database, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { api } from '../../services/api';
import { testService } from '../../services/testService';
import { Test, User } from '../../types';

export const InstitutionDashboard = () => {
  const [trainers, setTrainers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, testsRes, attemptsRes] = await Promise.all([
          api.get('/users/all').catch(() => ({ data: [] })),
          testService.getTrainerTests().catch(() => []),
          api.get('/attempts').catch(() => ({ data: [] }))
        ]);

        const allUsers: User[] = usersRes.data || [];
        const trainerList = allUsers.filter((u) => u.role === 'trainer');
        const studentList = allUsers.filter((u) => u.role === 'student');

        setTrainers(trainerList);
        setStudents(studentList);
        setTests(testsRes || []);
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error('Failed to load institution overview', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const submittedAttempts = attempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted');
  const avgScore = submittedAttempts.length > 0
    ? submittedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / submittedAttempts.length
    : 0;

  const statCards = [
    { title: 'Academic Trainers', value: trainers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Enrolled Students', value: students.length, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Total Assessments', value: tests.length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Completed Tests', value: submittedAttempts.length, icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Institution Avg', value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <Building2 className="h-4 w-4" />
            <span>Academic Institution Portal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Institutional Oversight & Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Holistic performance analytics, test creation, student batch management, and trainer activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link to="/institution/tests/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileText className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          </Link>
          <Link to="/institution/tests/schedule">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Test
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{stat.title}</p>
              <div className={`p-2 rounded-lg shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/institution/students" className="group">
          <Card className="hover:border-emerald-300 hover:shadow-md transition-all h-full border border-slate-200">
            <CardContent className="p-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Student Directory & Registration
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Browse student batches, register new candidate profiles, and monitor integrity violations.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Access Students</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/institution/analytics" className="group">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all h-full border border-slate-200">
            <CardContent className="p-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Campus Analytics & Deep Dive
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Explore department pass rates, batch performance comparisons, and grade bracket distributions.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>View Analytics</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/institution/question-bank" className="group">
          <Card className="hover:border-purple-300 hover:shadow-md transition-all h-full border border-slate-200">
            <CardContent className="p-6">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Question Banks & Excel Import
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Maintain question repositories, upload bulk MCQs via Excel sheets, and organize by categories.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
                <span>Manage Banks</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Trainers Overview (Read-Only) & Recent Tests Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trainers List (Read-Only) */}
        <Card className="border border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Academic Faculty / Trainers
            </CardTitle>
            <Link to="/institution/trainers" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All ({trainers.length})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading trainers...</div>
            ) : trainers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {trainers.slice(0, 5).map((trainer) => (
                  <div key={trainer.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                        {trainer.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{trainer.name}</p>
                        <p className="text-xs text-slate-500">{trainer.email}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {trainer.department || 'General Faculty'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">No trainers registered yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assessments */}
        <Card className="border border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Recent Assessments
            </CardTitle>
            <Link to="/institution/tests" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
              View All ({tests.length})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading assessments...</div>
            ) : tests.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {tests.slice(0, 5).map((test) => (
                  <div key={test.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{test.title}</p>
                      <p className="text-xs text-slate-500">
                        {test.questionIds.length} Questions • {test.settings.duration} mins • {test.totalMarks} marks
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      test.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                      test.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                      test.status === 'Live' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">No assessments created yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
