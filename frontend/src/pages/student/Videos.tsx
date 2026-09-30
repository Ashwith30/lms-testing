import React, { useState } from 'react';
import { 
  Play, Video, Search, Filter, Clock, BookOpen, CheckCircle2, 
  Sparkles, Award, Star, Share2, Bookmark, BookmarkCheck,
  ChevronRight, ArrowRight, Download, MessageSquare, 
  Maximize2, Volume2, VolumeX, Pause, RotateCcw, Plus, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export interface VideoLecture {
  id: string;
  title: string;
  track: string;
  category: 'aptitude' | 'reasoning' | 'verbal' | 'technical' | 'placement' | 'dsa';
  instructor: string;
  instructorRole: string;
  duration: string;
  durationMinutes: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  views: number;
  rating: number;
  progressPercent: number; // 0 to 100
  thumbnailColor: string;
  description: string;
  videoUrl?: string;
  chapters: { title: string; time: string; seconds: number }[];
  resources: { name: string; type: string; size: string }[];
}

const INITIAL_VIDEOS: VideoLecture[] = [
  {
    id: 'vid-1',
    title: 'DBMS & SQL Query Optimization: Deep Dive',
    track: 'Technical Core',
    category: 'technical',
    instructor: 'Kiran Mehta',
    instructorRole: 'Lead Technical Trainer • Ex-Oracle',
    duration: '45:30',
    durationMinutes: 45,
    level: 'Intermediate',
    views: 1840,
    rating: 4.9,
    progressPercent: 70,
    thumbnailColor: 'from-blue-600 to-blue-800',
    description: 'Master indexing, query execution plans, subqueries vs joins, and transaction isolation levels for technical interviews.',
    chapters: [
      { title: 'Introduction & SQL Architecture', time: '00:00', seconds: 0 },
      { title: 'B-Tree Indexing Internal Mechanism', time: '08:45', seconds: 525 },
      { title: 'Nested Loops vs Hash Joins', time: '18:20', seconds: 1100 },
      { title: 'ACID & Isolation Level Anomalies', time: '30:10', seconds: 1810 },
      { title: 'Top 10 Interview Query Questions', time: '38:00', seconds: 2280 },
    ],
    resources: [
      { name: 'SQL_Optimization_CheatSheet.pdf', type: 'PDF', size: '2.4 MB' },
      { name: 'Practice_Queries_Schema.sql', type: 'SQL', size: '480 KB' },
    ]
  },
  {
    id: 'vid-2',
    title: 'Quantitative Aptitude: Time, Speed & Distance Hacks',
    track: 'Quantitative Aptitude',
    category: 'aptitude',
    instructor: 'Rahul Kumar',
    instructorRole: 'Senior Aptitude Specialist',
    duration: '38:15',
    durationMinutes: 38,
    level: 'Beginner',
    views: 2920,
    rating: 4.8,
    progressPercent: 100,
    thumbnailColor: 'from-sky-600 to-blue-700',
    description: 'Shortcuts, relative speed concepts, train problems, and boat & stream speed-solving techniques with 0 formula memorization.',
    chapters: [
      { title: 'Proportionality in Speed & Time', time: '00:00', seconds: 0 },
      { title: 'Relative Speed: Opposite vs Same Direction', time: '09:30', seconds: 570 },
      { title: 'Train & Platform Crossing Problems', time: '19:15', seconds: 1155 },
      { title: 'Boats & Streams: Upstream/Downstream', time: '28:40', seconds: 1720 },
    ],
    resources: [
      { name: 'Speed_Distance_Shortcuts.pdf', type: 'PDF', size: '1.8 MB' },
      { name: '100_Practice_Problems.pdf', type: 'PDF', size: '3.1 MB' },
    ]
  },
  {
    id: 'vid-3',
    title: 'Logical Reasoning: Circular & Linear Seating Arrangements',
    track: 'Logical Reasoning',
    category: 'reasoning',
    instructor: 'Priya Sharma',
    instructorRole: 'Reasoning & Analytical Expert',
    duration: '52:00',
    durationMinutes: 52,
    level: 'Intermediate',
    views: 2150,
    rating: 4.9,
    progressPercent: 35,
    thumbnailColor: 'from-sky-600 to-blue-800',
    description: 'Deconstruct complex multi-variable seating puzzles, inward/outward facing circles, and bidirectional linear arrangements.',
    chapters: [
      { title: 'Fundamentals of Circular Seating', time: '00:00', seconds: 0 },
      { title: 'Inward vs Outward Facing Variables', time: '12:10', seconds: 730 },
      { title: 'Parallel Row Arrangements', time: '26:40', seconds: 1600 },
      { title: 'Hard Puzzle Case Studies', time: '41:15', seconds: 2475 },
    ],
    resources: [
      { name: 'Seating_Arrangement_Framework.pdf', type: 'PDF', size: '2.1 MB' },
    ]
  },
  {
    id: 'vid-4',
    title: 'Dynamic Programming & Recursion Masterclass',
    track: 'Data Structures & Algorithms',
    category: 'dsa',
    instructor: 'Rahul Kumar',
    instructorRole: 'Competitive Programming Lead',
    duration: '1:15:20',
    durationMinutes: 75,
    level: 'Advanced',
    views: 4320,
    rating: 5.0,
    progressPercent: 15,
    thumbnailColor: 'from-amber-600 to-orange-800',
    description: 'Transition from recursive brute force to Memoization and Bottom-Up DP. 0/1 Knapsack, LCS, LIS, and Matrix Chain Multiplication.',
    chapters: [
      { title: 'Identifying DP Subproblems', time: '00:00', seconds: 0 },
      { title: 'Top-Down with Memoization', time: '14:20', seconds: 860 },
      { title: 'Bottom-Up Tabulation Pattern', time: '31:45', seconds: 1905 },
      { title: '0/1 Knapsack Variants & Code', time: '48:30', seconds: 2910 },
      { title: 'Space Optimization to O(1)', time: '1:02:10', seconds: 3730 },
    ],
    resources: [
      { name: 'DP_Patterns_MindMap.pdf', type: 'PDF', size: '4.5 MB' },
      { name: 'Knapsack_Java_Python_Code.zip', type: 'ZIP', size: '1.2 MB' },
    ]
  },
  {
    id: 'vid-5',
    title: 'Verbal Ability: Reading Comprehension & Para Jumbles',
    track: 'Verbal Ability',
    category: 'verbal',
    instructor: 'Sneha Reddy',
    instructorRole: 'Verbal & Soft Skills Mentor',
    duration: '34:40',
    durationMinutes: 34,
    level: 'Beginner',
    views: 1680,
    rating: 4.7,
    progressPercent: 0,
    thumbnailColor: 'from-emerald-600 to-teal-800',
    description: 'Critical reading strategies, tone of the author identification, keyword skims, and mandatory pair detection in para jumbles.',
    chapters: [
      { title: 'Skimming vs Scanning in RC', time: '00:00', seconds: 0 },
      { title: 'Author Tone & Inference Questions', time: '10:15', seconds: 615 },
      { title: 'Para Jumbles: Finding Anchor Sentences', time: '20:30', seconds: 1230 },
      { title: 'Elimination Tactics in Options', time: '28:10', seconds: 1690 },
    ],
    resources: [
      { name: 'RC_Tone_Vocabulary_Guide.pdf', type: 'PDF', size: '1.5 MB' },
    ]
  },
  {
    id: 'vid-6',
    title: 'Placement Drive Mock Technical Interview Simulation',
    track: 'Placement Prep',
    category: 'placement',
    instructor: 'Kiran Mehta & Alumni Panel',
    instructorRole: 'Industry Hiring Panel',
    duration: '48:50',
    durationMinutes: 48,
    level: 'Advanced',
    views: 3890,
    rating: 4.9,
    progressPercent: 0,
    thumbnailColor: 'from-rose-600 to-pink-800',
    description: 'Full unedited live mock interview simulation covering DSA whiteboard coding, system design trade-offs, and resume behavioral questions.',
    chapters: [
      { title: 'Candidate Self Introduction & Pitch', time: '00:00', seconds: 0 },
      { title: 'Live Coding Problem 1: Two Pointers', time: '07:20', seconds: 440 },
      { title: 'System Design: URL Shortener High-Level', time: '22:45', seconds: 1365 },
      { title: 'STAR Method Behavioral Answers', time: '36:10', seconds: 2170 },
      { title: 'Interviewer Feedback & Critique', time: '42:30', seconds: 2550 },
    ],
    resources: [
      { name: 'Mock_Interview_Scorecard_Rubric.pdf', type: 'PDF', size: '1.1 MB' },
    ]
  },
];

export const VideoLibrary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [videos, setVideos] = useState<VideoLecture[]>(INITIAL_VIDEOS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['vid-1', 'vid-4']));

  // Active playing video modal
  const [activeVideo, setActiveVideo] = useState<VideoLecture | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'notes' | 'resources'>('chapters');
  const [userNote, setUserNote] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<Record<string, string[]>>({
    'vid-1': ['Key takeaway: Use composite indexing on (dept_id, created_at) to avoid filesort!'],
  });

  // Add video modal state (for trainers/admins)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTrack, setNewTrack] = useState('Technical Core');
  const [newInstructor, setNewInstructor] = useState(user?.name || 'Faculty Trainer');
  const [newDuration, setNewDuration] = useState('30:00');
  const [newLevel, setNewLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [newDescription, setNewDescription] = useState('');

  // Filtered videos
  const filteredVideos = videos.filter((v) => {
    const matchesCat = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.track.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || v.level === selectedLevel;
    const matchesStatus = 
      selectedStatus === 'all' ? true :
      selectedStatus === 'completed' ? v.progressPercent === 100 :
      selectedStatus === 'in_progress' ? (v.progressPercent > 0 && v.progressPercent < 100) :
      v.progressPercent === 0;

    return matchesCat && matchesSearch && matchesLevel && matchesStatus;
  });

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Video removed from bookmarks.', 'info');
      } else {
        next.add(id);
        toast('Video saved to your personal library!', 'success');
      }
      return next;
    });
  };

  const handleOpenVideo = (video: VideoLecture) => {
    setActiveVideo(video);
    setIsPlaying(true);
  };

  const handleMarkCompleted = (vidId: string) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === vidId ? { ...v, progressPercent: 100 } : v))
    );
    if (activeVideo && activeVideo.id === vidId) {
      setActiveVideo({ ...activeVideo, progressPercent: 100 });
    }
    toast('Congratulations! Lecture marked as 100% completed.', 'success');
  };

  const handleSaveNote = () => {
    if (!activeVideo || !userNote.trim()) return;
    setSavedNotes((prev) => ({
      ...prev,
      [activeVideo.id]: [...(prev[activeVideo.id] || []), userNote.trim()],
    }));
    setUserNote('');
    toast('Lecture note saved to your study journal.', 'success');
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newVid: VideoLecture = {
      id: `vid-${Date.now()}`,
      title: newTitle.trim(),
      track: newTrack,
      category: 'technical',
      instructor: newInstructor,
      instructorRole: 'LMS Faculty Trainer',
      duration: newDuration,
      durationMinutes: 30,
      level: newLevel,
      views: 0,
      rating: 5.0,
      progressPercent: 0,
      thumbnailColor: 'from-blue-600 to-blue-800',
      description: newDescription.trim() || 'Comprehensive video lecture with conceptual explanations and step-by-step solutions.',
      chapters: [
        { title: 'Chapter 1: Conceptual Overview', time: '00:00', seconds: 0 },
        { title: 'Chapter 2: Deep Dive & Problem Solving', time: '10:00', seconds: 600 },
        { title: 'Chapter 3: Summary & Next Steps', time: '25:00', seconds: 1500 },
      ],
      resources: [
        { name: `${newTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Slides.pdf`, type: 'PDF', size: '2.0 MB' },
      ],
    };

    setVideos([newVid, ...videos]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    toast('New video lecture published successfully!', 'success');
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Video className="h-4 w-4" />
            <span>Video Learning Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Recorded Lectures & Masterclasses</h1>
          <p className="text-slate-500 text-sm mt-1">
            Stream high-definition lecture modules, shortcut workshops, and mock interview breakdowns.
          </p>
        </div>

        {(user?.role === 'admin' || user?.role === 'trainer') && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Upload Video Lecture
          </Button>
        )}
      </div>

      {/* Featured Spotlight Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-blue-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Spotlight Masterclass of the Week</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              DBMS & SQL Query Optimization: Deep Dive
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Learn advanced query execution strategies, composite B-Tree indexes, and transaction isolation levels taught by industry engineers.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-blue-400" /> 45 mins</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400 fill-amber-400" /> 4.9 (1,840 views)</span>
              <span className="bg-blue-800/60 px-2.5 py-0.5 rounded-md border border-blue-700/50 text-blue-200 font-medium">Intermediate</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button
              onClick={() => handleOpenVideo(videos[0])}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 py-3 px-6 rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Resume Lecture (70%)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Category Pills & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {[
            { id: 'all', label: 'All Tracks' },
            { id: 'technical', label: 'Technical Core (DBMS/SQL)' },
            { id: 'aptitude', label: 'Quantitative Aptitude' },
            { id: 'reasoning', label: 'Logical Reasoning' },
            { id: 'dsa', label: 'DSA & Algorithms' },
            { id: 'verbal', label: 'Verbal Ability' },
            { id: 'placement', label: 'Placement Drives' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, keyword, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none hover:bg-white cursor-pointer"
            >
              <option value="all">All Difficulty Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none hover:bg-white cursor-pointer"
            >
              <option value="all">All Watch Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => {
          const isBookmarked = bookmarkedIds.has(video.id);

          return (
            <Card
              key={video.id}
              onClick={() => handleOpenVideo(video)}
              className="group border border-slate-200/90 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Video Thumbnail Preview */}
                <div className={`relative h-44 bg-gradient-to-br ${video.thumbnailColor} p-4 flex flex-col justify-between text-white overflow-hidden`}>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-white/10">
                      {video.track}
                    </span>
                    <button
                      onClick={(e) => toggleBookmark(video.id, e)}
                      className="p-1.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Play Overlay Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-200 shadow-lg">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Video Meta Bar */}
                  <div className="flex items-center justify-between text-[11px] font-semibold relative z-10">
                    <span className="bg-black/60 px-2 py-0.5 rounded-md">{video.duration}</span>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md text-white">{video.level}</span>
                  </div>

                  {/* Progress Bar (if started) */}
                  {video.progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                      <div
                        className={`h-full ${video.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${video.progressPercent}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-700">{video.rating}</span> ({video.views})
                    </span>
                    {video.progressPercent === 100 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                      </span>
                    ) : video.progressPercent > 0 ? (
                      <span className="text-[11px] font-semibold text-blue-600">
                        {video.progressPercent}% Watched
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">Not started</span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {video.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>

              {/* Card Footer with Instructor */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {video.instructor.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{video.instructor}</p>
                    <p className="text-[10px] text-slate-400">{video.instructorRole.split('•')[0]}</p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Watch →
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No video lectures found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, difficulty filters, or track categories.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Interactive Video Player & Learning Console Modal                         */}
      {/* ========================================================================= */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{activeVideo.title}</h2>
                  <p className="text-xs text-slate-500">{activeVideo.track} • {activeVideo.instructor}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Player + Right Column Console */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
              
              {/* Left Side: Video Canvas & Controls */}
              <div className="lg:col-span-8 p-6 space-y-4 border-r border-slate-200">
                {/* Simulated High-Res Video Canvas */}
                <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between p-4 group">
                  <div className="flex items-center justify-between text-white/80 text-xs">
                    <span className="bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-xs font-semibold">
                      1080p Full HD • {activeVideo.track}
                    </span>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                      {playbackSpeed}x Speed
                    </span>
                  </div>

                  {/* Play / Pause Big Center Trigger */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="self-center p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:scale-110 hover:bg-blue-600 transition-all cursor-pointer shadow-xl"
                  >
                    {isPlaying ? <Pause className="h-8 w-8 fill-white" /> : <Play className="h-8 w-8 fill-white ml-1" />}
                  </button>

                  {/* Bottom Video Controls Overlay */}
                  <div className="space-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 rounded-xl">
                    {/* Scrub Bar */}
                    <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.max(activeVideo.progressPercent, 35)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-blue-400 cursor-pointer">
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <span>14:20 / {activeVideo.duration}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Playback speed buttons */}
                        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-[10px]">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => setPlaybackSpeed(spd)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                playbackSpeed === spd ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleMarkCompleted(activeVideo.id)}
                      variant="outline"
                      className="text-xs font-semibold gap-1.5 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Mark as Completed
                    </Button>

                    <Button
                      onClick={(e) => toggleBookmark(activeVideo.id, e)}
                      variant="outline"
                      className="text-xs font-semibold gap-1.5 border-slate-200 hover:border-blue-300 cursor-pointer"
                    >
                      <Bookmark className="h-4 w-4" />
                      Save
                    </Button>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    Instructor: <strong className="text-slate-900">{activeVideo.instructor}</strong> ({activeVideo.instructorRole})
                  </p>
                </div>
              </div>

              {/* Right Side: Interactive Study Console */}
              <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-slate-50/50">
                <div>
                  {/* Console Tabs */}
                  <div className="flex items-center border-b border-slate-200 pb-2 gap-1 text-xs font-semibold">
                    <button
                      onClick={() => setActiveTab('chapters')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'chapters'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Chapters ({activeVideo.chapters.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'notes'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      My Notes
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'resources'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Slides & Files
                    </button>
                  </div>

                  {/* Tab Content 1: Chapters */}
                  {activeTab === 'chapters' && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Lecture Outline</p>
                      {activeVideo.chapters.map((chap, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            toast(`Skipped to ${chap.title} (${chap.time})`, 'info');
                          }}
                          className="p-3 bg-white hover:bg-blue-50/60 border border-slate-200 rounded-xl transition-all cursor-pointer group flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-6 w-6 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center font-bold text-[11px] text-slate-600 transition-colors">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 group-hover:text-blue-600">{chap.title}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{chap.time}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab Content 2: Notes */}
                  {activeTab === 'notes' && (
                    <div className="mt-4 space-y-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Video Notes</p>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(savedNotes[activeVideo.id] || []).map((note, i) => (
                          <div key={i} className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed">
                            {note}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 pt-2">
                        <textarea
                          placeholder="Type a timestamp note or shortcut idea here..."
                          value={userNote}
                          onChange={(e) => setUserNote(e.target.value)}
                          rows={3}
                          className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                        <Button
                          onClick={handleSaveNote}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-xl cursor-pointer"
                        >
                          Save Note
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 3: Resources */}
                  {activeTab === 'resources' && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Lecture Downloads</p>
                      {activeVideo.resources.map((res, i) => (
                        <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-semibold text-slate-800">{res.name}</p>
                              <p className="text-[10px] text-slate-400">{res.type} • {res.size}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => toast(`Downloading ${res.name}...`, 'success')}
                            variant="outline"
                            size="sm"
                            className="text-xs font-semibold gap-1 hover:bg-slate-50 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200">
                  <p className="text-[11px] text-slate-400">
                    Watching recorded content counts toward your monthly learning engagement metrics.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Upload Video Lecture Modal (For Trainers & Admins)                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Publish Video Lecture</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms: BFS & DFS Traversal Patterns"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Track</label>
                  <select
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="Technical Core">Technical Core</option>
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Data Structures">Data Structures & Algo</option>
                    <option value="Placement Prep">Placement Prep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty Level</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor Name</label>
                  <input
                    type="text"
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (mm:ss)</label>
                  <input
                    type="text"
                    placeholder="42:00"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Description</label>
                <textarea
                  rows={3}
                  placeholder="Key learning outcomes, prerequisites, and concepts covered..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5"
                >
                  Publish Lecture
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
