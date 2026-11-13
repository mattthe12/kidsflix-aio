import type { SubcategoryId } from '../types';

/**
 * Free, openly licensed demo video library.
 *
 * Every stream below was checked with ffprobe (H.264 + AAC, direct MP4) and its
 * licence was read from the host item metadata:
 *  - Blender Foundation open movies: Creative Commons Attribution 3.0 / 4.0.
 *  - Ub Iwerks ComiColor cartoons: public domain (complete 1933–36 collection).
 *  - NASA and NOAA: U.S. federal government works, public domain.
 *  - Prelinger Archives: public-domain educational films.
 *
 * Attribution is required for the Creative Commons clips, so every episode
 * carries a credit line into the player and README.md lists the full sources.
 * Replace this file with your licensed catalogue for production.
 */
export type MediaLicense = 'CC BY 3.0' | 'CC BY 4.0' | 'Public domain';

export interface MediaClip {
  id: string;
  name: string;
  creator: string;
  license: MediaLicense;
  licenseUrl: string;
  sourceUrl: string;
  streamUrl: string;
  /** Smaller rendition used for offline downloads where the host provides one. */
  downloadUrl?: string;
  durationSec: number;
  sizeMb?: number;
  year?: number;
}

const COMICOLOR_BASE =
  'https://archive.org/download/ub-iwerks-comicolor-classics-the-complete-collection-1933-36/';
const COMICOLOR_SOURCE =
  'https://archive.org/details/ub-iwerks-comicolor-classics-the-complete-collection-1933-36';

/** A named Ub Iwerks ComiColor cartoon from the public-domain complete collection. */
function comicolor(
  id: string,
  name: string,
  year: number,
  file: string,
  durationSec: number
): MediaClip {
  return {
    id,
    name,
    year,
    creator: 'Ub Iwerks / Celebrity Pictures',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: COMICOLOR_SOURCE,
    streamUrl: `${COMICOLOR_BASE}${encodeURIComponent(file)}`,
    durationSec,
  };
}

const COMICOLOR_CLIPS: MediaClip[] = [
  comicolor('jack-and-the-beanstalk', 'Jack and the Beanstalk', 1933,
    'Comicolor Cartoons - Jack and the Beanstalk - 1933 (Remastered).mp4', 491),
  comicolor('puss-in-boots', 'Puss in Boots', 1934,
    'Comicolor Cartoons - Puss in Boots - 1934 (Remastered).mp4', 427),
  comicolor('jack-frost', 'Jack Frost', 1934,
    'Comicolor Cartoons - Jack Frost - 1934.mp4', 512),
  comicolor('the-valiant-tailor', 'The Valiant Tailor', 1934,
    'Comicolor Cartoons - The Valiant Tailor - 1934 (HD).mp4', 494),
  comicolor('the-three-bears', 'The Three Bears', 1935,
    'Comicolor Cartoons - The Three Bears - 1935 (HD).mp4', 475),
  comicolor('simple-simon', 'Simple Simon', 1935,
    'Comicolor Cartoon - Simple Simon - 1935.mp4', 403),
  comicolor('the-queen-of-hearts', 'The Queen of Hearts', 1934,
    'Comicolor Cartoons - The Queen of Hearts - 1934 (HD Remastered).mp4', 483),
  comicolor('balloon-land', 'Balloon Land', 1935,
    'ComiColor Classics - Balloon Land (1935).mp4', 422),
  comicolor('marys-little-lamb', "Mary's Little Lamb", 1935,
    "ComiColor Cartoon - Mary's Little Lamb - 1935.mp4", 446),
  comicolor('the-bremen-town-musicians', 'The Bremen Town Musicians', 1935,
    'ComiColor Classics - The Bremen Town Musicians (1935).mp4', 501),
  comicolor('don-quixote', 'Don Quixote', 1934,
    'Comicolor Cartoons - Don Quixote - 1934.mp4', 489),
  comicolor('the-brave-tin-soldier', 'The Brave Tin Soldier', 1934,
    'Comicolor Cartoons - The Brave Tin Soldier - 1934 (Remastered).mp4', 432),
  comicolor('summertime', 'Summertime', 1935,
    'ComiColor Cartoon - Summertime - 1935.mp4', 484),
  comicolor('happy-days', 'Happy Days', 1935,
    'ComiColor Cartoons - Happy Days.mp4', 528),
  comicolor('tom-thumb', 'Tom Thumb', 1936,
    'Comicolor Cartoons - Tom Thumb - 1936 (HD).mp4', 420),
  comicolor('dick-whittingtons-cat', "Dick Whittington's Cat", 1936,
    'Comicolor Cartoons - Dick Whittington\'s Cat - 1936 (HD).mp4', 452),
];

