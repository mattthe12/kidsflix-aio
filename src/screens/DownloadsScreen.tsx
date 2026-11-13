import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, PageHeader, EmptyState } from '../components/Screen';
import { Poster } from '../components/Poster';
import { BigButton } from '../components/BigButton';
import { titleById } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { formatBytes, formatMinutes } from '../lib/format';

export function DownloadsScreen() {
  const { t, downloads, settings, removeDownload, downloadTitle, downloading } = useApp();
  const nav = useNav();

  return (
    <Screen>
      <PageHeader title={t('downloads')} subtitle="Watch offline — on the plane, in the car, anywhere" onBack={() => nav.back()} />

      {!settings.downloadsAllowed ? (
        <View style={styles.locked}>
          <Text style={{ fontSize: 34 }}>🔒</Text>
          <Text style={styles.lockedTitle}>{t('downloadsAllowed')}: off</Text>
          <Text style={styles.lockedBody}>
            A grown-up has turned downloads off. Open the parent dashboard to allow them again.
          </Text>
          <BigButton label={t('parentDashboard')} size="sm" full={false} onPress={() => nav.push({ name: 'parentGate', then: 'dashboard' })} />
        </View>
      ) : null}

      {downloads.length === 0 ? (
        <EmptyState
          emoji="📥"
          title="No downloads yet"
          body={t('offlineEmpty')}
          actionLabel="Browse shows"
          onAction={() => nav.setTab('shows')}
        />
      ) : (
        <View style={styles.list}>
          {downloads.map((record) => {
            const title = titleById[record.titleId];
            if (!title) return null;
            const episode = title.episodes.find((e) => e.id === record.episodeId);
            return (
              <View key={`${record.titleId}-${record.episodeId}`} style={styles.row}>
                <Poster title={title} width={82} onPress={() => nav.push({ name: 'title', titleId: title.id })} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name} numberOfLines={1}>{title.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {episode?.name ?? 'Episode'} · {formatMinutes(episode?.durationMin ?? title.minutes)}
                  </Text>

                  {record.status === 'downloading' ? (
                    <>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${Math.round(record.progress * 100)}%` }]} />
                      </View>
                      <Text style={styles.status}>{t('downloading')} {Math.round(record.progress * 100)}%</Text>
                    </>
                  ) : record.status === 'ready' ? (
                    <Text style={[styles.status, { color: colors.mint }]}>✓ {t('downloaded')} · {formatBytes(record.sizeBytes)}</Text>
                  ) : (
                    <Text style={[styles.status, { color: colors.danger }]}>Download failed — tap retry.</Text>
                  )}

                  <View style={styles.actions}>
                    {record.status === 'ready' ? (
                      <BigButton
                        label="Play offline"
                        icon="▶"
                        size="sm"
                        full={false}
                        onPress={() => nav.push({ name: 'player', titleId: title.id, episodeId: record.episodeId })}
                      />
                    ) : null}
                    {record.status === 'error' ? (
                      <BigButton label="Retry" size="sm" full={false} variant="soft" onPress={() => downloadTitle(title.id)} />
                    ) : null}
                    <Pressable
                      onPress={() => removeDownload(title.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('removeDownload')} ${title.name}`}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>🗑️ {t('removeDownload')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.footnote}>
        {downloading ? 'Saving a video… you can keep browsing.' : 'Downloads are stored on this device only and use the authorised MP4 rendition.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.white },
  meta: { fontFamily: font.medium, fontSize: 11.5, color: colors.textDim },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', backgroundColor: colors.mint, borderRadius: 3 },
  status: { fontFamily: font.semibold, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  removeBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  removeText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.textFaint },
  locked: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,210,63,0.1)',
    borderRadius: radius.lg,
    padding: 18,
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.25)',
  },
  lockedTitle: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  lockedBody: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  footnote: { fontFamily: font.body, fontSize: 11, color: colors.textFaint, textAlign: 'center', paddingHorizontal: 30, marginTop: 20, lineHeight: 16 },
});
