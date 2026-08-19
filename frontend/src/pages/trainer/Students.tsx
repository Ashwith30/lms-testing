import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, User, Award, ShieldAlert, ShieldCheck, BookOpen, AlertTriangle, Eye, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ProctoringAuditModal } from '../../components/common/ProctoringAuditModal';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  department?: string;
  batch?: string;
  createdAt: string;
}

interface StudentAttempt {
  id: string;
  testId: string;
  testTitle: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  violations: number;
  violationLogs?: any[];
  proctoringSummary?: any;
  status: string;
  rawTest?: any;
}

export const TrainerStudents = () => {
  const { toast } = useToast();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<StudentAttempt[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [selectedAuditAttempt, setSelectedAuditAttempt] = useState<StudentAttempt | null>(null);

  const loadData = async () => {
    try {
      const [usersRes, attemptsRes, testsRes] = await Promise.all([
        api.get('/users/all'),
        api.get('/attempts'),
        api.get('/tests'),
      ]);

      const filteredStudents = usersRes.data.filter((u: any) => u.role === 'student');
      setStudents(filteredStudents);
      setAttempts(attemptsRes.data);
      setTests(testsRes.data);
    } catch (e) {
      console.error(e);
      toast('Failed to load student data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute student stats
  const getStudentStats = (studentId: string) => {
    const studentAttempts = attempts.filter((a) => a.studentId === studentId && (a.status === 'submitted' || a.status === 'auto_submitted'));
    const testCount = studentAttempts.length;
    const avgPercentage = testCount > 0
      ? studentAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / testCount
      : 0;
    const totalViolations = studentAttempts.reduce((sum, a) => sum + (a.violations || 0), 0);

    return { testCount, avgPercentage, totalViolations };
  };

  // Aggregate stats
  const totalRegistered = students.length;
  const submittedAttempts = attempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted');
  const classAverage = submittedAttempts.length > 0
    ? submittedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / submittedAttempts.length
    : 0;
  const topScore = submittedAttempts.length > 0
    ? Math.max(...submittedAttempts.map((a) => a.percentage || 0))
    : 0;
  const totalViolationsCount = attempts.reduce((sum, a) => sum + (a.violations || 0), 0);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(search.toLowerCase()));
    
    const matchesDept = deptFilter === 'all' || s.department === deptFilter;
    const matchesBatch = batchFilter === 'all' || s.batch === batchFilter;

    return matchesSearch && matchesDept && matchesBatch;
  });

  // Unique departments and batches for filter dropdowns
  const departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean)));
  const batches = Array.from(new Set(students.map((s) => s.batch).filter(Boolean)));

  // View performance modal loader
  const handleOpenPerformance = async (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsLoadingModal(true);

    try {
      const studentAttempts = attempts.filter((a) => a.studentId === student.id);
      
      const mappedAttempts = studentAttempts.map((a) => {
        const test = tests.find((t) => t.id === a.testId);
        return {
          id: a.id,
          testId: a.testId,
          testTitle: test ? test.title : 'Unknown Assessment',
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          score: a.score,
          totalMarks: test ? test.totalMarks : 0,
          percentage: a.percentage,
          violations: a.violations || 0,
          violationLogs: a.violationLogs || [],
          proctoringSummary: a.proctoringSummary,
          status: a.status,
          rawTest: test || { id: a.testId, title: 'Unknown Assessment', totalMarks: a.score || 100 }
        };
      });

      setStudentAttempts(mappedAttempts);
    } catch (e) {
      console.error(e);
      toast('Failed to load performance details', 'error');
    } finally {
      setIsLoadingModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
        <p className="text-slate-500">Monitor student performance metrics, aggregate grades, and fullscreen violations.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading student directory...</div>
      ) : (
        <>
          {/* Aggregate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Enrolled</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalRegistered} Students</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Class Average</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{classAverage.toFixed(1)}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Top Performance</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{topScore.toFixed(1)}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Violations</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalViolationsCount} Flags</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <div className="flex-1 md:flex-initial">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 md:flex-initial">
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Directory Table */}
          <Card className="border border-slate-200 overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Dept & Batch</th>
                        <th className="px-6 py-4 text-center">Tests Taken</th>
                        <th className="px-6 py-4 text-center">Average Score</th>
                        <th className="px-6 py-4 text-center">Violations</th>
                        <th className="px-6 py-4 text-right">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.map((student) => {
                        const stats = getStudentStats(student.id);
                        return (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm uppercase">
                                  {student.name.substring(0, 2)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{student.name}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-slate-700">
                              {student.studentId || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-800">{student.department || 'N/A'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Batch: {student.batch || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-900">
                              {stats.testCount}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                stats.testCount === 0 ? 'bg-slate-50 text-slate-400' :
                                stats.avgPercentage >= 70 ? 'bg-green-50 text-green-700 border border-green-200' :
                                stats.avgPercentage >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {stats.testCount > 0 ? `${stats.avgPercentage.toFixed(1)}%` : 'No attempts'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {stats.totalViolations > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <AlertTriangle className="h-3 w-3" />
                                  {stats.totalViolations}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenPerformance(student)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye className="mr-1.5 h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                View Performance
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <User className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No students matched search criteria</p>
                  <p className="text-sm mt-0.5">Try clearing filters or checking spelling.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal overlays for Drilldown performance */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border shadow-2xl animate-in">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between bg-slate-50">
              <div className="flex gap-4">
                <div className="h-12 w-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg uppercase shrink-0">
                  {selectedStudent.name.substring(0, 2)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-sm text-slate-500 font-mono">
                    ID: {selectedStudent.studentId || 'N/A'} • {selectedStudent.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dept: {selectedStudent.department || 'N/A'} • Batch: {selectedStudent.batch || 'N/A'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Test Performance History</h4>
              
              {isLoadingModal ? (
                <div className="text-center py-12 text-slate-500">Loading performance data...</div>
              ) : studentAttempts.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3">Assessment</th>
                        <th className="px-4 py-3 text-center">Score</th>
                        <th className="px-4 py-3 text-center">Percentage</th>
                        <th className="px-4 py-3 text-center">Trust Score & Audit</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Attempt Date</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {studentAttempts.map((attempt) => {
                        const trustScore = attempt.proctoringSummary?.trustScore ?? Math.max(0, 100 - (attempt.violations || 0) * 20);
                        return (
                          <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">{attempt.testTitle}</td>
                            <td className="px-4 py-3 text-center font-medium text-slate-700">
                              {attempt.status === 'in_progress' ? '—' : `${attempt.score} / ${attempt.totalMarks}`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {attempt.status === 'in_progress' ? (
                                <span className="text-xs text-slate-400">In Progress</span>
                              ) : (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  (attempt.percentage || 0) >= 70 ? 'bg-green-50 text-green-700 border border-green-200' :
                                  (attempt.percentage || 0) >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {attempt.percentage?.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {attempt.status === 'in_progress' ? (
                                <span className="text-xs text-slate-400">Active Session</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAuditAttempt(attempt)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all hover:scale-105 ${
                                    trustScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    trustScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {trustScore >= 80 ? (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                  )}
                                  <span>{trustScore}% ({attempt.violations} viol.)</span>
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-medium capitalize">
                              {attempt.status === 'auto_submitted' ? (
                                <span className="text-amber-600">Auto Submitted</span>
                              ) : attempt.status === 'submitted' ? (
                                <span className="text-green-600">Submitted</span>
                              ) : (
                                <span className="text-slate-400">In Progress</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-400">
                              {new Date(attempt.startedAt).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {attempt.status !== 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedAuditAttempt(attempt)}
                                >
                                  View Audit
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 border border-dashed rounded-xl">
                  <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-900">No test attempts registered</p>
                  <p className="text-xs mt-0.5">This student has not started any scheduled assessments yet.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end bg-slate-50">
              <Button onClick={() => setSelectedStudent(null)}>Close Window</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Proctoring Audit & Trust Score Modal for Trainers */}
      {selectedAuditAttempt && selectedStudent && (
        <ProctoringAuditModal
          isOpen={!!selectedAuditAttempt}
          onClose={() => setSelectedAuditAttempt(null)}
          student={selectedStudent as any}
          test={selectedAuditAttempt.rawTest}
          violations={selectedAuditAttempt.violations}
          violationLogs={selectedAuditAttempt.violationLogs || []}
          proctoringSummary={selectedAuditAttempt.proctoringSummary}
          score={selectedAuditAttempt.score}
          percentage={selectedAuditAttempt.percentage}
        />
      )}
    </div>
  );
};