export const MEDIA_CLIPS: Record<string, MediaClip> = {
  ...Object.fromEntries(COMICOLOR_CLIPS.map((c) => [c.id, c])),
  'big-buck-bunny': {
    id: 'big-buck-bunny',
    name: 'Big Buck Bunny',
    creator: 'Blender Foundation',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://archive.org/details/BigBuckBunny_124',
    streamUrl:
      'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
    durationSec: 596,
    sizeMb: 59,
  },
  'llama-drama': {
    id: 'llama-drama',
    name: 'Caminandes 1: Llama Drama',
    creator: 'Blender Foundation',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://archive.org/details/Caminandes1LlamaDrama',
    streamUrl:
      'https://archive.org/download/Caminandes1LlamaDrama/01_llama_drama_1080p.mp4',
    durationSec: 90,
    sizeMb: 33.5,
  },
  'gran-dillama': {
    id: 'gran-dillama',
    name: 'Caminandes 2: Gran Dillama',
    creator: 'Blender Foundation',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://archive.org/details/Caminandes2GranDillama',
    streamUrl:
      'https://archive.org/download/Caminandes2GranDillama/02_gran_dillama_1080p.mp4',
    durationSec: 146,
    sizeMb: 120,
  },
  llamigos: {
    id: 'llamigos',
    name: 'Caminandes 3: Llamigos',
    creator: 'Blender Foundation',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://archive.org/details/CaminandesLlamigos',
    streamUrl:
      'https://archive.org/download/CaminandesLlamigos/Caminandes_%20Llamigos-1080p.mp4',
    durationSec: 150,
    sizeMb: 132,
  },
  spring: {
    id: 'spring',
    name: 'Spring',
    creator: 'Blender Foundation',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://archive.org/details/springopenmovie',
    streamUrl: 'https://archive.org/download/springopenmovie/springopenmovie.mp4',
    durationSec: 464,
    sizeMb: 86,
  },
  'wing-it': {
    id: 'wing-it',
    name: 'Wing It!',
    creator: 'Blender Foundation',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://archive.org/details/wing_it',
    streamUrl: 'https://archive.org/download/wing_it/wing_it.mp4',
    durationSec: 238,
    sizeMb: 62.5,
  },
  'animal-alphabet': {
    id: 'animal-alphabet',
    name: "Andy's Animal Alphabet",
    creator: 'Prelinger Archives',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://archive.org/details/AndysAnimalA',
    streamUrl: 'https://archive.org/download/AndysAnimalA/AndysAnimalA_512kb.mp4',
    durationSec: 606,
    sizeMb: 42,
  },
  'mother-goose': {
    id: 'mother-goose',
    name: 'Mother Goose Stories',
    creator: 'Prelinger Archives',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://archive.org/details/MotherGooseS',
    streamUrl: 'https://archive.org/download/MotherGooseS/MotherGooseS_512kb.mp4',
    durationSec: 585,
    sizeMb: 40.6,
  },
  'making-books': {
    id: 'making-books',
    name: 'Making Books',
    creator: 'Prelinger Archives',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://archive.org/details/MakingBo1947',
    streamUrl: 'https://archive.org/download/MakingBo1947/MakingBo1947_512kb.mp4',
    durationSec: 647,
    sizeMb: 43.6,
  },
  octopus: {
    id: 'octopus',
    name: 'Octopus Friday on Saturday',
    creator: 'NOAA Ocean Exploration',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl:
      'https://archive.org/details/noaa-oe-video-okeanos-explorations-ex1905-dailyupdates-sept14-media-octopus-friday-on-saturday',
    streamUrl:
      'https://archive.org/download/noaa-oe-video-okeanos-explorations-ex1905-dailyupdates-sept14-media-octopus-friday-on-saturday/octopus-friday-on-saturday-1920x1080-2.mp4',
    durationSec: 113,
    sizeMb: 108,
  },
  goosefish: {
    id: 'goosefish',
    name: 'Grumpy Goosefish',
    creator: 'NOAA Ocean Exploration',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl:
      'https://archive.org/details/noaa-oe-video-okeanos-explorations-ex1907-dailyupdates-nov2-media-dive02-goosefish',
    streamUrl:
      'https://archive.org/download/noaa-oe-video-okeanos-explorations-ex1907-dailyupdates-nov2-media-dive02-goosefish/dive02-goosefish-1280x720-1.mp4',
    durationSec: 82,
    sizeMb: 78,
  },
  jelly: {
    id: 'jelly',
    name: 'Twirling Jelly',
    creator: 'NOAA Ocean Exploration',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl:
      'https://archive.org/details/noaa-oe-video-okeanos-explorations-ex1907-logs-nov3-media-helmet-jelly',
    streamUrl:
      'https://archive.org/download/noaa-oe-video-okeanos-explorations-ex1907-logs-nov3-media-helmet-jelly/jelly-1920x1080-2.mp4',
    durationSec: 67,
    sizeMb: 64,
  },
  'sea-lion-cave': {
    id: 'sea-lion-cave',
    name: 'Sea Lion Cave',
    creator: 'NOAA Ocean Exploration',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl:
      'https://archive.org/details/noaa-oe-video-explorations-22sunfish-features-heaton-submerged-intern-media-cave-video',
    streamUrl:
      'https://archive.org/download/noaa-oe-video-explorations-22sunfish-features-heaton-submerged-intern-media-cave-video/SUNFISH-OSP-Deployment-Video-1280x720-1.mp4',
    durationSec: 15,
    sizeMb: 5.9,
  },
  underdogs: {
    id: 'underdogs',
    name: 'Deep-Sea Underdogs',
    creator: 'NOAA Ocean Exploration',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl: 'https://archive.org/details/noaa-oe-video-deep-sea-underdogs',
    streamUrl:
      'https://archive.org/download/noaa-oe-video-deep-sea-underdogs/dive13-underdogs.mp4',
    durationSec: 106,
    sizeMb: 102,
  },
  'earth-views': {
    id: 'earth-views',
    name: 'Earth Views from the International Space Station',
    creator: 'NASA',
    license: 'Public domain',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    sourceUrl:
      'https://images.nasa.gov/details/Earth%20Views%20from%20the%20International%20Space%20Station',
    streamUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~medium.mp4',
    downloadUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~mobile.mp4',
    durationSec: 201,
    sizeMb: 55,
  },
  'moon-phases': {
    id: 'moon-phases',
    name: 'STEMonstrations: Moon Phases',
    creator: 'NASA',
    license: 'Public domain',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    sourceUrl:
      'https://images.nasa.gov/details/jsc2020m000081-STEMonstrations_Moon_Phases',
    streamUrl:
      'https://images-assets.nasa.gov/video/jsc2020m000081-STEMonstrations_Moon_Phases/jsc2020m000081-STEMonstrations_Moon_Phases~medium.mp4',
    downloadUrl:
      'https://images-assets.nasa.gov/video/jsc2020m000081-STEMonstrations_Moon_Phases/jsc2020m000081-STEMonstrations_Moon_Phases~mobile.mp4',
    durationSec: 261,
    sizeMb: 78,
  },
  'water-cycle': {
    id: 'water-cycle',
    name: 'GPM: The Water Cycle',
    creator: 'NASA',
    license: 'Public domain',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    sourceUrl:
      'https://images.nasa.gov/details/GSFC_20121221_GPM_m11165_ESA_Water_Cycle',
    streamUrl:
      'https://images-assets.nasa.gov/video/GSFC_20121221_GPM_m11165_ESA_Water_Cycle/GSFC_20121221_GPM_m11165_ESA_Water_Cycle~medium.mp4',
    durationSec: 16,
    sizeMb: 3.7,
  },
  aurora: {
    id: 'aurora',
    name: 'The Aurora Named STEVE',
    creator: 'NASA',
    license: 'Public domain',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    sourceUrl:
      'https://images.nasa.gov/details/GSFC_20180314_Aurora_m12865_Steve',
    streamUrl:
      'https://images-assets.nasa.gov/video/GSFC_20180314_Aurora_m12865_Steve/GSFC_20180314_Aurora_m12865_Steve~medium.mp4',
    durationSec: 133,
    sizeMb: 37,
  },
  'rocket-launch': {
    id: 'rocket-launch',
    name: 'TROPICS Rocket Launch',
    creator: 'NASA',
    license: 'Public domain',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    sourceUrl:
      'https://images.nasa.gov/details/KSC-20230507-MH-RLS01-TROPICS_Rocket_Launch-Rocket_Lab-WON_3330130',
    streamUrl:
      'https://images-assets.nasa.gov/video/KSC-20230507-MH-RLS01-TROPICS_Rocket_Launch-Rocket_Lab-WON_3330130/KSC-20230507-MH-RLS01-TROPICS_Rocket_Launch-Rocket_Lab-WON_3330130~medium.mp4',
    durationSec: 30,
    sizeMb: 15.4,
  },
};

