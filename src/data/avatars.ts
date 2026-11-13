export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
  colors: readonly [string, string];
}

export const AVATARS: AvatarOption[] = [
  { id: 'fox', emoji: '🦊', label: 'Foxy', colors: ['#FF8A3D', '#FF5CA8'] },
  { id: 'panda', emoji: '🐼', label: 'Bamboo', colors: ['#3EA8FF', '#7C4DFF'] },
  { id: 'unicorn', emoji: '🦄', label: 'Sparkle', colors: ['#FF5CA8', '#FFD23F'] },
  { id: 'octopus', emoji: '🐙', label: 'Inky', colors: ['#B14BFF', '#3EA8FF'] },
  { id: 'tiger', emoji: '🐯', label: 'Stripes', colors: ['#FFD23F', '#FF8A3D'] },
  { id: 'frog', emoji: '🐸', label: 'Hoppy', colors: ['#3FE0B0', '#3EA8FF'] },
  { id: 'monkey', emoji: '🐵', label: 'Coco', colors: ['#FFB347', '#FF5CA8'] },
  { id: 'lion', emoji: '🦁', label: 'Roary', colors: ['#FFD23F', '#FF5E6C'] },
  { id: 'bunny', emoji: '🐰', label: 'Pip', colors: ['#FF9ECD', '#A88BFF'] },
  { id: 'koala', emoji: '🐨', label: 'Cloud', colors: ['#9BB7FF', '#7C4DFF'] },
  { id: 'dino', emoji: '🦖', label: 'Rex', colors: ['#3FE0B0', '#FFD23F'] },
  { id: 'whale', emoji: '🐳', label: 'Splash', colors: ['#3EA8FF', '#3FE0B0'] },
];

export function avatarFor(id: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export const AGE_GROUPS = [
  { id: 'toddler' as const, label: 'Little Explorer', ages: '2–4', emoji: '🐣', maxRating: 'G' as const },
  { id: 'kid' as const, label: 'Big Kid', ages: '5–7', emoji: '🚀', maxRating: 'PG' as const },
  { id: 'tween' as const, label: 'Super Kid', ages: '8–10', emoji: '⭐', maxRating: 'Y7' as const },
];
