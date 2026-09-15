import React from 'react';
import { 
  Building2, Users, BookOpen, FileText, ChevronRight, 
  Plus, MoreHorizontal, Settings2, ShieldCheck, Sliders, Bell, Settings,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const institutions = [
  { name: 'ABC Engineering', location: 'Hyderabad', students: 820, courses: 4, status: 'Active' },
  { name: 'XYZ Institute', location: 'Bangalore', students: 540, courses: 4, status: 'Active' },
  { name: 'PQR College', location: 'Chennai', students: 312, courses: 3, status: 'Inactive' },
];

const trainers = [
  { name: 'Rahul Kumar', email: 'rahul@lms.com', institution: 'ABC Engineering', courses: 2, status: 'Active' },
  { name: 'Priya Sharma', email: 'priya@lms.com', institution: 'XYZ Institute', courses: 3, status: 'Active' },
  { name: 'Kiran Mehta', email: 'kiran@lms.com', institution: 'PQR College', courses: 2, status: 'On Leave' },
];

const coursesData = [
  { course: 'Aptitude', topics: 8, materials: 42, status: 'Active' },
  { course: 'Verbal', topics: 6, materials: 28, status: 'Active' },
  { course: 'Reasoning', topics: 7, materials: 30, status: 'Active' },
  { course: 'Technical', topics: 12, materials: 56, status: 'Active' },
];

const materialsData = [
  { title: 'Data Interpretation.pdf', type: 'PDF', course: 'Aptitude', date: '12 Sep 2026', status: 'Published' },
  { title: 'Verbals - Practice Set', type: 'Quiz', course: 'Verbal', date: '10 Sep 2026', status: 'Published' },
  { title: 'Logic Game 1', type: 'Game', course: 'Reasoning', date: '08 Sep 2026', status: 'Draft' },
  { title: 'DBMS - Lecture 1', type: 'Video', course: 'Technical', date: '05 Sep 2028', status: 'Published' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStyle = () => {
    switch(status.toLowerCase()) {
      case 'active':
      case 'published':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'inactive':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'on leave':
      case 'draft':
        return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ring-1 ring-inset tracking-wider ${getStyle()}`}>
      {status}
    </span>
  );
};

export const AdminManagement = () => {
  return (
    <div className="space-y-8 pb-8">
      {/* Header & Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Management</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage the structure and configuration of your LMS.</p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 max-w-md shadow-sm relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute right-10 -top-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="bg-white/80 p-2.5 rounded-xl border border-white shadow-sm shrink-0 relative z-10">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div className="relative z-10">
            <h3 className="font-semibold text-slate-900 text-sm">Keep your LMS organized</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add, update and manage institutions, trainers, courses and system settings from here.</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Institution</h4>
              <p className="text-xs text-slate-500 truncate">Create a new partner institution</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </div>

          <div className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Trainer</h4>
              <p className="text-xs text-slate-500 truncate">Create a new trainer account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-green-500 transition-colors shrink-0" />
          </div>

          <div className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Course</h4>
              <p className="text-xs text-slate-500 truncate">Create a new course or topic</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-500 transition-colors shrink-0" />
          </div>

          <div className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Upload Material</h4>
              <p className="text-xs text-slate-500 truncate">Add learning resources</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Institutions Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Institutions</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage partner institutions and their details.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Institution
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Students</th>
                      <th className="px-5 py-3">Courses</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                   {institutions.map((inst, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-5 py-3 font-semibold text-slate-800">{inst.name}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.location}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.students}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.courses}</td>
                         <td className="px-5 py-3"><StatusBadge status={inst.status} /></td>
                         <td className="px-5 py-3 text-center">
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                               <MoreHorizontal className="h-4 w-4 inline-block" />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* Trainers Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Trainers</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage trainers and their assignments.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Trainer
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Institution</th>
                      <th className="px-5 py-3">Courses</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                   {trainers.map((trainer, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-5 py-3 font-semibold text-slate-800">{trainer.name}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.email}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.institution}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.courses}</td>
                         <td className="px-5 py-3"><StatusBadge status={trainer.status} /></td>
                         <td className="px-5 py-3 text-center">
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                               <MoreHorizontal className="h-4 w-4 inline-block" />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* Courses & Topics Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-purple-50 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-purple-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Courses & Topics</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage courses, sub-topics and learning structure.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Course
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Course</th>
                      <th className="px-5 py-3">Topics</th>
                      <th className="px-5 py-3">Materials</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                   {coursesData.map((course, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-5 py-3 font-semibold text-slate-800">{course.course}</td>
                         <td className="px-5 py-3 text-slate-500">{course.topics}</td>
                         <td className="px-5 py-3 text-slate-500">{course.materials}</td>
                         <td className="px-5 py-3"><StatusBadge status={course.status} /></td>
                         <td className="px-5 py-3 text-center">
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                               <MoreHorizontal className="h-4 w-4 inline-block" />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* Learning Materials Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-green-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-green-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Learning Materials</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage study materials, videos, games and resources.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Upload Material
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Course</th>
                      <th className="px-5 py-3">Uploaded On</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                   {materialsData.map((mat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-5 py-3 font-semibold text-slate-800">{mat.title}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.type}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.course}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.date}</td>
                         <td className="px-5 py-3"><StatusBadge status={mat.status} /></td>
                         <td className="px-5 py-3 text-center">
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                               <MoreHorizontal className="h-4 w-4 inline-block" />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>
      </div>

      {/* System Settings Section */}
      <Card className="border border-slate-200 bg-slate-50/50 mt-8 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
           <div className="flex flex-row items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-600" />
              <div>
                 <CardTitle className="text-sm font-bold text-slate-900">System Settings</CardTitle>
                 <p className="text-[11px] text-slate-500 mt-0.5">Configure platform preferences, roles and access controls.</p>
              </div>
           </div>
           <button className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200 flex items-center gap-1 bg-white">
              Manage Settings <ChevronRight className="h-3.5 w-3.5" />
           </button>
        </CardHeader>
        <CardContent className="pt-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Settings className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900">General Settings</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Platform name, timezone, preferences</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900">User Roles & Permissions</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Manage access levels</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900">Test Configuration</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Global test settings</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Bell className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Email and in-app notifications</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};
