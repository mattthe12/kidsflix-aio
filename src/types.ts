export type CategoryId = 'cartoons' | 'learning' | 'movies' | 'music' | 'bedtime';

export type SubcategoryId =
  | 'funny'
  | 'animals'
  | 'fantasy'
  | 'superhero'
  | 'comedy'
  | 'originals'
  | 'alphabet'
  | 'numbers'
  | 'science'
  | 'reading'
  | 'geography'
  | 'quizzes'
  | 'animated'
  | 'family'
  | 'adventure'
  | 'movie-comedy'
  | 'movie-fantasy'
  | 'rhymes'
  | 'singalong'
  | 'dancing'
  | 'music'
  | 'musicals'
  | 'stories'
  | 'relaxing'
  | 'sleep'
  | 'calm'
  | 'nighttime';

export type Rating = 'G' | 'PG' | 'Y7';
export type AgeGroup = 'toddler' | 'kid' | 'tween';

export interface Subcategory {
  id: SubcategoryId;
  name: string;
  emoji: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  emoji: string;
  blurb: string;
  colors: readonly [string, string];
  subcategories: Subcategory[];
}

export interface Episode {
  id: string;
  titleId: string;
  number: number;
  name: string;
  durationMin: number;
  hlsUrl: string;
  mp4Url: string;
  /** Progressive MP4 used for offline downloads (may be a smaller rendition). */
  downloadUrl?: string;
  /** Id of the open media clip backing this episode. */
  clipId?: string;
  /** Human-readable credit shown in the player (title, creator, licence). */
  attribution?: string;
  captions: CaptionTrack[];
}

export interface CaptionTrack {
  lang: 'en' | 'es';
  label: string;
  cues: { start: number; end: number; text: string }[];
  /** Where the caption track came from, shown in the playback sheet. */
  credit?: string;
  sourceUrl?: string;
  /** True for machine-generated captions (never presented as human-authored). */
  auto?: boolean;
}

export interface Title {
  id: string;
  name: string;
  category: CategoryId;
  subcategory: SubcategoryId;
  rating: Rating;
  emoji: string;
  palette: number;
  minutes: number;
  year: number;
  description: string;
  popularity: number;
  addedDaysAgo: number;
  episodes: Episode[];
  tags: string[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  ageGroup: AgeGroup;
  ageLimit: Rating;
  /** Optional favourite cartoon buddies chosen in My Cartoon World. */
  favoriteCharacters?: string[];
  createdAt: number;
}

export interface ProgressEntry {
  titleId: string;
  episodeId: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  titleId: string;
  episodeId: string;
  watchedSec: number;
  at: number;
}

export type ApprovalStatus = 'approved' | 'blocked';

export interface DownloadRecord {
  titleId: string;
  episodeId: string;
  status: 'downloading' | 'ready' | 'error';
  progress: number;
  sizeBytes?: number;
  localUri?: string;
  updatedAt: number;
}

export type Plan = 'trial' | 'monthly' | 'yearly';

export interface ParentSettings {
  dailyLimitMinutes: number;
  downloadsAllowed: boolean;
  notificationsEnabled: boolean;
  autoPlayNext: boolean;
  language: 'en' | 'es' | 'fr';
  captionsAlways: boolean;
  reduceMotion: boolean;
  bigText: boolean;
  pinHash: string | null;
  plan: Plan;
  trialEndsAt: number;
  subscriptionStatus: 'trialing' | 'active' | 'inactive';
  bonus: { date: string; minutes: number } | null;
}

export interface FamilyData {
  accountId: string;
  email: string;
  parentName: string;
  profiles: Profile[];
  activeProfileId: string | null;
  progress: Record<string, Record<string, ProgressEntry>>;
  favorites: Record<string, string[]>;
  watchlist: Record<string, string[]>;
  history: Record<string, HistoryEntry[]>;
  approvals: Record<string, Record<string, ApprovalStatus>>;
  downloads: Record<string, DownloadRecord[]>;
  watchMsByDay: Record<string, Record<string, number>>;
  settings: ParentSettings;
}

export type RootRoute =
  | { name: 'tabs'; tab: TabName }
  | { name: 'title'; titleId: string }
  | { name: 'player'; titleId: string; episodeId?: string }
  | { name: 'search' }
  | { name: 'category'; category: CategoryId; subcategory?: SubcategoryId }
  | { name: 'downloads' }
  | { name: 'world' }
  | { name: 'collection'; collectionId: string }
  | { name: 'parent' }
  | { name: 'parentGate'; then: 'dashboard' | 'settings' | 'subscription' }
  | { name: 'parentSetup' }
  | { name: 'settings' }
  | { name: 'subscription' }
  | { name: 'profiles' }
  | { name: 'profileForm'; profileId?: string };

export type TabName = 'home' | 'shows' | 'learning' | 'favorites' | 'profile';
