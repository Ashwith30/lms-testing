import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, BookOpen, FileText, ChevronRight, 
  Plus, MoreHorizontal, Settings2, ShieldCheck, Sliders, Bell, Settings,
  ArrowRight, Check, Eye, Trash2, Download, Search, Edit3, Send, Radio, Megaphone, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  AddInstitutionModal,
  InstitutionDetailsModal,
  AddTrainerModal,
  AddCourseModal,
  UploadMaterialModal,
  MaterialPreviewModal,
  SystemSettingsModal,
  SendBatchNotificationModal,
  BaseModal
} from '../../components/common/DashboardModals';
import { useToast } from '../../context/ToastContext';
import { notificationService } from '../../services/notificationService';
import { NotificationItem } from '../../types';

interface InstitutionItem {
  name: string;
  location: string;
  students: number;
  courses: number;
  status: string;
}

interface TrainerItem {
  name: string;
  email: string;
  institution: string;
  courses: number;
  status: string;
}

interface CourseItem {
  course: string;
  topics: number;
  materials: number;
  status: string;
}

interface MaterialItem {
  title: string;
  type: string;
  course: string;
  date: string;
  status: string;
}

const initialInstitutions: InstitutionItem[] = [
  { name: 'ABC Engineering', location: 'Hyderabad', students: 820, courses: 4, status: 'Active' },
  { name: 'XYZ Institute', location: 'Bangalore', students: 540, courses: 4, status: 'Active' },
  { name: 'PQR College', location: 'Chennai', students: 312, courses: 3, status: 'Inactive' },
];

const initialTrainers: TrainerItem[] = [
  { name: 'Rahul Kumar', email: 'rahul@lms.com', institution: 'ABC Engineering', courses: 2, status: 'Active' },
  { name: 'Priya Sharma', email: 'priya@lms.com', institution: 'XYZ Institute', courses: 3, status: 'Active' },
  { name: 'Kiran Mehta', email: 'kiran@lms.com', institution: 'PQR College', courses: 2, status: 'On Leave' },
];

const initialCourses: CourseItem[] = [
  { course: 'Aptitude', topics: 8, materials: 42, status: 'Active' },
  { course: 'Verbal', topics: 6, materials: 28, status: 'Active' },
  { course: 'Reasoning', topics: 7, materials: 30, status: 'Active' },
  { course: 'Technical', topics: 12, materials: 56, status: 'Active' },
];

