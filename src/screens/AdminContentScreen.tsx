import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BigButton, Chip } from '../components/BigButton';
import { Card } from '../components/Screen';
import { TextField } from '../components/TextField';
import { CATEGORIES, CATEGORY_MAP } from '../data/catalog';
import { colors, font, radius } from '../theme';
import {
  listAdminContent,
  newContentDraft,
  saveAdminContent,
  setAdminContentStatus,
  type AdminContentRow,
  type ContentStatus,
} from '../lib/content';
import type { CategoryId, Episode, Rating, SubcategoryId, Title } from '../types';

type Filter = 'all' | ContentStatus;

function cloneTitle(title: Title): Title {
  return JSON.parse(JSON.stringify(title)) as Title;
}

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function contentIssues(title: Title): string | null {
  if (!title.name.trim()) return 'Add a title name before publishing.';
  if (!title.description.trim()) return 'Add a short description before publishing.';
  if (!title.episodes.length) return 'Add at least one episode before publishing.';
  if (title.episodes.some((episode) => !episode.name.trim())) return 'Every episode needs a name before publishing.';
  return null;
}

export function AdminContentScreen() {
  const [rows, setRows] = useState<AdminContentRow[]>([]);
  const [listBusy, setListBusy] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Title | null>(null);
  const [editingStatus, setEditingStatus] = useState<ContentStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setListBusy(true);
    const result = await listAdminContent();
    setRows(result.rows);
    setLoadError(result.error ?? '');
    setListBusy(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'published' && row.status !== 'published') return false;
      if (filter === 'draft' && row.status !== 'draft' && !row.draftPayload) return false;
      if (!query) return true;
      const text = `${row.id} ${row.payload.name} ${row.draftPayload?.name ?? ''} ${row.payload.category}`.toLowerCase();
      return text.includes(query);
    });
  }, [filter, rows, search]);

  const publishedCount = rows.filter((row) => row.status === 'published').length;
  const draftCount = rows.filter((row) => row.status === 'draft' || Boolean(row.draftPayload)).length;

  const startNew = () => {
    setEditing(newContentDraft());
    setEditingStatus('draft');
    setFormError('');
    setNotice('');
  };

  const startEdit = (row: AdminContentRow) => {
    setEditing(cloneTitle(row.draftPayload ?? row.payload));
    setEditingStatus(row.status);
    setFormError('');
    setNotice('');
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setFormError('');
    setNotice('');
  };

  const patchTitle = (patch: Partial<Title>) => {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  };

  const patchEpisode = (episodeId: string, patch: Partial<Episode>) => {
    setEditing((current) =>
      current
        ? {
            ...current,
            episodes: current.episodes.map((episode) =>
              episode.id === episodeId ? { ...episode, ...patch } : episode
            ),
          }
        : current
    );
  };

  const addEpisode = () => {
    setEditing((current) => {
      if (!current) return current;
      const nextNumber = Math.max(0, ...current.episodes.map((episode) => episode.number)) + 1;
      return {
        ...current,
        episodes: [
          ...current.episodes,
          {
            id: `${current.id}-e${Date.now().toString(36)}`,
            titleId: current.id,
            number: nextNumber,
            name: 'New episode',
            durationMin: 1,
            hlsUrl: '',
            mp4Url: '',
            downloadUrl: '',
            captions: [],
          },
        ],
      };
    });
  };

  const removeEpisode = (episodeId: string) => {
    setEditing((current) =>
      current ? { ...current, episodes: current.episodes.filter((episode) => episode.id !== episodeId) } : current
    );
  };

  const save = async (publish: boolean) => {
    if (!editing) return;
    if (publish) {
      const issue = contentIssues(editing);
      if (issue) {
        setFormError(issue);
        return;
      }
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const normalized: Title = {
      ...editing,
      name: editing.name.trim(),
      description: editing.description.trim(),
      tags: editing.tags.map((tag) => String(tag).trim()).filter(Boolean),
    };
    const saveResult = await saveAdminContent(editing.id, normalized);
    if (!saveResult.ok) {
      setFormError(saveResult.error ?? 'Could not save this title.');
      setSaving(false);
      return;
    }

    if (publish) {
      const publishResult = await setAdminContentStatus(editing.id, 'published');
      if (!publishResult.ok) {
        setFormError(publishResult.error ?? 'Draft saved, but publishing failed.');
        setEditing(normalized);
        await load();
        setSaving(false);
        return;
      }
      setEditingStatus('published');
      setNotice('Published. The title is live for the kid app.');
    } else {
      setNotice(editingStatus === 'published' ? 'Draft saved. The live version is unchanged.' : 'Draft saved.');
    }

    setEditing(normalized);
    await load();
    setSaving(false);
  };

  const toggleStatus = async (row: AdminContentRow) => {
    const next: ContentStatus = row.status === 'published' ? 'draft' : 'published';
    setSaving(true);
    setFormError('');
    setNotice('');
    const result = await setAdminContentStatus(row.id, next);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error ?? "Could not change this title's status.");
      return;
    }
    if (editing?.id === row.id) setEditingStatus(next);
    setFormError('');
    setNotice(next === 'published' ? 'Published.' : 'Moved back to draft; it is no longer live.');
    await load();
  };

  const selectedCategory = editing ? CATEGORY_MAP[editing.category] : null;

  return (
    <View style={styles.root}>
      <View style={styles.intro}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Catalogue</Text>
          <Text style={styles.body}>
            {rows.length} titles · {publishedCount} live · {draftCount} draft or unpublished changes. Published titles are live after the app reloads; drafts never reach the kid app.
          </Text>
        </View>
        <BigButton label="New title" icon="＋" onPress={startNew} full={false} size="sm" />
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {loadError ? (
        <Text style={styles.error}>
          {loadError}
          {'\n'}Run the content catalogue migration and seed before editing here.
        </Text>
      ) : null}

      {editing ? (
        <Card style={styles.editor}>
          <View style={styles.editorHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.editorTitle}>{rows.some((row) => row.id === editing.id) ? 'Edit title' : 'New title'}</Text>
              <Text style={styles.muted}>ID: {editing.id} · {editingStatus === 'published' ? 'Published' : 'Draft'}</Text>
            </View>
            <Pressable onPress={closeEditor} accessibilityRole="button" accessibilityLabel="Close editor" hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <TextField
            label="Title name"
            value={editing.name}
            onChangeText={(name) => patchTitle({ name })}
            placeholder="e.g. Panda Pals"
          />
          <TextField
            label="Emoji"
            value={editing.emoji}
            onChangeText={(emoji) => patchTitle({ emoji })}
            placeholder="🐼"
            maxLength={8}
          />
          <TextField
            label="Description"
            value={editing.description}
            onChangeText={(description) => patchTitle({ description })}
            placeholder="What happens in this title?"
            multiline
            style={styles.multiline}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                emoji={category.emoji}
                active={editing.category === category.id}
                onPress={() =>
                  patchTitle({
                    category: category.id as CategoryId,
                    subcategory: category.subcategories[0].id as SubcategoryId,
                  })
                }
              />
            ))}
          </View>

          <Text style={styles.label}>Collection</Text>
          <View style={styles.chipRow}>
            {(selectedCategory?.subcategories ?? []).map((subcategory) => (
              <Chip
                key={subcategory.id}
                label={subcategory.name}
                emoji={subcategory.emoji}
                active={editing.subcategory === subcategory.id}
                onPress={() => patchTitle({ subcategory: subcategory.id as SubcategoryId })}
              />
            ))}
          </View>

          <Text style={styles.label}>Rating</Text>
          <View style={styles.chipRow}>
            {(['G', 'PG', 'Y7'] as Rating[]).map((rating) => (
              <Chip
                key={rating}
                label={rating}
                active={editing.rating === rating}
                onPress={() => patchTitle({ rating })}
              />
            ))}
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <TextField
                label="Minutes"
                value={String(editing.minutes)}
                onChangeText={(value) => patchTitle({ minutes: Number(value.replace(/\D/g, '')) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.fieldHalf}>
              <TextField
                label="Year"
                value={String(editing.year)}
                onChangeText={(value) => patchTitle({ year: Number(value.replace(/\D/g, '')) || 0 })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <TextField
                label="Popularity"
                value={String(editing.popularity)}
                onChangeText={(value) => patchTitle({ popularity: Number(value.replace(/\D/g, '')) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.fieldHalf}>
              <TextField
                label="Days since added"
                value={String(editing.addedDaysAgo)}
                onChangeText={(value) => patchTitle({ addedDaysAgo: Number(value.replace(/\D/g, '')) || 0 })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <TextField
            label="Tags (comma separated)"
            value={editing.tags.join(', ')}
            onChangeText={(value) => patchTitle({ tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
            placeholder="animals, gentle, music"
          />

          <Text style={styles.sectionTitle}>Episodes</Text>
          {editing.episodes.map((episode, index) => (
            <View key={episode.id} style={styles.episode}>
              <View style={styles.episodeHeader}>
                <Text style={styles.episodeTitle}>Episode {index + 1}</Text>
                <Pressable onPress={() => removeEpisode(episode.id)} accessibilityRole="button" accessibilityLabel={`Remove episode ${index + 1}`}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
              <TextField
                label="Episode name"
                value={episode.name}
                onChangeText={(name) => patchEpisode(episode.id, { name })}
                placeholder="e.g. Full cartoon"
              />
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <TextField
                    label="Number"
                    value={String(episode.number)}
                    onChangeText={(value) => patchEpisode(episode.id, { number: Number(value.replace(/\D/g, '')) || 0 })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <TextField
                    label="Duration (min)"
                    value={String(episode.durationMin)}
                    onChangeText={(value) => patchEpisode(episode.id, { durationMin: Number(value.replace(/\D/g, '')) || 0 })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <TextField
                label="MP4 URL"
                value={episode.mp4Url}
                onChangeText={(mp4Url) => patchEpisode(episode.id, { mp4Url })}
                placeholder="https://…"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextField
                label="HLS URL (optional)"
                value={episode.hlsUrl}
                onChangeText={(hlsUrl) => patchEpisode(episode.id, { hlsUrl })}
                placeholder="https://…"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextField
                label="Download URL (optional)"
                value={episode.downloadUrl ?? ''}
                onChangeText={(downloadUrl) => patchEpisode(episode.id, { downloadUrl })}
                placeholder="https://…"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Existing captions and clip metadata are preserved when you edit an episode.</Text>
            </View>
          ))}
          <BigButton label="Add episode" variant="soft" icon="＋" onPress={addEpisode} size="sm" />

          <View style={styles.editorActions}>
            <BigButton
              label={saving ? 'Saving…' : editingStatus === 'published' ? 'Publish changes' : 'Publish'}
              icon="🚀"
              onPress={() => void save(true)}
              disabled={saving}
            />
            <BigButton
              label="Save draft"
              variant="ghost"
              onPress={() => void save(false)}
              disabled={saving}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles or IDs"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
          accessibilityLabel="Search managed catalogue"
        />
        <BigButton label="Refresh" variant="soft" onPress={() => void load()} full={false} size="sm" />
      </View>

      <View style={styles.chipRow}>
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Published" active={filter === 'published'} onPress={() => setFilter('published')} />
        <Chip label="Drafts" active={filter === 'draft'} onPress={() => setFilter('draft')} />
      </View>

      {listBusy ? <ActivityIndicator color={colors.pink} style={{ marginVertical: 20 }} /> : null}
      {!listBusy && !visibleRows.length ? (
        <Text style={styles.empty}>{rows.length ? 'No titles match this filter.' : 'No managed titles yet. Add one or run the seed.'}</Text>
      ) : null}

      {visibleRows.map((row) => {
        const display = row.draftPayload ?? row.payload;
        return (
          <Card key={row.id} style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {display.emoji} {display.name || 'Untitled title'}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {row.id} · {display.category}/{display.subcategory} · {display.rating} · {display.episodes.length} episode(s)
              </Text>
              <Text style={row.status === 'published' ? styles.published : styles.draft}>
                {row.status === 'published' ? 'Published' : 'Draft'}
                {row.draftPayload ? ' · edited draft waiting to publish' : ''}
                {' · '}updated {dateLabel(row.updatedAt)}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => startEdit(row)} accessibilityRole="button" accessibilityLabel={`Edit ${display.name}`} style={styles.action}>
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => void toggleStatus(row)}
                accessibilityRole="button"
                accessibilityLabel={`${row.status === 'published' ? 'Unpublish' : 'Publish'} ${display.name}`}
                style={styles.action}
                disabled={saving}
              >
                <Text style={styles.actionText}>{row.status === 'published' ? 'Unpublish' : 'Publish'}</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { fontFamily: font.display, fontSize: 24, color: colors.white },
  body: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: colors.textDim, marginTop: 5 },
  editor: { padding: 16, marginBottom: 16, gap: 2 },
  editorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  editorTitle: { fontFamily: font.display, fontSize: 22, color: colors.white },
  close: { fontFamily: font.bold, fontSize: 22, color: colors.textDim },
  muted: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: colors.textDim },
  label: { fontFamily: font.bold, fontSize: 13, color: colors.textDim, marginLeft: 6, marginBottom: 7, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1, minWidth: 0 },
  multiline: { minHeight: 88, textAlignVertical: 'top' } as object,
  sectionTitle: { fontFamily: font.displaySoft, fontSize: 20, color: colors.white, marginTop: 8, marginBottom: 10 },
  episode: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4, marginBottom: 8 },
  episodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  episodeTitle: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  remove: { fontFamily: font.semibold, fontSize: 12, color: '#FFB3B9' },
  hint: { fontFamily: font.body, fontSize: 11, color: colors.textFaint, lineHeight: 16, marginLeft: 6, marginBottom: 8 },
  editorActions: { gap: 8, marginTop: 12 },
  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  search: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.white, fontFamily: font.semibold, fontSize: 14, paddingHorizontal: 13, paddingVertical: 10 },
  row: { padding: 13, marginBottom: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  rowTitle: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  published: { fontFamily: font.semibold, fontSize: 12, color: colors.mint, marginTop: 3 },
  draft: { fontFamily: font.semibold, fontSize: 12, color: colors.yellow, marginTop: 3 },
  rowActions: { flexDirection: 'row', gap: 7 },
  action: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, paddingVertical: 8 },
  actionText: { fontFamily: font.bold, fontSize: 12, color: colors.primarySoft },
  notice: { fontFamily: font.semibold, fontSize: 13, color: colors.mint, marginBottom: 4 },
  error: { fontFamily: font.semibold, fontSize: 13, color: '#FFB3B9', backgroundColor: 'rgba(255,94,108,0.16)', padding: 12, borderRadius: radius.sm, marginBottom: 8, lineHeight: 19 },
  empty: { fontFamily: font.body, fontSize: 13, color: colors.textDim, textAlign: 'center', padding: 24 },
});