export const ALL_MEDIA_CLIPS: MediaClip[] = Object.values(MEDIA_CLIPS);

/**
 * Clip pools per subcategory. Episodes cycle through the pool, so the first
 * four episodes of a show stay on-theme instead of reusing one global clip.
 */
export const CLIPS_BY_SUB: Record<SubcategoryId, string[]> = {
  funny: ['big-buck-bunny', 'simple-simon'],
  animals: ['gran-dillama', 'llamigos', 'big-buck-bunny'],
  fantasy: ['jack-and-the-beanstalk', 'jack-frost'],
  superhero: ['the-valiant-tailor', 'puss-in-boots'],
  comedy: ['the-three-bears', 'llama-drama', 'big-buck-bunny'],
  originals: ['spring', 'wing-it'],
  alphabet: ['animal-alphabet', 'making-books'],
  numbers: ['rocket-launch', 'moon-phases', 'water-cycle'],
  science: ['water-cycle', 'moon-phases', 'aurora'],
  reading: ['making-books', 'animal-alphabet'],
  geography: ['earth-views', 'aurora', 'sea-lion-cave'],
  quizzes: ['underdogs', 'octopus', 'goosefish'],
  animated: ['the-queen-of-hearts', 'balloon-land'],
  family: ['marys-little-lamb', 'the-bremen-town-musicians'],
  adventure: ['don-quixote', 'tom-thumb'],
  'movie-comedy': ['summertime', 'happy-days'],
  'movie-fantasy': ['the-brave-tin-soldier', 'dick-whittingtons-cat'],
  rhymes: ['mother-goose', 'animal-alphabet'],
  singalong: ['mother-goose', 'animal-alphabet', 'wing-it'],
  dancing: ['llamigos', 'wing-it', 'gran-dillama'],
  music: ['spring', 'gran-dillama', 'wing-it'],
  musicals: ['mother-goose', 'spring', 'llamigos'],
  stories: ['spring', 'mother-goose', 'moon-phases'],
  relaxing: ['aurora', 'earth-views', 'sea-lion-cave'],
  sleep: ['moon-phases', 'aurora', 'earth-views'],
  calm: ['sea-lion-cave', 'spring', 'jelly'],
  nighttime: ['aurora', 'moon-phases', 'earth-views'],
};

