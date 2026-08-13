import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { testService } from '../../services/testService';
import { useAuth } from '../../context/AuthContext';
import { Test, Schedule, Attempt } from '../../types';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [upcomingTests, setUpcomingTests] = useState<{schedule: Schedule, test: Test, attempt?: Attempt, isAvailable: boolean}[]>([]);

  useEffect(() => {
    const fetchUpcomingTests = async () => {
      if (user?.id) {
        try {
          const data = await testService.getStudentUpcomingTests(user.id);
          setUpcomingTests(data as any);
        } catch (error) {
          console.error("Failed to load upcoming tests", error);
        }
      }
    };
    fetchUpcomingTests();
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Welcome, {user?.name}
        </h1>
        <p className="text-slate-500 mt-1">Here are your upcoming placement assessments.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Upcoming Tests</h2>
        
        {upcomingTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingTests.map((item) => (
              <Card key={item.schedule.id} className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                      <Clock className="h-6 w-6" />
                    </div>
                    {item.isAvailable ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                        Available Now
                      </span>
                    ) : item.attempt?.status === 'in_progress' ? (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                        In Progress
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                        Scheduled
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">
                    {item.test.title}
                  </h3>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-slate-500 flex items-center">
                      <span className="w-24 font-medium">Questions:</span>
                      {item.test.questionIds.length}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center">
                      <span className="w-24 font-medium">Duration:</span>
                      {item.test.settings.duration} Minutes
                    </p>
                    <p className="text-sm text-slate-500 flex items-center">
                      <span className="w-24 font-medium">Window:</span>
                      {new Date(item.schedule.startTime).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <Link to={`/student/tests/${item.test.id}`}>
                    <Button className="w-full" variant={item.isAvailable ? 'primary' : 'outline'}>
                      {item.attempt?.status === 'in_progress' ? 'Resume Test' : 'View Test'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">All caught up!</h3>
              <p>You have no pending or upcoming assessments.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