const initialMaterials: MaterialItem[] = [
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
  const { toast } = useToast();

  // Lists state
  const [institutions, setInstitutions] = useState<InstitutionItem[]>(initialInstitutions);
  const [trainers, setTrainers] = useState<TrainerItem[]>(initialTrainers);
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [materials, setMaterials] = useState<MaterialItem[]>(initialMaterials);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Active Dropdown Action Menus
  const [activeInstMenuIndex, setActiveInstMenuIndex] = useState<number | null>(null);
  const [activeTrainerMenuIndex, setActiveTrainerMenuIndex] = useState<number | null>(null);
  const [activeCourseMenuIndex, setActiveCourseMenuIndex] = useState<number | null>(null);
  const [activeMatMenuIndex, setActiveMatMenuIndex] = useState<number | null>(null);
  const [activeNotifMenuIndex, setActiveNotifMenuIndex] = useState<number | null>(null);

  // Modals state
  const [isAddInstOpen, setIsAddInstOpen] = useState(false);
  const [selectedInstForDetails, setSelectedInstForDetails] = useState<InstitutionItem | null>(null);
  const [isInstDirectoryOpen, setIsInstDirectoryOpen] = useState(false);

  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [selectedTrainerForDetails, setSelectedTrainerForDetails] = useState<TrainerItem | null>(null);
  const [isTrainersDirectoryOpen, setIsTrainersDirectoryOpen] = useState(false);

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<CourseItem | null>(null);
  const [isCoursesDirectoryOpen, setIsCoursesDirectoryOpen] = useState(false);

  const [isUploadMatOpen, setIsUploadMatOpen] = useState(false);
  const [selectedMatForPreview, setSelectedMatForPreview] = useState<MaterialItem | null>(null);
  const [isMaterialsDirectoryOpen, setIsMaterialsDirectoryOpen] = useState(false);

  const [isBatchNotifOpen, setIsBatchNotifOpen] = useState(false);
  const [selectedNotifForDetails, setSelectedNotifForDetails] = useState<NotificationItem | null>(null);
  const [isNotifDirectoryOpen, setIsNotifDirectoryOpen] = useState(false);

  const [settingsModalTab, setSettingsModalTab] = useState<'general' | 'roles' | 'tests' | 'notifications' | null>(null);

  // Load backend notifications on mount
  useEffect(() => {
    notificationService.getNotifications()
      .then(data => setNotifications(data))
      .catch(err => console.error('Failed to load notifications:', err));
  }, []);

  // Close menus on click outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveInstMenuIndex(null);
      setActiveTrainerMenuIndex(null);
      setActiveCourseMenuIndex(null);
      setActiveMatMenuIndex(null);
      setActiveNotifMenuIndex(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-8 pb-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Management</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage the structure and configuration of your LMS.</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div 
            onClick={() => setIsAddInstOpen(true)}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Institution</h4>
              <p className="text-xs text-slate-500 truncate">Create a new partner institution</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </div>

          <div 
            onClick={() => setIsAddTrainerOpen(true)}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Trainer</h4>
              <p className="text-xs text-slate-500 truncate">Create a new trainer account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-green-500 transition-colors shrink-0" />
          </div>

          <div 
            onClick={() => setIsAddCourseOpen(true)}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
              <BookOpen className="h-5 w-5 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Add Course</h4>
              <p className="text-xs text-slate-500 truncate">Create a new course or topic</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 transition-colors shrink-0" />
          </div>

          <div 
            onClick={() => setIsUploadMatOpen(true)}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Upload Material</h4>
              <p className="text-xs text-slate-500 truncate">Add learning resources</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
          </div>

          <div 
            onClick={() => setIsBatchNotifOpen(true)}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Broadcast to Batch</h4>
              <p className="text-xs text-slate-500 truncate">Send cohort notification</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Institutions Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-visible">
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
               <button 
                  onClick={() => setIsInstDirectoryOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 cursor-pointer"
               >
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button 
                  onClick={() => setIsAddInstOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
               >
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
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedInstForDetails(inst)}
                      >
                         <td className="px-5 py-3 font-semibold text-slate-800">{inst.name}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.location}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.students}</td>
                         <td className="px-5 py-3 text-slate-500">{inst.courses}</td>
                         <td className="px-5 py-3"><StatusBadge status={inst.status} /></td>
                         <td className="px-5 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setActiveInstMenuIndex(activeInstMenuIndex === idx ? null : idx)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                               <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeInstMenuIndex === idx && (
                              <div className="absolute right-6 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in text-xs">
                                <button
                                  onClick={() => {
                                    setSelectedInstForDetails(inst);
                                    setActiveInstMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setInstitutions(prev => prev.map((item, i) => i === idx ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item));
                                    toast(`Status for ${inst.name} switched to ${inst.status === 'Active' ? 'Inactive' : 'Active'}`, 'info');
                                    setActiveInstMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Check className="h-3.5 w-3.5" /> Toggle Active State
                                </button>
                                <button
                                  onClick={() => {
                                    toast(`Report generated for ${inst.name}`, 'success');
                                    setActiveInstMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Download className="h-3.5 w-3.5" /> Export College Stats
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setInstitutions(prev => prev.filter((_, i) => i !== idx));
                                    toast(`Institution ${inst.name} removed`, 'info');
                                    setActiveInstMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove Institution
                                </button>
                              </div>
                            )}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* 2. Trainers Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-visible">
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
               <button 
                  onClick={() => setIsTrainersDirectoryOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 cursor-pointer"
               >
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button 
                  onClick={() => setIsAddTrainerOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
               >
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
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedTrainerForDetails(trainer)}
                      >
                         <td className="px-5 py-3 font-semibold text-slate-800">{trainer.name}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.email}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.institution}</td>
                         <td className="px-5 py-3 text-slate-500">{trainer.courses}</td>
                         <td className="px-5 py-3"><StatusBadge status={trainer.status} /></td>
                         <td className="px-5 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setActiveTrainerMenuIndex(activeTrainerMenuIndex === idx ? null : idx)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                               <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeTrainerMenuIndex === idx && (
                              <div className="absolute right-6 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in text-xs">
                                <button
                                  onClick={() => {
                                    setSelectedTrainerForDetails(trainer);
                                    setActiveTrainerMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Profile
                                </button>
                                <button
                                  onClick={() => {
                                    setTrainers(prev => prev.map((item, i) => i === idx ? { ...item, status: item.status === 'Active' ? 'On Leave' : 'Active' } : item));
                                    toast(`Status for ${trainer.name} updated`, 'info');
                                    setActiveTrainerMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Check className="h-3.5 w-3.5" /> Toggle Leave / Active
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setTrainers(prev => prev.filter((_, i) => i !== idx));
                                    toast(`Trainer ${trainer.name} account deleted`, 'info');
                                    setActiveTrainerMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove Trainer
                                </button>
                              </div>
                            )}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* 3. Courses & Topics Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-visible">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-sky-50 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-sky-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Courses & Topics</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage courses, sub-topics and learning structure.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button 
                  onClick={() => setIsCoursesDirectoryOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 cursor-pointer"
               >
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button 
                  onClick={() => setIsAddCourseOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
               >
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
                   {courses.map((course, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedCourseForDetails(course)}
                      >
                         <td className="px-5 py-3 font-semibold text-slate-800">{course.course}</td>
                         <td className="px-5 py-3 text-slate-500">{course.topics} Topics</td>
                         <td className="px-5 py-3 text-slate-500">{course.materials} Files</td>
                         <td className="px-5 py-3"><StatusBadge status={course.status} /></td>
                         <td className="px-5 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setActiveCourseMenuIndex(activeCourseMenuIndex === idx ? null : idx)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                               <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeCourseMenuIndex === idx && (
                              <div className="absolute right-6 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in text-xs">
                                <button
                                  onClick={() => {
                                    setSelectedCourseForDetails(course);
                                    setActiveCourseMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Curriculum
                                </button>
                                <button
                                  onClick={() => {
                                    toast(`Added new topic to ${course.course}`, 'success');
                                    setActiveCourseMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add Sub-Topic
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setCourses(prev => prev.filter((_, i) => i !== idx));
                                    toast(`Course ${course.course} archived`, 'info');
                                    setActiveCourseMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Archive Course
                                </button>
                              </div>
                            )}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>

        {/* 4. Learning Materials Table */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-visible">
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
               <button 
                  onClick={() => setIsMaterialsDirectoryOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 cursor-pointer"
               >
                  View All <ArrowRight className="h-3 w-3" />
               </button>
               <button 
                  onClick={() => setIsUploadMatOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
               >
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
                   {materials.map((mat, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedMatForPreview(mat)}
                      >
                         <td className="px-5 py-3 font-semibold text-slate-800">{mat.title}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.type}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.course}</td>
                         <td className="px-5 py-3 text-slate-500">{mat.date}</td>
                         <td className="px-5 py-3"><StatusBadge status={mat.status} /></td>
                         <td className="px-5 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setActiveMatMenuIndex(activeMatMenuIndex === idx ? null : idx)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                               <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMatMenuIndex === idx && (
                              <div className="absolute right-6 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in text-xs">
                                <button
                                  onClick={() => {
                                    setSelectedMatForPreview(mat);
                                    setActiveMatMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview Resource
                                </button>
                                <button
                                  onClick={() => {
                                    toast(`Downloaded ${mat.title}`, 'success');
                                    setActiveMatMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download File
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setMaterials(prev => prev.filter((_, i) => i !== idx));
                                    toast(`Material "${mat.title}" removed`, 'info');
                                    setActiveMatMenuIndex(null);
                                  }}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete File
                                </button>
                              </div>
                            )}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>
        {/* 5. Batch Notifications & Broadcasts Card */}
        <Card className="border border-slate-200 shadow-sm flex flex-col h-full overflow-visible col-span-1 lg:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
               <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-blue-600" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Batch Notifications & Announcements</CardTitle>
                  <p className="text-[11px] text-slate-500">Manage cohort broadcasts, exam alerts, and placement reminders dispatched to students.</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button 
                  onClick={() => setIsNotifDirectoryOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 cursor-pointer"
               >
                  View All ({notifications.length}) <ArrowRight className="h-3 w-3" />
               </button>
               <button 
                  onClick={() => setIsBatchNotifOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
               >
                  <Plus className="h-3.5 w-3.5" />
                  Send Batch Notification
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
             {notifications.length === 0 ? (
               <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                 <Bell className="h-8 w-8 text-slate-300" />
                 <p className="text-xs font-semibold text-slate-700">No batch broadcasts dispatched yet</p>
                 <p className="text-[11px] text-slate-400 max-w-sm">Broadcast custom notifications to any student batch to notify them about tests, schedules or updates.</p>
                 <button
                   onClick={() => setIsBatchNotifOpen(true)}
                   className="mt-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer transition-colors"
                 >
                   + Send First Batch Notification
                 </button>
               </div>
             ) : (
               <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Announcement Title</th>
                        <th className="px-5 py-3">Target Batch</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Priority</th>
                        <th className="px-5 py-3">Dispatched</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                     {notifications.slice(0, 5).map((notif, idx) => (
                        <tr 
                          key={notif.id || idx} 
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          onClick={() => setSelectedNotifForDetails(notif)}
                        >
                           <td className="px-5 py-3">
                             <div className="font-semibold text-slate-800 line-clamp-1">{notif.title}</div>
                             <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{notif.message || notif.description}</div>
                           </td>
                           <td className="px-5 py-3 whitespace-nowrap">
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                               {notif.targetBatch === 'all' ? 'All Batches' : notif.targetBatch || 'All Batches'}
                             </span>
                           </td>
                           <td className="px-5 py-3 whitespace-nowrap">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                               notif.type === 'alert' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                               notif.type === 'success' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
                               notif.type === 'announcement' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                             }`}>
                               {notif.type}
                             </span>
                           </td>
                           <td className="px-5 py-3 whitespace-nowrap">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                               notif.priority === 'urgent' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                               notif.priority === 'high' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                             }`}>
                               {notif.priority || 'normal'}
                             </span>
                           </td>
                           <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{notif.time || 'Recent'}</td>
                           <td className="px-5 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => setActiveNotifMenuIndex(activeNotifMenuIndex === idx ? null : idx)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                 <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeNotifMenuIndex === idx && (
                                <div className="absolute right-6 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left animate-in text-xs">
                                  <button
                                    onClick={() => {
                                      setSelectedNotifForDetails(notif);
                                      setActiveNotifMenuIndex(null);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View Details
                                  </button>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await notificationService.deleteNotification(notif.id);
                                        setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                        toast(`Notification "${notif.title}" revoked`, 'info');
                                      } catch {
                                        toast('Failed to delete notification', 'error');
                                      }
                                      setActiveNotifMenuIndex(null);
                                    }}
                                    className="w-full px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Revoke Broadcast
                                  </button>
                                </div>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             )}
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
           <button 
              onClick={() => setSettingsModalTab('general')}
              className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1 bg-white cursor-pointer transition-colors"
           >
              Manage Settings <ChevronRight className="h-3.5 w-3.5" />
           </button>
        </CardHeader>
        <CardContent className="pt-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setSettingsModalTab('general')}
                className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
              >
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Settings className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">General Settings</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Platform name, timezone, preferences</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div 
                onClick={() => setSettingsModalTab('roles')}
                className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
              >
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">User Roles & Permissions</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Manage access levels</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div 
                onClick={() => setSettingsModalTab('tests')}
                className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
              >
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Test Configuration</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Global test settings</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>

              <div 
                onClick={() => setSettingsModalTab('notifications')}
                className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
              >
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                       <Bell className="h-5 w-5" />
                    </div>
                    <div>
                       <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Notifications</h4>
                       <p className="text-[11px] text-slate-500 mt-0.5">Email and in-app notifications</p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
              </div>
           </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* MANAGEMENT MODALS                                            */}
      {/* ============================================================ */}

      {/* 1. Add Institution Modal */}
      <AddInstitutionModal
        isOpen={isAddInstOpen}
        onClose={() => setIsAddInstOpen(false)}
        onAdd={(newInst) => setInstitutions(prev => [newInst, ...prev])}
      />

      {/* 2. Institution Details Modal */}
      <InstitutionDetailsModal
        isOpen={selectedInstForDetails !== null}
        onClose={() => setSelectedInstForDetails(null)}
        institution={selectedInstForDetails}
        onToggleStatus={() => {
          if (selectedInstForDetails) {
            setInstitutions(prev => prev.map(item => item.name === selectedInstForDetails.name ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item));
            setSelectedInstForDetails(prev => prev ? { ...prev, status: prev.status === 'Active' ? 'Inactive' : 'Active' } : null);
          }
        }}
        onDelete={() => {
          if (selectedInstForDetails) {
            setInstitutions(prev => prev.filter(item => item.name !== selectedInstForDetails.name));
            setSelectedInstForDetails(null);
          }
        }}
      />

      {/* 3. Full Institutions Directory Modal */}
      <BaseModal
        isOpen={isInstDirectoryOpen}
        onClose={() => setIsInstDirectoryOpen(false)}
        title="Partner Institutions Directory"
        subtitle="Complete roster of affiliated campuses, student capacities and program assignments"
        icon={<Building2 className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">{institutions.length} Colleges Enrolled</span>
            <button
              onClick={() => {
                setIsInstDirectoryOpen(false);
                setIsAddInstOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add College
            </button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            {institutions.map((inst, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setIsInstDirectoryOpen(false);
                  setSelectedInstForDetails(inst);
                }}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{inst.name}</h4>
                  <p className="text-xs text-slate-500">{inst.location} • {inst.students} Students • {inst.courses} Tracks</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={inst.status} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BaseModal>

      {/* 4. Add Trainer Modal */}
      <AddTrainerModal
        isOpen={isAddTrainerOpen}
        onClose={() => setIsAddTrainerOpen(false)}
        onAdd={(newTrainer) => setTrainers(prev => [newTrainer, ...prev])}
      />

      {/* 5. Trainer Details Modal */}
      {selectedTrainerForDetails && (
        <BaseModal
          isOpen={selectedTrainerForDetails !== null}
          onClose={() => setSelectedTrainerForDetails(null)}
          title={`Trainer Profile: ${selectedTrainerForDetails.name}`}
          subtitle={`Instructor at ${selectedTrainerForDetails.institution}`}
          icon={<Users className="h-5 w-5" />}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center">
                {selectedTrainerForDetails.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedTrainerForDetails.name}</h4>
                <p className="text-xs text-slate-500">{selectedTrainerForDetails.email}</p>
                <div className="mt-1">
                  <StatusBadge status={selectedTrainerForDetails.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Courses</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">{selectedTrainerForDetails.courses} Tracks</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Sessions</span>
                <span className="text-base font-bold text-emerald-600 block mt-0.5">18 Completed</span>
              </div>
            </div>

            <button
              onClick={() => {
                toast(`Email notification dispatched to ${selectedTrainerForDetails.email}`, 'info');
                setSelectedTrainerForDetails(null);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer"
            >
              Send Direct Message
            </button>
          </div>
        </BaseModal>
      )}

      {/* 6. Full Trainers Directory Modal */}
      <BaseModal
        isOpen={isTrainersDirectoryOpen}
        onClose={() => setIsTrainersDirectoryOpen(false)}
        title="Faculty & Trainers Directory"
        subtitle="Complete list of all active instructors and their course workloads"
        icon={<Users className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">{trainers.length} Trainers Active</span>
            <button
              onClick={() => {
                setIsTrainersDirectoryOpen(false);
                setIsAddTrainerOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Trainer
            </button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            {trainers.map((tr, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setIsTrainersDirectoryOpen(false);
                  setSelectedTrainerForDetails(tr);
                }}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{tr.name}</h4>
                  <p className="text-xs text-slate-500">{tr.email} • {tr.institution} ({tr.courses} Courses)</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={tr.status} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BaseModal>

      {/* 7. Add Course Modal */}
      <AddCourseModal
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        onAdd={(newCourse) => setCourses(prev => [newCourse, ...prev])}
      />

      {/* 8. Course Details Modal */}
      {selectedCourseForDetails && (
        <BaseModal
          isOpen={selectedCourseForDetails !== null}
          onClose={() => setSelectedCourseForDetails(null)}
          title={`Course Curriculum: ${selectedCourseForDetails.course}`}
          subtitle={`${selectedCourseForDetails.topics} Module Topics • ${selectedCourseForDetails.materials} Study Materials`}
          icon={<BookOpen className="h-5 w-5" />}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Module 1: Fundamental Principles</span>
                <span className="text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Module 2: Advanced Practice Drills</span>
                <span className="text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Module 3: Benchmark Test Series</span>
                <span className="text-blue-600">Scheduled</span>
              </div>
            </div>
            <button
              onClick={() => {
                toast(`Curriculum syllabus for ${selectedCourseForDetails.course} downloaded.`, 'success');
                setSelectedCourseForDetails(null);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer"
            >
              Export Syllabus
            </button>
          </div>
        </BaseModal>
      )}

      {/* 9. Full Courses Directory Modal */}
      <BaseModal
        isOpen={isCoursesDirectoryOpen}
        onClose={() => setIsCoursesDirectoryOpen(false)}
        title="Curriculum & Courses Directory"
        subtitle="Syllabus catalogue and learning track hierarchy"
        icon={<BookOpen className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            {courses.map((c, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setIsCoursesDirectoryOpen(false);
                  setSelectedCourseForDetails(c);
                }}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.course}</h4>
                  <p className="text-xs text-slate-500">{c.topics} Topics • {c.materials} Published Materials</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      </BaseModal>

      {/* 10. Upload Material Modal */}
      <UploadMaterialModal
        isOpen={isUploadMatOpen}
        onClose={() => setIsUploadMatOpen(false)}
        onAdd={(newMat) => setMaterials(prev => [newMat, ...prev])}
      />

      {/* 11. Material Preview Modal */}
      <MaterialPreviewModal
        isOpen={selectedMatForPreview !== null}
        onClose={() => setSelectedMatForPreview(null)}
        material={selectedMatForPreview}
      />

      {/* 12. Full Materials Directory Modal */}
      <BaseModal
        isOpen={isMaterialsDirectoryOpen}
        onClose={() => setIsMaterialsDirectoryOpen(false)}
        title="Learning Resources Repository"
        subtitle="All documents, lecture videos, interactive quizzes, and coding exercises"
        icon={<FileText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            {materials.map((m, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setIsMaterialsDirectoryOpen(false);
                  setSelectedMatForPreview(m);
                }}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                  <p className="text-xs text-slate-500">{m.type} • Course: {m.course} • {m.date}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </div>
      </BaseModal>

      {/* 13. System Settings Multi-Tab Modal */}
      <SystemSettingsModal
        isOpen={settingsModalTab !== null}
        onClose={() => setSettingsModalTab(null)}
        initialTab={settingsModalTab || 'general'}
      />

      {/* 14. Send Batch Notification Modal */}
      <SendBatchNotificationModal
        isOpen={isBatchNotifOpen}
        onClose={() => setIsBatchNotifOpen(false)}
        onSuccess={(newNotif) => {
          setNotifications(prev => [newNotif, ...prev]);
        }}
      />

      {/* 15. Notification Details Modal */}
      {selectedNotifForDetails && (
        <BaseModal
          isOpen={selectedNotifForDetails !== null}
          onClose={() => setSelectedNotifForDetails(null)}
          title={`Announcement: ${selectedNotifForDetails.title}`}
          subtitle={`Dispatched to ${selectedNotifForDetails.targetBatch === 'all' ? 'All Batches' : selectedNotifForDetails.targetBatch || 'All Batches'}`}
          icon={<Bell className="h-5 w-5 text-blue-600" />}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Target: {selectedNotifForDetails.targetBatch === 'all' ? 'All Batches' : selectedNotifForDetails.targetBatch}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedNotifForDetails.time || 'Recent'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{selectedNotifForDetails.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedNotifForDetails.message || selectedNotifForDetails.description}
              </p>
              {selectedNotifForDetails.link && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                  Redirect Link: {selectedNotifForDetails.link}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Category</span>
                <span className="font-bold text-slate-800 capitalize mt-0.5 block">{selectedNotifForDetails.type}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Priority</span>
                <span className="font-bold text-slate-800 uppercase mt-0.5 block">{selectedNotifForDetails.priority || 'Normal'}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                if (selectedNotifForDetails) {
                  try {
                    await notificationService.deleteNotification(selectedNotifForDetails.id);
                    setNotifications(prev => prev.filter(n => n.id !== selectedNotifForDetails.id));
                    toast(`Notification revoked`, 'info');
                    setSelectedNotifForDetails(null);
                  } catch {
                    toast('Failed to revoke notification', 'error');
                  }
                }
              }}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs cursor-pointer transition-colors"
            >
              Revoke Notification
            </button>
          </div>
        </BaseModal>
      )}

      {/* 16. Full Notifications Directory Modal */}
      <BaseModal
        isOpen={isNotifDirectoryOpen}
        onClose={() => setIsNotifDirectoryOpen(false)}
        title="Batch Broadcasts & Announcement Log"
        subtitle="Complete log of all batch communications, notifications and platform announcements"
        icon={<Bell className="h-5 w-5 text-blue-600" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">{notifications.length} Broadcasts Dispatched</span>
            <button
              onClick={() => {
                setIsNotifDirectoryOpen(false);
                setIsBatchNotifOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Broadcast New
            </button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            {notifications.map((notif, idx) => (
              <div 
                key={notif.id || idx}
                onClick={() => {
                  setIsNotifDirectoryOpen(false);
                  setSelectedNotifForDetails(notif);
                }}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{notif.title}</h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      {notif.targetBatch === 'all' ? 'All Batches' : notif.targetBatch}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notif.message || notif.description}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">{notif.time || 'Recent'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                    notif.type === 'alert' ? 'bg-amber-50 text-amber-700' :
                    notif.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {notif.type}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
