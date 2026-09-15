import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  Users, Building2, FileText, Calendar, 
  TrendingUp, TrendingDown, Plus, UploadCloud, UserPlus, FilePlus, Activity, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

const studentActivityData = [
  { day: 'Mon\n11 Sep', attempts: 210, materials: 240 },
  { day: 'Tue\n12 Sep', attempts: 240, materials: 290 },
  { day: 'Wed\n13 Sep', attempts: 240, materials: 290 },
  { day: 'Thu\n14 Sep', attempts: 270, materials: 300 },
  { day: 'Fri\n15 Sep', attempts: 240, materials: 330 },
  { day: 'Sat\n16 Sep', attempts: 230, materials: 310 },
  { day: 'Sun\n17 Sep', attempts: 280, materials: 340 },
];

const institutionData = [
  { name: 'ABC Engineering', value: 2486 * 0.33, percentage: '33%', color: '#3b82f6' },
  { name: 'XYZ Institute', value: 2486 * 0.22, percentage: '22%', color: '#6366f1' },
  { name: 'PQR College', value: 2486 * 0.18, percentage: '18%', color: '#8b5cf6' },
  { name: 'Others', value: 2486 * 0.27, percentage: '27%', color: '#93c5fd' },
];

const scheduleData = [
  { time: '10:00 AM', name: 'Aptitude', trainer: 'Rahul Kumar', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-blue-500' },
  { time: '12:30 PM', name: 'Reasoning', trainer: 'Priya Sharma', institution: 'XYZ Institute', batch: 'Batch 2026', color: 'bg-green-500' },
  { time: '03:00 PM', name: 'Technical (DBMS)', trainer: 'Kiran Mehta', institution: 'PQR College', batch: 'Batch 2026', color: 'bg-purple-500' },
  { time: '04:30 PM', name: 'Verbal', trainer: 'Sneha Reddy', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-orange-500' },
];

const coursePerformance = [
  { name: 'Aptitude', progress: 78, color: 'bg-blue-500' },
  { name: 'Verbal', progress: 72, color: 'bg-green-500' },
  { name: 'Reasoning', progress: 69, color: 'bg-purple-500' },
  { name: 'Technical', progress: 81, color: 'bg-orange-500' },
];



export const AdminDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Good morning, Admin <span className="text-3xl">👋</span>
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening across your LMS.</p>
        </div>
        <p className="text-sm text-slate-500 font-medium">Wednesday, 17 September 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-blue-100 shadow-sm shadow-blue-100/50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">2,486</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-100 shadow-sm shadow-green-100/50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Partner Institutions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">8</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-100 shadow-sm shadow-purple-100/50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Trainers</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">42</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-100 shadow-sm shadow-orange-100/50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Performance</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">74.5%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Activity Chart */}
        <Card className="lg:col-span-2 border border-slate-200">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Student Activity
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Number of test attempts and learning activity over the last 7 days.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 text-xs text-slate-500 hidden sm:flex">
                  <div className="w-3 h-3 rounded-sm bg-[#3b82f6]"></div>
                  Tests Attempted
               </div>
               <div className="flex items-center gap-1.5 text-xs text-slate-500 hidden sm:flex">
                  <div className="w-3 h-3 rounded-sm bg-[#93c5fd]"></div>
                  Materials Viewed
               </div>
               <select className="text-xs border border-slate-200 rounded-md py-1.5 px-2 bg-white text-slate-700 outline-none ml-2">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
               </select>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="attempts" name="Tests Attempted" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="materials" name="Materials Viewed" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" />
              Upcoming Schedule
            </CardTitle>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              View All
            </button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {scheduleData.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white">
                <div className="w-[70px] shrink-0 text-sm font-semibold text-slate-700 pt-1">
                  {item.time}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`}></span>
                    <h4 className="font-semibold text-slate-900 truncate text-sm">{item.name}</h4>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 pl-4 space-y-0.5">
                    <p>Trainer: {item.trainer}</p>
                    <p>{item.institution} · {item.batch}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Performance */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Course Performance
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Average scores across major courses.</p>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full shrink-0">
              View Details
            </button>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {coursePerformance.map((course, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{course.name}</span>
                  <span className="text-sm font-semibold text-slate-900">{course.progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${course.color}`} style={{ width: `${course.progress}%` }}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Institutions Donut */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" />
              Institutions by Student Count
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between p-6 h-[250px]">
             {/* Chart Area */}
             <div className="relative w-[160px] h-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={institutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {institutionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       formatter={(value: number) => [`${Math.round(value)} Students`, 'Count']}
                       contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-1">
                   <p className="text-xl font-bold text-slate-900 leading-none">2,486</p>
                   <p className="text-[10px] text-slate-500 font-medium mt-1">Students</p>
                </div>
             </div>
             
             {/* Legend Area */}
             <div className="flex-1 pl-4 space-y-3 max-w-[200px]">
                {institutionData.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                         <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                         <span className="text-xs font-medium text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 shrink-0">{item.percentage}</span>
                   </div>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 h-full">
              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md hover:text-blue-600 transition-all text-slate-600 group">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Add Student</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-green-200 hover:shadow-md hover:text-green-600 transition-all text-slate-600 group">
                <div className="h-10 w-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Add Trainer</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-purple-200 hover:shadow-md hover:text-purple-600 transition-all text-slate-600 group">
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FilePlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Create Test</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-orange-200 hover:shadow-md hover:text-orange-600 transition-all text-slate-600 group">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Upload Materials</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
};
