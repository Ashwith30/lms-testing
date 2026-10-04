import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, Clock, User, Building2, BookOpen, FileText, CheckCircle2, 
  ExternalLink, Download, Play, BarChart3, TrendingUp, Award, Users, 
  Sparkles, Layers, ShieldCheck, Sliders, Bell, Settings, Plus, Search,
  Filter, Check, AlertCircle, Eye, Trash2, Edit3, ChevronRight, Video,
  HelpCircle, Star, Phone, Mail, MapPin, Share2, ChevronDown, Hash,
  ArrowRight, Shield, Globe, Send, MessageSquare
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { notificationService } from '../../services/notificationService';

// -------------------------------------------------------------
// Base Modal Wrapper - High Polish Glassmorphism, Portal & Scroll Lock
// -------------------------------------------------------------
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-lg'
}) => {
  React.useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const mainEl = document.querySelector('main');
      const originalMainOverflow = mainEl ? mainEl.style.overflow : '';

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        if (mainEl) mainEl.style.overflow = originalMainOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade overflow-y-auto select-none"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', margin: 0 }}
    >
      <div 
        className={`relative w-full ${maxWidth} bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/40 border border-slate-100/80 overflow-hidden flex flex-col animate-in my-auto select-text max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-blue-600 shrink-0"></div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(100dvh-9rem)] sm:max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// -------------------------------------------------------------
// 1. Add Trainer Modal (Redesigned)
// -------------------------------------------------------------
interface AddTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (trainer: { name: string; email: string; institution: string; courses: number; status: string }) => void;
}

export const AddTrainerModal: React.FC<AddTrainerModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('ABC Engineering');
  const [courses, setCourses] = useState('2');
  const [department, setDepartment] = useState('Computer Science');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast('Please enter both name and email', 'error');
      return;
    }
    onAdd({
      name: name.trim(),
      email: email.trim(),
      institution,
      courses: parseInt(courses) || 2,
      status: 'Active'
    });
    toast(`Trainer "${name}" registered successfully!`, 'success');
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Trainer"
      subtitle="Register an instructor account with course teaching privileges"
      icon={<User className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <User className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Prof. Arvind Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              required
              placeholder="arvind@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Institution & Department */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institution</label>
            <div className="relative flex items-center">
              <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
              >
                <option value="ABC Engineering">ABC Engineering</option>
                <option value="XYZ Institute">XYZ Institute</option>
                <option value="PQR College">PQR College</option>
                <option value="Apex University">Apex University</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Courses Count</label>
            <div className="relative flex items-center">
              <BookOpen className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                min="1"
                max="10"
                value={courses}
                onChange={(e) => setCourses(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Department Info */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Academic Department</label>
          <div className="relative flex items-center">
            <Layers className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
            >
              <option value="Computer Science">Computer Science & IT</option>
              <option value="Aptitude & Reasoning">Quantitative & Logic Faculty</option>
              <option value="Verbal & Soft Skills">Verbal & Communication</option>
              <option value="Electronics">ECE & Technical Core</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Trainer Account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 2. Add Institution Modal (Redesigned)
// -------------------------------------------------------------
interface AddInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (inst: { name: string; location: string; students: number; courses: number; status: string }) => void;
}

export const AddInstitutionModal: React.FC<AddInstitutionModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [students, setStudents] = useState('450');
  const [courses, setCourses] = useState('4');
  const [status, setStatus] = useState('Active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      toast('Please enter institution name and location', 'error');
      return;
    }
    onAdd({
      name: name.trim(),
      location: location.trim(),
      students: parseInt(students) || 0,
      courses: parseInt(courses) || 4,
      status
    });
    toast(`Institution "${name}" registered successfully!`, 'success');
    setName('');
    setLocation('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Partner Institution"
      subtitle="Register a new college campus or training center partner"
      icon={<Building2 className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Institution Name <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Stanford Academy of Technology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <MapPin className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="e.g. Bangalore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Status</label>
            <div className="relative flex items-center">
              <CheckCircle2 className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Student Capacity</label>
            <div className="relative flex items-center">
              <Users className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                value={students}
                onChange={(e) => setStudents(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assigned Tracks</label>
            <div className="relative flex items-center">
              <BookOpen className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                value={courses}
                onChange={(e) => setCourses(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Save Institution
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 3. Add Student Modal (Redesigned)
// -------------------------------------------------------------
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [batch, setBatch] = useState('Batch 2026');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) {
      toast('Please enter student name and roll number', 'error');
      return;
    }
    toast(`Student ${name} (${rollNo}) enrolled in ${batch}`, 'success');
    setName('');
    setRollNo('');
    setEmail('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll New Student"
      subtitle="Add candidate to academic batch for assessment access"
      icon={<User className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Student Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <User className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Roll / Hall Ticket <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Hash className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="26CS108"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Batch</label>
            <div className="relative flex items-center">
              <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
              >
                <option value="Batch 2026">Batch 2026</option>
                <option value="Batch 2025">Batch 2025</option>
                <option value="Batch 2027">Batch 2027</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
          <div className="relative flex items-center">
            <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              placeholder="student@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register Student
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 4. Add Course Modal (Redesigned)
// -------------------------------------------------------------
interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (course: { course: string; topics: number; materials: number; status: string }) => void;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { toast } = useToast();
  const [courseName, setCourseName] = useState('');
  const [topics, setTopics] = useState('8');
  const [materials, setMaterials] = useState('24');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    onAdd({
      course: courseName.trim(),
      topics: parseInt(topics) || 8,
      materials: parseInt(materials) || 20,
      status: 'Active'
    });
    toast(`Course "${courseName}" created successfully!`, 'success');
    setCourseName('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Course Track"
      subtitle="Define curriculum syllabus and topic branches"
      icon={<BookOpen className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Course Title <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <BookOpen className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Advanced Data Structures"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topics Count</label>
            <div className="relative flex items-center">
              <Sliders className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Materials Initial</label>
            <div className="relative flex items-center">
              <FileText className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 5. Upload Material Modal (Redesigned)
// -------------------------------------------------------------
interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (mat: { title: string; type: string; course: string; date: string; status: string }) => void;
}

export const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('PDF');
  const [course, setCourse] = useState('Aptitude');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.endsWith(`.${type.toLowerCase()}`) ? title : `${title}.${type.toLowerCase()}`,
      type,
      course,
      date: 'Today',
      status: 'Published'
    });
    toast(`Resource "${title}" uploaded and published!`, 'success');
    setTitle('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Learning Resource"
      subtitle="Publish study materials, question sets, games, or videos"
      icon={<FileText className="h-5 w-5" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Resource Title <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <FileText className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Speed Math Formula Sheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Format Type</label>
            <div className="relative flex items-center">
              <Layers className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
              >
                <option value="PDF">PDF Document</option>
                <option value="Quiz">Interactive Quiz</option>
                <option value="Game">Brain Game</option>
                <option value="Video">Video Lecture</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Track</label>
            <div className="relative flex items-center">
              <BookOpen className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
              >
                <option value="Aptitude">Aptitude</option>
                <option value="Verbal">Verbal</option>
                <option value="Reasoning">Reasoning</option>
                <option value="Technical">Technical</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer group">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">Drag & drop files here, or browse local device</p>
          <p className="text-[11px] text-slate-400 mt-1">Supports PDF, MP4, JSON, PPTX up to 50MB</p>
        </div>

        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Upload & Publish
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 6. Schedule Details Modal (Session Drilldown)
// -------------------------------------------------------------
export interface ScheduleItem {
  time: string;
  name: string;
  trainer: string;
  institution: string;
  batch: string;
  color: string;
  room?: string;
  meetLink?: string;
  topics?: string[];
  attendeesCount?: number;
}

interface ScheduleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScheduleItem | null;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  isOpen,
  onClose,
  session
}) => {
  const { toast } = useToast();

  if (!session) return null;

  const handleJoinClass = () => {
    toast(`Launching virtual session for ${session.name}...`, 'info');
    window.open('https://meet.google.com', '_blank');
  };

  const handleDownloadMaterials = () => {
    toast(`Downloading curriculum guide & lecture notes for ${session.name}`, 'success');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${session.name} Session Details`}
      subtitle={`Scheduled for today at ${session.time}`}
      icon={<Calendar className="h-5 w-5" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Timing & Badge Pill */}
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/80 to-sky-50/80 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Clock className="h-4 w-4" />
            <span>{session.time} • 90 Mins</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Upcoming Live
          </span>
        </div>

        {/* Trainer & Institution Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor</p>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {session.trainer.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{session.trainer}</p>
                <p className="text-[10px] text-slate-500">Lead Faculty</p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cohort</p>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{session.institution}</p>
                <p className="text-[10px] text-slate-500">{session.batch} • 64 Enrolled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Agenda */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Key Session Topics</h4>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <span>Fundamental Concepts & Problem Solving Frameworks</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <span>Live Speed Drill & Real-time Practice Questions</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <span>Doubt Clearance & Previous Exam Analysis</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleJoinClass}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Video className="h-4 w-4" />
            Join Live Classroom
          </button>
          <button
            onClick={handleDownloadMaterials}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Lecture Notes
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 7. All Schedule Modal (Full Timetable)
// -------------------------------------------------------------
const allUpcomingSchedules: ScheduleItem[] = [
  { time: '10:00 AM', name: 'Aptitude Mastery', trainer: 'Rahul Kumar', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-blue-500' },
  { time: '11:45 AM', name: 'Data Structures & Algorithms', trainer: 'Dr. Anita Roy', institution: 'National Institute', batch: 'Batch 2025', color: 'bg-sky-600' },
  { time: '12:30 PM', name: 'Logical Reasoning', trainer: 'Priya Sharma', institution: 'XYZ Institute', batch: 'Batch 2026', color: 'bg-green-500' },
  { time: '02:00 PM', name: 'System Design Patterns', trainer: 'Alex Vance', institution: 'PQR College', batch: 'Batch 2025', color: 'bg-emerald-500' },
  { time: '03:00 PM', name: 'Technical (DBMS & SQL)', trainer: 'Kiran Mehta', institution: 'PQR College', batch: 'Batch 2026', color: 'bg-blue-600' },
  { time: '04:30 PM', name: 'Verbal Ability & Reading', trainer: 'Sneha Reddy', institution: 'ABC Engineering', batch: 'Batch 2026', color: 'bg-orange-500' },
  { time: '06:00 PM', name: 'Mock Placement Interview', trainer: 'Deepak Joshi', institution: 'Apex University', batch: 'Batch 2026', color: 'bg-rose-500' },
];

interface AllScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: ScheduleItem) => void;
}

