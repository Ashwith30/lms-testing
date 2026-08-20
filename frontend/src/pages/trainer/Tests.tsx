import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, FileText, Trash2, Calendar, Edit3, RefreshCw, Copy, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Test, Schedule } from '../../types';
import { api } from '../../services/api';
import { ReconductModal } from '../../components/trainer/ReconductModal';

export const Tests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reconduct modal state
  const [selectedTestForReconduct, setSelectedTestForReconduct] = useState<Test | null>(null);
  const [isReconductModalOpen, setIsReconductModalOpen] = useState(false);

  const fetchTests = async () => {
    try {
      const [testsData, schedulesRes] = await Promise.all([
        testService.getTrainerTests(user?.role === 'trainer' ? user?.id : undefined),
        api.get('/schedules').catch(() => ({ data: [] }))
      ]);
      setTests(testsData);
      setSchedules(schedulesRes.data || []);
    } catch (error) {
      console.error("Failed to load tests", error);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [user]);

  const handleDelete = async (testId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the assessment "${title}"? This will also remove any active schedules for it.`)) {
      setIsDeleting(testId);
      try {
        await testService.deleteTest(testId);
        toast('Assessment deleted successfully', 'success');
        fetchTests();
      } catch (e: any) {
        toast('Failed to delete assessment', 'error');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleClone = async (test: Test) => {
    const cloneTitle = prompt(`Enter title for duplicated test:`, `${test.title} (Copy)`);
    if (cloneTitle === null) return; // User cancelled

    setIsCloning(test.id);
    try {
      await testService.cloneTest(test.id, cloneTitle.trim() || undefined);
      toast('Test duplicated successfully! You can now edit or schedule it.', 'success');
      fetchTests();
    } catch (e: any) {
      toast('Failed to duplicate test', 'error');
    } finally {
      setIsCloning(null);
    }
  };

  const openReconduct = (test: Test) => {
    setSelectedTestForReconduct(test);
    setIsReconductModalOpen(true);
  };

  const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';
  const now = new Date().toISOString();

  const filteredTests = tests.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessments & Schedules</h1>
          <p className="text-slate-500 text-sm">
            Create, edit, reconduct across batches, and manage active exam sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
            />
          </div>
          <Link to={`${basePath}/tests/schedule`}>
            <Button variant="outline" className="text-xs">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Schedule Test
            </Button>
          </Link>
          <Link to={`${basePath}/tests/create`}>
            <Button className="text-xs bg-blue-600 hover:bg-blue-700 font-semibold">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTests.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Assessment Name</th>
                    <th className="px-4 py-4">Questions</th>
                    <th className="px-4 py-4">Duration</th>
                    <th className="px-4 py-4">Total Marks</th>
                    <th className="px-6 py-4">Scheduled Sessions</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTests.map((test) => {
                    const testSchedules = schedules.filter(s => s.testId === test.id);
                    const activeSchedule = testSchedules.find(s => now >= s.startTime && now <= s.endTime);
                    const upcomingSchedules = testSchedules.filter(s => s.startTime > now);
                    const pastSchedules = testSchedules.filter(s => s.endTime < now);

                    return (
                      <tr key={test.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{test.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{test.description || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-700">{test.questionIds?.length ?? 0} Qs</td>
                        <td className="px-4 py-4 font-medium text-slate-700">{test.settings?.duration ?? 60} min</td>
                        <td className="px-4 py-4 font-medium text-slate-900">{test.totalMarks ?? 0} pts</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {testSchedules.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-sm">
                                {activeSchedule && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Live: {activeSchedule.assignedBatch ? `Batch ${activeSchedule.assignedBatch}` : 'All'}
                                  </span>
                                )}
                                {upcomingSchedules.map((s, idx) => (
                                  <span key={s.id || idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    <Clock className="h-3 w-3" />
                                    {s.assignedBatch ? `Batch ${s.assignedBatch}` : 'All'} ({new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                                  </span>
                                ))}
                                {pastSchedules.map((s, idx) => (
                                  <span key={s.id || idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-100">
                                    {s.assignedBatch ? `Batch ${s.assignedBatch}` : 'All'} (Ended)
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                Draft / Unscheduled
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openReconduct(test)}
                              title="Reconduct / Schedule for Another Batch"
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold border border-blue-200"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Reconduct</span>
                            </button>
                            <button
                              onClick={() => handleClone(test)}
                              disabled={isCloning === test.id}
                              title="Duplicate Test"
                              className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <Link
                              to={`${basePath}/tests/${test.id}/edit`}
                              title="Edit Assessment Questions & Settings"
                              className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(test.id, test.title)}
                              disabled={isDeleting === test.id}
                              title="Delete Assessment"
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors inline-flex items-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredTests.map((test) => {
                const testSchedules = schedules.filter(s => s.testId === test.id);
                const activeSchedule = testSchedules.find(s => now >= s.startTime && now <= s.endTime);
                const upcomingSchedules = testSchedules.filter(s => s.startTime > now);

                return (
                  <div key={test.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-[13px] truncate">{test.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{test.description || 'No description'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="font-medium">{test.questionIds?.length ?? 0} Qs</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium">{test.settings?.duration ?? 60} min</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium">{test.totalMarks ?? 0} pts</span>
                    </div>

                    {/* Schedule badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeSchedule && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Live
                        </span>
                      )}
                      {upcomingSchedules.map((s, idx) => (
                        <span key={s.id || idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      ))}
                      {testSchedules.length === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => openReconduct(test)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-200 flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reconduct
                      </button>
                      <Link
                        to={`${basePath}/tests/${test.id}/edit`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleClone(test)}
                        disabled={isCloning === test.id}
                        className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id, test.title)}
                        disabled={isDeleting === test.id}
                        className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {searchTerm ? 'No matching assessments found' : 'No tests found'}
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              {searchTerm ? 'Try adjusting your search filter' : 'Get started by creating your first assessment from an uploaded question bank.'}
            </p>
            {!searchTerm && (
              <Link to={`${basePath}/tests/create`}>
                <Button>Create First Test</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Reconduct Modal */}
      <ReconductModal
        test={selectedTestForReconduct}
        isOpen={isReconductModalOpen}
        onClose={() => {
          setIsReconductModalOpen(false);
          setSelectedTestForReconduct(null);
        }}
        onSuccess={fetchTests}
      />
    </div>
  );
};
