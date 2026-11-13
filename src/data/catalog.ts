import type {
  AgeGroup,
  Category,
  CategoryId,
  Episode,
  Profile,
  Rating,
  SubcategoryId,
  Title,
} from '../types';
import { ratingRank } from '../lib/format';
import { MEDIA_CLIPS, clipsForTitle, creditFor } from './media';
import { captionsForClip } from './captions';

/**
 * Demo catalogue for KidsFlix.
 *
 * Cartoon and movie cards are real open or public-domain films with their
 * actual titles: Blender open movies (CC BY) and Ub Iwerks ComiColor cartoons
 * (public domain), one exact film per card. Learning, music and bedtime cards
 * are original KidsFlix demo shows that draw from themed NASA, NOAA and
 * Prelinger clips. Swap the library for your own licensed catalogue in
 * production.
 */

export const PALETTES: readonly (readonly [string, string])[] = [
  ['#7C4DFF', '#FF5CA8'],
  ['#3EA8FF', '#7C4DFF'],
  ['#FF8A3D', '#FFD23F'],
  ['#3FE0B0', '#3EA8FF'],
  ['#FF5CA8', '#FFD23F'],
  ['#B14BFF', '#3EA8FF'],
  ['#FFD23F', '#FF8A3D'],
  ['#2CD6C4', '#7C4DFF'],
  ['#FF6B6B', '#FF5CA8'],
  ['#6C8CFF', '#B14BFF'],
  ['#FFB84D', '#FF5E6C'],
  ['#57E389', '#3EA8FF'],
];

