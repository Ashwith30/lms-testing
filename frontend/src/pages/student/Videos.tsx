import React, { useState, useEffect } from 'react';
import {
  Play, Video, Search, Filter, Clock, BookOpen, CheckCircle2,
  Sparkles, Award, Star, Share2, Bookmark, BookmarkCheck,
  ChevronRight, ArrowRight, Download, MessageSquare,
  Maximize2, Volume2, VolumeX, Pause, RotateCcw, Plus, X, Trash2,
  Layers, Code, Brain, Compass, Calculator, FileText, Check
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Import thumbnail assets directly for Vite bundling
import thumbDbms from '../../assets/thumbnails/thumb_dbms.jpg';
import thumbAptitude from '../../assets/thumbnails/thumb_aptitude.jpg';
import thumbReasoning from '../../assets/thumbnails/thumb_reasoning.jpg';
import thumbDsa from '../../assets/thumbnails/thumb_dsa.jpg';
import thumbVerbal from '../../assets/thumbnails/thumb_verbal.jpg';
import thumbPlacement from '../../assets/thumbnails/thumb_placement.jpg';
import thumbSql from '../../assets/thumbnails/thumb_sql.jpg';

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
  thumbnailUrl: string;
  fallbackThumbnailUrl?: string;
  moduleCode: string;
  description: string;
  videoUrl?: string;
  chapters: { title: string; time: string; seconds: number }[];
  resources: { name: string; type: string; size: string }[];
  isCustom?: boolean;
}

export const THUMBNAIL_PRESETS = [
  { id: 'dbms', label: 'DBMS & Systems', category: 'technical', track: 'Technical Core', src: thumbDbms, publicPath: '/thumbnails/thumb_dbms.jpg', color: 'from-blue-600 to-indigo-900', icon: Layers },
  { id: 'aptitude', label: 'Aptitude & Speed', category: 'aptitude', track: 'Quantitative Aptitude', src: thumbAptitude, publicPath: '/thumbnails/thumb_aptitude.jpg', color: 'from-emerald-600 to-teal-900', icon: Calculator },
  { id: 'reasoning', label: 'Logical Reasoning', category: 'reasoning', track: 'Logical Reasoning', src: thumbReasoning, publicPath: '/thumbnails/thumb_reasoning.jpg', color: 'from-amber-600 to-orange-950', icon: Compass },
  { id: 'dsa', label: 'DSA & Algorithms', category: 'dsa', track: 'Data Structures & Algorithms', src: thumbDsa, publicPath: '/thumbnails/thumb_dsa.jpg', color: 'from-cyan-600 to-blue-950', icon: Code },
  { id: 'verbal', label: 'Verbal Ability', category: 'verbal', track: 'Verbal Ability', src: thumbVerbal, publicPath: '/thumbnails/thumb_verbal.jpg', color: 'from-purple-600 to-violet-950', icon: BookOpen },
  { id: 'placement', label: 'Placement Mock', category: 'placement', track: 'Placement Prep', src: thumbPlacement, publicPath: '/thumbnails/thumb_placement.jpg', color: 'from-rose-600 to-red-950', icon: Award },
  { id: 'sql', label: 'SQL & Database', category: 'technical', track: 'Technical Core', src: thumbSql, publicPath: '/thumbnails/thumb_sql.jpg', color: 'from-sky-600 to-slate-900', icon: Layers },
];