export const AllScheduleModal: React.FC<AllScheduleModalProps> = ({
  isOpen,
  onClose,
  onSelectSession
}) => {
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = allUpcomingSchedules.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.institution.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upcoming Academic Schedule"
      subtitle="Complete timetable of live classes, webinars and assessments"
      icon={<Calendar className="h-5 w-5" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['today', 'tomorrow', 'week'] as const).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedDay === day ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {day === 'today' ? 'Today (Sep 17)' : day === 'tomorrow' ? 'Tomorrow' : 'This Week'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search subject, trainer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Schedule Cards List */}
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                onClose();
                onSelectSession(item);
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md transition-all cursor-pointer group bg-white"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 text-center shrink-0">
                  <span className="text-xs font-bold text-slate-900 block">{item.time}</span>
                  <span className="text-[10px] text-slate-400 font-medium">90 min</span>
                </div>

                <div className="h-8 w-1 rounded-full bg-slate-200 group-hover:bg-blue-500 transition-colors shrink-0"></div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Trainer: <span className="text-slate-700 font-medium">{item.trainer}</span> • {item.institution} ({item.batch})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline-flex text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Details
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 8. Course Details Modal (Subject Breakdown)
// -------------------------------------------------------------
const courseDetailsDatabase: Record<string, any> = {
  'Aptitude': {
    name: 'Aptitude & Quantitative Analysis',
    progress: 78,
    color: 'bg-blue-500',
    topScorer: 'Aarav Patel (98%)',
    avgScore: 78.4,
    weakTopic: 'Permutations & Combinations (62%)',
    modules: [
      { name: 'Time, Speed & Distance', score: 86 },
      { name: 'Data Interpretation & Graphs', score: 82 },
      { name: 'Percentages & Profit/Loss', score: 79 },
      { name: 'Permutations & Combinations', score: 62 },
      { name: 'Number Systems & Divisibility', score: 84 },
    ]
  },
  'Verbal': {
    name: 'Verbal Ability & Comprehension',
    progress: 72,
    color: 'bg-green-500',
    topScorer: 'Priya Sharma (96%)',
    avgScore: 72.1,
    weakTopic: 'Sentence Correction & Grammar (64%)',
    modules: [
      { name: 'Reading Comprehension', score: 76 },
      { name: 'Vocabulary & Analogies', score: 78 },
      { name: 'Sentence Correction & Syntax', score: 64 },
      { name: 'Para Jumbles & Cohesion', score: 70 },
    ]
  },
  'Reasoning': {
    name: 'Logical Reasoning & Deduction',
    progress: 69,
    color: 'bg-sky-500',
    topScorer: 'Vikram Singh (95%)',
    avgScore: 69.3,
    weakTopic: 'Blood Relations & Seating Arrangement (58%)',
    modules: [
      { name: 'Syllogisms & Logical Connectives', score: 75 },
      { name: 'Seating Arrangements & Puzzles', score: 58 },
      { name: 'Direction Sense & Coding-Decoding', score: 81 },
      { name: 'Data Sufficiency', score: 63 },
    ]
  },
  'Technical': {
    name: 'Technical & CS Core (DBMS, OS, OOP)',
    progress: 81,
    color: 'bg-orange-500',
    topScorer: 'David Chen (99%)',
    avgScore: 81.6,
    weakTopic: 'Concurrency & Deadlocks (71%)',
    modules: [
      { name: 'Database Management Systems & SQL', score: 88 },
      { name: 'Object-Oriented Programming (Java/C++)', score: 85 },
      { name: 'Data Structures & Algorithms', score: 82 },
      { name: 'Operating Systems & Concurrency', score: 71 },
    ]
  }
};

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string | null;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  isOpen,
  onClose,
  courseName
}) => {
  const { toast } = useToast();

  if (!courseName) return null;
  const course = courseDetailsDatabase[courseName] || {
    name: courseName,
    progress: 75,
    color: 'bg-blue-500',
    topScorer: 'Top Ranker (95%)',
    avgScore: 75,
    weakTopic: 'Advanced Modules (65%)',
    modules: [
      { name: 'Module 1: Foundations', score: 80 },
      { name: 'Module 2: Advanced Practice', score: 70 },
    ]
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={course.name}
      subtitle="Performance benchmark, module breakdown and learning recommendations"
      icon={<BarChart3 className="h-5 w-5" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Main Metric Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs text-slate-300 font-medium">Batch Average Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold">{course.progress}%</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +4.2% vs last month
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Top Scorer</span>
            <span className="text-sm font-bold text-blue-300">{course.topScorer}</span>
          </div>
        </div>

        {/* Modules Progression */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Module Level Performance</h4>
            <span className="text-xs text-slate-500">{course.modules?.length} Topics Assessed</span>
          </div>

          <div className="space-y-2">
            {course.modules?.map((mod: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800 mb-1.5">
                  <span className="truncate max-w-[280px]">{mod.name}</span>
                  <span className={mod.score >= 75 ? 'text-emerald-600' : mod.score >= 65 ? 'text-amber-600' : 'text-red-600'}>
                    {mod.score}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      mod.score >= 75 ? 'bg-emerald-500' : mod.score >= 65 ? 'bg-amber-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${mod.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Recommendation */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <p className="font-bold">Recommended Faculty Focus:</p>
            <p className="mt-0.5">Students need additional drill sessions in <span className="font-semibold">{course.weakTopic}</span>.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={() => toast(`Curriculum analytics report for ${course.name} exported.`, 'success')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Subject Report
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 9. All Courses Performance Modal (Comparative Breakdown)
// -------------------------------------------------------------
interface AllCoursesPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (course: string) => void;
}

export const AllCoursesPerformanceModal: React.FC<AllCoursesPerformanceModalProps> = ({
  isOpen,
  onClose,
  onSelectCourse
}) => {
  const courses = [
    { name: 'Technical', progress: 81, tests: 24, topDept: 'CSE & IT', color: 'bg-orange-500' },
    { name: 'Aptitude', progress: 78, tests: 32, topDept: 'ECE', color: 'bg-blue-500' },
    { name: 'Verbal', progress: 72, tests: 18, topDept: 'EEE', color: 'bg-green-500' },
    { name: 'Reasoning', progress: 69, tests: 22, topDept: 'Mechanical', color: 'bg-sky-500' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Course Performance Analytics"
      subtitle="Holistic benchmark and batch comparisons across all 4 learning tracks"
      icon={<Award className="h-5 w-5" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Overall LMS Mean</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">75.0%</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[11px] text-emerald-600 font-medium block">Highest Track</span>
            <span className="text-xl font-bold text-emerald-800 mt-0.5 block">Technical (81%)</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="text-[11px] text-blue-600 font-medium block">Active Assessments</span>
            <span className="text-xl font-bold text-blue-800 mt-0.5 block">96 Tests</span>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Detailed Subject Matrix</h4>
          {courses.map((c, idx) => (
            <div
              key={idx}
              onClick={() => {
                onClose();
                onSelectCourse(c.name);
              }}
              className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${c.color}`}></span>
                  <h5 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </h5>
                  <span className="text-xs text-slate-400 font-medium">({c.tests} assessments)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">{c.progress}%</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.progress}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Top Performing Dept: <span className="font-semibold text-slate-700">{c.topDept}</span></span>
                <span className="text-blue-600 font-semibold group-hover:underline">View Module Drilldown →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 10. KPI Insight Modal (Card Drilldown)
// -------------------------------------------------------------
interface KPIInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiType: 'students' | 'institutions' | 'trainers' | 'performance' | null;
}

export const KPIInsightModal: React.FC<KPIInsightModalProps> = ({
  isOpen,
  onClose,
  kpiType
}) => {
  if (!kpiType) return null;

  const contentMap = {
    students: {
      title: 'Total Enrolled Students (2,486)',
      subtitle: 'Student breakdown across participating colleges and batches',
      icon: <Users className="h-5 w-5" />,
      stats: [
        { label: 'Active This Week', value: '2,140' },
        { label: 'Test Attempts Today', value: '480' },
        { label: 'Batch 2026', value: '1,620' },
        { label: 'Batch 2025', value: '866' },
      ]
    },
    institutions: {
      title: 'Partner Institutions (8 Colleges)',
      subtitle: 'Colleges actively integrated with training programs',
      icon: <Building2 className="h-5 w-5" />,
      stats: [
        { label: 'ABC Engineering', value: '820 Students' },
        { label: 'XYZ Institute', value: '540 Students' },
        { label: 'PQR College', value: '312 Students' },
        { label: '5 Other Campuses', value: '814 Students' },
      ]
    },
    trainers: {
      title: 'Academic Faculty & Trainers (42)',
      subtitle: 'Trainers assigned across aptitude, verbal, and coding tracks',
      icon: <Users className="h-5 w-5" />,
      stats: [
        { label: 'Full-time Faculty', value: '28 Trainers' },
        { label: 'Visiting Experts', value: '14 Trainers' },
        { label: 'Active Sessions Today', value: '12 Live' },
        { label: 'Avg Trainer Rating', value: '4.8 / 5.0' },
      ]
    },
    performance: {
      title: 'Overall Average Performance (74.5%)',
      subtitle: 'System-wide accuracy and assessment pass metrics',
      icon: <TrendingUp className="h-5 w-5" />,
      stats: [
        { label: 'Passing Benchmark', value: '60.0%' },
        { label: 'Overall Pass Rate', value: '88.2%' },
        { label: 'Top 10% Decile', value: '91.4% Avg' },
        { label: 'Improvement Delta', value: '+5.6% YoY' },
      ]
    }
  };

  const item = contentMap[kpiType];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      subtitle={item.subtitle}
      icon={item.icon}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {item.stats.map((s, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] text-slate-500 font-medium block">{s.label}</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{s.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 11. Institution Details Modal (College Profile)
// -------------------------------------------------------------
interface InstitutionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: {
    name: string;
    location: string;
    students: number;
    courses: number;
    status: string;
  } | null;
  onToggleStatus?: () => void;
  onDelete?: () => void;
}

export const InstitutionDetailsModal: React.FC<InstitutionDetailsModalProps> = ({
  isOpen,
  onClose,
  institution,
  onToggleStatus,
  onDelete
}) => {
  const { toast } = useToast();

  if (!institution) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={institution.name}
      subtitle={`Partner College Overview in ${institution.location}`}
      icon={<Building2 className="h-5 w-5" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Status bar */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${institution.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-bold text-slate-800">Status: {institution.status}</span>
          </div>
          <button
            onClick={() => {
              if (onToggleStatus) onToggleStatus();
              toast(`Institution status changed to ${institution.status === 'Active' ? 'Inactive' : 'Active'}`, 'info');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Switch to {institution.status === 'Active' ? 'Inactive' : 'Active'}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Students</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">{institution.students}</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Tracks</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">{institution.courses}</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Avg Score</span>
            <span className="text-lg font-bold text-emerald-600 mt-0.5 block">76.8%</span>
          </div>
        </div>

        {/* Assigned Programs */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Cohorts & Batches</h4>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="font-semibold">B.Tech Batch 2026 (Final Year)</span>
              <span className="text-slate-500">420 Students</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">B.Tech Batch 2027 (Pre-Final Year)</span>
              <span className="text-slate-500">400 Students</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={() => toast(`Exporting cohort report for ${institution.name}...`, 'success')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export College Report
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to remove ${institution.name}?`)) {
                  onDelete();
                  onClose();
                  toast(`Institution ${institution.name} removed`, 'info');
                }
              }}
              className="py-2.5 px-3.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 12. Material Preview Modal (Simulated Reader / Quiz / Video)
// -------------------------------------------------------------
interface MaterialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: { title: string; type: string; course: string; date: string; status: string } | null;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  isOpen,
  onClose,
  material
}) => {
  const { toast } = useToast();
  if (!material) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={material.title}
      subtitle={`${material.type} • Track: ${material.course} • Published on ${material.date}`}
      icon={<Eye className="h-5 w-5" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Simulated Document Viewer */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white min-h-[260px] flex flex-col items-center justify-center text-center relative overflow-hidden border border-slate-800 shadow-lg">
          <div className="absolute inset-0 bg-radial from-blue-900/30 to-transparent pointer-events-none"></div>

          {material.type === 'PDF' && (
            <div className="space-y-3 z-10">
              <FileText className="h-12 w-12 text-blue-400 mx-auto animate-bounce" />
              <h4 className="text-base font-bold text-white">{material.title}</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Document preview loaded (12 Pages • High-resolution text & formulas for {material.course}).
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg">Page 1 of 12</span>
              </div>
            </div>
          )}

          {material.type === 'Video' && (
            <div className="space-y-3 z-10">
              <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
              <h4 className="text-base font-bold text-white">{material.title}</h4>
              <p className="text-xs text-slate-400">Duration: 42 mins • 1080p Full HD Video Lecture</p>
            </div>
          )}

          {(material.type === 'Quiz' || material.type === 'Game') && (
            <div className="space-y-3 z-10">
              <Sparkles className="h-12 w-12 text-amber-400 mx-auto" />
              <h4 className="text-base font-bold text-white">{material.title}</h4>
              <p className="text-xs text-slate-400">
                Interactive {material.type} with 15 adaptive challenges and instant scoring.
              </p>
              <button
                onClick={() => toast(`Launching interactive ${material.type} simulator...`, 'info')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Launch {material.type}
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Status: <span className="font-semibold text-emerald-600">{material.status}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toast(`Downloaded ${material.title}`, 'success')}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download File
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 13. System Settings Multi-Tab Modal
// -------------------------------------------------------------
interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'roles' | 'tests' | 'notifications';
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general'
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [negativeMarking, setNegativeMarking] = useState(true);

  const handleSave = () => {
    toast('System settings saved and applied platform-wide.', 'success');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="System Configuration & Settings"
      subtitle="Configure platform parameters, user permissions and global test rules"
      icon={<Settings className="h-5 w-5" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'general', label: 'General Settings', icon: Sliders },
            { id: 'roles', label: 'Roles & Access', icon: ShieldCheck },
            { id: 'tests', label: 'Test Rules', icon: BookOpen },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Platform Brand Name</label>
              <input
                type="text"
                defaultValue="Apex LMS - Placement & Skill Assessment"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/70 focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">System Timezone</label>
                <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white outline-none">
                  <option>Asia/Kolkata (IST - UTC+5:30)</option>
                  <option>UTC (Coordinated Universal Time)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Academic Year</label>
                <input
                  type="text"
                  defaultValue="2026 - 2027"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50/70 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Roles */}
        {activeTab === 'roles' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-500">Configure role privilege boundaries:</p>
            {[
              { role: 'Institutional Admins', desc: 'Can view analytics, register students, and assign batch tests', active: true },
              { role: 'Academic Trainers', desc: 'Can author question banks, schedule test dates, and upload materials', active: true },
              { role: 'Student Candidates', desc: 'Can attempt assigned tests and view historical transcripts', active: true },
            ].map((r, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-900">{r.role}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                  Enabled
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Test Rules */}
        {activeTab === 'tests' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900">Enforce Strict Timer Auto-Submit</h5>
                <p className="text-[11px] text-slate-500">Automatically end and submit exam when countdown finishes</p>
              </div>
              <input
                type="checkbox"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900">Negative Marking Default (-0.25)</h5>
                <p className="text-[11px] text-slate-500">Apply standard placement test penalty for incorrect answers</p>
              </div>
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900">Send Email Alerts on Test Publication</h5>
                <p className="text-[11px] text-slate-500">Notify enrolled students when new exams are scheduled</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="pt-2 flex gap-2.5 border-t border-slate-100">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 14. Study Circle Modal (Student Dashboard)
// -------------------------------------------------------------
interface StudyCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Array<{ name: string; initial: string; color: string; score: string }>;
}

export const StudyCircleModal: React.FC<StudyCircleModalProps> = ({
  isOpen,
  onClose,
  members
}) => {
  const { toast } = useToast();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cohort Study Circle (28 Classmates)"
      subtitle="Connect, compare scores and practice alongside your batchmates"
      icon={<Users className="h-5 w-5" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {members.map((m, idx) => (
          <div
            key={idx}
            className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full bg-gradient-to-tr ${m.color} text-white font-bold text-xs flex items-center justify-center shadow-xs`}>
                {m.initial}
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-900">{m.name}</h5>
                <p className="text-[10px] text-slate-500">Placement Batch 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                {m.score} Score
              </span>
              <button
                onClick={() => toast(`Invited ${m.name} to a practice challenge!`, 'success')}
                className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
              >
                Challenge
              </button>
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};

// -------------------------------------------------------------
// 15. Send Batch Notification Modal (Admin Management)
// -------------------------------------------------------------
interface SendBatchNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (notification: any) => void;
  initialBatch?: string;
}

export const SendBatchNotificationModal: React.FC<SendBatchNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialBatch = 'Class of 2026'
}) => {
  const { toast } = useToast();
  const [batches, setBatches] = useState<string[]>(['All Batches', 'Class of 2026', 'Batch 2026', 'Batch 2027']);
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatch);
  const [customBatch, setCustomBatch] = useState<string>('');
  const [useCustomBatch, setUseCustomBatch] = useState<boolean>(false);
  const [type, setType] = useState<'info' | 'alert' | 'success' | 'warning' | 'announcement'>('info');
  const [targetRole, setTargetRole] = useState<'student' | 'all' | 'trainer'>('student');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [link, setLink] = useState<string>('/student/tests');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      notificationService.getBatches().then((bList) => {
        const unique = Array.from(new Set(['All Batches', ...bList]));
        setBatches(unique);
        if (initialBatch && !unique.includes(initialBatch)) {
          setSelectedBatch(initialBatch);
        }
      }).catch(() => {});
    }
  }, [isOpen, initialBatch]);

  const templates = [
    { label: 'Assessment Scheduled', title: 'New Assessment Scheduled', msg: 'A new aptitude assessment has been scheduled for your batch. Check your test calendar for timings.', link: '/student/tests', type: 'info' as const },
    { label: 'Placement Update', title: 'Campus Placement Drive Notice', msg: 'Registration is now open for upcoming campus placements. Update your profile and submit resume.', link: '/student/dashboard', type: 'announcement' as const },
    { label: 'Study Material Upload', title: 'New Learning Modules Added', msg: 'New study materials and practice modules have been uploaded for your batch.', link: '/student/materials', type: 'success' as const },
    { label: 'Urgent Deadline', title: 'Submission Deadline Approaching', msg: 'Please complete your assigned assessment and submit before 11:59 PM tonight.', link: '/student/tests', type: 'alert' as const },
  ];

  const handleApplyTemplate = (tmpl: typeof templates[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.msg);
    setLink(tmpl.link);
    setType(tmpl.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please enter a notification title', 'error');
      return;
    }
    if (!message.trim()) {
      toast('Please enter a notification message', 'error');
      return;
    }

    const targetBatchFinal = useCustomBatch && customBatch.trim() ? customBatch.trim() : (selectedBatch === 'All Batches' ? 'all' : selectedBatch);

    setIsSubmitting(true);
    try {
      const created = await notificationService.sendBatchNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        targetBatch: targetBatchFinal,
        targetRole,
        link: link.trim() || undefined,
        priority,
        sendEmail
      });

      toast(`Notification successfully dispatched to ${targetBatchFinal === 'all' ? 'All Batches' : targetBatchFinal}!`, 'success');
      if (sendEmail) {
        toast(`Simulated email blast sent to enrolled students in ${targetBatchFinal}`, 'info');
      }

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
      setTitle('');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      toast(err?.response?.data?.detail || 'Failed to dispatch notification', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast Batch Notification"
      subtitle="Deliver targeted announcements, urgent alerts, or schedule updates to specific student cohorts"
      icon={<Bell className="h-5 w-5 text-blue-600" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Quick Templates */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Quick Subject Templates</label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
              >
                + {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Batch & Audience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Target Batch *</label>
              <button
                type="button"
                onClick={() => setUseCustomBatch(!useCustomBatch)}
                className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {useCustomBatch ? 'Select from list' : '+ Custom batch name'}
              </button>
            </div>
            {useCustomBatch ? (
              <input
                type="text"
                placeholder="e.g. CSE-2026-A or Section-B"
                value={customBatch}
                onChange={(e) => setCustomBatch(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            ) : (
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer"
              >
                {batches.map((b, idx) => (
                  <option key={idx} value={b}>{b}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Target Audience</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="student">Students Only (Default)</option>
              <option value="all">Students & Faculty (All)</option>
              <option value="trainer">Trainers / Faculty Only</option>
            </select>
          </div>
        </div>

        {/* Category / Type & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Category / Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'info', label: 'Info', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { id: 'alert', label: 'Alert', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { id: 'success', label: 'Success', color: 'bg-green-50 text-green-700 border-green-200' },
                { id: 'announcement', label: 'General', color: 'bg-sky-50 text-sky-700 border-sky-200' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                    type === item.id 
                      ? `${item.color} ring-2 ring-blue-500/40 font-bold shadow-xs` 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Priority</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'normal', label: 'Normal' },
                { id: 'high', label: 'High' },
                { id: 'urgent', label: 'Urgent' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPriority(item.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                    priority === item.id 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Notification Title *</label>
          <input
            type="text"
            placeholder="e.g. Mandatory Aptitude Mock Assessment on Friday"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            required
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700">Message Content *</label>
            <span className="text-[10px] text-slate-400">{message.length} chars</span>
          </div>
          <textarea
            rows={3}
            placeholder="Write the complete announcement details, instructions or guidelines for the batch..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            required
          />
        </div>

        {/* Action Link & Email Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Action Link (Direct redirection)</label>
            <select
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="/student/tests">Upcoming Tests (/student/tests)</option>
              <option value="/student/materials">Study Materials (/student/materials)</option>
              <option value="/student/results">Results (/student/results)</option>
              <option value="/student/dashboard">Student Dashboard (/student/dashboard)</option>
              <option value="">No action button</option>
            </select>
          </div>

          <div className="pt-2 sm:pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">Simulate Email Alert to Batch</span>
            </label>
          </div>
        </div>

        {/* Live Student Preview Card */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-blue-600" /> Live Student Bell Preview
          </label>
          <div className="p-3 bg-gradient-to-r from-blue-50/50 via-white to-sky-50/40 border border-blue-100 rounded-xl flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              type === 'alert' ? 'bg-amber-100 text-amber-700' :
              type === 'success' ? 'bg-green-100 text-green-700' :
              type === 'announcement' ? 'bg-sky-100 text-sky-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h6 className="text-xs font-bold text-slate-900 truncate">
                  {title || 'Notification Subject Preview'}
                </h6>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                  {useCustomBatch && customBatch ? customBatch : selectedBatch}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                {message || 'Your detailed message will appear here for all enrolled students in this cohort.'}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                <span>Just now</span>
                {link && (
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                    Opens: {link} <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex gap-2.5 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? 'Dispatching...' : `Broadcast to ${useCustomBatch && customBatch ? customBatch : selectedBatch}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

