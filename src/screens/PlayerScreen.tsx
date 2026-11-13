import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Title } from '../types';
import { titleById, nextEpisode as findNext, prevEpisode as findPrev } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { formatClock } from '../lib/format';
import { SeekBar } from '../components/SeekBar';
import { Sheet } from '../components/Sheet';
import { BigButton } from '../components/BigButton';
import { Poster } from '../components/Poster';
import { tap } from '../lib/haptics';

export function PlayerScreen({ titleId, episodeId }: { titleId: string; episodeId?: string }) {
  const title = titleById[titleId];
  const [currentId, setCurrentId] = useState(
    () => title?.episodes.find((e) => e.id === episodeId)?.id ?? title?.episodes[0]?.id ?? ''
  );
  if (!title || !currentId) {
    return (
      <View style={styles.root}>
        <Text style={styles.errorTitle}>This title is not available.</Text>
      </View>
    );
  }
  return <PlayerStage key={`${titleId}:${currentId}`} titleId={titleId} episodeId={currentId} onSwitchEpisode={setCurrentId} />;
}

function PlayerStage({
  titleId,
  episodeId,
  onSwitchEpisode,
}: {
  titleId: string;
  episodeId: string;
  onSwitchEpisode: (episodeId: string) => void;
}) {
  const {
    t,
    settings,
    saveProgress,
    recordWatch,
    episodeProgress,
    getOfflineSource,
    limitReached,
    grantExtraTime,
    canWatch,
    recommended,
  } = useApp();
  const nav = useNav();
  const { width, height } = useWindowDimensions();
  const title = titleById[titleId] as Title | undefined;
  const episode = useMemo(
    () => title?.episodes.find((e) => e.id === episodeId) ?? title?.episodes[0],
    [title, episodeId]
  );
  const [offline, setOffline] = useState<string | null>(null);
  const [startAt] = useState(() => {
    const saved = episode ? episodeProgress(episode.id) : undefined;
    return saved && !saved.completed ? saved.positionSec : 0;
  });
  const [pos, setPos] = useState(startAt);
  const [dur, setDur] = useState(episode ? episode.durationMin * 60 : 0);
  const [buffered, setBuffered] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>('loading');
  const [controls, setControls] = useState(true);
  const [ended, setEnded] = useState(false);
  const [cc, setCc] = useState<'off' | 'en' | 'es'>(() =>
    settings.captionsAlways && episode?.captions[0] ? episode.captions[0].lang : 'off'
  );
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [captionBg, setCaptionBg] = useState(true);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepLeft, setSleepLeft] = useState<number | null>(null);
  const [sleepDone, setSleepDone] = useState(false);
  const [timeUp, setTimeUp] = useState(limitReached);
  const [autoNextIn, setAutoNextIn] = useState<number | null>(null);
  const resumedRef = useRef(startAt <= 0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef({ at: 0, x: 0 });
  const compactControls = width < 420;

  const videoRef = useRef<any>(null);
  const watched = useRef(0);
  const posRef = useRef(pos);
  const durRef = useRef(dur);
  const endedRef = useRef(false);
  const epRef = useRef(episode);
  posRef.current = pos;
  durRef.current = dur;
  epRef.current = episode;

  const source = useMemo(() => {
    if (offline) return offline;
    if (!episode) return '';
    return Platform.OS === 'web' ? episode.mp4Url : episode.hlsUrl;
  }, [offline, episode]);

  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.audioMixingMode = 'doNotMix';
    p.volume = 1;
    if (startAt > 0) p.currentTime = startAt;
    p.play();
  });

  // If this title/episode is downloaded, play the local file instead.
  useEffect(() => {
    let alive = true;
    if (!episode) return;
    getOfflineSource(titleId, episode.id).then((uri) => {
      if (alive && uri) setOffline(uri);
    });
    return () => {
      alive = false;
    };
  }, [titleId, episode?.id, getOfflineSource]);

  const persist = useCallback(() => {
    if (!episode) return;
    saveProgress(titleId, episode.id, posRef.current, durRef.current || 1);
  }, [episode, saveProgress, titleId]);

  const flushWatch = useCallback(() => {
    if (watched.current >= 5 && episode) {
      recordWatch(titleId, episode.id, Math.round(watched.current));
      watched.current = 0;
    }
  }, [episode, recordWatch, titleId]);

  // Main playback ticker (progress, buffering, screen-time, history).
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const current = player.currentTime ?? 0;
      const total = player.duration ?? 0;
      setPos(current);
      if (total > 0) setDur(total);
      setPlaying(Boolean(player.playing));
      setStatus(player.status ?? 'loading');
      setBuffered(Math.max(0, player.bufferedPosition ?? 0));

      if (player.playing) {
        watched.current += 0.5;
        if (watched.current >= 30) flushWatch();
      }

      if (total > 0 && current >= total - 0.6 && !endedRef.current) {
        endedRef.current = true;
        setEnded(true);
        setControls(true);
        persist();
      }

      if (limitReached && player.playing) {
        player.pause();
        setTimeUp(true);
        flushWatch();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player, flushWatch, limitReached, persist]);

  // Persist progress periodically and when leaving.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!endedRef.current) persist();
    }, 5000);
    return () => {
      clearInterval(interval);
      flushWatch();
      if (epRef.current) {
        saveProgress(titleId, epRef.current.id, posRef.current, durRef.current || 1);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleId]);

  // Auto-hide controls (independent of the progress ticker).
  useEffect(() => {
    if (!controls || !playing || ended) return;
    const timer = setTimeout(() => setControls(false), 4500);
    return () => clearTimeout(timer);
  }, [controls, playing, ended]);

  // Seek to the saved position once the media is actually ready (web needs this).
  useEffect(() => {
    if (resumedRef.current || !player || startAt <= 0) return;
    if (status !== 'readyToPlay' && status !== 'idle') return;
    player.currentTime = startAt;
    resumedRef.current = true;
  }, [status, player, startAt]);

  // Sleep timer countdown.
  useEffect(() => {
    if (sleepLeft === null) return;
    if (sleepLeft <= 0) {
      player?.pause();
      setSleepDone(true);
      setSleepLeft(null);
      return;
    }
    const timer = setTimeout(() => setSleepLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [sleepLeft, player]);

  useEffect(() => {
    if (!player) return;
    player.muted = muted;
    player.volume = volume;
  }, [player, muted, volume]);

  useEffect(() => {
    if (!player) return;
    player.playbackRate = speed;
  }, [player, speed]);

  // Recover once or twice from a transient network/media failure.
  useEffect(() => {
    if (status !== 'error' || recoveryAttempts >= 2 || !player) return;
    const timer = setTimeout(() => {
      setRecoveryAttempts((count) => count + 1);
      player.replay();
    }, 1600);
    return () => clearTimeout(timer);
  }, [status, recoveryAttempts, player]);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  // Keep the caption language valid when moving between episodes that have
  // different published tracks.
  useEffect(() => {
    setCc((current) => {
      if (current === 'off') {
        return settings.captionsAlways && episode?.captions[0] ? episode.captions[0].lang : 'off';
      }
      if (episode?.captions.some((track) => track.lang === current)) return current;
      return episode?.captions[0]?.lang ?? 'off';
    });
  }, [episode?.id, settings.captionsAlways]);

  const next = episode ? findNext(titleId, episode.id) : undefined;
  const prev = episode ? findPrev(titleId, episode.id) : undefined;

  useEffect(() => {
    if (!ended || !next || !settings.autoPlayNext) {
      setAutoNextIn(null);
      return;
    }
    setAutoNextIn(8);
    const timer = setInterval(() => {
      setAutoNextIn((n) => {
        if (n === null) return null;
        if (n <= 1) {
          clearInterval(timer);
          goToEpisode(next);
          return null;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, next?.id, settings.autoPlayNext]);

  const goToEpisode = (target: { id: string; number: number }) => {
    if (!title) return;
    const ep = title.episodes.find((e) => e.id === target.id);
    if (!ep) return;
    flushWatch();
    persist();
    setAutoNextIn(null);
    onSwitchEpisode(ep.id);
  };

  const leave = () => {
    flushWatch();
    persist();
    nav.back();
  };

  const toggle = () => {
    if (!player) return;
    if (player.playing) player.pause();
    else {
      if (limitReached) {
        setTimeUp(true);
        return;
      }
      if (ended) {
        player.replay();
        endedRef.current = false;
        setEnded(false);
      } else player.play();
    }
    setControls(true);
  };

  const seekTo = (seconds: number) => {
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(seconds, dur || seconds));
    setPos(Math.max(0, Math.min(seconds, dur || seconds)));
    setEnded(false);
    endedRef.current = false;
    setControls(true);
  };

  const skip = (delta: number) => {
    tap();
    seekTo((player?.currentTime ?? pos) + delta);
  };

  const handleSurfaceTap = (locationX: number) => {
    const now = Date.now();
    const isDouble = now - lastTap.current.at < 320 && Math.abs(locationX - lastTap.current.x) < 90;
    if (isDouble) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      lastTap.current = { at: 0, x: 0 };
      skip(locationX < width / 2 ? -10 : 10);
      return;
    }
    lastTap.current = { at: now, x: locationX };
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      setControls((value) => !value);
      tapTimer.current = null;
    }, 220);
  };

  if (!title || !episode) {
    return (
      <View style={styles.root}>
        <Text style={styles.errorTitle}>This title is not available.</Text>
        <BigButton label="Go back" onPress={() => nav.back()} full={false} />
      </View>
    );
  }

  if (!canWatch(title)) {
    return (
      <View style={styles.root}>
        <Text style={{ fontSize: 54 }}>🔒</Text>
        <Text style={styles.errorTitle}>Not available for this profile</Text>
        <Text style={styles.errorBody}>A grown-up can change the age level in the parent dashboard.</Text>
        <BigButton label="Go back" onPress={() => nav.back()} full={false} />
      </View>
    );
  }

  if (timeUp) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#241447', '#150C31']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 72 }}>🌙</Text>
        <Text style={styles.errorTitle}>{t('timeUpTitle')}</Text>
        <Text style={styles.errorBody}>{t('timeUpBody')}</Text>
        <View style={{ gap: 10, marginTop: 12, alignItems: 'center' }}>
          <BigButton label={t('askGrownUp')} icon="🔐" onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })} full={false} />
          <BigButton label="Back home" variant="ghost" full={false} onPress={() => nav.setTab('home')} />
        </View>
      </View>
    );
  }

  const lang = cc === 'off' ? null : episode.captions.find((c) => c.lang === cc);
  const activeCues = lang ? lang.cues.filter((c) => pos >= c.start && pos <= c.end) : [];
  // Some NASA/ASR tracks contain overlapping cues. Show the newest one so the
  // overlay reads like a subtitle track instead of an arbitrary first match.
  const cue = activeCues.length ? activeCues[activeCues.length - 1] : undefined;
  const captionOptions = [
    { id: 'off' as const, label: 'Off' },
    ...episode.captions.map((track) => ({ id: track.lang, label: track.label })),
  ];
  const captionCredit = episode.captions[0]?.credit;
  const hasAutoCaption = episode.captions.some((track) => track.auto);
  const recent = recommended.filter((r) => r.id !== title.id).slice(0, 6);

  return (
    <View style={styles.root}>
      <VideoView
        ref={videoRef}
        player={player}
        style={[StyleSheet.absoluteFill, styles.video]}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ enable: true }}
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(event) => handleSurfaceTap(event.nativeEvent.locationX ?? width / 2)}
        accessibilityRole="button"
        accessibilityLabel="Video. Double tap the left or right side to skip ten seconds"
      />

      {status === 'loading' && !ended ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.loadingText}>Loading the magic…</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 44 }}>😢</Text>
          <Text style={styles.errorTitle}>That video did not load</Text>
          <Text style={styles.errorBody}>Check the internet connection, then try again.</Text>
          <BigButton label="Try again" onPress={() => player?.replay()} full={false} />
          <BigButton label="Go back" variant="ghost" full={false} onPress={leave} />
        </View>
      ) : null}

      {cc !== 'off' && cue && !ended ? (
        <View style={[styles.captionWrap, { bottom: controls ? 128 : 44 }]} pointerEvents="none">
          <Text
            style={[
              styles.captionText,
              {
                fontSize: captionSize === 'sm' ? 15 : captionSize === 'lg' ? 26 : 20,
                lineHeight: captionSize === 'sm' ? 22 : captionSize === 'lg' ? 34 : 28,
                backgroundColor: captionBg ? 'rgba(0,0,0,0.78)' : 'transparent',
                textShadowColor: 'rgba(0,0,0,0.95)',
                textShadowRadius: 4,
              },
            ]}
          >
            {cue.text}
          </Text>
        </View>
      ) : null}

      {controls && !ended && status !== 'error' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.72)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bottomScrim} pointerEvents="none" />

          <SafeAreaView style={styles.controlsLayer} edges={['top', 'bottom']}>
            <View style={styles.topRow} pointerEvents="box-none">
              <Pressable onPress={leave} style={styles.circleBtn} accessibilityRole="button" accessibilityLabel="Close player">
                <Text style={styles.circleText}>←</Text>
              </Pressable>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.epTitle} numberOfLines={1}>{title.name}</Text>
                <Text style={styles.epSub} numberOfLines={1}>
                  {episode.name} · Episode {episode.number}{offline ? ' · Offline' : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                style={[styles.pillBtn, cc !== 'off' && styles.pillBtnOn]}
                accessibilityRole="button"
                accessibilityLabel={t('captions')}
              >
                <Text style={styles.pillText}>CC</Text>
              </Pressable>
              <Pressable
                onPress={() => setSleepOpen(true)}
                style={[styles.pillBtn, sleepLeft !== null && styles.pillBtnOn, { marginLeft: 8 }]}
                accessibilityRole="button"
                accessibilityLabel={t('sleepTimer')}
              >
                <Text style={styles.pillText}>🌙</Text>
              </Pressable>
            </View>

            <View style={[styles.middleRow, compactControls && { gap: 6 }]} pointerEvents="box-none">
              <Pressable onPress={() => prev && goToEpisode(prev)} disabled={!prev} style={[styles.skipBtn, !prev && styles.disabled]} accessibilityLabel={t('previous')}>
                <Text style={styles.skipText}>⏮</Text>
                <Text style={styles.skipLabel}>{t('previous')}</Text>
              </Pressable>
              <Pressable onPress={() => skip(-10)} style={styles.skipBtn} accessibilityLabel="Back 10 seconds">
                <Text style={styles.skipText}>↺</Text>
                <Text style={styles.skipLabel}>10s</Text>
              </Pressable>
              <Pressable onPress={toggle} style={[styles.playBtn, compactControls && { width: 66, height: 66, borderRadius: 33, marginHorizontal: 2 }]} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
                <LinearGradient colors={['#FFD23F', '#FF8A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
              </Pressable>
              <Pressable onPress={() => skip(10)} style={styles.skipBtn} accessibilityLabel="Forward 10 seconds">
                <Text style={styles.skipText}>↻</Text>
                <Text style={styles.skipLabel}>10s</Text>
              </Pressable>
              <Pressable onPress={() => next && goToEpisode(next)} disabled={!next} style={[styles.skipBtn, !next && styles.disabled]} accessibilityLabel={t('next')}>
                <Text style={styles.skipText}>⏭</Text>
                <Text style={styles.skipLabel}>{title.episodes.length > 1 ? t('next') : '—'}</Text>
              </Pressable>
            </View>

            <View style={styles.bottom}>
              <View style={styles.timeRow}>
                <Text style={styles.time}>{formatClock(pos)}</Text>
                <Text style={styles.timeDim}>{formatClock(dur)}</Text>
              </View>
              <SeekBar
                value={pos}
                max={dur || 1}
                onSeek={(v) => setPos(v)}
                onScrubStart={() => player?.pause()}
                onScrubEnd={(v) => {
                  seekTo(v);
                  if (playing) player?.play();
                }}
              />
              <View style={styles.bottomRow}>
                <Pressable onPress={() => setMuted((m) => !m)} style={styles.iconBtn} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
                  <Text style={{ fontSize: 16 }}>{muted || volume === 0 ? '🔇' : '🔊'}</Text>
                </Pressable>
                <SeekBar
                  value={muted ? 0 : volume}
                  max={1}
                  thumb={false}
                  height={4}
                  style={{ width: 96, paddingVertical: 8 }}
                  color={colors.white}
                  onSeek={(v) => {
                    setVolume(v);
                    setMuted(v === 0);
                  }}
                />
                <View style={{ flex: 1 }} />
                <Text style={styles.hdTag}>MP4</Text>
                <Pressable onPress={() => videoRef.current?.enterFullscreen?.()} style={styles.iconBtn} accessibilityLabel={t('fullscreen')}>
                  <Text style={{ fontSize: 16 }}>⛶</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      ) : null}

      {ended ? (
        <View style={styles.endOverlay}>
          <LinearGradient colors={['rgba(10,5,25,0.94)', '#1C0F3C']} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.endInner} edges={['top', 'bottom']}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={styles.endTitle}>{t('finished')}</Text>
            <Text style={styles.endSub}>{title.name} · {episode.name}</Text>

            {next && autoNextIn !== null ? (
              <View style={styles.upNext}>
                <Text style={styles.upNextLabel}>Up next in {autoNextIn}s</Text>
                <Text style={styles.upNextName}>{next.name}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <BigButton label="Play now" size="sm" full={false} onPress={() => goToEpisode(next)} />
                  <BigButton label="Cancel" variant="ghost" size="sm" full={false} onPress={() => setAutoNextIn(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {next ? <BigButton label={t('next')} icon="⏭" full={false} onPress={() => goToEpisode(next)} /> : null}
                <BigButton label={t('replay')} icon="↻" variant="secondary" full={false} onPress={() => { endedRef.current = false; setEnded(false); player?.replay(); }} />
                <BigButton label={t('exit')} variant="ghost" full={false} onPress={leave} />
              </View>
            )}

            {recent.length ? (
              <View style={{ width: '100%', marginTop: 24 }}>
                <Text style={styles.recTitle}>✨ {t('recommended')}</Text>
                <View style={styles.recRow}>
                  {recent.slice(0, 4).map((r) => (
                    <Poster
                      key={r.id}
                      title={r}
                      width={Math.min(120, (width - 80) / 4)}
                      onPress={() => {
                        flushWatch();
                        nav.replace({ name: 'player', titleId: r.id });
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      ) : null}

      {sleepDone ? (
        <Pressable style={styles.sleepDone} onPress={() => setSleepDone(false)} accessibilityRole="button">
          <Text style={{ fontSize: 70 }}>😴</Text>
          <Text style={styles.endTitle}>Sleepy time</Text>
          <Text style={styles.endSub}>The video paused for bedtime. Sweet dreams!</Text>
          <Text style={styles.tapHint}>Tap to close</Text>
        </Pressable>
      ) : null}

      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="Playback">
        <Text style={styles.sheetLabel}>{t('subtitleLanguage')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {captionOptions.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setCc(opt.id)}
              style={[styles.opt, cc === opt.id && styles.optOn]}
              accessibilityRole="button"
              accessibilityLabel={`Captions ${opt.label}`}
              accessibilityState={{ selected: cc === opt.id }}
            >
              <Text style={[styles.optText, cc === opt.id && { color: '#2A1259' }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.sheetNote, { marginTop: -8, marginBottom: 18 }]}>
          {episode.captions.length
            ? `CC source: ${captionCredit}${hasAutoCaption ? ' · Auto-generated captions may contain errors.' : ''}`
            : 'No captions have been published for this clip. Captions are not invented or guessed.'}
        </Text>

        <Text style={styles.sheetLabel}>Playback speed</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[0.75, 1, 1.25, 1.5].map((rate) => (
            <Pressable
              key={rate}
              onPress={() => setSpeed(rate)}
              style={[styles.opt, speed === rate && styles.optOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: speed === rate }}
            >
              <Text style={[styles.optText, speed === rate && { color: '#2A1259' }]}>{rate === 1 ? 'Normal' : `${rate}×`}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sheetLabel}>Caption size</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {([
            { id: 'sm' as const, label: 'Small' },
            { id: 'md' as const, label: 'Medium' },
            { id: 'lg' as const, label: 'Large' },
          ]).map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setCaptionSize(opt.id)}
              style={[styles.opt, captionSize === opt.id && styles.optOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: captionSize === opt.id }}
            >
              <Text style={[styles.optText, captionSize === opt.id && { color: '#2A1259' }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setCaptionBg((value) => !value)}
          style={[styles.opt, captionBg && styles.optOn, { alignSelf: 'flex-start', marginBottom: 18 }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: captionBg }}
        >
          <Text style={[styles.optText, captionBg && { color: '#2A1259' }]}>Caption background {captionBg ? 'on' : 'off'}</Text>
        </Pressable>

        <Text style={styles.sheetLabel}>Episode</Text>
        {title.episodes.map((ep) => (
          <Pressable key={ep.id} onPress={() => { setSettingsOpen(false); goToEpisode(ep); }} style={styles.epRow}>
            <Text style={[styles.epNum, ep.id === episode.id && { color: colors.pink }]}>{ep.number}</Text>
            <Text style={styles.epName} numberOfLines={1}>{ep.name}</Text>
            <Text style={styles.epDur}>{ep.durationMin}m</Text>
          </Pressable>
        ))}

        <Text style={[styles.sheetLabel, { marginTop: 18 }]}>Session</Text>
        <Text style={styles.sheetNote}>
          {offline ? '📥 Playing from your download (no internet needed).' : '☁️ Streaming an openly licensed demo video.'}
        </Text>
        {episode.attribution ? <Text style={styles.sheetNote}>🎬 {episode.attribution}</Text> : null}
        <Text style={styles.sheetNote}>{settings.autoPlayNext ? '▶️ Next episodes play automatically.' : '⏸️ Episodes wait for you.'}</Text>
        <Text style={styles.sheetNote}>🎚️ This source is a single progressive MP4, so there is one audio track and one quality level. Playback speed is adjustable; captions appear when this clip has a published track.</Text>
        <View style={{ height: 10 }} />
      </Sheet>

      <Sheet visible={sleepOpen} onClose={() => setSleepOpen(false)} title={t('sleepTimer')}>
        <Text style={styles.sheetNote}>Pause the video after a little while, so bedtime stays calm.</Text>
        <View style={{ gap: 10, marginTop: 14 }}>
          {[15, 30, 45, 60].map((mins) => (
            <Pressable
              key={mins}
              onPress={() => { setSleepLeft(mins * 60); setSleepOpen(false); setSleepDone(false); }}
              style={styles.sleepOpt}
              accessibilityRole="button"
            >
              <Text style={styles.sleepOptText}>🌙 {mins} minutes</Text>
              <Text style={styles.sleepOptArrow}>›</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => { setSleepLeft(null); setSleepOpen(false); }} style={styles.sleepOpt} accessibilityRole="button">
            <Text style={[styles.sleepOptText, { color: colors.textDim }]}>Turn off timer</Text>
          </Pressable>
        </View>
        {sleepLeft !== null ? <Text style={styles.sleepCountdown}>{formatClock(sleepLeft)} left</Text> : null}
        {sleepLeft !== null ? (
          <BigButton
            label="Grown-up: add 15 minutes of screen time"
            variant="soft"
            size="sm"
            onPress={async () => {
              grantExtraTime(15);
              setTimeUp(false);
              setSleepOpen(false);
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05020D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  video: { width: '100%', height: '100%', maxWidth: '100%' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.75)', fontFamily: font.semibold, fontSize: 13 },
  errorTitle: { fontFamily: font.displaySoft, fontSize: 24, color: colors.white, textAlign: 'center', marginTop: 8 },
  errorBody: { fontFamily: font.body, fontSize: 14, color: colors.textDim, textAlign: 'center', maxWidth: 340, lineHeight: 20, marginBottom: 14, paddingHorizontal: 20 },
  captionWrap: { position: 'absolute', left: 30, right: 30, alignItems: 'center' },
  captionText: {
    backgroundColor: 'rgba(0,0,0,0.78)',
    color: colors.white,
    fontFamily: font.semibold,
    fontSize: Platform.OS === 'web' ? 22 : 18,
    lineHeight: Platform.OS === 'web' ? 30 : 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
  },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 230 },
  controlsLayer: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: { color: colors.white, fontSize: 22, fontFamily: font.bold, lineHeight: 26 },
  epTitle: { color: colors.white, fontFamily: font.bold, fontSize: 15 },
  epSub: { color: 'rgba(255,255,255,0.7)', fontFamily: font.medium, fontSize: 11, marginTop: 1 },
  pillBtn: { paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  pillBtnOn: { backgroundColor: colors.primary },
  pillText: { color: colors.white, fontFamily: font.bold, fontSize: 12 },
  middleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  skipBtn: { alignItems: 'center', gap: 2, minWidth: 48 },
  skipText: { fontSize: 24, color: colors.white },
  skipLabel: { fontFamily: font.semibold, fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  disabled: { opacity: 0.3 },
  playBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  playIcon: { fontSize: 30, color: '#3B1A00', fontFamily: font.bold },
  bottom: { paddingBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  time: { color: colors.white, fontFamily: font.bold, fontSize: 12 },
  timeDim: { color: 'rgba(255,255,255,0.6)', fontFamily: font.semibold, fontSize: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  hdTag: { color: 'rgba(255,255,255,0.65)', fontFamily: font.bold, fontSize: 10, marginRight: 4 },
  endOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  endInner: { width: '100%', maxWidth: 760, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  endTitle: { fontFamily: font.display, fontSize: 34, color: colors.white, marginTop: 6, textAlign: 'center' },
  endSub: { fontFamily: font.body, fontSize: 14, color: colors.textDim, marginTop: 4, textAlign: 'center' },
  upNext: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 420,
  },
  upNextLabel: { fontFamily: font.bold, fontSize: 11, color: colors.yellow, letterSpacing: 0.5 },
  upNextName: { fontFamily: font.bold, fontSize: 17, color: colors.white, textAlign: 'center' },
  recTitle: { fontFamily: font.bold, fontSize: 14, color: colors.textDim, marginBottom: 10 },
  recRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  sleepDone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,4,20,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 30,
  },
  tapHint: { fontFamily: font.semibold, fontSize: 12, color: colors.textFaint, marginTop: 16 },
  sheetLabel: { fontFamily: font.bold, fontSize: 12, color: colors.textFaint, marginBottom: 8, letterSpacing: 0.5 },
  sheetNote: { fontFamily: font.body, fontSize: 13, color: colors.textDim, lineHeight: 19, marginBottom: 6 },
  opt: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  optOn: { backgroundColor: colors.white, borderColor: colors.white },
  optText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  epNum: { fontFamily: font.displaySoft, fontSize: 16, color: colors.textFaint, width: 26 },
  epName: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.white },
  epDur: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint },
  sleepOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sleepOptText: { fontFamily: font.bold, fontSize: 15, color: colors.white },
  sleepOptArrow: { fontFamily: font.bold, fontSize: 20, color: colors.textFaint },
  sleepCountdown: { fontFamily: font.displaySoft, fontSize: 20, color: colors.yellow, textAlign: 'center', marginVertical: 12 },
});
