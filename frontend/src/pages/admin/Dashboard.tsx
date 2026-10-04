import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  Users, Building2, Calendar, 
  UploadCloud, UserPlus, FilePlus, Activity, Zap,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import {
  ScheduleDetailsModal,
  AllScheduleModal,
  CourseDetailsModal,
  AllCoursesPerformanceModal,
  KPIInsightModal,
  AddStudentModal,
  AddTrainerModal,
  UploadMaterialModal,
  InstitutionDetailsModal,
  ScheduleItem
} from '../../components/common/DashboardModals';
import { useToast } from '../../context/ToastContext';

const studentActivityDatasets: Record<string, { day: string; attempts: number; materials: number }[]> = {
  '7': [
    { day: 'Mon\n11 Sep', attempts: 210, materials: 240 },
    { day: 'Tue\n12 Sep', attempts: 240, materials: 290 },
    { day: 'Wed\n13 Sep', attempts: 240, materials: 290 },
    { day: 'Thu\n14 Sep', attempts: 270, materials: 300 },
    { day: 'Fri\n15 Sep', attempts: 240, materials: 330 },
    { day: 'Sat\n16 Sep', attempts: 230, materials: 310 },
    { day: 'Sun\n17 Sep', attempts: 280, materials: 340 },
  ],
  '14': [
    { day: '04 Sep', attempts: 180, materials: 220 },
    { day: '06 Sep', attempts: 200, materials: 250 },
    { day: '08 Sep', attempts: 230, materials: 270 },
    { day: '10 Sep', attempts: 210, materials: 240 },
    { day: '12 Sep', attempts: 240, materials: 290 },
    { day: '14 Sep', attempts: 270, materials: 300 },
    { day: '17 Sep', attempts: 280, materials: 340 },
  ],
  '30': [
    { day: 'W1', attempts: 1140, materials: 1420 },
    { day: 'W2', attempts: 1390, materials: 1680 },
    { day: 'W3', attempts: 1520, materials: 1810 },
    { day: 'W4', attempts: 1680, materials: 1950 },
  ],
  '90': [
    { day: 'Jul', attempts: 3840, materials: 4620 },
    { day: 'Aug', attempts: 4920, materials: 5850 },
    { day: 'Sep', attempts: 5730, materials: 6860 },
  ],
  'year': [
    { day: 'Jul', attempts: 3840, materials: 4620 },
    { day: 'Aug', attempts: 4920, materials: 5850 },
    { day: 'Sep', attempts: 5730, materials: 6860 },
    { day: 'Oct', attempts: 5410, materials: 6200 },
    { day: 'Nov', attempts: 6150, materials: 7100 },
    { day: 'Dec', attempts: 4800, materials: 5600 },
    { day: 'Jan', attempts: 7200, materials: 8400 },
  ],
  'all': [
    { day: '2023-24', attempts: 32400, materials: 41200 },
    { day: '2024-25', attempts: 58900, materials: 72100 },
    { day: '2025-26', attempts: 64200, materials: 81400 },
  ]
};

const institutionData = [
  { name: 'ABC Engineering', value: 2486 * 0.33, percentage: '33%', color: '#3b82f6', location: 'Hyderabad', students: 820, courses: 4, status: 'Active' },
  { name: 'XYZ Institute', value: 2486 * 0.22, percentage: '22%', color: '#0284c7', location: 'Bangalore', students: 540, courses: 4, status: 'Active' },
  { name: 'PQR College', value: 2486 * 0.18, percentage: '18%', color: '#38bdf8', location: 'Chennai', students: 312, courses: 3, status: 'Inactive' },
  { name: 'Others', value: 2486 * 0.27, percentage: '27%', color: '#93c5fd', location: 'Multiple Campuses', students: 814, courses: 4, status: 'Active' },
];

