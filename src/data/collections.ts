import type { Title } from '../types';
import { titleById } from './catalog';

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  colors: readonly [string, string];
  titleIds: string[];
}

/**
 * Curated collections built from the real catalogue. Every id below is an
 * existing title, so a collection never invents a show or a broken card.
 */
export const COLLECTIONS: Collection[] = [
  {
    id: 'classic-cartoons',
    name: 'Classic Cartoon Collection',
    emoji: '🎞️',
    blurb: 'Hand-drawn favourites from the golden age of cartoons.',
    colors: ['#FF8A3D', '#FF5CA8'],
    titleIds: [
      'big-buck-bunny',
      'jack-and-the-beanstalk',
      'jack-frost',
      'puss-in-boots',
      'the-three-bears',
      'the-valiant-tailor',
      'the-queen-of-hearts',
      'balloon-land',
    ],
  },
  {
    id: 'animal-adventures',
    name: 'Animal Adventures',
    emoji: '🐾',
    blurb: 'Llamas, lions, lambs and a very big bunny.',
    colors: ['#3FE0B0', '#3EA8FF'],
    titleIds: ['big-buck-bunny', 'gran-dillama', 'llamigos', 'llama-drama', 'marys-little-lamb', 'the-bremen-town-musicians', 'spring', 'wing-it'],
  },
  {
    id: 'funny-cartoons',
    name: 'Funny Cartoons',
    emoji: '😂',
    blurb: 'Silly songs, cheeky heroes and happy endings.',
    colors: ['#FFD23F', '#FF8A3D'],
    titleIds: ['simple-simon', 'jack-frost', 'happy-days', 'summertime', 'the-queen-of-hearts', 'tom-thumb', 'balloon-land', 'dance-party-pals'],
  },
  {
    id: 'space-adventures',
    name: 'Space Adventures',
    emoji: '🚀',
    blurb: 'Rockets, stars and big questions about our universe.',
    colors: ['#3EA8FF', '#B14BFF'],
    titleIds: ['why-wonders', 'little-lab-coats', 'starlight-adventures', 'night-sky-friends', 'dream-train', 'number-ninjas'],
  },
  {
    id: 'fairy-tales',
    name: 'Fairy Tales',
    emoji: '🏰',
    blurb: 'Castles, beanstalks and brave little heroes.',
    colors: ['#B14BFF', '#FF5CA8'],
    titleIds: [
      'jack-and-the-beanstalk',
      'the-three-bears',
      'puss-in-boots',
      'the-valiant-tailor',
      'the-queen-of-hearts',
      'don-quixote',
      'tom-thumb',
      'the-brave-tin-soldier',
    ],
  },
  {
    id: 'learning-adventures',
    name: 'Learning Adventures',
    emoji: '🧠',
    blurb: 'Letters, numbers, science and stories that teach.',
    colors: ['#3FE0B0', '#7C4DFF'],
    titleIds: ['abc-adventure', 'letter-land', 'count-with-coco', 'number-ninjas', 'little-lab-coats', 'why-wonders', 'story-seeds', 'read-and-roar'],
  },
  {
    id: 'bedtime-stories',
    name: 'Bedtime Stories',
    emoji: '🌙',
    blurb: 'Soft voices and sleepy adventures for winding down.',
    colors: ['#6C8CFF', '#B14BFF'],
    titleIds: ['bedtime-with-bear', 'snuggle-stories', 'calm-clouds', 'sleepy-seas', 'dream-train', 'moonlight-lullabies', 'slow-and-cozy', 'quiet-forest'],
  },
  {
    id: 'family-favorites',
    name: 'Family Favorites',
    emoji: '👨‍👩‍👧',
    blurb: 'Short films that work for every age in the room.',
    colors: ['#FF5CA8', '#FFD23F'],
    titleIds: ['big-buck-bunny', 'spring', 'the-bremen-town-musicians', 'marys-little-lamb', 'happy-days', 'rainbow-musical', 'barnyard-broadway', 'wing-it'],
  },
];

export const COLLECTION_MAP: Record<string, Collection> = COLLECTIONS.reduce(
  (acc, collection) => ({ ...acc, [collection.id]: collection }),
  {} as Record<string, Collection>
);

export function collectionTitles(collection: Collection): Title[] {
  return collection.titleIds.map((id) => titleById[id]).filter(Boolean) as Title[];
}
