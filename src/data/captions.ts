import type { CaptionTrack } from '../types';

/**
 * Real, sourced closed-caption tracks for the demo media library.
 *
 * Sources:
 *  - NASA video captions (public domain): images.nasa.gov
 *  - Wikimedia Commons TimedText for Blender open movies (CC BY-SA 4.0):
 *    commons.wikimedia.org/wiki/TimedText
 *  - Internet Archive auto-generated captions for public-domain Prelinger films.
 *    These are labelled "auto" in the UI because they are machine-generated.
 *
 * Clips without a published caption file intentionally have no track. The
 * player shows an honest "captions not published" message instead of inventing
 * dialogue that is not in the video.
 */
export const CAPTIONS_BY_CLIP: Record<string, CaptionTrack[]> = {
  "big-buck-bunny": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 5.489,
          "end": 6.201,
          "text": "( crow cawing )"
        },
        {
          "start": 20.3,
          "end": 22,
          "text": "( bird chirping )"
        },
        {
          "start": 24.98,
          "end": 27,
          "text": "THE PEACH OPEN MOVIE PROJECT PRESENTS"
        },
        {
          "start": 28,
          "end": 33,
          "text": "BIG BUCK BUNNY"
        },
        {
          "start": 40,
          "end": 42,
          "text": "( snoring )"
        },
        {
          "start": 54.2,
          "end": 56,
          "text": "( yawning )"
        },
        {
          "start": 81,
          "end": 84,
          "text": "( peaceful music playing )"
        },
        {
          "start": 98.8,
          "end": 99.333,
          "text": "( chomps )"
        },
        {
          "start": 135,
          "end": 137,
          "text": "( footsteps running )"
        },
        {
          "start": 137,
          "end": 138,
          "text": "( leaves rustling )"
        },
        {
          "start": 150.985,
          "end": 153.231,
          "text": "( sneaky music playing )"
        },
        {
          "start": 157.23,
          "end": 158.111,
          "text": "( squirrel chirps )"
        },
        {
          "start": 165,
          "end": 166.656,
          "text": "( squirrels laughing )"
        },
        {
          "start": 176,
          "end": 180,
          "text": "( banging )"
        },
        {
          "start": 182,
          "end": 185,
          "text": "- ( action music playing ) - ( banging continues )"
        },
        {
          "start": 209,
          "end": 212,
          "text": "( sad music playing )"
        },
        {
          "start": 227.98,
          "end": 232.222,
          "text": "( action music playing )"
        },
        {
          "start": 258.65,
          "end": 264.832,
          "text": "( epic music playing )"
        },
        {
          "start": 274.734,
          "end": 278,
          "text": "( joyful music playing )"
        },
        {
          "start": 282,
          "end": 289,
          "text": "( epic music continues )"
        },
        {
          "start": 332,
          "end": 335.666,
          "text": "- ( branch cracking ) - ( squirrels chirping )"
        },
        {
          "start": 341,
          "end": 342,
          "text": "( screams )"
        },
        {
          "start": 349.128,
          "end": 352,
          "text": "- ( exclaims ) - ( rumbling )"
        },
        {
          "start": 377,
          "end": 380,
          "text": "( screams )"
        },
        {
          "start": 424,
          "end": 426,
          "text": "( branches cracking )"
        },
        {
          "start": 440.559,
          "end": 442.431,
          "text": "( leaves snapping )"
        },
        {
          "start": 445.444,
          "end": 446.888,
          "text": "( screams )"
        },
        {
          "start": 461,
          "end": 462.3,
          "text": "( squirrel screaming )"
        },
        {
          "start": 466.5,
          "end": 473.5,
          "text": "( heroic music playing )"
        },
        {
          "start": 495.5,
          "end": 501.679,
          "text": "( epic closing music playing )"
        },
        {
          "start": 584.54,
          "end": 590.54,
          "text": "( epic closing music continues )"
        }
      ],
      "credit": "Wikimedia Commons timed text · CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/TimedText:Big_Buck_Bunny_4K.webm.en.srt"
    },
    {
      "lang": "es",
      "label": "Español",
      "cues": [
        {
          "start": 5.489,
          "end": 6.201,
          "text": "(Cuervo graznando)"
        },
        {
          "start": 20.3,
          "end": 22,
          "text": "(Pájaro cantando)"
        },
        {
          "start": 24.98,
          "end": 27,
          "text": "The Peach Open Movie Pronect (el proyecto de cine abierto Durazno) presenta..."
        },
        {
          "start": 28,
          "end": 33,
          "text": "BIG BUCK BUNNY (El conejo grande - ¡Cuidado con las trampas!)"
        },
        {
          "start": 40,
          "end": 42,
          "text": "(Ronquidos)"
        },
        {
          "start": 54.2,
          "end": 56,
          "text": "(Bostezos)"
        },
        {
          "start": 81,
          "end": 84,
          "text": "(Música tranquila sonando)"
        },
        {
          "start": 98.8,
          "end": 99.333,
          "text": "(Sonido de mastica)"
        },
        {
          "start": 135,
          "end": 137,
          "text": "(Pasos corriendo)"
        },
        {
          "start": 137,
          "end": 138,
          "text": "(Susurro de las hojas)"
        },
        {
          "start": 150.985,
          "end": 153.231,
          "text": "(Música discreta sonando)"
        },
        {
          "start": 157.23,
          "end": 158.111,
          "text": "(Ardilla chillando)"
        },
        {
          "start": 165,
          "end": 166.656,
          "text": "(Ardillas riendo)"
        },
        {
          "start": 176,
          "end": 180,
          "text": "(Golpeando)"
        },
        {
          "start": 182,
          "end": 185,
          "text": "- (Música de acción sonando) - (Los golpes continúan)"
        },
        {
          "start": 209,
          "end": 212,
          "text": "(Música triste sonando)"
        },
        {
          "start": 227.98,
          "end": 232.222,
          "text": "(Música de acción sonando)"
        },
        {
          "start": 258.65,
          "end": 264.832,
          "text": "(Música épica sonando)"
        },
        {
          "start": 274.734,
          "end": 278,
          "text": "(Música feliz sonando)"
        },
        {
          "start": 282,
          "end": 289,
          "text": "(Música épica continúa)"
        },
        {
          "start": 332,
          "end": 335.666,
          "text": "- (Crujido de ramas) - (Ardillas chillando)"
        },
        {
          "start": 341,
          "end": 342,
          "text": "(Gritos)"
        },
        {
          "start": 349.128,
          "end": 352,
          "text": "- (Exclamación) - (Sonido retumbante)"
        },
        {
          "start": 377,
          "end": 380,
          "text": "(Gritos)"
        },
        {
          "start": 424,
          "end": 426,
          "text": "(Crujido de ramas)"
        },
        {
          "start": 440.559,
          "end": 442.431,
          "text": "(Hojas rompiéndose)"
        },
        {
          "start": 445.444,
          "end": 446.888,
          "text": "(Gritos)"
        },
        {
          "start": 461,
          "end": 462.3,
          "text": "(Ardilla gritando)"
        },
        {
          "start": 466.5,
          "end": 473.5,
          "text": "(Música heroica sonando)"
        },
        {
          "start": 495.5,
          "end": 501.679,
          "text": "(Música de cierre épica sonando)"
        },
        {
          "start": 584.54,
          "end": 590.54,
          "text": "(Música de cierre épica continúa)"
        }
      ],
      "credit": "Wikimedia Commons timed text · CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/TimedText:Big_Buck_Bunny_4K.webm.es.srt"
    }
  ],
  "spring": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 15.84,
          "end": 16.88,
          "text": "[note plays]"
        },
        {
          "start": 39.04,
          "end": 41.68,
          "text": "[dog barking]"
        },
        {
          "start": 46,
          "end": 47.64,
          "text": "[Spring whistles]"
        },
        {
          "start": 54.16,
          "end": 56.36,
          "text": "Oo...ha!"
        },
        {
          "start": 57.42,
          "end": 58.68,
          "text": "[exclaims]"
        },
        {
          "start": 101.12,
          "end": 103.42,
          "text": "[breathing more heavily]"
        },
        {
          "start": 103.5,
          "end": 105.98,
          "text": "[creature snores]"
        },
        {
          "start": 108.76,
          "end": 110.92,
          "text": "- [exhales] - [dog calls]"
        },
        {
          "start": 128.06,
          "end": 130.44,
          "text": "[barks, echoes]"
        },
        {
          "start": 143.62,
          "end": 145.12,
          "text": "[grunts]"
        },
        {
          "start": 168.14,
          "end": 170.78,
          "text": "[creature groans]"
        },
        {
          "start": 182.46,
          "end": 184.94,
          "text": "[bones move melodically]"
        },
        {
          "start": 203.72,
          "end": 206.76,
          "text": "[mystical tunes]"
        },
        {
          "start": 207.08,
          "end": 207.8,
          "text": "Eh?"
        },
        {
          "start": 215.46,
          "end": 220.34,
          "text": "[tunes in response]"
        },
        {
          "start": 220.44,
          "end": 222.88,
          "text": "[giggles]"
        },
        {
          "start": 317.44,
          "end": 319.38,
          "text": "[groaning]"
        },
        {
          "start": 321.48,
          "end": 323.04,
          "text": "[barks]"
        },
        {
          "start": 355.04,
          "end": 356.6,
          "text": "SPRING: Woohoo!"
        },
        {
          "start": 394.54,
          "end": 396.36,
          "text": "[water flowing]"
        },
        {
          "start": 408.28,
          "end": 411.04,
          "text": "[giggling]"
        }
      ],
      "credit": "Wikimedia Commons timed text · CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/TimedText:Spring_-_Blender_Open_Movie.webm.en.srt"
    },
    {
      "lang": "es",
      "label": "Español",
      "cues": [
        {
          "start": 15.84,
          "end": 16.88,
          "text": "*Suena música de nota*"
        },
        {
          "start": 39.04,
          "end": 41.68,
          "text": "*Perro ladrando*"
        },
        {
          "start": 46,
          "end": 47.64,
          "text": "*El Spring silbando*"
        },
        {
          "start": 54.16,
          "end": 56.36,
          "text": "Spring: ¡Oh… ja!"
        },
        {
          "start": 57.42,
          "end": 58.68,
          "text": "*Exclamación*"
        },
        {
          "start": 101.12,
          "end": 103.42,
          "text": "*Respirando más profundamente*"
        },
        {
          "start": 103.5,
          "end": 105.98,
          "text": "*La criatura ronca*"
        },
        {
          "start": 108.76,
          "end": 110.92,
          "text": "*Exhala y el perro llama*"
        },
        {
          "start": 128.06,
          "end": 130.44,
          "text": "*Ladridos y hace eco*"
        },
        {
          "start": 143.62,
          "end": 145.12,
          "text": "*Gruñedos*"
        },
        {
          "start": 168.14,
          "end": 170.78,
          "text": "*La criatura gime*"
        },
        {
          "start": 182.46,
          "end": 184.94,
          "text": "*Los huesos se mueven melódicamente*"
        },
        {
          "start": 203.72,
          "end": 206.76,
          "text": "*Música de melodía mística*"
        },
        {
          "start": 207.08,
          "end": 207.8,
          "text": "Spring: ¿Eh?"
        },
        {
          "start": 215.46,
          "end": 220.34,
          "text": "*Música de melodía en respuesta*"
        },
        {
          "start": 220.44,
          "end": 222.88,
          "text": "*Risas*"
        },
        {
          "start": 317.44,
          "end": 319.38,
          "text": "*Gemiendo*"
        },
        {
          "start": 321.48,
          "end": 323.04,
          "text": "*Ladrando*"
        },
        {
          "start": 355.04,
          "end": 356.6,
          "text": "Spring: ¡Guau-hoo!"
        },
        {
          "start": 394.54,
          "end": 396.36,
          "text": "*Agua fluyendo*"
        },
        {
          "start": 408.28,
          "end": 411.04,
          "text": "*Riéndose*"
        }
      ],
      "credit": "Wikimedia Commons timed text · CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/TimedText:Spring_-_Blender_Open_Movie.webm.es.srt"
    }
  ],
  "earth-views": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 1,
          "end": 30,
          "text": "[Background music with ambient sounds]"
        }
      ],
      "credit": "NASA · public domain",
      "sourceUrl": "https://images.nasa.gov/details/Earth%20Views%20from%20the%20International%20Space%20Station"
    }
  ],
  "moon-phases": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 3.42,
          "end": 21.82,
          "text": "[Music]"
        },
        {
          "start": 24.16,
          "end": 26.72,
          "text": "Hi there"
        },
        {
          "start": 25.119,
          "end": 29.119,
          "text": "My name is Anne McClain and I'm an"
        },
        {
          "start": 26.72,
          "end": 30.56,
          "text": "astronaut who has lived and worked 250"
        },
        {
          "start": 29.119,
          "end": 32.64,
          "text": "miles above the earth's surface on the"
        },
        {
          "start": 30.56,
          "end": 34.32,
          "text": "international space station."
        },
        {
          "start": 32.64,
          "end": 36,
          "text": "Today we're going to be turning our eyes"
        },
        {
          "start": 34.32,
          "end": 37.84,
          "text": "toward the moon and learning more about"
        },
        {
          "start": 36,
          "end": 39.6,
          "text": "what causes the moon phases."
        },
        {
          "start": 37.84,
          "end": 40.879,
          "text": "But before we check out the moon phases"
        },
        {
          "start": 39.6,
          "end": 42.399,
          "text": "let's take a look at where the space"
        },
        {
          "start": 40.879,
          "end": 44,
          "text": "station is compared to where we are on"
        },
        {
          "start": 42.399,
          "end": 48.16,
          "text": "earth and where the moon and the sun"
        },
        {
          "start": 44,
          "end": 49.52,
          "text": "are. On earth you're only about 250 miles"
        },
        {
          "start": 48.16,
          "end": 53.559,
          "text": "below the station."
        },
        {
          "start": 49.52,
          "end": 56.96,
          "text": "The moon however is located 238"
        },
        {
          "start": 53.559,
          "end": 60.16,
          "text": "855 miles on average from earth."
        },
        {
          "start": 56.96,
          "end": 62.16,
          "text": "You could fit 30 earths in that distance."
        },
        {
          "start": 60.16,
          "end": 63.28,
          "text": "When you think about how far away we are"
        },
        {
          "start": 62.16,
          "end": 65.6,
          "text": "from you on the station"
        },
        {
          "start": 63.28,
          "end": 67.52,
          "text": "versus how far away the moon is, the"
        },
        {
          "start": 65.6,
          "end": 69.6,
          "text": "station is only a tiny bit closer to the"
        },
        {
          "start": 67.52,
          "end": 71.439,
          "text": "moon than we are here on earth."
        },
        {
          "start": 69.6,
          "end": 73.28,
          "text": "And that's only when the station is in"
        },
        {
          "start": 71.439,
          "end": 74.08,
          "text": "orbit on the same side of earth as the"
        },
        {
          "start": 73.28,
          "end": 77.04,
          "text": "moon."
        },
        {
          "start": 74.08,
          "end": 77.6,
          "text": "So the station is 250 miles away the"
        },
        {
          "start": 77.04,
          "end": 81.2,
          "text": "moon is"
        },
        {
          "start": 77.6,
          "end": 85.119,
          "text": "238 855 miles away"
        },
        {
          "start": 81.2,
          "end": 88,
          "text": "and the sun is approximately 92 million"
        },
        {
          "start": 85.119,
          "end": 90.4,
          "text": "900 000 miles away. That is quite the"
        },
        {
          "start": 88,
          "end": 92.24,
          "text": "distance!"
        },
        {
          "start": 90.4,
          "end": 94.079,
          "text": "Now that you know where you are relative"
        },
        {
          "start": 92.24,
          "end": 96.4,
          "text": "to the station moon and the sun"
        },
        {
          "start": 94.079,
          "end": 97.68,
          "text": "let's talk about the moon phases. Now"
        },
        {
          "start": 96.4,
          "end": 98.96,
          "text": "when you're looking up at the moon from"
        },
        {
          "start": 97.68,
          "end": 100.479,
          "text": "the earth you'll notice that it looks"
        },
        {
          "start": 98.96,
          "end": 102.159,
          "text": "different from day to day."
        },
        {
          "start": 100.479,
          "end": 103.6,
          "text": "We call these differences the phases of"
        },
        {
          "start": 102.159,
          "end": 106,
          "text": "the moon and they cycle through"
        },
        {
          "start": 103.6,
          "end": 107.84,
          "text": "every 30 days. Let's check out a"
        },
        {
          "start": 106,
          "end": 108.88,
          "text": "demonstration of the moon phases here on"
        },
        {
          "start": 107.84,
          "end": 111.439,
          "text": "the ground."
        },
        {
          "start": 108.88,
          "end": 112.24,
          "text": "We're going to pretend his head is earth"
        },
        {
          "start": 111.439,
          "end": 113.92,
          "text": "letting him"
        },
        {
          "start": 112.24,
          "end": 116.719,
          "text": "view the moon as you would from your"
        },
        {
          "start": 113.92,
          "end": 117.84,
          "text": "home. The ball in their hand is going to"
        },
        {
          "start": 116.719,
          "end": 119.6,
          "text": "represent the moon"
        },
        {
          "start": 117.84,
          "end": 121.6,
          "text": "and the light source is going to be our"
        },
        {
          "start": 119.6,
          "end": 122.88,
          "text": "sun. Keep in mind that while the moon is"
        },
        {
          "start": 121.6,
          "end": 125.2,
          "text": "orbiting earth"
        },
        {
          "start": 122.88,
          "end": 127.439,
          "text": "earth is also rotating on its axis and"
        },
        {
          "start": 125.2,
          "end": 129.36,
          "text": "slowly orbiting the sun."
        },
        {
          "start": 127.439,
          "end": 131.599,
          "text": "Now looking from our outsider"
        },
        {
          "start": 129.36,
          "end": 133.36,
          "text": "perspective we can see the moon is still"
        },
        {
          "start": 131.599,
          "end": 134.48,
          "text": "whole the entire time it is orbiting"
        },
        {
          "start": 133.36,
          "end": 136.56,
          "text": "around earth"
        },
        {
          "start": 134.48,
          "end": 139.84,
          "text": "with a side facing the sun always"
        },
        {
          "start": 136.56,
          "end": 142.8,
          "text": "illuminated and reflecting sunlight."
        },
        {
          "start": 139.84,
          "end": 144.239,
          "text": "Let's take a look at what he is seeing."
        },
        {
          "start": 142.8,
          "end": 145.04,
          "text": "As you can see in the photographs from"
        },
        {
          "start": 144.239,
          "end": 146.959,
          "text": "earth's view"
        },
        {
          "start": 145.04,
          "end": 148.64,
          "text": "the reflection of sunlight looks quite"
        },
        {
          "start": 146.959,
          "end": 150.48,
          "text": "different from this angle."
        },
        {
          "start": 148.64,
          "end": 152.64,
          "text": "Since we are only able to see parts of"
        },
        {
          "start": 150.48,
          "end": 153.76,
          "text": "the reflected sunlight as the moon moves"
        },
        {
          "start": 152.64,
          "end": 156,
          "text": "around earth"
        },
        {
          "start": 153.76,
          "end": 157.519,
          "text": "this is what causes our moon phases as"
        },
        {
          "start": 156,
          "end": 161.44,
          "text": "the moon orbits around earth"
        },
        {
          "start": 157.519,
          "end": 163.44,
          "text": "every 30 days. There are names for each"
        },
        {
          "start": 161.44,
          "end": 165.04,
          "text": "of the phases of the moon's 30-day cycle."
        },
        {
          "start": 163.44,
          "end": 167.68,
          "text": "When the moon looks completely dark"
        },
        {
          "start": 165.04,
          "end": 170.08,
          "text": "we're experiencing a new moon. This is"
        },
        {
          "start": 167.68,
          "end": 171.76,
          "text": "the beginning of the 30-day cycle. It"
        },
        {
          "start": 170.08,
          "end": 174.72,
          "text": "will move through a waxing crescent"
        },
        {
          "start": 171.76,
          "end": 176.959,
          "text": "phase until it is a first quarter moon."
        },
        {
          "start": 174.72,
          "end": 179.519,
          "text": "From here we will see a waxing gibbous"
        },
        {
          "start": 176.959,
          "end": 181.76,
          "text": "until the moon appears fully illuminated."
        },
        {
          "start": 179.519,
          "end": 182.879,
          "text": "You might have heard this phase before"
        },
        {
          "start": 181.76,
          "end": 186.08,
          "text": "this is what we call"
        },
        {
          "start": 182.879,
          "end": 187.92,
          "text": "a full moon. After this phase the moon"
        },
        {
          "start": 186.08,
          "end": 190.64,
          "text": "will go from a waning gibbous phase"
        },
        {
          "start": 187.92,
          "end": 192.239,
          "text": "into a third quarter moon. After the"
        },
        {
          "start": 190.64,
          "end": 193.28,
          "text": "third quarter moon it will become a"
        },
        {
          "start": 192.239,
          "end": 196.48,
          "text": "waning crescent"
        },
        {
          "start": 193.28,
          "end": 198.319,
          "text": "until it returns to a new moon."
        },
        {
          "start": 196.48,
          "end": 200.159,
          "text": "On the space station we see the same"
        },
        {
          "start": 198.319,
          "end": 201.28,
          "text": "moon phases as we do on the earth's"
        },
        {
          "start": 200.159,
          "end": 203.519,
          "text": "surface."
        },
        {
          "start": 201.28,
          "end": 205.28,
          "text": "Since the space station is only 250"
        },
        {
          "start": 203.519,
          "end": 206.48,
          "text": "miles closer to the moon than we are"
        },
        {
          "start": 205.28,
          "end": 208.159,
          "text": "here on the ground"
        },
        {
          "start": 206.48,
          "end": 210,
          "text": "astronauts on the station have the same"
        },
        {
          "start": 208.159,
          "end": 211.36,
          "text": "perspective you have but don't have the"
        },
        {
          "start": 210,
          "end": 212.159,
          "text": "earth's atmosphere in their way for"
        },
        {
          "start": 211.36,
          "end": 213.519,
          "text": "photographs."
        },
        {
          "start": 212.159,
          "end": 215.36,
          "text": "Astronauts currently on the space"
        },
        {
          "start": 213.519,
          "end": 215.84,
          "text": "station actually use the moon's phases"
        },
        {
          "start": 215.36,
          "end": 217.519,
          "text": "to collect"
        },
        {
          "start": 215.84,
          "end": 219.76,
          "text": "research that will help NASA with the"
        },
        {
          "start": 217.519,
          "end": 223.519,
          "text": "Artemis program as we work to go forward"
        },
        {
          "start": 219.76,
          "end": 225.599,
          "text": "to the moon with our astronauts by 2024."
        },
        {
          "start": 223.519,
          "end": 227.12,
          "text": "So the next time you're outside take a"
        },
        {
          "start": 225.599,
          "end": 228.239,
          "text": "glance up at the moon to check out what"
        },
        {
          "start": 227.12,
          "end": 229.519,
          "text": "phase it's in."
        },
        {
          "start": 228.239,
          "end": 231.92,
          "text": "Are you interested in seeing the space"
        },
        {
          "start": 229.519,
          "end": 233.599,
          "text": "station fly by as well? Ask an adult to"
        },
        {
          "start": 231.92,
          "end": 236.72,
          "text": "help you sign up for spot the station"
        },
        {
          "start": 233.599,
          "end": 238.239,
          "text": "at spot the station.nasa.gov."
        },
        {
          "start": 236.72,
          "end": 240.33,
          "text": "Thanks for learning with me today! See"
        },
        {
          "start": 238.239,
          "end": 255.619,
          "text": "you next time!"
        },
        {
          "start": 240.33,
          "end": 255.619,
          "text": "[Music]"
        },
        {
          "start": 262.32,
          "end": 263,
          "text": "subscribe for more space"
        }
      ],
      "credit": "NASA · public domain",
      "sourceUrl": "https://images.nasa.gov/details/jsc2020m000081-STEMonstrations_Moon_Phases"
    }
  ],
  "water-cycle": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 1,
          "end": 18,
          "text": "[video with no audio content]"
        }
      ],
      "credit": "NASA · public domain",
      "sourceUrl": "https://images.nasa.gov/details/GSFC_20121221_GPM_m11165_ESA_Water_Cycle"
    }
  ],
  "aurora": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 0.03,
          "end": 4.05,
          "text": "music throughout"
        },
        {
          "start": 4.07,
          "end": 8.09,
          "text": "Liz MacDonald: People were out observing the aurora, and they started noticing something that was overhead"
        },
        {
          "start": 8.11,
          "end": 12.09,
          "text": "as well, when they were seeing aurora far to the northern regions."
        },
        {
          "start": 12.11,
          "end": 16.11,
          "text": "It was unlike most aurora. Talked to the scientists,"
        },
        {
          "start": 16.13,
          "end": 20.12,
          "text": "we didn't know what it was. And together,"
        },
        {
          "start": 20.14,
          "end": 24.2,
          "text": "they said we will keep taking observations, and we will call it Steve"
        },
        {
          "start": 24.22,
          "end": 28.21,
          "text": "in the meantime. Steve is mostly a very narrow purple arc"
        },
        {
          "start": 28.23,
          "end": 32.26,
          "text": "and sometimes it has these little green features"
        },
        {
          "start": 32.28,
          "end": 36.31,
          "text": "that go along with it as well that are kind of like waving fingers"
        },
        {
          "start": 36.33,
          "end": 40.37,
          "text": "or a picket fence. That means that there's plasma physics"
        },
        {
          "start": 40.39,
          "end": 44.39,
          "text": "happening up there to cause that light and to make these"
        },
        {
          "start": 44.41,
          "end": 48.4,
          "text": "little discrete features that we don't understand yet."
        },
        {
          "start": 48.42,
          "end": 52.41,
          "text": "We now have some satellite observations from the ESA satellite"
        },
        {
          "start": 52.43,
          "end": 56.45,
          "text": "called SWARM that show that Steve"
        },
        {
          "start": 56.47,
          "end": 60.48,
          "text": "optically is associated with a very strong flow"
        },
        {
          "start": 60.5,
          "end": 64.49,
          "text": "in the particles in the ionosphere, the upper level of our atmosphere."
        },
        {
          "start": 64.51,
          "end": 68.58,
          "text": "Steve is important for a number of reasons. It's really"
        },
        {
          "start": 68.6,
          "end": 72.58,
          "text": "exciting that people armed with cameras"
        },
        {
          "start": 72.6,
          "end": 76.6,
          "text": "all over the globe can capture something that we didn't fully understand"
        },
        {
          "start": 76.62,
          "end": 80.64,
          "text": "and shed new light on that."
        },
        {
          "start": 80.66,
          "end": 84.69,
          "text": "It's also really exciting that this happens further to the south where there are more people."
        },
        {
          "start": 84.71,
          "end": 88.69,
          "text": "So, it might be a kind of aurora that more people can see than the usual kind."
        },
        {
          "start": 88.71,
          "end": 92.71,
          "text": "We are now able to look up at the sky and see"
        },
        {
          "start": 92.73,
          "end": 96.71,
          "text": "things about the aurora and this sub-auroral region"
        },
        {
          "start": 96.73,
          "end": 100.71,
          "text": "that we never understood before."
        },
        {
          "start": 100.73,
          "end": 104.72,
          "text": "We can correlate that with our traditional observations and lead to greater"
        },
        {
          "start": 104.74,
          "end": 108.73,
          "text": "understanding."
        },
        {
          "start": 108.75,
          "end": 112.78,
          "text": "Thank you to the citizen scientists around the world who help us explore as one."
        },
        {
          "start": 112.8,
          "end": 116.78,
          "text": "Join the search for STEVE at www.aurorasaurus.org"
        },
        {
          "start": 116.8,
          "end": 120.79,
          "text": "tone"
        },
        {
          "start": 120.81,
          "end": 124.79,
          "text": "tone"
        },
        {
          "start": 124.81,
          "end": 128.82,
          "text": "beeping"
        },
        {
          "start": 128.84,
          "end": 132.846,
          "text": "beeping"
        }
      ],
      "credit": "NASA · public domain",
      "sourceUrl": "https://images.nasa.gov/details/GSFC_20180314_Aurora_m12865_Steve"
    }
  ],
  "rocket-launch": [
    {
      "lang": "en",
      "label": "English",
      "cues": [
        {
          "start": 1,
          "end": 30,
          "text": "[Ambient sounds]"
        }
      ],
      "credit": "NASA · public domain",
      "sourceUrl": "https://images.nasa.gov/details/KSC-20230507-MH-RLS01-TROPICS_Rocket_Launch-Rocket_Lab-WON_3330130"
    }
  ],
  "animal-alphabet": [
    {
      "lang": "en",
      "label": "English (auto)",
      "cues": [
        {
          "start": 24,
          "end": 27,
          "text": "We think it's very nice to know your alphabet."
        },
        {
          "start": 43.001,
          "end": 49,
          "text": "We're going to show you the animals in the zoo whose names begin with alphabet"
        },
        {
          "start": 49,
          "end": 51,
          "text": "letters from A to Z."
        },
        {
          "start": 51,
          "end": 57.001,
          "text": "A is for our dad, a kind of wild sheep that lives on the hot, dry hills of"
        },
        {
          "start": 57.001,
          "end": 61.001,
          "text": "northern Africa. Just see how fast it can run."
        },
        {
          "start": 68.001,
          "end": 74,
          "text": "B is for bear and especially for the big white polar bears that live near the"
        },
        {
          "start": 74,
          "end": 79,
          "text": "North Pole. In the zoo they like to dive into the water and Andy's friend"
        },
        {
          "start": 79,
          "end": 81,
          "text": "shows him just how they do it."
        },
        {
          "start": 82,
          "end": 87.001,
          "text": "He's in. Polar bears have lots of fun in their pool. They have a barrel to play"
        },
        {
          "start": 87.001,
          "end": 93,
          "text": "with and on very hot days they dive and splash and play all day long. They"
        },
        {
          "start": 93,
          "end": 94.001,
          "text": "don't mind the heat at all."
        },
        {
          "start": 96.001,
          "end": 103,
          "text": "C comes next and C stands for camel. Children ride on camels in the Bronx Zoo and"
        },
        {
          "start": 103,
          "end": 109,
          "text": "have lots of fun. This kind of camel comes from the Arabian Desert and Andy and"
        },
        {
          "start": 109,
          "end": 112.001,
          "text": "his friend are going to take a camel ride and pretend they're crossing"
        },
        {
          "start": 112.001,
          "end": 114,
          "text": "the hot stands of the desert."
        },
        {
          "start": 114,
          "end": 119.001,
          "text": "This is probably the first time a baby orangue stands ever to ride on a camel."
        },
        {
          "start": 125.001,
          "end": 131,
          "text": "Next is the letter D and D is for deer. This is the kind of deer called"
        },
        {
          "start": 131,
          "end": 135,
          "text": "paredaveed deer that used to live in China. These are the only"
        },
        {
          "start": 135,
          "end": 137,
          "text": "ones in the United States."
        },
        {
          "start": 139,
          "end": 144.001,
          "text": "What does E stand for? Why E is for these playful young African elephants. Let's"
        },
        {
          "start": 144.001,
          "end": 148,
          "text": "listen to them."
        },
        {
          "start": 155,
          "end": 160.001,
          "text": "F is the letter that stands for frog. Andy doesn't like frogs. He's getting out"
        },
        {
          "start": 160.001,
          "end": 166,
          "text": "of there quick. It's just a common old bullfrog Andy. It won't hurt you. Andy"
        },
        {
          "start": 166,
          "end": 171.001,
          "text": "isn't sure about that but he knows his friend won't let the frog jump at him."
        },
        {
          "start": 173.001,
          "end": 178,
          "text": "[...] is for gibbon, a kind of ape that lived in Malaysia. Listen to its call."
        },
        {
          "start": 186,
          "end": 191.001,
          "text": "G also stands for giraffe, the tallest animal in the world. Some giraffes are"
        },
        {
          "start": 191.001,
          "end": 197.001,
          "text": "three times taller than a man. In Africa, it eats leaves but in the Bronx Zoo it"
        },
        {
          "start": 197.001,
          "end": 202,
          "text": "likes a piece of bread and it's willing to bend way, way down to get it."
        },
        {
          "start": 202.001,
          "end": 208,
          "text": "Did you ever see a giraffe bend down? This is the way he does it."
        },
        {
          "start": 211,
          "end": 217,
          "text": "Here comes the letter H and H stands for the hippopotamus of Central Africa."
        },
        {
          "start": 217.001,
          "end": 223,
          "text": "This one is named Teeth and he's the oldest hippopotamus in any zoo in the world."
        },
        {
          "start": 223.001,
          "end": 227.001,
          "text": "He was born in 1903. He likes to eat cabbage for breakfast."
        },
        {
          "start": 229.001,
          "end": 235,
          "text": "I stands for a very pretty bird, the scarlet ibis of South America. When hundreds"
        },
        {
          "start": 235,
          "end": 238.001,
          "text": "of scarlet ibises perch in a tree, it looks as if the tree were"
        },
        {
          "start": 238.001,
          "end": 240,
          "text": "in bloom with red flowers."
        },
        {
          "start": 241.001,
          "end": 246.001,
          "text": "Jaguar begins with J and that's our animal for this letter. Andy wants to see the"
        },
        {
          "start": 246.001,
          "end": 251,
          "text": "Jaguar. He'll like this one in the Bronx Zoo because it's gentle and friendly."
        },
        {
          "start": 256.001,
          "end": 262.001,
          "text": "What does K stand for, Andy? Why, K stands for the kangaroo that comes from"
        },
        {
          "start": 262.001,
          "end": 268,
          "text": "Australia on the other side of the world. This one has a baby kangaroo in her"
        },
        {
          "start": 268,
          "end": 270.001,
          "text": "pouch and she carries it with her everywhere."
        },
        {
          "start": 272.001,
          "end": 274.001,
          "text": "Now what's the baby play hide and seek?"
        },
        {
          "start": 277.001,
          "end": 282.001,
          "text": "L stands for the African lion. So Andy and his friend go to see the African"
        },
        {
          "start": 282.001,
          "end": 287,
          "text": "plains exhibit in the Bronx Zoo. They want to hear the lion's roar. Did you ever"
        },
        {
          "start": 287,
          "end": 289,
          "text": "hear a lion roar? Listen."
        },
        {
          "start": 309,
          "end": 315,
          "text": "Next is M and M is for marmoset, a kind of little monkey that lives in South"
        },
        {
          "start": 315,
          "end": 320,
          "text": "America. At first the babies ride on the backs of their fathers and mothers, but"
        },
        {
          "start": 320,
          "end": 325.001,
          "text": "they soon learn to play by themselves. Don't they hop around like little frogs?"
        },
        {
          "start": 331,
          "end": 336,
          "text": "In Andy's alphabet, N stands for Niala, one of the pretty antelopes that live in"
        },
        {
          "start": 336,
          "end": 339.001,
          "text": "Africa. All these Nialas are brothers and sisters."
        },
        {
          "start": 346.001,
          "end": 352.001,
          "text": "O is for O. Rangutan and that's what Andy is, of course. Now Andy's pretending"
        },
        {
          "start": 352.001,
          "end": 357,
          "text": "he's shy and he's going to try to hide. But we know where he"
        },
        {
          "start": 357,
          "end": 358.001,
          "text": "is. We see you, Andy."
        },
        {
          "start": 359.001,
          "end": 366,
          "text": "O also stands for ostrich, the biggest bird in the world. It can't fly, but"
        },
        {
          "start": 366,
          "end": 367.001,
          "text": "see how fast it can run."
        },
        {
          "start": 374.001,
          "end": 380,
          "text": "P is for penguin and that's another kind of bird that can't fly. This is a king"
        },
        {
          "start": 380,
          "end": 383.001,
          "text": "penguin that lives down by the South Pole. It can swim"
        },
        {
          "start": 383.001,
          "end": 385,
          "text": "underwater faster than a face."
        },
        {
          "start": 386.001,
          "end": 392,
          "text": "There aren't many animals whose names begin with Q, but there's the quail, a bird"
        },
        {
          "start": 392,
          "end": 395,
          "text": "that lives in the field. Someday when you're out in the"
        },
        {
          "start": 395,
          "end": 397,
          "text": "country, maybe you'll see one."
        },
        {
          "start": 401.001,
          "end": 407,
          "text": "Next is R and that's for rhinoceros that lives in Africa. He likes to stir up the"
        },
        {
          "start": 407,
          "end": 413,
          "text": "dust with his nose and then he walks over to beg for apples. He likes apples as"
        },
        {
          "start": 413,
          "end": 416.001,
          "text": "much as you do and Andy and his friend are giving him some."
        },
        {
          "start": 421.001,
          "end": 425,
          "text": "S is for sea lion. Let's listen to it bark."
        },
        {
          "start": 426.001,
          "end": 433.001,
          "text": "S also stands"
        },
        {
          "start": 433.001,
          "end": 439,
          "text": "for skunk and that's one animal Andy's sure he doesn't want to make friends with."
        },
        {
          "start": 439.001,
          "end": 443.001,
          "text": "One look and one sniff and Andy's getting out of there."
        },
        {
          "start": 444,
          "end": 447.001,
          "text": "And when Andy doesn't like something, he makes a face about it."
        },
        {
          "start": 450.001,
          "end": 456.001,
          "text": "In the Bronx Zoo, T is for tiger and especially for this beautiful gentle mother"
        },
        {
          "start": 456.001,
          "end": 458.001,
          "text": "tiger who was born in the Bronx Zoo."
        },
        {
          "start": 463,
          "end": 468,
          "text": "This is the drawing of a tortoise, T for tortoise. And Andy's learning all about"
        },
        {
          "start": 468,
          "end": 472.001,
          "text": "it because he's going to take a slow easy ride on one of these big"
        },
        {
          "start": 472.001,
          "end": 474.001,
          "text": "tortoises from the Galapagos Island."
        },
        {
          "start": 475,
          "end": 480,
          "text": "They won't bite Andy because they only eat leaves and cactus and green things"
        },
        {
          "start": 480,
          "end": 486,
          "text": "like that. But Andy isn't too sure it's safe. Hang on Andy, it's a long way to"
        },
        {
          "start": 486,
          "end": 488,
          "text": "the ground. It's almost two feet."
        },
        {
          "start": 491,
          "end": 496,
          "text": "U is for a very rare sort of bird, the umbrella bird that comes from South"
        },
        {
          "start": 496,
          "end": 500.001,
          "text": "America. It's called that because it can spread the feathers on top of its head"
        },
        {
          "start": 500.001,
          "end": 504,
          "text": "like opening an umbrella. At certain seasons, the male puffs"
        },
        {
          "start": 504,
          "end": 506,
          "text": "out his throat like this."
        },
        {
          "start": 516.001,
          "end": 522,
          "text": "V is for another bird, the North African eared vulture. It isn't very pretty, is"
        },
        {
          "start": 522,
          "end": 529,
          "text": "it? But there's another kind of vulture that is pretty."
        },
        {
          "start": 529,
          "end": 533,
          "text": "This is the king vulture that lives in Mexico and part of South America."
        },
        {
          "start": 534,
          "end": 539.001,
          "text": "After V comes W and that's for the wolves. There used to be lots of wolves in the"
        },
        {
          "start": 539.001,
          "end": 544,
          "text": "United States, but they only live in out of the way places now and"
        },
        {
          "start": 544,
          "end": 545.001,
          "text": "they're not dangerous to people."
        },
        {
          "start": 547,
          "end": 553.001,
          "text": "X is a hard letter to find an animal for, but these are Xenopus frogs spelled X-E"
        },
        {
          "start": 553.001,
          "end": 560,
          "text": "-N-O-P-U-S. The man is going to take one out of the tank and hold it in his hand"
        },
        {
          "start": 560,
          "end": 563,
          "text": "so you can see it. These frogs come from Africa."
        },
        {
          "start": 568,
          "end": 573.001,
          "text": "For the letter Y, we have the long-haired Jack from Tibet. I wouldn't want to"
        },
        {
          "start": 573.001,
          "end": 580.001,
          "text": "wear long hair like that in summertime, would you? Everybody knows that Z"
        },
        {
          "start": 580.001,
          "end": 584,
          "text": "stands for zebra and that's the last letter in the alphabet."
        },
        {
          "start": 584.001,
          "end": 590,
          "text": "We've gone all around the Bronx Zoo looking at the animals from A to Z and that's"
        },
        {
          "start": 590,
          "end": 594.001,
          "text": "the end of Andy's animal alphabet. Andy"
        },
        {
          "start": 594.001,
          "end": 597,
          "text": "says..."
        }
      ],
      "credit": "Internet Archive auto-captions · public-domain film",
      "sourceUrl": "https://archive.org/download/AndysAnimalA/AndysAnimalA.asr.vtt",
      "auto": true
    }
  ],
  "making-books": [
    {
      "lang": "en",
      "label": "English (auto)",
      "cues": [
        {
          "start": 21.001,
          "end": 23.001,
          "text": "This man is an author."
        },
        {
          "start": 24.001,
          "end": 25.001,
          "text": "He writes stories."
        },
        {
          "start": 26,
          "end": 28.001,
          "text": "He has just finished writing a story."
        },
        {
          "start": 29.001,
          "end": 32.001,
          "text": "He thinks many people will like to read it."
        },
        {
          "start": 33,
          "end": 35.001,
          "text": "So he must have the story made into a book."
        },
        {
          "start": 37,
          "end": 39.001,
          "text": "Let's see how the book is made."
        },
        {
          "start": 41,
          "end": 43,
          "text": "First, the story goes to the printing shop."
        },
        {
          "start": 44,
          "end": 46,
          "text": "This workman is a type setter."
        },
        {
          "start": 46.001,
          "end": 49.001,
          "text": "He starts the job of preparing the story so it can be printed."
        },
        {
          "start": 51.001,
          "end": 55,
          "text": "He types the story on this machine letter by letter."
        },
        {
          "start": 57,
          "end": 61,
          "text": "Every time the type setter touches a key, a mold for a letter"
        },
        {
          "start": 61,
          "end": 63.001,
          "text": "slides into this box."
        },
        {
          "start": 67,
          "end": 69,
          "text": "Many molds together make a line."
        },
        {
          "start": 71,
          "end": 75,
          "text": "Every time the lever goes up, melted metal pours over the"
        },
        {
          "start": 75,
          "end": 76.001,
          "text": "letter molds inside the machine."
        },
        {
          "start": 80.001,
          "end": 86,
          "text": "When the metal cools off, it hardens and makes a line of words."
        },
        {
          "start": 87.001,
          "end": 91.001,
          "text": "It takes many lines like this to make a page."
        },
        {
          "start": 94.001,
          "end": 100,
          "text": "As the type setter works on new lines, a man takes the finished"
        },
        {
          "start": 100,
          "end": 101.001,
          "text": "lines over to a long table."
        },
        {
          "start": 105,
          "end": 108,
          "text": "Here he arranges the lines for each page."
        },
        {
          "start": 113.001,
          "end": 117.001,
          "text": "This page is to have a picture."
        },
        {
          "start": 119.001,
          "end": 122.001,
          "text": "The picture takes up the space of many lines."
        },
        {
          "start": 125.001,
          "end": 128,
          "text": "The composer then goes to the next page."
        },
        {
          "start": 129.001,
          "end": 133.001,
          "text": "With a piece of wood, the composer marks the end of each page."
        },
        {
          "start": 134.001,
          "end": 138,
          "text": "When many pages like this are ready, a workman takes them to"
        },
        {
          "start": 138,
          "end": 140,
          "text": "another part of the printing shop."
        },
        {
          "start": 143,
          "end": 147.001,
          "text": "Then this workman takes the lines of type for many pages"
        },
        {
          "start": 147.001,
          "end": 149.001,
          "text": "and fits them into a metal frame."
        },
        {
          "start": 150.001,
          "end": 152.001,
          "text": "He must be careful not to mix them up."
        },
        {
          "start": 160,
          "end": 165.001,
          "text": "Long and short pieces of metal keep the pages apart and fill out the edges."
        },
        {
          "start": 170,
          "end": 174,
          "text": "This key locks the lines and pictures tightly in the frame."
        },
        {
          "start": 177,
          "end": 178.001,
          "text": "He locks them on all sides."
        },
        {
          "start": 179.001,
          "end": 183.001,
          "text": "Then he evens all the lines so that none of them will stick up."
        },
        {
          "start": 186,
          "end": 191.001,
          "text": "Then all is locked still tighter so that the lines"
        },
        {
          "start": 191.001,
          "end": 193,
          "text": "and pages won't come apart."
        },
        {
          "start": 196.001,
          "end": 200.001,
          "text": "But the words and lines of type are of soft metal."
        },
        {
          "start": 201.001,
          "end": 203,
          "text": "They would soon wear out in printing."
        },
        {
          "start": 203.001,
          "end": 206,
          "text": "In this shop, they are made into copper."
        },
        {
          "start": 207,
          "end": 207.001,
          "text": "Copper is hard."
        },
        {
          "start": 209,
          "end": 210.001,
          "text": "Let's watch how this is done."
        },
        {
          "start": 211,
          "end": 214.001,
          "text": "This operator covers the lines and pages with a plate of wax."
        },
        {
          "start": 215.001,
          "end": 217,
          "text": "Then he pushes it into the press."
        },
        {
          "start": 220,
          "end": 221.001,
          "text": "Down goes the press."
        },
        {
          "start": 222,
          "end": 226,
          "text": "And out comes the wax plate with all the pictures and letters"
        },
        {
          "start": 226,
          "end": 228,
          "text": "pressed into the soft wax."
        },
        {
          "start": 238.001,
          "end": 244.001,
          "text": "Next, another worker dips the wax plate into a large tank which has copper in it."
        },
        {
          "start": 245,
          "end": 249,
          "text": "The copper goes into all the places where the letters have pressed into the wax."
        },
        {
          "start": 250,
          "end": 251.001,
          "text": "It forms a solid plate."
        },
        {
          "start": 252.001,
          "end": 257.001,
          "text": "It has the same letters and same pictures as before, but it is much stronger."
        },
        {
          "start": 260,
          "end": 262.001,
          "text": "Many books can be printed from copper plates."
        },
        {
          "start": 265,
          "end": 266.001,
          "text": "Now the plates are cut apart."
        },
        {
          "start": 269.001,
          "end": 272.001,
          "text": "This sharp saw easily cuts through the hard copper."
        },
        {
          "start": 277.001,
          "end": 283,
          "text": "Each of these small plates has the words and pictures"
        },
        {
          "start": 283,
          "end": 284.001,
          "text": "for just one page of the book."
        },
        {
          "start": 289,
          "end": 292,
          "text": "Next, the plates go over to the printing press."
        },
        {
          "start": 293.001,
          "end": 297.001,
          "text": "Here, this workman makes the plates ready for printing on this press."
        },
        {
          "start": 298.001,
          "end": 300,
          "text": "That is why they call him the ready man."
        },
        {
          "start": 303,
          "end": 306.001,
          "text": "The space where you see him now is called the press bed."
        },
        {
          "start": 310,
          "end": 312.001,
          "text": "64 pages fit on one bed."
        },
        {
          "start": 316,
          "end": 320.001,
          "text": "The ready man fits every plate tightly to the bed in the right order."
        },
        {
          "start": 324.001,
          "end": 330,
          "text": "There are two beds on this press, one for each side of the paper."
        },
        {
          "start": 337,
          "end": 340.001,
          "text": "Both press beds of this printing press must be filled with plates"
        },
        {
          "start": 340.001,
          "end": 342,
          "text": "before the printing can begin."
        },
        {
          "start": 345.001,
          "end": 349,
          "text": "Now, one push of a button and the big press starts."
        },
        {
          "start": 351,
          "end": 353,
          "text": "The paper travels around the drums."
        },
        {
          "start": 356,
          "end": 359.001,
          "text": "Rollers spread the ink evenly over the plates."
        },
        {
          "start": 362.001,
          "end": 367.001,
          "text": "First, one side of the paper is pressed to one set of plates, then the other"
        },
        {
          "start": 367.001,
          "end": 369,
          "text": "side of the paper to the other set."
        },
        {
          "start": 371,
          "end": 375.001,
          "text": "Sheet after sheet, the printed pages begin to pile up at one end of the press."
        },
        {
          "start": 379,
          "end": 384,
          "text": "This workman now examines the sheets to see if they are"
        },
        {
          "start": 384,
          "end": 386,
          "text": "nicely and clearly printed."
        },
        {
          "start": 397,
          "end": 400.001,
          "text": "Now, let's see what happens to these sheets after they are printed."
        },
        {
          "start": 402,
          "end": 406,
          "text": "Here in the bookbinding plant, they first come to the folding machine."
        },
        {
          "start": 407.001,
          "end": 411,
          "text": "Each large printed sheet will be folded until it reaches"
        },
        {
          "start": 411,
          "end": 412.001,
          "text": "the size of a single page."
        },
        {
          "start": 414.001,
          "end": 416,
          "text": "[...] the paper."
        },
        {
          "start": 416,
          "end": 420.001,
          "text": "The machine goes on, folding and folding, until all the"
        },
        {
          "start": 420.001,
          "end": 422,
          "text": "printed sheets have been folded."
        },
        {
          "start": 428,
          "end": 439,
          "text": "This man checks the folders to make sure that the pages follow each"
        },
        {
          "start": 439,
          "end": 440.001,
          "text": "other in the right order."
        },
        {
          "start": 446.001,
          "end": 451,
          "text": "Then all the folders are taken to another part of the bindery. This part"
        },
        {
          "start": 451,
          "end": 452.001,
          "text": "is called the gathering room."
        },
        {
          "start": 455,
          "end": 460.001,
          "text": "These girls stack the folders in piles and put each pile into its proper bin."
        },
        {
          "start": 462.001,
          "end": 465.001,
          "text": "They see to it that there are always folders in every bin."
        },
        {
          "start": 470,
          "end": 474,
          "text": "This machine gathers the folders in the right order from the first"
        },
        {
          "start": 474,
          "end": 476,
          "text": "page to the last page of the book."
        },
        {
          "start": 478,
          "end": 484,
          "text": "One by one, the machine gathers all the folders for one book."
        },
        {
          "start": 485.001,
          "end": 489,
          "text": "At the end of this long machine, the folders are coming"
        },
        {
          "start": 489,
          "end": 491.001,
          "text": "out, all the pages for the book."
        },
        {
          "start": 497.001,
          "end": 501.001,
          "text": "Here, other girls take the assembled folders to other machines."
        },
        {
          "start": 505.001,
          "end": 510,
          "text": "Here, a machine sews them together. Again, each"
        },
        {
          "start": 510,
          "end": 512,
          "text": "folder goes into the machine separately."
        },
        {
          "start": 514,
          "end": 518,
          "text": "This machine sews the folders together with strong thread."
        },
        {
          "start": 519,
          "end": 521.001,
          "text": "The sewing will keep the pages from coming apart."
        },
        {
          "start": 527.001,
          "end": 532,
          "text": "After the books have been sewed, they go on to the trimming shop."
        },
        {
          "start": 535,
          "end": 541.001,
          "text": "This machine trims the pages to just the right size with three sharp knives."
        },
        {
          "start": 542.001,
          "end": 547,
          "text": "First with one knife for the long side of the book, then with two"
        },
        {
          "start": 547,
          "end": 548.001,
          "text": "knives for the two short sides."
        },
        {
          "start": 559.001,
          "end": 563.001,
          "text": "But the books are not yet finished. They still need covers."
        },
        {
          "start": 565,
          "end": 567.001,
          "text": "Strong book covers are made from paper board."
        },
        {
          "start": 568.001,
          "end": 572,
          "text": "First, the paper board is cut just the right size."
        },
        {
          "start": 581,
          "end": 585,
          "text": "Next, cloth from this roll is glued over the paper board."
        },
        {
          "start": 586.001,
          "end": 589.001,
          "text": "This makes covers that are strong and good looking."
        },
        {
          "start": 595.001,
          "end": 601.001,
          "text": "At last, the name of the book is stamped on the cover in shining gold letters."
        },
        {
          "start": 606,
          "end": 612,
          "text": "Now, the covers are ready for the pages of the book to be put inside them."
        },
        {
          "start": 615.001,
          "end": 620,
          "text": "One push, and the book has a cover around it. Another push,"
        },
        {
          "start": 620.001,
          "end": 622,
          "text": "and the cover is glued tight."
        },
        {
          "start": 627.001,
          "end": 634.001,
          "text": "Here they go, all finished and ready for shipping to all parts of the world."
        },
        {
          "start": 635.001,
          "end": 639.001,
          "text": "The story has been made into a book, for readers everywhere."
        },
        {
          "start": 642,
          "end": 646,
          "text": "www.mooji.org"
        }
      ],
      "credit": "Internet Archive auto-captions · public-domain film",
      "sourceUrl": "https://archive.org/download/MakingBo1947/MakingBo1947.asr.vtt",
      "auto": true
    }
  ]
};

export function captionsForClip(clipId?: string): CaptionTrack[] {
  return (clipId && CAPTIONS_BY_CLIP[clipId]) || [];
}