const initialScheduleData: ScheduleItem[] = [
  { time: '10:00 AM', name: 'Aptitude', trainer: 'Rahul Kumar', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-blue-500' },
  { time: '12:30 PM', name: 'Reasoning', trainer: 'Priya Sharma', institution: 'XYZ Institute', batch: 'Batch 2026', color: 'bg-green-500' },
  { time: '03:00 PM', name: 'Technical (DBMS)', trainer: 'Kiran Mehta', institution: 'PQR College', batch: 'Batch 2026', color: 'bg-sky-600' },
  { time: '04:30 PM', name: 'Verbal', trainer: 'Sneha Reddy', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-orange-500' },
];

const coursePerformance = [
  { name: 'Aptitude', progress: 78, color: 'bg-blue-500' },
  { name: 'Verbal', progress: 72, color: 'bg-green-500' },
  { name: 'Reasoning', progress: 69, color: 'bg-sky-500' },
  { name: 'Technical', progress: 81, color: 'bg-orange-500' },
];

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for Donut Chart hover/selection
  const [activeInstitutionIndex, setActiveInstitutionIndex] = useState<number | null>(null);
  const activeInstitution = activeInstitutionIndex !== null ? institutionData[activeInstitutionIndex] : null;

  // Chart time range
  const [activityTimeRange, setActivityTimeRange] = useState<string>('7');

  // Modals state
  const [selectedScheduleSession, setSelectedScheduleSession] = useState<ScheduleItem | null>(null);
  const [isAllScheduleModalOpen, setIsAllScheduleModalOpen] = useState(false);

  const [selectedCourseName, setSelectedCourseName] = useState<string | null>(null);
  const [isAllCoursesModalOpen, setIsAllCoursesModalOpen] = useState(false);

  const [selectedKPIType, setSelectedKPIType] = useState<'students' | 'institutions' | 'trainers' | 'performance' | null>(null);

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);

  const [selectedInstitutionForDetails, setSelectedInstitutionForDetails] = useState<any | null>(null);

  return (
    <div className="space-y-6 pb-8 animate-in">
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

      {/* Interactive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Students */}
        <Card 
          onClick={() => setSelectedKPIType('students')}
          className="border border-blue-100 shadow-sm shadow-blue-100/50 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Students</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">2,486</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
          </CardContent>
        </Card>

        {/* KPI 2: Partner Institutions */}
        <Card 
          onClick={() => setSelectedKPIType('institutions')}
          className="border border-green-100 shadow-sm shadow-green-100/50 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Partner Institutions</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">8</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
          </CardContent>
        </Card>

        {/* KPI 3: Trainers */}
        <Card 
          onClick={() => setSelectedKPIType('trainers')}
          className="border border-sky-100 shadow-sm shadow-sky-100/50 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Trainers</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">42</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
          </CardContent>
        </Card>

        {/* KPI 4: Avg Performance */}
        <Card 
          onClick={() => setSelectedKPIType('performance')}
          className="border border-orange-100 shadow-sm shadow-orange-100/50 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Performance</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">74.5%</h3>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
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
              <p className="text-xs text-slate-500 mt-1">Number of test attempts and learning activity over the selected period.</p>
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
               <select 
                  value={activityTimeRange}
                  onChange={(e) => setActivityTimeRange(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-1.5 px-2.5 bg-white font-medium text-slate-700 outline-none ml-2 cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
               >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="year">This Academic Year</option>
                  <option value="all">All Time</option>
               </select>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={studentActivityDatasets[activityTimeRange] || studentActivityDatasets['7']} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }} 
                barGap={6}
              >
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
        <Card className="border border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" />
              Upcoming Schedule
            </CardTitle>
            <button 
              onClick={() => setIsAllScheduleModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              View All
            </button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {initialScheduleData.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedScheduleSession(item)}
                className="flex gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm transition-all bg-white cursor-pointer group"
              >
                <div className="w-[70px] shrink-0 text-sm font-semibold text-slate-700 pt-1">
                  {item.time}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`}></span>
                      <h4 className="font-semibold text-slate-900 truncate text-sm group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </h4>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="text-xs text-slate-500 mt-1 pl-4 space-y-0.5">
                    <p>Trainer: <span className="font-medium text-slate-700">{item.trainer}</span></p>
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
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Course Performance
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Average scores across major courses.</p>
            </div>
            <button 
              onClick={() => setIsAllCoursesModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
            >
              View Details
            </button>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {coursePerformance.map((course, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedCourseName(course.name)}
                className="p-2.5 -mx-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                    {course.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">{course.progress}%</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${course.color}`} style={{ width: `${course.progress}%` }}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Institutions Donut */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" />
              Institutions by Student Count
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-around p-4 sm:p-6 min-h-[250px] gap-4 sm:gap-2">
             {/* Chart Area */}
             <div className="relative w-[160px] h-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={institutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      onMouseEnter={(_, index) => setActiveInstitutionIndex(index)}
                      onMouseLeave={() => setActiveInstitutionIndex(null)}
                      onClick={(_, index) => setSelectedInstitutionForDetails(institutionData[index])}
                    >
                      {institutionData.map((entry, index) => {
                        const isHovered = activeInstitutionIndex === index;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            opacity={activeInstitutionIndex === null || isHovered ? 1 : 0.45}
                            style={{
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'opacity 0.2s ease, transform 0.2s ease',
                              filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none',
                            }}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200 text-center px-1">
                   {activeInstitution ? (
                     <>
                       <p className="text-lg font-bold text-slate-900 leading-tight">
                         {Math.round(Number(activeInstitution.value) || 0).toLocaleString()}
                       </p>
                       <p className="text-[10px] font-semibold text-blue-600 truncate max-w-[95px] leading-tight mt-0.5">
                         {activeInstitution.name}
                       </p>
                       <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">
                         {activeInstitution.percentage}
                       </p>
                     </>
                   ) : (
                     <>
                       <p className="text-xl font-bold text-slate-900 leading-none">2,486</p>
                       <p className="text-[10px] text-slate-500 font-medium mt-1">Students</p>
                     </>
                   )}
                </div>
             </div>
             
             {/* Legend Area */}
             <div className="w-full sm:flex-1 pl-0 sm:pl-4 space-y-2 max-w-full sm:max-w-[200px]">
                {institutionData.map((item, idx) => {
                   const isHovered = activeInstitutionIndex === idx;
                   return (
                     <div 
                       key={idx} 
                       className={`flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-lg transition-all cursor-pointer ${
                         isHovered ? 'bg-slate-100/90 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                       }`}
                       onMouseEnter={() => setActiveInstitutionIndex(idx)}
                       onMouseLeave={() => setActiveInstitutionIndex(null)}
                       onClick={() => setSelectedInstitutionForDetails(item)}
                     >
                        <div className="flex items-center gap-2 min-w-0">
                           <div 
                             className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${isHovered ? 'scale-125 ring-2 ring-white shadow-sm' : ''}`} 
                             style={{ backgroundColor: item.color }}
                           ></div>
                           <span className={`text-xs truncate transition-colors ${isHovered ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                             {item.name}
                           </span>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 transition-colors ${isHovered ? 'text-blue-600' : 'text-slate-900'}`}>
                          {item.percentage}
                        </span>
                     </div>
                   );
                })}
             </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-slate-200 bg-slate-50/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 h-full">
              <button 
                onClick={() => setIsAddStudentOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-blue-300 hover:shadow-md hover:text-blue-600 transition-all text-slate-600 group cursor-pointer"
              >
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Add Student</span>
              </button>
              
              <button 
                onClick={() => setIsAddTrainerOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-green-300 hover:shadow-md hover:text-green-600 transition-all text-slate-600 group cursor-pointer"
              >
                <div className="h-10 w-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Add Trainer</span>
              </button>

              <button 
                onClick={() => navigate('/admin/tests/create')}
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-sky-300 hover:shadow-md hover:text-sky-600 transition-all text-slate-600 group cursor-pointer"
              >
                <div className="h-10 w-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FilePlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Create Test</span>
              </button>

              <button 
                onClick={() => setIsUploadMaterialOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-orange-300 hover:shadow-md hover:text-orange-600 transition-all text-slate-600 group cursor-pointer"
              >
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">Upload Materials</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* ALL MODAL DIALOGS                                            */}
      {/* ============================================================ */}

      {/* 1. Schedule Item Details */}
      <ScheduleDetailsModal
        isOpen={selectedScheduleSession !== null}
        onClose={() => setSelectedScheduleSession(null)}
        session={selectedScheduleSession}
      />

      {/* 2. All Schedule Full View */}
      <AllScheduleModal
        isOpen={isAllScheduleModalOpen}
        onClose={() => setIsAllScheduleModalOpen(false)}
        onSelectSession={(session) => setSelectedScheduleSession(session)}
      />

      {/* 3. Single Course Performance Details */}
      <CourseDetailsModal
        isOpen={selectedCourseName !== null}
        onClose={() => setSelectedCourseName(null)}
        courseName={selectedCourseName}
      />

      {/* 4. All Courses Performance Summary */}
      <AllCoursesPerformanceModal
        isOpen={isAllCoursesModalOpen}
        onClose={() => setIsAllCoursesModalOpen(false)}
        onSelectCourse={(name) => setSelectedCourseName(name)}
      />

      {/* 5. KPI Cards Insight */}
      <KPIInsightModal
        isOpen={selectedKPIType !== null}
        onClose={() => setSelectedKPIType(null)}
        kpiType={selectedKPIType}
      />

      {/* 6. Quick Action: Add Student */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
      />

      {/* 7. Quick Action: Add Trainer */}
      <AddTrainerModal
        isOpen={isAddTrainerOpen}
        onClose={() => setIsAddTrainerOpen(false)}
        onAdd={(trainer) => {
          toast(`Trainer ${trainer.name} registered!`, 'success');
        }}
      />

      {/* 8. Quick Action: Upload Material */}
      <UploadMaterialModal
        isOpen={isUploadMaterialOpen}
        onClose={() => setIsUploadMaterialOpen(false)}
        onAdd={(mat) => {
          toast(`Material "${mat.title}" uploaded!`, 'success');
        }}
      />

      {/* 9. Institution Details */}
      <InstitutionDetailsModal
        isOpen={selectedInstitutionForDetails !== null}
        onClose={() => setSelectedInstitutionForDetails(null)}
        institution={selectedInstitutionForDetails}
      />
    </div>
  );
};
