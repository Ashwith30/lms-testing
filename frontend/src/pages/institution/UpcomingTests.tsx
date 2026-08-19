import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Calendar, Clock, CheckCircle, Search, Edit3 } from 'lucide-react';
import { api } from '../../services/api';
import { testService } from '../../services/testService';
import { Test, Schedule } from '../../types';

export const InstitutionUpcomingTests = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedRes, testsRes] = await Promise.all([
          api.get('/schedules').catch(() => ({ data: [] })),
          testService.getTrainerTests().catch(() => [])
        ]);

        setSchedules(schedRes.data || []);
        setTests(testsRes || []);
      } catch (e) {
        console.error('Failed to load upcoming schedules', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const now = new Date().toISOString();

  const scheduledItems = schedules.map((s) => {
    const test = tests.find((t) => t.id === s.testId);
    const isLive = now >= s.startTime && now <= s.endTime;
    const isUpcoming = now < s.startTime;
    const isPast = now > s.endTime;

    return {
      schedule: s,
      test: test || ({
        id: s.testId,
        title: 'Assessment',
        description: '',
        questionIds: [],
        totalMarks: 0,
        settings: { duration: 30 },
        createdBy: '',
        status: 'Scheduled',
        createdAt: ''
      } as unknown as Test),
      isLive,
      isUpcoming,
      isPast
    };
  });

  const filteredItems = scheduledItems.filter((item) =>
    item.test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.schedule.assignedBatch && item.schedule.assignedBatch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Upcoming & Scheduled Assessments</h1>
          <p className="text-slate-500">
            Monitor active, upcoming, and planned assessment testing windows across your institution.
          </p>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test title or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading schedules...</div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.schedule.id} className="border border-slate-200 hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                  {item.isLive ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                      Live Window Active
                    </span>
                  ) : item.isUpcoming ? (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                      Upcoming
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                      Window Closed
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">
                  {item.test.title}
                </h3>

                <div className="space-y-2 text-sm text-slate-500 mb-4">
                  <p className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Duration:</span>
                    <span>{item.test.settings?.duration || 30} mins</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Assigned Batch:</span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800">
                      {item.schedule.assignedBatch || 'All Batches'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Total Marks:</span>
                    <span>{item.test.totalMarks || 0} pts</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Start: {new Date(item.schedule.startTime).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      End: {new Date(item.schedule.endTime).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                  <Link
                    to={`/institution/tests/${item.test.id}/edit`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Test
                  </Link>
                  <Link
                    to={`/institution/tests/schedule?scheduleId=${item.schedule.id}&testId=${item.test.id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Edit Schedule
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed">
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No scheduled assessments found</h3>
            <p className="text-sm">No assessments currently match your search filter.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
