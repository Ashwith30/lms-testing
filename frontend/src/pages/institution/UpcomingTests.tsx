import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Calendar,
  Clock,
  Search,
  Edit3,
  Radio,
  Timer,
  CheckCircle2,
  BookOpen,
  Users,
  ArrowUpRight,
  CalendarClock,
  LayoutGrid,
  List,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { testService } from '../../services/testService';
import { Test, Schedule } from '../../types';

type StatusFilter = 'all' | 'live' | 'upcoming' | 'completed';

export const InstitutionUpcomingTests = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const scheduledItems = useMemo(() =>
    schedules.map((s) => {
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
    }),
    [schedules, tests, now]
  );

  // Stats
  const liveCount = scheduledItems.filter(i => i.isLive).length;
  const upcomingCount = scheduledItems.filter(i => i.isUpcoming).length;
  const completedCount = scheduledItems.filter(i => i.isPast).length;

  // Filter
  const filteredItems = scheduledItems.filter((item) => {
    const matchesSearch =
      item.test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.schedule.assignedBatch && item.schedule.assignedBatch.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'live' && item.isLive) ||
      (statusFilter === 'upcoming' && item.isUpcoming) ||
      (statusFilter === 'completed' && item.isPast);

    return matchesSearch && matchesStatus;
  });

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getRelativeTime = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    const absDiff = Math.abs(diff);
    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const statusTabs: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: scheduledItems.length, color: 'text-slate-600' },
    { key: 'live', label: 'Live Now', count: liveCount, color: 'text-emerald-600' },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount, color: 'text-blue-600' },
    { key: 'completed', label: 'Completed', count: completedCount, color: 'text-slate-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Scheduled Assessments
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor and manage all assessment windows across your institution.
        </p>
      </div>

      {/* Stat summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 pt-4 flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Radio className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{liveCount}</p>
              <p className="text-xs text-slate-500 font-medium">Live Now</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 pt-4 flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Timer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
              <p className="text-xs text-slate-500 font-medium">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400 hover:shadow-md transition-shadow">
          <CardContent className="p-4 pt-4 flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
              <p className="text-xs text-slate-500 font-medium">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by test title or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex items-center bg-[#f0f2f5] p-1 rounded-xl self-start sm:self-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
                    statusFilter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 pt-6 space-y-4">
                <div className="flex justify-between">
                  <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                  <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                </div>
                <div className="h-5 w-3/4 bg-slate-100 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-50 rounded"></div>
                  <div className="h-4 w-2/3 bg-slate-50 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <Card
              key={item.schedule.id}
              className={`group hover:shadow-lg transition-all duration-200 border ${
                item.isLive
                  ? 'border-emerald-200 ring-1 ring-emerald-100'
                  : item.isUpcoming
                  ? 'border-blue-100'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              <CardContent className="p-0">
                {/* Card top accent bar */}
                <div
                  className={`h-1 rounded-t-xl ${
                    item.isLive
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : item.isUpcoming
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                      : 'bg-slate-200'
                  }`}
                />

                <div className="p-5">
                  {/* Header: icon + status */}
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        item.isLive
                          ? 'bg-emerald-50 text-emerald-600'
                          : item.isUpcoming
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {item.isLive ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live
                      </span>
                    ) : item.isUpcoming ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                        <CalendarClock className="h-3 w-3" />
                        In {getRelativeTime(item.schedule.startTime)}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3 line-clamp-1 group-hover:text-blue-700 transition-colors">
                    {item.test.title}
                  </h3>

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Duration</p>
                      <p className="text-sm font-semibold text-slate-800">{item.test.settings?.duration || 30} min</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Marks</p>
                      <p className="text-sm font-semibold text-slate-800">{item.test.totalMarks || 0} pts</p>
                    </div>
                  </div>

                  {/* Batch */}
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">
                      {item.schedule.assignedBatch || 'All Batches'}
                    </span>
                  </div>

                  {/* Schedule times */}
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-slate-400">Start:</span>
                      <span className="font-medium text-slate-700">
                        {formatDateTime(item.schedule.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-slate-400">End:</span>
                      <span className="font-medium text-slate-700">
                        {formatDateTime(item.schedule.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Link
                      to={`/institution/tests/${item.test.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Test
                    </Link>
                    <Link
                      to={`/institution/tests/schedule?scheduleId=${item.schedule.id}&testId=${item.test.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-all"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Schedule
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-slate-300">
          <CardContent className="p-16 pt-16 text-center flex flex-col items-center">
            <div className="p-4 bg-slate-50 rounded-2xl mb-4">
              <CalendarClock className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No assessments found</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              {searchTerm || statusFilter !== 'all'
                ? 'No assessments match your current filters. Try adjusting your search or filter.'
                : 'No assessments have been scheduled yet. Create a test and schedule it to see it here.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
