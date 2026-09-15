import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Edit3, 
  KeyRound, 
  CheckCircle2, 
  Award,
  Lock,
  BadgeCheck,
  Building
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export const StudentProfile = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [batch, setBatch] = useState(user?.batch || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return <div className="text-center py-12 text-slate-500 font-medium">Loading profile...</div>;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updates: any = {
        name: name.trim(),
        department: department.trim(),
        batch: batch.trim(),
      };
      if (newPassword.trim()) {
        updates.password = newPassword.trim();
        updates.currentPassword = currentPassword;
      }

      const res = await api.put(`/users/${user.id}`, updates);
      login(res.data);
      toast('Profile updated successfully!', 'success');
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      toast(e.response?.data?.detail || e.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const academicDetails = [
    { label: 'Full Name', value: user.name, icon: User, desc: 'Registered primary name in portal' },
    { label: 'Email Address', value: user.email, icon: Mail, desc: 'Official student email address' },
    { label: 'Department / Major', value: user.department || 'Computer Science and Engineering', icon: Building, desc: 'Academic engineering discipline' },
    { label: 'Graduation Year', value: user.batch ? `Class of ${user.batch}` : 'Class of 2026', icon: GraduationCap, desc: 'Expected placement cycle batch' },
  ];

  const systemDetails = [
    { label: 'Student Portal ID', value: user.studentId || 'LMS001', icon: Shield, desc: 'Unique LMS candidate identifier' },
    { label: 'Account Role', value: user.role === 'student' ? 'Placement Candidate' : user.role, icon: Award, desc: 'System authorization level' },
    { 
      label: 'Enrolled Since', 
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      }) : 'September 3, 2026', 
      icon: Calendar, 
      desc: 'Account registration date' 
    },
    { label: 'Security Status', value: 'Password Protected', icon: Lock, desc: 'Active secure credentials' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your academic credentials, placement tracks, and security settings.</p>
        </div>
        <Button 
          variant={isEditing ? "secondary" : "outline"}
          onClick={() => {
            setIsEditing(!isEditing);
            setName(user.name);
            setDepartment(user.department || '');
            setBatch(user.batch || '');
            setCurrentPassword('');
            setNewPassword('');
          }}
          className={isEditing ? "bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs" : "border-slate-300 text-slate-700 hover:bg-slate-50 text-xs shadow-xs"}
        >
          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </Button>
      </div>

      {/* Main Profile Card */}
      <Card className="overflow-hidden border border-slate-200 shadow-xs bg-white rounded-2xl">
        {/* Banner with Sapphire Blue Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-sky-700 h-36 relative px-8 flex items-end">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Avatar Placement */}
          <div className="absolute -bottom-11 left-6 sm:left-8 flex items-end gap-4">
            <div className="relative">
              <div className="h-22 w-22 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-2xl tracking-wider shadow-inner">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
                <BadgeCheck className="h-5 w-5 text-blue-600 fill-blue-50" />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-14 pb-8 px-6 sm:px-8">
          {/* Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Active Candidate
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span>{user.department || 'Computer Science and Engineering'}</span>
                <span>•</span>
                <span>ID: {user.studentId || 'LMS001'}</span>
                <span>•</span>
                <span>{user.batch ? `Class of ${user.batch}` : 'Class of 2026'}</span>
              </p>
            </div>
          </div>

          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleUpdateProfile} className="space-y-6 pt-6 animate-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Academic & Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Department / Branch"
                    value={department}
                    placeholder="e.g. Computer Science & Engineering"
                    onChange={e => setDepartment(e.target.value)}
                  />
                  <Input
                    label="Graduation Batch"
                    value={batch}
                    placeholder="e.g. 2026"
                    onChange={e => setBatch(e.target.value)}
                  />
                  <Input
                    label="Registered Email"
                    value={user.email}
                    disabled
                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  Change Security Password (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  isLoading={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 shadow-xs"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save Changes
                </Button>
              </div>
            </form>
          ) : (
            /* Information Sections */
            <div className="space-y-6 pt-6">
              {/* Academic & Personal Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                  Academic Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {academicDetails.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-200 transition-colors flex items-start gap-3.5"
                    >
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{item.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portal & Security Details */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  Portal & Security Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {systemDetails.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-200 transition-colors flex items-start gap-3.5"
                    >
                      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 flex-shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{item.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
