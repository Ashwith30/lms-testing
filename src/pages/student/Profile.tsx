import React from 'react';
import { User, Mail, Shield, BookOpen, GraduationCap, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';

export const StudentProfile = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="text-center py-12 text-slate-500">Loading profile...</div>;
  }

  const profileItems = [
    { label: 'Full Name', value: user.name, icon: User, desc: 'Your registered primary name' },
    { label: 'Email Address', value: user.email, icon: Mail, desc: 'Contact address for notifications' },
    { label: 'Student ID', value: user.studentId || 'N/A', icon: Shield, desc: 'Your unique identifier (LMS ID)' },
    { label: 'Department', value: user.department || 'N/A', icon: BookOpen, desc: 'Academic department branch' },
    { label: 'Graduation Batch', value: user.batch || 'N/A', icon: GraduationCap, desc: 'Year of course completion' },
    {
      label: 'Account Created',
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      }) : 'N/A',
      icon: Calendar,
      desc: 'Registration date in this system'
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Profile</h1>
        <p className="text-slate-500">View your account information and academic details.</p>
      </div>

      <Card className="overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="bg-white p-2 rounded-full shadow-lg border">
              <div className="bg-blue-100 text-blue-600 rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl uppercase">
                {user.name.substring(0, 2)}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-14 pb-8 px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm font-medium text-slate-400 capitalize flex items-center gap-1.5 mt-1">
              <Shield className="h-4 w-4 text-blue-500" />
              Role: {user.role}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
            {profileItems.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="p-3 bg-slate-100 text-slate-500 rounded-lg h-fit">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-base font-semibold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