export const INITIAL_VIDEOS: VideoLecture[] = [
  {
    id: 'vid-1',
    title: 'DBMS & SQL Query Optimization: Deep Dive',
    track: 'Technical Core',
    category: 'technical',
    moduleCode: 'TC-301',
    thumbnailUrl: thumbDbms,
    fallbackThumbnailUrl: '/thumbnails/thumb_dbms.jpg',
    instructor: 'Kiran Mehta',
    instructorRole: 'Lead Technical Trainer • Ex-Oracle',
    duration: '45:30',
    durationMinutes: 45,
    level: 'Intermediate',
    views: 1840,
    rating: 4.9,
    progressPercent: 70,
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
    moduleCode: 'QA-104',
    thumbnailUrl: thumbAptitude,
    fallbackThumbnailUrl: '/thumbnails/thumb_aptitude.jpg',
    instructor: 'Rahul Kumar',
    instructorRole: 'Senior Aptitude Specialist',
    duration: '38:15',
    durationMinutes: 38,
    level: 'Beginner',
    views: 2920,
    rating: 4.8,
    progressPercent: 100,
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
    moduleCode: 'LR-208',
    thumbnailUrl: thumbReasoning,
    fallbackThumbnailUrl: '/thumbnails/thumb_reasoning.jpg',
    instructor: 'Priya Sharma',
    instructorRole: 'Reasoning & Analytical Expert',
    duration: '52:00',
    durationMinutes: 52,
    level: 'Intermediate',
    views: 2150,
    rating: 4.9,
    progressPercent: 35,
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
    moduleCode: 'CS-402',
    thumbnailUrl: thumbDsa,
    fallbackThumbnailUrl: '/thumbnails/thumb_dsa.jpg',
    instructor: 'Rahul Kumar',
    instructorRole: 'Competitive Programming Lead',
    duration: '1:15:20',
    durationMinutes: 75,
    level: 'Advanced',
    views: 4320,
    rating: 5.0,
    progressPercent: 15,
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
    moduleCode: 'VA-102',
    thumbnailUrl: thumbVerbal,
    fallbackThumbnailUrl: '/thumbnails/thumb_verbal.jpg',
    instructor: 'Sneha Reddy',
    instructorRole: 'Verbal & Soft Skills Mentor',
    duration: '34:40',
    durationMinutes: 34,
    level: 'Beginner',
    views: 1680,
    rating: 4.7,
    progressPercent: 0,
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
    moduleCode: 'PL-501',
    thumbnailUrl: thumbPlacement,
    fallbackThumbnailUrl: '/thumbnails/thumb_placement.jpg',
    instructor: 'Kiran Mehta & Alumni Panel',
    instructorRole: 'Industry Hiring Panel',
    duration: '48:50',
    durationMinutes: 48,
    level: 'Advanced',
    views: 3890,
    rating: 4.9,
    progressPercent: 0,
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

/**
 * Robust Thumbnail Component with Multi-Level Fallback & Vector Cover
 */
export const VideoThumbnailDisplay: React.FC<{
  video: VideoLecture;
  className?: string;
}> = ({ video, className = '' }) => {
  const [imgSrc, setImgSrc] = useState<string>(video.thumbnailUrl || video.fallbackThumbnailUrl || '');
  const [hasError, setHasError] = useState<boolean>(false);
  const [triedFallback, setTriedFallback] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(video.thumbnailUrl || video.fallbackThumbnailUrl || '');
    setHasError(false);
    setTriedFallback(false);
  }, [video.thumbnailUrl, video.fallbackThumbnailUrl]);

  const handleImgError = () => {
    if (!triedFallback && video.fallbackThumbnailUrl && imgSrc !== video.fallbackThumbnailUrl) {
      setTriedFallback(true);
      setImgSrc(video.fallbackThumbnailUrl);
    } else {
      setHasError(true);
    }
  };

  // Find matching preset for nice gradient fallback
  const preset = THUMBNAIL_PRESETS.find(p => p.category === video.category) || THUMBNAIL_PRESETS[0];
  const IconComp = preset.icon;

  if (hasError || !imgSrc) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${preset.color} flex flex-col justify-between p-4 relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/40 text-white/90 px-2 py-0.5 rounded border border-white/10">
            {video.track}
          </span>
          <IconComp className="h-5 w-5 text-white/60" />
        </div>
        <div className="relative z-10">
          <p className="text-white font-bold text-sm line-clamp-2 leading-snug drop-shadow-md">
            {video.title}
          </p>
          <p className="text-white/70 text-[11px] mt-0.5">{video.instructor}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={video.title}
      onError={handleImgError}
      className={`w-full h-full object-cover ${className}`}
      loading="eager"
    />
  );
};