export const CATEGORIES: Category[] = [
  {
    id: 'cartoons',
    name: 'Cartoons & Shows',
    emoji: '📺',
    blurb: 'Giggles, animals, magic and superheroes',
    colors: ['#7C4DFF', '#FF5CA8'],
    subcategories: [
      { id: 'funny', name: 'Funny cartoons', emoji: '🤪' },
      { id: 'animals', name: 'Animal adventures', emoji: '🐼' },
      { id: 'fantasy', name: 'Fantasy & magic', emoji: '🪄' },
      { id: 'superhero', name: 'Superhero adventures', emoji: '🦸' },
      { id: 'comedy', name: 'Comedy shows', emoji: '😂' },
      { id: 'originals', name: 'Independent shorts', emoji: '🌟' },
    ],
  },
  {
    id: 'learning',
    name: 'Learning Zone',
    emoji: '🧠',
    blurb: 'Letters, numbers, science and big ideas',
    colors: ['#3EA8FF', '#3FE0B0'],
    subcategories: [
      { id: 'alphabet', name: 'Alphabet learning', emoji: '🔤' },
      { id: 'numbers', name: 'Numbers & counting', emoji: '🔢' },
      { id: 'science', name: 'Science experiments', emoji: '🧪' },
      { id: 'reading', name: 'Reading lessons', emoji: '📚' },
      { id: 'geography', name: 'Geography', emoji: '🌍' },
      { id: 'quizzes', name: 'Educational quizzes', emoji: '❓' },
    ],
  },
  {
    id: 'movies',
    name: 'Cartoon Classics',
    emoji: '🎬',
    blurb: 'Vintage fairy-tale cartoons for family movie time',
    colors: ['#FF5CA8', '#FF8A3D'],
    subcategories: [
      { id: 'animated', name: 'Animated classics', emoji: '🎨' },
      { id: 'family', name: 'Family cartoons', emoji: '👨‍👩‍👧' },
      { id: 'adventure', name: 'Adventure cartoons', emoji: '🗺️' },
      { id: 'movie-comedy', name: 'Comedy cartoons', emoji: '🎉' },
      { id: 'movie-fantasy', name: 'Fantasy cartoons', emoji: '💎' },
    ],
  },
  {
    id: 'music',
    name: 'Music & Fun',
    emoji: '🎵',
    blurb: 'Sing, dance and wiggle along',
    colors: ['#FFD23F', '#FF8A3D'],
    subcategories: [
      { id: 'rhymes', name: 'Nursery rhymes', emoji: '🎶' },
      { id: 'singalong', name: 'Sing-along songs', emoji: '🎤' },
      { id: 'dancing', name: 'Dancing videos', emoji: '💃' },
      { id: 'music', name: "Children's music", emoji: '🎹' },
      { id: 'musicals', name: 'Musical cartoons', emoji: '🌈' },
    ],
  },
  {
    id: 'bedtime',
    name: 'Bedtime Zone',
    emoji: '🌙',
    blurb: 'Soft stories and sleepy sounds',
    colors: ['#6C8CFF', '#B14BFF'],
    subcategories: [
      { id: 'stories', name: 'Bedtime stories', emoji: '📖' },
      { id: 'relaxing', name: 'Relaxing music', emoji: '☁️' },
      { id: 'sleep', name: 'Sleep stories', emoji: '😴' },
      { id: 'calm', name: 'Calm cartoons', emoji: '🐢' },
      { id: 'nighttime', name: 'Nighttime animations', emoji: '🌌' },
    ],
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<CategoryId, Category>
);

export const SUBCATEGORY_MAP = CATEGORIES.reduce((acc, category) => {
  category.subcategories.forEach((sub) => {
    acc[sub.id] = { ...sub, categoryId: category.id };
  });
  return acc;
}, {} as Record<SubcategoryId, { id: SubcategoryId; name: string; emoji: string; categoryId: CategoryId }>);

type Seed = {
  id: string;
  name: string;
  category: CategoryId;
  sub: SubcategoryId;
  rating: Rating;
  emoji: string;
  minutes: number;
  year: number;
  popularity: number;
  added: number;
  description: string;
  tags: string[];
};

const SEEDS: Seed[] = [
  // ── Cartoons & Shows ───────────────────────────────────────────────────────
  { id: 'big-buck-bunny', name: 'Big Buck Bunny', category: 'cartoons', sub: 'funny', rating: 'G', emoji: '🐰', minutes: 10, year: 2008, popularity: 99, added: 1,
    description: 'A gentle giant rabbit teaches three bullying rodents a wordless, slapstick lesson in this Blender open movie.', tags: ['classic', 'animals', 'silly'] },
  { id: 'simple-simon', name: 'Simple Simon', category: 'cartoons', sub: 'funny', rating: 'G', emoji: '🎣', minutes: 7, year: 1935, popularity: 82, added: 22,
    description: 'Simple Simon meets a cheerful fisherman and a very unusual catch in this sing-song ComiColor cartoon.', tags: ['classic', 'fairy tale', 'silly'] },
  { id: 'gran-dillama', name: 'Caminandes 2: Gran Dillama', category: 'cartoons', sub: 'animals', rating: 'G', emoji: '🦙', minutes: 2, year: 2013, popularity: 90, added: 10,
    description: 'Koro the llama tries to cross a busy desert road for a tasty bush — and finds traffic is not on his side.', tags: ['animals', 'silly'] },
  { id: 'llamigos', name: 'Caminandes 3: Llamigos', category: 'cartoons', sub: 'animals', rating: 'G', emoji: '🐧', minutes: 3, year: 2016, popularity: 92, added: 4,
    description: 'Koro and a hungry penguin discover that sharing a meal is better than stealing one.', tags: ['animals', 'friends', 'silly'] },
  { id: 'jack-and-the-beanstalk', name: 'Jack and the Beanstalk', category: 'cartoons', sub: 'fantasy', rating: 'G', emoji: '🌱', minutes: 8, year: 1933, popularity: 88, added: 12,
    description: 'Jack trades the family cow for magic beans and climbs into a giant’s world in this Ub Iwerks fairy-tale cartoon.', tags: ['fairy tale', 'classic', 'magic'] },
  { id: 'jack-frost', name: 'Jack Frost', category: 'cartoons', sub: 'fantasy', rating: 'PG', emoji: '❄️', minutes: 9, year: 1934, popularity: 80, added: 30,
    description: 'A young bear ventures into winter and meets the mischievous sprite who paints the frost.', tags: ['fairy tale', 'classic', 'winter'] },
  { id: 'the-valiant-tailor', name: 'The Valiant Tailor', category: 'cartoons', sub: 'superhero', rating: 'G', emoji: '✂️', minutes: 8, year: 1934, popularity: 79, added: 26,
    description: 'A clever tailor outwits a giant with nothing but a needle, thread and quick thinking.', tags: ['fairy tale', 'hero', 'classic'] },
  { id: 'puss-in-boots', name: 'Puss in Boots', category: 'cartoons', sub: 'superhero', rating: 'G', emoji: '🐱', minutes: 7, year: 1934, popularity: 86, added: 16,
    description: 'A boot-wearing cat uses charm and trickery to win a kingdom for his poor master.', tags: ['fairy tale', 'hero', 'animals'] },
  { id: 'the-three-bears', name: 'The Three Bears', category: 'cartoons', sub: 'comedy', rating: 'G', emoji: '🐻', minutes: 8, year: 1935, popularity: 84, added: 20,
    description: 'Goldilocks discovers porridge, chairs and three very surprised bears.', tags: ['fairy tale', 'classic', 'silly'] },
  { id: 'llama-drama', name: 'Caminandes 1: Llama Drama', category: 'cartoons', sub: 'comedy', rating: 'G', emoji: '🦙', minutes: 2, year: 2013, popularity: 87, added: 6,
    description: 'Koro the llama tries to reach a bush on the other side of a fence, with disastrously funny results.', tags: ['animals', 'silly'] },
  { id: 'spring', name: 'Spring', category: 'cartoons', sub: 'originals', rating: 'G', emoji: '🌸', minutes: 8, year: 2019, popularity: 95, added: 2,
    description: 'A shepherd girl and her dog face the spirit of winter in this hand-painted Blender short.', tags: ['magic', 'nature', 'gentle'] },
  { id: 'wing-it', name: 'Wing It!', category: 'cartoons', sub: 'originals', rating: 'PG', emoji: '🐦', minutes: 4, year: 2023, popularity: 89, added: 3,
    description: 'A determined bird tries to fly in this slapstick Blender short.', tags: ['animals', 'silly', 'adventure'] },

  // ── Learning Zone ──────────────────────────────────────────────────────────
  { id: 'abc-adventure', name: 'ABC Adventure', category: 'learning', sub: 'alphabet', rating: 'G', emoji: '🔤', minutes: 8, year: 2026, popularity: 94, added: 5,
    description: 'Hop from A to Z with Alfie the ant and his alphabet balloon.', tags: ['alphabet', 'learning'] },
  { id: 'letter-land', name: 'Letter Land', category: 'learning', sub: 'alphabet', rating: 'G', emoji: '🎈', minutes: 7, year: 2025, popularity: 82, added: 24,
    description: 'Every letter has a home in Letter Land. Come say hello!', tags: ['alphabet', 'learning'] },
  { id: 'count-with-coco', name: 'Count with Coco', category: 'learning', sub: 'numbers', rating: 'G', emoji: '🔢', minutes: 8, year: 2026, popularity: 93, added: 7,
    description: 'Count apples, socks and wiggly toes with Coco the counting monkey.', tags: ['numbers', 'learning'] },
  { id: 'number-ninjas', name: 'Number Ninjas', category: 'learning', sub: 'numbers', rating: 'PG', emoji: '🥷', minutes: 9, year: 2025, popularity: 81, added: 30,
    description: 'Sneaky number ninjas add and subtract with quiet high-fives.', tags: ['numbers', 'silly'] },
  { id: 'little-lab-coats', name: 'Little Lab Coats', category: 'learning', sub: 'science', rating: 'G', emoji: '🧪', minutes: 10, year: 2026, popularity: 90, added: 8,
    description: 'Safe bubbly experiments you can try at home with a grown-up.', tags: ['science', 'learning'] },
  { id: 'why-wonders', name: 'Why Wonders', category: 'learning', sub: 'science', rating: 'PG', emoji: '🔬', minutes: 9, year: 2025, popularity: 78, added: 35,
    description: 'Why is the sky blue? Why do cats purr? Let us wonder together.', tags: ['science', 'curious'] },
  { id: 'story-seeds', name: 'Story Seeds', category: 'learning', sub: 'reading', rating: 'G', emoji: '🌱', minutes: 8, year: 2026, popularity: 85, added: 11,
    description: 'Plant a word, grow a story. First sounds and friendly reading games.', tags: ['reading', 'learning'] },
  { id: 'read-and-roar', name: 'Read & Roar', category: 'learning', sub: 'reading', rating: 'G', emoji: '🦁', minutes: 7, year: 2025, popularity: 80, added: 39,
    description: 'Leo the lion reads aloud and roars the extra-fun words.', tags: ['reading', 'silly'] },
  { id: 'globe-trotters', name: 'Globe Trotters', category: 'learning', sub: 'geography', rating: 'G', emoji: '🌍', minutes: 10, year: 2026, popularity: 87, added: 12,
    description: 'Spin the globe and visit a new country every episode.', tags: ['geography', 'travel'] },
  { id: 'map-mates', name: 'Map Mates', category: 'learning', sub: 'geography', rating: 'PG', emoji: '🗺️', minutes: 9, year: 2024, popularity: 73, added: 62,
    description: 'Follow the map, find the treasure, learn the continents.', tags: ['geography', 'adventure'] },
  { id: 'quizzy-kids', name: 'Quizzy Kids', category: 'learning', sub: 'quizzes', rating: 'G', emoji: '❓', minutes: 8, year: 2026, popularity: 92, added: 10,
    description: 'Three rounds, silly buzzer sounds, and a star for everyone.', tags: ['quiz', 'silly'] },
  { id: 'brainy-bunch', name: 'Brainy Bunch', category: 'learning', sub: 'quizzes', rating: 'PG', emoji: '🧠', minutes: 10, year: 2025, popularity: 76, added: 44,
    description: 'Thinky questions about animals, space and the sea.', tags: ['quiz', 'science'] },

  // ── Movies ─────────────────────────────────────────────────────────────────
  { id: 'the-queen-of-hearts', name: 'The Queen of Hearts', category: 'movies', sub: 'animated', rating: 'G', emoji: '👑', minutes: 8, year: 1934, popularity: 83, added: 18,
    description: 'The Queen of Hearts bakes her famous tarts while the Knave plots a royal prank.', tags: ['fairy tale', 'classic', 'rhyme'] },
  { id: 'balloon-land', name: 'Balloon Land', category: 'movies', sub: 'animated', rating: 'G', emoji: '🎈', minutes: 7, year: 1935, popularity: 81, added: 24,
    description: 'A world where everyone is a balloon faces the prickly Pincushion Man.', tags: ['classic', 'fantasy', 'silly'] },
  { id: 'marys-little-lamb', name: "Mary's Little Lamb", category: 'movies', sub: 'family', rating: 'G', emoji: '🐑', minutes: 7, year: 1935, popularity: 78, added: 28,
    description: 'Mary’s lamb follows her to school and turns the classroom upside down.', tags: ['fairy tale', 'rhyme', 'animals', 'gentle'] },
  { id: 'the-bremen-town-musicians', name: 'The Bremen Town Musicians', category: 'movies', sub: 'family', rating: 'G', emoji: '🐴', minutes: 8, year: 1935, popularity: 82, added: 21,
    description: 'Four unwanted animals form a band and scare off a gang of robbers.', tags: ['fairy tale', 'animals', 'music'] },
  { id: 'don-quixote', name: 'Don Quixote', category: 'movies', sub: 'adventure', rating: 'PG', emoji: '🌬️', minutes: 8, year: 1934, popularity: 76, added: 34,
    description: 'A dreamy knight mistakes windmills for giants in this classic cartoon retelling.', tags: ['classic', 'adventure', 'silly'] },
  { id: 'tom-thumb', name: 'Tom Thumb', category: 'movies', sub: 'adventure', rating: 'G', emoji: '👍', minutes: 7, year: 1936, popularity: 77, added: 32,
    description: 'A boy no bigger than a thumb has a very big adventure.', tags: ['fairy tale', 'adventure', 'classic'] },
  { id: 'summertime', name: 'Summertime', category: 'movies', sub: 'movie-comedy', rating: 'G', emoji: '☀️', minutes: 8, year: 1935, popularity: 74, added: 40,
    description: 'A hot summer day turns into a splashy, musical cartoon comedy.', tags: ['classic', 'silly', 'music'] },
  { id: 'happy-days', name: 'Happy Days', category: 'movies', sub: 'movie-comedy', rating: 'G', emoji: '😊', minutes: 9, year: 1935, popularity: 72, added: 44,
    description: 'A cheerful trip through a bright, musical cartoon world.', tags: ['classic', 'music', 'silly'] },
  { id: 'the-brave-tin-soldier', name: 'The Brave Tin Soldier', category: 'movies', sub: 'movie-fantasy', rating: 'PG', emoji: '🪖', minutes: 7, year: 1934, popularity: 75, added: 38,
    description: 'A one-legged tin soldier braves wind and water for the love of a paper ballerina.', tags: ['fairy tale', 'classic', 'gentle'] },
  { id: 'dick-whittingtons-cat', name: "Dick Whittington's Cat", category: 'movies', sub: 'movie-fantasy', rating: 'G', emoji: '🐈', minutes: 8, year: 1936, popularity: 73, added: 42,
    description: 'A poor boy and his clever cat sail to a kingdom overrun by mice.', tags: ['fairy tale', 'animals', 'classic'] },

  // ── Music & Fun ────────────────────────────────────────────────────────────
  { id: 'nursery-rhyme-time', name: 'Nursery Rhyme Time', category: 'music', sub: 'rhymes', rating: 'G', emoji: '🎵', minutes: 24, year: 2026, popularity: 95, added: 4,
    description: 'All the classic rhymes with bright, bouncy animations.', tags: ['music', 'sing'] },
  { id: 'twinkle-tunes', name: 'Twinkle Tunes', category: 'music', sub: 'rhymes', rating: 'G', emoji: '✨', minutes: 22, year: 2025, popularity: 82, added: 28,
    description: 'Twinkle, twinkle… plus eleven more little star songs.', tags: ['music', 'gentle'] },
  { id: 'sing-with-sunny', name: 'Sing with Sunny', category: 'music', sub: 'singalong', rating: 'G', emoji: '🌞', minutes: 26, year: 2026, popularity: 94, added: 6,
    description: 'Follow the bouncing sun and sing along with big, easy words.', tags: ['sing', 'music'] },
  { id: 'karaoke-critters', name: 'Karaoke Critters', category: 'music', sub: 'singalong', rating: 'G', emoji: '🎤', minutes: 25, year: 2025, popularity: 85, added: 19,
    description: 'Critters take turns at the karaoke mic. Your turn next!', tags: ['sing', 'silly'] },
  { id: 'dance-party-pals', name: 'Dance Party Pals', category: 'music', sub: 'dancing', rating: 'G', emoji: '💃', minutes: 20, year: 2026, popularity: 91, added: 7,
    description: 'Simple dance moves for little feet and very big wiggles.', tags: ['dance', 'move'] },
  { id: 'move-and-groove', name: 'Move & Groove', category: 'music', sub: 'dancing', rating: 'G', emoji: '🕺', minutes: 21, year: 2025, popularity: 79, added: 41,
    description: 'Stretch, stomp, spin and giggle. A mini dance party at home.', tags: ['dance', 'move'] },
  { id: 'melody-makers', name: 'Melody Makers', category: 'music', sub: 'music', rating: 'G', emoji: '🎹', minutes: 23, year: 2026, popularity: 84, added: 13,
    description: 'Meet the piano, the drum and the very shy triangle.', tags: ['music', 'learning'] },
  { id: 'music-box-mornings', name: 'Music Box Mornings', category: 'music', sub: 'music', rating: 'G', emoji: '🎼', minutes: 22, year: 2024, popularity: 75, added: 58,
    description: 'Gentle morning melodies to start the day with a smile.', tags: ['music', 'gentle'] },
  { id: 'rainbow-musical', name: 'The Rainbow Musical', category: 'music', sub: 'musicals', rating: 'G', emoji: '🌈', minutes: 45, year: 2026, popularity: 92, added: 8,
    description: 'A whole musical about a raincloud who just wants to paint.', tags: ['music', 'magic'] },
  { id: 'barnyard-broadway', name: 'Barnyard Broadway', category: 'music', sub: 'musicals', rating: 'G', emoji: '🐮', minutes: 42, year: 2025, popularity: 77, added: 34,
    description: 'The cows are putting on a show, and the chickens are the band.', tags: ['music', 'silly'] },

  // ── Bedtime Zone ───────────────────────────────────────────────────────────
  { id: 'bedtime-with-bear', name: 'Bedtime with Bear', category: 'bedtime', sub: 'stories', rating: 'G', emoji: '🐻', minutes: 18, year: 2026, popularity: 93, added: 2,
    description: 'Bear reads one soft story, then turns out the little lantern.', tags: ['bedtime', 'gentle'] },
  { id: 'snuggle-stories', name: 'Snuggle Stories', category: 'bedtime', sub: 'stories', rating: 'G', emoji: '🧸', minutes: 16, year: 2025, popularity: 86, added: 23,
    description: 'Short, snuggly tales that end with everyone fast asleep.', tags: ['bedtime', 'gentle'] },
  { id: 'calm-clouds', name: 'Calm Clouds', category: 'bedtime', sub: 'relaxing', rating: 'G', emoji: '☁️', minutes: 30, year: 2026, popularity: 88, added: 9,
    description: 'Slow, floaty cloud shapes with soft piano music.', tags: ['calm', 'music'] },
  { id: 'sleepy-seas', name: 'Sleepy Seas', category: 'bedtime', sub: 'relaxing', rating: 'G', emoji: '🌊', minutes: 32, year: 2025, popularity: 81, added: 31,
    description: 'Gentle waves and sleepy whales rocking the ocean to rest.', tags: ['calm', 'nature'] },
  { id: 'dream-train', name: 'Dream Train', category: 'bedtime', sub: 'sleep', rating: 'G', emoji: '🚂', minutes: 35, year: 2026, popularity: 90, added: 5,
    description: 'All aboard the Dream Train for a slow ride to the land of nod.', tags: ['sleep', 'gentle'] },
  { id: 'moonlight-lullabies', name: 'Moonlight Lullabies', category: 'bedtime', sub: 'sleep', rating: 'G', emoji: '🌙', minutes: 28, year: 2024, popularity: 76, added: 47,
    description: 'Twelve quiet lullabies under a big friendly moon.', tags: ['sleep', 'music'] },
  { id: 'slow-and-cozy', name: 'Slow & Cozy', category: 'bedtime', sub: 'calm', rating: 'G', emoji: '🐢', minutes: 26, year: 2026, popularity: 83, added: 16,
    description: 'Turtle has nowhere to be. Walk slowly, breathe deeply, feel cozy.', tags: ['calm', 'gentle'] },
  { id: 'quiet-forest', name: 'Quiet Forest', category: 'bedtime', sub: 'calm', rating: 'G', emoji: '🌲', minutes: 30, year: 2025, popularity: 80, added: 36,
    description: 'Fireflies, ferns and the softest sounds of the forest at dusk.', tags: ['calm', 'nature'] },
  { id: 'night-sky-friends', name: 'Night Sky Friends', category: 'bedtime', sub: 'nighttime', rating: 'G', emoji: '⭐', minutes: 24, year: 2026, popularity: 87, added: 12,
    description: 'The stars come out to say goodnight, one by one.', tags: ['night', 'gentle'] },
  { id: 'starlight-adventures', name: 'Starlight Adventures', category: 'bedtime', sub: 'nighttime', rating: 'PG', emoji: '🌠', minutes: 27, year: 2025, popularity: 74, added: 42,
    description: 'Two little night owls explore the sky before bedtime.', tags: ['night', 'adventure'] },
];

const EPISODE_NAMES: Record<CategoryId, string[]> = {
  cartoons: ['A Wiggly Beginning', 'The Big Surprise', 'Bubbles Everywhere', 'A Very Silly Day', 'The Lost Giggle', 'Super Star Finale', 'The Wobble Dance', 'Everybody Helps'],
  learning: ['Let’s Begin!', 'Try It Again', 'A Is for Adventure', 'Count With Me', 'Little Quiz Time', 'Great Job!', 'One More Idea', 'You Did It!'],
  movies: ['Full Movie'],
  music: ['Warm-Up Song', 'Clap Along', 'The Silly Verse', 'Everybody Sing', 'Big Finish', 'One More Time!', 'Quiet Verse', 'Goodnight Song'],
  bedtime: ['Once Upon a Time', 'The Sleepy River', 'One More Hug', 'Shhh…', 'Under the Stars', 'Sweet Dreams', 'The Last Yawn', 'Goodnight'],
};

function buildEpisodes(seed: Seed): Episode[] {
  // Real cartoons and films are standalone shorts: one exact, named video each.
  const isShort = seed.category === 'cartoons' || seed.category === 'movies';
  const count = isShort ? 1 : 4;
  const exact = MEDIA_CLIPS[seed.id];
  const clips = isShort && exact ? [exact] : clipsForTitle(seed.id, seed.sub);
  return Array.from({ length: count }, (_, i) => {
    const clip = clips[i % clips.length] ?? MEDIA_CLIPS['big-buck-bunny'];
    const names = EPISODE_NAMES[seed.category];
    return {
      id: `${seed.id}-e${i + 1}`,
      titleId: seed.id,
      number: i + 1,
      name: isShort ? (seed.category === 'movies' ? 'Full movie' : 'Full cartoon') : names[i % names.length],
      durationMin: Math.max(1, Math.round(clip.durationSec / 60)),
      hlsUrl: clip.streamUrl,
      mp4Url: clip.streamUrl,
      downloadUrl: clip.downloadUrl ?? clip.streamUrl,
      clipId: clip.id,
      attribution: creditFor(clip),
      captions: captionsForClip(clip.id),
    };
  });
}

export const allTitles: Title[] = SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  category: seed.category,
  subcategory: seed.sub,
  rating: seed.rating,
  emoji: seed.emoji,
  palette: index % PALETTES.length,
  minutes: seed.minutes,
  year: seed.year,
  description: seed.description,
  popularity: seed.popularity,
  addedDaysAgo: seed.added,
  episodes: buildEpisodes(seed),
  tags: seed.tags,
}));