/**
 * Hand-picked overrides where a title needs a more specific clip than its
 * subcategory pool (e.g. Ocean Buddies should not open with a woodland bunny).
 */
export const TITLE_CLIPS: Record<string, string[]> = {
  'panda-pals': ['big-buck-bunny', 'llama-drama'],
  'ocean-buddies': ['octopus', 'jelly', 'sea-lion-cave', 'goosefish'],
  'dragon-daycare': ['wing-it', 'llamigos'],
  'mystic-meadow': ['spring', 'aurora'],
  'captain-comet': ['rocket-launch', 'earth-views', 'moon-phases'],
  'mega-minis': ['rocket-launch', 'earth-views'],
  'starberry-friends': ['llamigos', 'spring'],
  'cloud-keepers': ['aurora', 'earth-views', 'spring'],
  'abc-adventure': ['animal-alphabet'],
  'letter-land': ['animal-alphabet', 'making-books'],
  'count-with-coco': ['rocket-launch', 'water-cycle'],
  'number-ninjas': ['rocket-launch', 'moon-phases'],
  'little-lab-coats': ['water-cycle', 'moon-phases'],
  'why-wonders': ['moon-phases', 'aurora'],
  'story-seeds': ['making-books', 'animal-alphabet'],
  'read-and-roar': ['animal-alphabet', 'making-books'],
  'globe-trotters': ['earth-views', 'aurora'],
  'map-mates': ['earth-views', 'sea-lion-cave'],
  'quizzy-kids': ['underdogs', 'octopus'],
  'brainy-bunch': ['goosefish', 'jelly'],
  'nursery-rhyme-time': ['mother-goose'],
  'twinkle-tunes': ['mother-goose', 'aurora'],
  'sing-with-sunny': ['mother-goose', 'animal-alphabet'],
  'karaoke-critters': ['animal-alphabet', 'mother-goose'],
  'dance-party-pals': ['llamigos', 'wing-it'],
  'move-and-groove': ['wing-it', 'llamigos'],
  'melody-makers': ['spring', 'gran-dillama'],
  'music-box-mornings': ['aurora', 'spring'],
  'rainbow-musical': ['spring', 'mother-goose'],
  'barnyard-broadway': ['mother-goose', 'gran-dillama'],
  'bedtime-with-bear': ['spring', 'moon-phases'],
  'snuggle-stories': ['mother-goose', 'spring'],
  'calm-clouds': ['aurora', 'earth-views'],
  'sleepy-seas': ['sea-lion-cave', 'jelly', 'octopus'],
  'dream-train': ['moon-phases', 'aurora'],
  'moonlight-lullabies': ['moon-phases', 'aurora'],
  'slow-and-cozy': ['sea-lion-cave', 'spring'],
  'quiet-forest': ['spring', 'aurora'],
  'night-sky-friends': ['aurora', 'moon-phases'],
  'starlight-adventures': ['moon-phases', 'earth-views'],
};

export function clipsForTitle(titleId: string, sub: SubcategoryId): MediaClip[] {
  const ids = TITLE_CLIPS[titleId] ?? CLIPS_BY_SUB[sub];
  return ids.map((id) => MEDIA_CLIPS[id]).filter(Boolean);
}

export function creditFor(clip: MediaClip): string {
  const year = clip.year ? ` (${clip.year})` : '';
  return `${clip.name}${year} — ${clip.creator} · ${clip.license}`;
}