export const VideoLibrary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Load shared videos from localStorage or default
  const [videos, setVideos] = useState<VideoLecture[]>(() => {
    try {
      const saved = localStorage.getItem('lms_video_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-attach imported thumbnail references if matched by ID
          return parsed.map((item: VideoLecture) => {
            const defaultMatch = INITIAL_VIDEOS.find(v => v.id === item.id);
            if (defaultMatch) {
              return {
                ...item,
                thumbnailUrl: item.thumbnailUrl || defaultMatch.thumbnailUrl,
                fallbackThumbnailUrl: item.fallbackThumbnailUrl || defaultMatch.fallbackThumbnailUrl,
              };
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load saved videos', e);
    }
    return INITIAL_VIDEOS;
  });

  // Save to localStorage when videos change
  useEffect(() => {
    try {
      localStorage.setItem('lms_video_library', JSON.stringify(videos));
    } catch (e) {
      console.error('Failed to save videos to localStorage', e);
    }
  }, [videos]);

  // Bookmarks per user
  const userBookmarkKey = `lms_bookmarked_videos_${user?.id || 'default'}`;
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(userBookmarkKey);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // ignore
    }
    return new Set(['vid-1', 'vid-4']);
  });

  useEffect(() => {
    try {
      localStorage.setItem(userBookmarkKey, JSON.stringify(Array.from(bookmarkedIds)));
    } catch {
      // ignore
    }
  }, [bookmarkedIds, userBookmarkKey]);

  // Active playing video modal
  const [activeVideo, setActiveVideo] = useState<VideoLecture | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'notes' | 'resources'>('chapters');
  const [userNote, setUserNote] = useState<string>('');

  // User notes per user
  const userNotesKey = `lms_video_notes_${user?.id || 'default'}`;
  const [savedNotes, setSavedNotes] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(userNotesKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(userNotesKey, JSON.stringify(savedNotes));
    } catch {
      // ignore
    }
  }, [savedNotes, userNotesKey]);

  // Add video modal state (for trainers/admins/institutions)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTrack, setNewTrack] = useState('Technical Core');
  const [newCategory, setNewCategory] = useState<VideoLecture['category']>('technical');
  const [newInstructor, setNewInstructor] = useState(user?.name || 'Faculty Trainer');
  const [newDuration, setNewDuration] = useState('35:00');
  const [newLevel, setNewLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [newDescription, setNewDescription] = useState('');
  const [selectedThumbnailId, setSelectedThumbnailId] = useState<string>('dbms');

  // Can manage videos: Trainer, Admin, Institution
  const canUploadVideos = user?.role === 'admin' || user?.role === 'trainer' || user?.role === 'institution';

  const filteredVideos = videos;

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

  const handleDeleteVideo = (vidId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this video lecture?')) {
      setVideos(prev => prev.filter(v => v.id !== vidId));
      if (activeVideo?.id === vidId) {
        setActiveVideo(null);
      }
      toast('Video lecture removed successfully.', 'info');
    }
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

    const chosenPreset = THUMBNAIL_PRESETS.find(p => p.id === selectedThumbnailId) || THUMBNAIL_PRESETS[0];

    const newVid: VideoLecture = {
      id: `vid-${Date.now()}`,
      title: newTitle.trim(),
      track: newTrack,
      category: newCategory,
      moduleCode: `MOD-${Math.floor(100 + Math.random() * 900)}`,
      thumbnailUrl: chosenPreset.src,
      fallbackThumbnailUrl: chosenPreset.publicPath,
      instructor: newInstructor.trim() || user?.name || 'Faculty Trainer',
      instructorRole: user?.role === 'trainer' ? 'Certified Master Trainer' : user?.role === 'institution' ? 'Institutional Faculty' : 'Senior Platform Instructor',
      duration: newDuration.trim() || '30:00',
      durationMinutes: parseInt(newDuration.split(':')[0], 10) || 30,
      level: newLevel,
      views: 1,
      rating: 5.0,
      progressPercent: 0,
      description: newDescription.trim() || 'Comprehensive video masterclass covering deep concept breakdowns, edge cases, and industry interview practice.',
      chapters: [
        { title: 'Part 1: Conceptual Foundations', time: '00:00', seconds: 0 },
        { title: 'Part 2: Deep Dive & Live Solving', time: '12:00', seconds: 720 },
        { title: 'Part 3: Key Takeaways & Exam Strategies', time: '24:00', seconds: 1440 },
      ],
      resources: [
        { name: `${newTitle.replace(/[^a-zA-Z0-9]/g, '_')}_StudyNotes.pdf`, type: 'PDF', size: '2.4 MB' },
        { name: 'Practice_Problems_Set.pdf', type: 'PDF', size: '1.2 MB' },
      ],
      isCustom: true,
    };

    setVideos([newVid, ...videos]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    toast('New video lecture published with high-definition thumbnail!', 'success');
  };

  const CATEGORIES = [
    { id: 'all', label: 'All Modules', icon: Layers },
    { id: 'technical', label: 'Technical Core', icon: Layers },
    { id: 'aptitude', label: 'Aptitude', icon: Calculator },
    { id: 'reasoning', label: 'Logical Reasoning', icon: Compass },
    { id: 'dsa', label: 'DSA & Algo', icon: Code },
    { id: 'verbal', label: 'Verbal Ability', icon: BookOpen },
    { id: 'placement', label: 'Placement Prep', icon: Award },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">
            <Video className="h-4 w-4 text-slate-700" />
            <span>Video Learning Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Video Lectures</h1>
          <p className="text-slate-500 text-sm mt-1">
            Stream high-definition lecture modules, shortcut workshops, and mock interview breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canUploadVideos && (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Upload Video Lecture
            </Button>
          )}
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
              className="group border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between bg-white"
            >
              <div>
                {/* Visual Heading-Accurate Course Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <VideoThumbnailDisplay
                    video={video}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none"></div>

                  {/* Top Bar: Module Tag & Bookmark */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <span className="text-[10px] font-bold font-mono text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/20">
                      {video.track}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {canUploadVideos && video.isCustom && (
                        <button
                          onClick={(e) => handleDeleteVideo(video.id, e)}
                          title="Delete Video"
                          className="p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => toggleBookmark(video.id, e)}
                        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Video'}
                        className="p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-amber-400 fill-amber-400" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Centered Play Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div className="h-12 w-12 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-slate-900 ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Duration */}
                  <div className="absolute bottom-2 right-3 z-10">
                    <span className="bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-semibold text-white">
                      {video.duration}
                    </span>
                  </div>

                  {/* Progress Bar (if started) */}
                  {video.progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20">
                      <div
                        className={`h-full ${video.progressPercent === 100 ? 'bg-emerald-500' : 'bg-white'}`}
                        style={{ width: `${video.progressPercent}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-5 space-y-2">
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
                      <span className="text-[11px] font-semibold text-slate-700">
                        {video.progressPercent}% Watched
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">Not started</span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-slate-700 transition-colors line-clamp-2">
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
                  <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                    {video.instructor.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{video.instructor}</p>
                    <p className="text-[10px] text-slate-400">{video.instructorRole.split('•')[0]}</p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-900 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                  Watch →
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Video className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No video lectures available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no published lecture videos in the library.
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-200 text-slate-900">
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
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between p-4 group bg-slate-950">
                  <div className="absolute inset-0 w-full h-full opacity-60 pointer-events-none">
                    <VideoThumbnailDisplay video={activeVideo} />
                  </div>
                  
                  <div className="flex items-center justify-between text-white/80 text-xs z-10">
                    <span className="bg-black/70 px-2.5 py-1 rounded-md backdrop-blur-xs font-semibold text-slate-200 border border-white/10">
                      1080p Full HD • {activeVideo.track}
                    </span>
                    <span className="bg-slate-800/90 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded text-[11px] font-bold">
                      {playbackSpeed}x Speed
                    </span>
                  </div>

                  {/* Play / Pause Big Center Trigger */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="self-center p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:scale-110 hover:bg-white hover:text-slate-950 transition-all cursor-pointer shadow-xl z-10"
                  >
                    {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                  </button>

                  {/* Bottom Video Controls Overlay */}
                  <div className="space-y-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 rounded-xl z-10">
                    {/* Scrub Bar */}
                    <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${Math.max(activeVideo.progressPercent, 35)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-slate-300 cursor-pointer">
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <span className="text-slate-300">14:20 / {activeVideo.duration}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Playback speed buttons */}
                        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-[10px]">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => setPlaybackSpeed(spd)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                playbackSpeed === spd ? 'bg-white text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
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
                      className="text-xs font-semibold gap-1.5 border-slate-200 hover:border-slate-400 cursor-pointer"
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
              <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-slate-50/60">
                <div>
                  {/* Console Tabs */}
                  <div className="flex items-center border-b border-slate-200 pb-2 gap-1 text-xs font-semibold">
                    <button
                      onClick={() => setActiveTab('chapters')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'chapters'
                          ? 'border-slate-900 text-slate-900 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Chapters ({activeVideo.chapters.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'notes'
                          ? 'border-slate-900 text-slate-900 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      My Notes
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'resources'
                          ? 'border-slate-900 text-slate-900 font-bold'
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
                          className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer group flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-6 w-6 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center font-bold text-[11px] text-slate-600 transition-colors">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 group-hover:text-slate-900">{chap.title}</span>
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
                        {(savedNotes[activeVideo.id] || []).length === 0 ? (
                          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                            <p className="text-xs text-slate-500 font-medium">No notes saved yet for this lecture.</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Write your timestamps, formula shortcuts, or key takeaways below.</p>
                          </div>
                        ) : (
                          (savedNotes[activeVideo.id] || []).map((note, i) => (
                            <div key={i} className="group/note p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start justify-between gap-2">
                              <span>{note}</span>
                              <button
                                onClick={() => {
                                  setSavedNotes((prev) => ({
                                    ...prev,
                                    [activeVideo.id]: prev[activeVideo.id].filter((_, idx) => idx !== i),
                                  }));
                                  toast('Note deleted.', 'info');
                                }}
                                className="opacity-0 group-hover/note:opacity-100 text-amber-700 hover:text-rose-600 p-0.5 transition-opacity cursor-pointer shrink-0"
                                title="Delete note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2 pt-2">
                        <textarea
                          placeholder="Type a timestamp note or shortcut idea here..."
                          value={userNote}
                          onChange={(e) => setUserNote(e.target.value)}
                          rows={3}
                          className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400"
                        />
                        <Button
                          onClick={handleSaveNote}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl cursor-pointer"
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
                            <BookOpen className="h-4 w-4 text-slate-700" />
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
      {/* Upload Video Lecture Modal (For Trainers, Admins & Institutions)          */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-slate-900" />
                <h3 className="font-bold text-slate-900 text-base">Publish Video Lecture</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms: BFS & DFS Traversal Patterns"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* Select Visual Thumbnail Theme */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Thumbnail Artwork *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {THUMBNAIL_PRESETS.map((preset) => {
                    const isChosen = selectedThumbnailId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedThumbnailId(preset.id);
                          setNewTrack(preset.track);
                          setNewCategory(preset.category as VideoLecture['category']);
                        }}
                        className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all p-0.5 text-left cursor-pointer ${
                          isChosen ? 'border-slate-900 ring-2 ring-slate-900/20 scale-[1.02]' : 'border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt={preset.label}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] font-bold text-white truncate">{preset.label}</span>
                        </div>
                        {isChosen && (
                          <div className="absolute top-1 right-1 bg-slate-900 text-white rounded-full p-0.5 shadow-sm">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Track</label>
                  <select
                    value={newTrack}
                    onChange={(e) => {
                      setNewTrack(e.target.value);
                      const matchingPreset = THUMBNAIL_PRESETS.find(p => p.track === e.target.value);
                      if (matchingPreset) {
                        setSelectedThumbnailId(matchingPreset.id);
                        setNewCategory(matchingPreset.category as VideoLecture['category']);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="Technical Core">Technical Core</option>
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algo</option>
                    <option value="Placement Prep">Placement Prep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty Level</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (mm:ss)</label>
                  <input
                    type="text"
                    placeholder="42:00"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
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
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5"
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