export const titleById: Record<string, Title> = allTitles.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {} as Record<string, Title>);

export const FEATURED_IDS = ['big-buck-bunny', 'jack-and-the-beanstalk', 'spring', 'abc-adventure'];

export const FEATURED = FEATURED_IDS.map((id) => titleById[id]).filter(Boolean);

export function maxRatingForAge(age: AgeGroup): Rating {
  if (age === 'toddler') return 'G';
  if (age === 'kid') return 'PG';
  return 'Y7';
}

export function isAgeAllowed(title: Title, ageLimit: Rating): boolean {
  return ratingRank[title.rating] <= ratingRank[ageLimit];
}

export function visibleTitles(ageLimit: Rating): Title[] {
  return allTitles.filter((t) => isAgeAllowed(t, ageLimit));
}

export function titlesInSub(category: CategoryId, subcategory: SubcategoryId): Title[] {
  return allTitles.filter((t) => t.category === category && t.subcategory === subcategory);
}

export function titlesInCategory(category: CategoryId): Title[] {
  return allTitles.filter((t) => t.category === category);
}

export function searchCatalog(query: string, category: CategoryId | 'all' = 'all'): Title[] {
  const q = query.trim().toLowerCase();
  return allTitles.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (!q) return true;
    const sub = SUBCATEGORY_MAP[t.subcategory]?.name ?? '';
    const cat = CATEGORY_MAP[t.category].name;
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      sub.toLowerCase().includes(q) ||
      cat.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
    );
  });
}

