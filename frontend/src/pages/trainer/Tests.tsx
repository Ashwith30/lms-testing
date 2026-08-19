import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, FileText, Trash2, Calendar, Edit3, Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Test, Schedule } from '../../types';
import { api } from '../../services/api';

export const Tests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const basePath = user?.role === 'institution' ? '/institution' : user?.role === 'admin' ? '/admin' : '/trainer';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessments</h1>
          <p className="text-slate-500">Manage, edit, schedule, and configure test parameters.</p>
        </div>
        <div className="flex gap-3">
          <Link to={`${basePath}/tests/schedule`}>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Test
            </Button>
          </Link>
          <Link to={`${basePath}/tests/create`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {tests.length > 0 ? (
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Total Marks</th>
                <th className="px-6 py-4">Schedule / Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((test) => {
                const sched = schedules.find(s => s.testId === test.id);

                return (
                  <tr key={test.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{test.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{test.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{test.questionIds.length} Qs</td>
                    <td className="px-6 py-4 font-medium">{test.settings.duration} min</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{test.totalMarks} pts</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                          ${test.status === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                            test.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            test.status === 'Live' ? 'bg-green-50 text-green-700 border-green-200' : 
                            'bg-purple-50 text-purple-700 border-purple-200'}`
                        }>
                          {test.status}
                        </span>
                        {sched && (
                          <p className="text-[11px] text-slate-500">
                            Batch: {sched.assignedBatch || 'All'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Test Link */}
                        <Link
                          to={`${basePath}/tests/${test.id}/edit`}
                          title="Edit Assessment"
                          className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Link>

                        {/* Edit Schedule / Reschedule Link */}
                        <Link
                          to={sched ? `${basePath}/tests/schedule?scheduleId=${sched.id}&testId=${test.id}` : `${basePath}/tests/schedule?testId=${test.id}`}
                          title={sched ? "Edit Schedule" : "Schedule Test"}
                          className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="hidden sm:inline">{sched ? 'Reschedule' : 'Schedule'}</span>
                        </Link>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(test.id, test.title)}
                          disabled={isDeleting === test.id}
                          title="Delete Assessment"
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center"
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
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No tests found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Get started by creating your first assessment from an uploaded question bank.</p>
            <Link to={`${basePath}/tests/create`}>
              <Button>Create First Test</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