export function recommendedFor(profile: Profile, favorites: string[], history: string[]): Title[] {
  const favTitles = favorites.map((id) => titleById[id]).filter(Boolean) as Title[];
  const lovedTags = new Set(favTitles.flatMap((t) => t.tags));
  const remote = new Set(history);
  return visibleTitles(profile.ageLimit)
    .map((t) => {
      let score = t.popularity / 10;
      if (t.tags.some((tag) => lovedTags.has(tag))) score += 8;
      if (remote.has(t.id)) score -= 3;
      if (t.rating === profile.ageLimit) score += 1.5;
      score += (10 - Math.min(t.addedDaysAgo, 10)) / 10;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map((x) => x.t);
}

export function getEpisode(titleId: string, episodeId?: string): Episode | undefined {
  const title = titleById[titleId];
  if (!title) return undefined;
  return title.episodes.find((e) => e.id === episodeId) ?? title.episodes[0];
}

export function nextEpisode(titleId: string, episodeId: string): Episode | undefined {
  const title = titleById[titleId];
  if (!title) return undefined;
  const idx = title.episodes.findIndex((e) => e.id === episodeId);
  return idx >= 0 ? title.episodes[idx + 1] : undefined;
}

export function prevEpisode(titleId: string, episodeId: string): Episode | undefined {
  const title = titleById[titleId];
  if (!title) return undefined;
  const idx = title.episodes.findIndex((e) => e.id === episodeId);
  return idx > 0 ? title.episodes[idx - 1] : undefined;
}

export function suggestedQueries(): string[] {
  return ['Panda Pals', 'Alphabet', 'Bedtime', 'Superhero', 'Sing-along', 'Space', 'Counting'];
}
