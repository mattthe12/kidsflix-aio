import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader, SettingRow, Card } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { BigButton, Chip, IconSwitch } from '../components/BigButton';
import { Sheet } from '../components/Sheet';
import { AGE_GROUPS } from '../data/avatars';
import { CATEGORY_MAP, allTitles, titleById } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { formatMinutes, timeAgo, todayKey } from '../lib/format';
import { pinSecurity, type SecurityAlertDiagnostic } from '../lib/pinSecurity';
import type { ApprovalStatus, Rating } from '../types';

type Tab = 'overview' | 'kids' | 'controls' | 'history' | 'account';
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'kids', label: 'Kids', emoji: '🧒' },
  { id: 'controls', label: 'Controls', emoji: '🛡️' },
  { id: 'history', label: 'History', emoji: '🕒' },
  { id: 'account', label: 'Account', emoji: '⚙️' },
];

export function ParentDashboardScreen() {
  const {
    t,
    family,
    settings,
    updateSettings,
    updateProfile,
    deleteProfile,
    profiles,
    account,
    setApprovalFor,
    removeFavoriteFor,
    grantExtraTime,
    lockParent,
    isDemo,
    signOut,
    setParentName,
    clearHistory,
  } = useApp();
  const nav = useNav();
  const [tab, setTab] = useState<Tab>('overview');
  const [kidId, setKidId] = useState(profiles[0]?.id ?? '');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [parentName, setLocalParentName] = useState(family?.parentName ?? '');
  const [testEmailState, setTestEmailState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testEmailMessage, setTestEmailMessage] = useState('');
  const [alertDiagnostics, setAlertDiagnostics] = useState<SecurityAlertDiagnostic[]>([]);

  useEffect(() => {
    if (tab !== 'account' || isDemo) return;
    let alive = true;
    void pinSecurity.diagnostics().then((alerts) => {
      if (alive) setAlertDiagnostics(alerts);
    });
    return () => {
      alive = false;
    };
  }, [tab, isDemo]);

  const sendTestSecurityEmail = async () => {
    setTestEmailState('sending');
    setTestEmailMessage('');
    const result = await pinSecurity.sendTestEmail();
    if (result.ok) {
      setTestEmailState('success');
      setTestEmailMessage(
        `Resend accepted the test email for ${result.recipientMasked ?? account?.email ?? 'the registered parent'}. Check the inbox and Spam folder. Delivery is marked delivered only when Resend reports it.`
      );
    } else {
      setTestEmailState('error');
      setTestEmailMessage(result.error ?? 'The security email could not be sent.');
    }
    const alerts = await pinSecurity.diagnostics();
    setAlertDiagnostics(alerts);
  };

  const kid = profiles.find((p) => p.id === kidId) ?? profiles[0];
  const today = todayKey();

  const minutesFor = (profileId: string) =>
    Math.floor((family?.watchMsByDay[profileId]?.[today] ?? 0) / 60000);

  const kidHistory = useMemo(
    () => (kid ? family?.history[kid.id] ?? [] : []),
    [family, kid]
  );
  const kidFavorites = useMemo(
    () => (kid ? family?.favorites[kid.id] ?? [] : []),
    [family, kid]
  );

  const approvalTitles = useMemo(() => {
    const q = approvalSearch.trim().toLowerCase();
    return [...allTitles]
      .filter((title) => !q || title.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [approvalSearch]);

  const totalToday = profiles.reduce((sum, p) => sum + minutesFor(p.id), 0);
  const blockedCount = kid ? Object.values(family?.approvals[kid.id] ?? {}).filter((s) => s === 'blocked').length : 0;

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = todayKey(date);
      const minutes = kid ? Math.floor((family?.watchMsByDay[kid.id]?.[key] ?? 0) / 60000) : 0;
      return { key, minutes, label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2) };
    });
  }, [family, kid]);
  const weekMax = Math.max(30, ...weekDays.map((day) => day.minutes));
  const weekTotal = weekDays.reduce((sum, day) => sum + day.minutes, 0);

  const mostWatched = useMemo(() => {
    const counts = new Map<string, { titleId: string; seconds: number; plays: number }>();
    kidHistory.forEach((entry) => {
      const current = counts.get(entry.titleId) ?? { titleId: entry.titleId, seconds: 0, plays: 0 };
      counts.set(entry.titleId, { titleId: entry.titleId, seconds: current.seconds + entry.watchedSec, plays: current.plays + 1 });
    });
    return Array.from(counts.values()).sort((a, b) => b.seconds - a.seconds).slice(0, 5);
  }, [kidHistory]);

  const categoryTotals = useMemo(() => {
    const counts = new Map<string, number>();
    kidHistory.forEach((entry) => {
      const title = titleById[entry.titleId];
      if (title) counts.set(title.category, (counts.get(title.category) ?? 0) + entry.watchedSec);
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, seconds]) => ({ category: CATEGORY_MAP[id as keyof typeof CATEGORY_MAP], seconds, pct: total ? Math.round((seconds / total) * 100) : 0 }))
      .filter((entry) => Boolean(entry.category));
  }, [kidHistory]);

  const planLabel =
    settings.plan === 'trial' ? 'Free trial' : settings.plan === 'monthly' ? 'Monthly · $7.99' : 'Yearly · $69.99';

  return (
    <Screen>
      <PageHeader title={t('parentDashboard')} subtitle={`${account?.email ?? ''} · Grown-ups only`} onBack={() => { lockParent(); nav.setTab('home'); }} />

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {TABS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              emoji={item.emoji}
              active={tab === item.id}
              onPress={() => setTab(item.id)}
            />
          ))}
        </ScrollView>
      </View>

      {tab === 'overview' ? (
        <View style={styles.body}>
          {isDemo ? (
            <View style={styles.demo}>
              <Text style={styles.demoTitle}>🧪 Demo mode</Text>
              <Text style={styles.demoBody}>
                Supabase is not configured, so profiles and limits live on this device. Add EXPO_PUBLIC_SUPABASE_URL and
                EXPO_PUBLIC_SUPABASE_ANON_KEY to sync across devices. Payments need Stripe configuration.
              </Text>
            </View>
          ) : null}

          <Card style={styles.summaryCard}>
            <Text style={styles.cardLabel}>TODAY AT A GLANCE</Text>
            <Text style={styles.bigNumber}>{formatMinutes(totalToday)}</Text>
            <Text style={styles.cardSub}>
              across {profiles.length} profile{profiles.length === 1 ? '' : 's'} · limit {settings.dailyLimitMinutes ? `${settings.dailyLimitMinutes} min each` : 'off'}
            </Text>
            <View style={styles.kidBars}>
              {profiles.map((p) => {
                const mins = minutesFor(p.id);
                const limit = settings.dailyLimitMinutes || 60;
                return (
                  <View key={p.id} style={styles.kidBarRow}>
                    <Avatar avatarId={p.avatar} size={32} ring={false} />
                    <Text style={styles.kidBarName} numberOfLines={1}>{p.name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(100, (mins / Math.max(limit, 1)) * 100)}%` }]} />
                    </View>
                    <Text style={styles.kidBarMins}>{mins}m</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.cardLabel}>LAST 7 DAYS{kid ? ` · ${kid.name.toUpperCase()}` : ''}</Text>
                <Text style={styles.chartTotal}>{formatMinutes(weekTotal)}</Text>
              </View>
              <Text style={styles.chartAverage}>{Math.round(weekTotal / 7)} min/day average</Text>
            </View>
            <View style={styles.weekChart}>
              {weekDays.map((day) => (
                <View key={day.key} style={styles.weekColumn}>
                  <View style={styles.weekTrack}>
                    <View style={[styles.weekBar, { height: `${Math.max(4, (day.minutes / weekMax) * 100)}%` }]} />
                  </View>
                  <Text style={styles.weekValue}>{day.minutes || ''}</Text>
                  <Text style={styles.weekLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={styles.sectionLabel}>⏱️ Daily screen time</Text>
          <View style={styles.chipRow}>
            {[
              { v: 0, label: 'No limit' },
              { v: 30, label: '30 min' },
              { v: 45, label: '45 min' },
              { v: 60, label: '1 hour' },
              { v: 90, label: '1.5 hours' },
              { v: 120, label: '2 hours' },
            ].map((opt) => (
              <Chip
                key={opt.v}
                label={opt.label}
                active={settings.dailyLimitMinutes === opt.v}
                onPress={() => updateSettings({ dailyLimitMinutes: opt.v })}
              />
            ))}
          </View>

          <View style={styles.bodyInner}>
            <SettingRow
              icon="⏳"
              label="Give 15 extra minutes today"
              subtitle="A one-off treat; resets tomorrow"
              onPress={() => grantExtraTime(15)}
            />
            <SettingRow
              icon="📥"
              label={t('downloadsAllowed')}
              subtitle={settings.downloadsAllowed ? 'Kids can save shows offline' : 'Downloads are blocked'}
              right={<IconSwitch label={t('downloadsAllowed')} value={settings.downloadsAllowed} onChange={(v) => updateSettings({ downloadsAllowed: v })} />}
            />
            <SettingRow
              icon="🔔"
              label={t('notifications')}
              subtitle={settings.notificationsEnabled ? 'New episode updates on' : 'All episode alerts off'}
              right={<IconSwitch label={t('notifications')} value={settings.notificationsEnabled} onChange={(v) => updateSettings({ notificationsEnabled: v })} />}
            />
            <SettingRow
              icon="▶️"
              label={t('autoplay')}
              subtitle={settings.autoPlayNext ? 'Plays the next episode after 8s' : 'Waits for a tap between episodes'}
              right={<IconSwitch label={t('autoplay')} value={settings.autoPlayNext} onChange={(v) => updateSettings({ autoPlayNext: v })} />}
            />
            <SettingRow icon="💳" label={t('subscription')} subtitle={planLabel} onPress={() => nav.push({ name: 'subscription' })} />
            <SettingRow icon="🔑" label={t('changePin')} subtitle="Keep the parent area private" onPress={() => nav.push({ name: 'parentSetup' })} />
          </View>

          <View style={styles.safety}>
            <Text style={styles.safetyTitle}>🛡️ Safety is always on</Text>
            {[
              'No chat, comments, messaging or social features',
              'No ads or targeted advertising for kids',
              'Age ratings enforced for every profile',
              'Parent PIN protects settings and billing',
              'Downloads fully controlled by a grown-up',
            ].map((line) => (
              <Text key={line} style={styles.safetyLine}>✓ {line}</Text>
            ))}
          </View>
        </View>
      ) : null}

      {tab === 'kids' ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>🧒 Kid profiles</Text>
          {profiles.map((p) => {
            const age = AGE_GROUPS.find((g) => g.id === p.ageGroup);
            return (
              <Card key={p.id} style={styles.kidCard}>
                <View style={styles.kidTop}>
                  <Avatar avatarId={p.avatar} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kidName}>{p.name}</Text>
                    <Text style={styles.kidMeta}>
                      {age?.emoji} {age?.label} · ages {age?.ages} · {minutesFor(p.id)} min today
                    </Text>
                  </View>
                  <Pressable onPress={() => setDeleteTarget(p.id)} accessibilityRole="button" style={styles.deleteBtn}>
                    <Text style={{ fontSize: 15 }}>🗑️</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Maximum content level</Text>
                <View style={styles.chipRow}>
                  {(['G', 'PG', 'Y7'] as Rating[]).map((rating) => (
                    <Chip
                      key={rating}
                      label={rating === 'G' ? 'G · all ages' : rating === 'PG' ? 'PG · 5+' : 'Y7 · 7+'}
                      active={p.ageLimit === rating}
                      onPress={() => updateProfile(p.id, { ageLimit: rating })}
                    />
                  ))}
                </View>

                <View style={styles.kidActions}>
                  <BigButton label="Edit profile" variant="soft" size="sm" full={false} onPress={() => nav.push({ name: 'profileForm', profileId: p.id })} />
                  <BigButton label="Preview as kid" variant="ghost" size="sm" full={false} onPress={() => nav.push({ name: 'profiles' })} />
                </View>
              </Card>
            );
          })}

          <BigButton label={t('addProfile')} icon="➕" onPress={() => nav.push({ name: 'profileForm' })} />
          <Text style={styles.hint}>Profiles never collect emails, photos or location. Only a first name and a cartoon buddy.</Text>
        </View>
      ) : null}

      {tab === 'controls' ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>🎛️ Choose a kid</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {profiles.map((p) => (
              <Chip key={p.id} label={p.name} emoji="😊" active={kid?.id === p.id} onPress={() => setKidId(p.id)} />
            ))}
          </ScrollView>

          <View style={styles.bodyInner}>
            <Card style={styles.controlsCard}>
              <Text style={styles.cardLabel}>APPROVALS FOR {kid?.name?.toUpperCase() ?? 'KID'}</Text>
              <Text style={styles.cardSub}>
                {blockedCount} blocked · everything else follows the {kid?.ageLimit ?? 'G'} age level.
              </Text>
              <TextInput
                value={approvalSearch}
                onChangeText={setApprovalSearch}
                placeholder="Search a show to approve or block…"
                placeholderTextColor={colors.textFaint}
                style={styles.search}
              />
              <View style={{ marginTop: 4 }}>
                {approvalTitles.slice(0, 60).map((title) => {
                  const status = kid ? family?.approvals[kid.id]?.[title.id] : undefined;
                  const setStatus = (next: ApprovalStatus | 'clear') => kid && setApprovalFor(kid.id, title.id, next);
                  return (
                    <View key={title.id} style={styles.approvalRow}>
                      <Text style={{ fontSize: 20 }}>{title.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.approvalName} numberOfLines={1}>{title.name}</Text>
                        <Text style={styles.approvalMeta}>
                          {title.rating} · {CATEGORY_MAP[title.category].name}
                          {status ? ` · ${status}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setStatus(status === 'approved' ? 'clear' : 'approved')}
                        style={[styles.miniBtn, status === 'approved' && styles.miniBtnAllow]}
                        accessibilityRole="button"
                        accessibilityLabel={`Allow ${title.name}`}
                      >
                        <Text style={[styles.miniText, status === 'approved' && styles.miniTextOn]}>✓</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setStatus(status === 'blocked' ? 'clear' : 'blocked')}
                        style={[styles.miniBtn, status === 'blocked' && styles.miniBtnBlock]}
                        accessibilityRole="button"
                        accessibilityLabel={`Block ${title.name}`}
                      >
                        <Text style={[styles.miniText, status === 'blocked' && styles.miniTextOn]}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Text style={styles.sectionLabel}>💖 {kid?.name ?? 'Kid'}'s favorites</Text>
            {kidFavorites.length ? (
              kidFavorites.map((titleId) => {
                const title = titleById[titleId];
                if (!title) return null;
                return (
                  <SettingRow
                    key={titleId}
                    icon={title.emoji}
                    label={title.name}
                    subtitle={`${title.rating} · ${CATEGORY_MAP[title.category].name}`}
                    right={
                      <Pressable onPress={() => kid && removeFavoriteFor(kid.id, titleId)} accessibilityRole="button" style={styles.deleteBtn}>
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </Pressable>
                    }
                  />
                );
              })
            ) : (
              <Text style={styles.hint}>No favorites yet.</Text>
            )}

            <SettingRow
              icon="📥"
              label={t('downloadsAllowed')}
              subtitle="Applies to every kid profile"
              right={<IconSwitch label={t('downloadsAllowed')} value={settings.downloadsAllowed} onChange={(v) => updateSettings({ downloadsAllowed: v })} />}
            />
          </View>
        </View>
      ) : null}

      {tab === 'history' ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>🕒 Watch history</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {profiles.map((p) => (
              <Chip key={p.id} label={p.name} emoji="😊" active={kid?.id === p.id} onPress={() => setKidId(p.id)} />
            ))}
          </ScrollView>

          <View style={styles.bodyInner}>
            {mostWatched.length ? (
              <Card style={{ marginBottom: 14 }}>
                <Text style={styles.cardLabel}>MOST WATCHED CARTOONS</Text>
                {mostWatched.map((entry, index) => {
                  const title = titleById[entry.titleId];
                  if (!title) return null;
                  return (
                    <View key={entry.titleId} style={styles.historyRow}>
                      <Text style={styles.rank}>{index + 1}</Text>
                      <Text style={{ fontSize: 19 }}>{title.emoji}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.historyName} numberOfLines={1}>{title.name}</Text>
                        <Text style={styles.historyMeta}>{Math.max(1, Math.round(entry.seconds / 60))} min · {entry.plays} session{entry.plays === 1 ? '' : 's'}</Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {categoryTotals.length ? (
              <Card style={{ marginBottom: 14 }}>
                <Text style={styles.cardLabel}>CATEGORY BREAKDOWN</Text>
                {categoryTotals.map((entry) => (
                  <View key={entry.category.id} style={{ marginBottom: 10 }}>
                    <View style={styles.categoryLabelRow}>
                      <Text style={styles.historyName}>{entry.category.emoji} {entry.category.name}</Text>
                      <Text style={styles.historyMeta}>{entry.pct}%</Text>
                    </View>
                    <View style={styles.categoryTrack}>
                      <View style={[styles.categoryFill, { width: `${entry.pct}%` }]} />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {kidHistory.length ? (
              <>
                <Card>
                  <Text style={styles.cardLabel}>RECENT ACTIVITY</Text>
                  {kidHistory.slice(0, 40).map((entry) => {
                    const title = titleById[entry.titleId];
                    const episode = title?.episodes.find((e) => e.id === entry.episodeId);
                    return (
                      <View key={entry.id} style={styles.historyRow}>
                        <Text style={{ fontSize: 18 }}>{title?.emoji ?? '🎬'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyName} numberOfLines={1}>{title?.name ?? entry.titleId}</Text>
                          <Text style={styles.historyMeta}>
                            {episode ? `${episode.name} · ` : ''}{Math.max(1, Math.round(entry.watchedSec / 60))} min watched · {timeAgo(entry.at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </Card>
                <BigButton label={t('clearHistory')} variant="ghost" size="sm" onPress={() => setConfirmClearHistory(true)} />
              </>
            ) : (
              <Text style={styles.hint}>{t('noHistory')}</Text>
            )}
            <Text style={styles.hint}>History helps with recommendations. Clear it any time for a fresh start.</Text>
          </View>
        </View>
      ) : null}

      {tab === 'account' ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>👨‍👩‍👧 Parent account</Text>
          <View style={styles.bodyInner}>
            <Card>
              <Text style={styles.cardLabel}>ACCOUNT HOLDER</Text>
              <Text style={styles.accountEmail}>{account?.email}</Text>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                value={parentName}
                onChangeText={setLocalParentName}
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
                style={styles.search}
              />
              <View style={{ height: 10 }} />
              <BigButton
                label={t('save')}
                size="sm"
                full={false}
                onPress={() => setParentName(parentName)}
              />
            </Card>

            <Card style={styles.securityCard}>
              <Text style={styles.cardLabel}>SECURITY EMAIL</Text>
              <Text style={styles.securityCopy}>
                Real PIN-lockout alerts go to the registered parent email from your Supabase account
                {account?.email ? ` (${account.email})` : ''}. The PIN and its hash are never included.
              </Text>
              <BigButton
                label={testEmailState === 'sending' ? 'SENDING TEST EMAIL…' : 'SEND TEST SECURITY EMAIL'}
                variant="soft"
                icon="✉️"
                size="sm"
                disabled={testEmailState === 'sending' || isDemo}
                onPress={() => void sendTestSecurityEmail()}
              />
              {testEmailState === 'sending' ? (
                <View style={styles.securityLoading}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.securityMeta}>Contacting Resend…</Text>
                </View>
              ) : null}
              {testEmailState !== 'idle' && testEmailState !== 'sending' && testEmailMessage ? (
                <Text style={[styles.securityMessage, testEmailState === 'error' ? styles.securityError : styles.securitySuccess]}>
                  {testEmailMessage}
                </Text>
              ) : null}
              <Text style={styles.securityHint}>
                Test emails are separate from real lockout alerts. They create their own diagnostic entry and never
                change the PIN lockout counter.
              </Text>

              {alertDiagnostics.length ? (
                <View style={styles.diagnostics}>
                  <Text style={styles.cardLabel}>RECENT SECURITY EMAIL ACTIVITY</Text>
                  {alertDiagnostics.map((alert) => (
                    <View key={alert.id} style={styles.diagnosticRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.diagnosticTitle}>
                          {alert.kind === 'test' ? 'Test email' : `${alert.failedAttempts} failed PIN attempts`} · {alert.status}
                        </Text>
                        <Text style={styles.diagnosticMeta} numberOfLines={2}>
                          {new Date(alert.eventAt).toLocaleString()} · {alert.recipientMasked || 'registered parent email'}
                          {alert.attemptCount > 1 ? ` · attempt ${alert.attemptCount}` : ''}
                          {alert.deliveredAt ? ' · delivered' : alert.status === 'accepted' ? ' · accepted by Resend' : ''}
                        </Text>
                        {alert.errorMessage ? (
                          <Text style={styles.diagnosticError} numberOfLines={2}>{alert.errorMessage}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            <SettingRow icon="💳" label={t('subscription')} subtitle={planLabel} onPress={() => nav.push({ name: 'subscription' })} />
            <SettingRow icon="🔑" label={t('changePin')} subtitle="Reset the 4-digit parent PIN" onPress={() => nav.push({ name: 'parentSetup' })} />
            <SettingRow icon="⚙️" label="Account settings" subtitle="Language, accessibility, legal" onPress={() => nav.push({ name: 'settings' })} />
            <SettingRow icon="📥" label="Manage downloads" subtitle={settings.downloadsAllowed ? 'Downloads allowed on this account' : 'Download permissions off'} onPress={() => nav.push({ name: 'downloads' })} />

            <View style={styles.legalCard}>
              <Text style={styles.legalTitle}>Child privacy & safety</Text>
              <Text style={styles.legalText}>
                KidsFlix is designed for children’s privacy. Kid profiles do not require email addresses, phone numbers, photos or
                location. We do not show behavioural advertising to children and there are no public profiles, comments, chat or
                messaging features. Watch history is visible only to the parent account holder and can be deleted at any time.
              </Text>
              <Text style={styles.legalText}>
                Operational note: deployments serving children in the United States must configure verifiable parental consent and
                data-retention policies in line with COPPA; other regions have equivalent laws (GDPR-K, UK Age Appropriate Design Code).
                This app provides the technical controls; legal review of your deployment is required.
              </Text>
            </View>

            <BigButton label={t('signOut')} variant="ghost" onPress={signOut} />
          </View>
        </View>
      ) : null}

      <Sheet visible={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete this profile?">
        <Text style={styles.sheetBody}>
          The profile, its favorites, history and downloads will be removed. This cannot be undone.
        </Text>
        <BigButton
          label="Yes, delete profile"
          variant="danger"
          onPress={() => {
            if (deleteTarget) deleteProfile(deleteTarget);
            setDeleteTarget(null);
          }}
        />
        <View style={{ height: 10 }} />
        <BigButton label={t('cancel')} variant="ghost" onPress={() => setDeleteTarget(null)} />
      </Sheet>

      <Sheet visible={confirmClearHistory} onClose={() => setConfirmClearHistory(false)} title="Clear watch history?">
        <Text style={styles.sheetBody}>Recommendations will start fresh for this profile. Favorites stay untouched.</Text>
        <BigButton
          label="Clear history"
          variant="danger"
          onPress={() => {
            if (kid) clearHistory(kid.id);
            setConfirmClearHistory(false);
          }}
        />
        <View style={{ height: 10 }} />
        <BigButton label={t('cancel')} variant="ghost" onPress={() => setConfirmClearHistory(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { marginBottom: 16 },
  body: { paddingBottom: 20 },
  bodyInner: { paddingHorizontal: 20 },
  demo: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(62,168,255,0.12)', borderRadius: radius.md, padding: 14 },
  demoTitle: { fontFamily: font.bold, fontSize: 13, color: '#9FD6FF', marginBottom: 4 },
  demoBody: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  summaryCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(124,77,255,0.2)' },
  chartCard: { marginHorizontal: 20, marginBottom: 18 },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  chartTotal: { fontFamily: font.display, fontSize: 28, color: colors.white },
  chartAverage: { fontFamily: font.semibold, fontSize: 11, color: colors.textFaint },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 132, marginTop: 14 },
  weekColumn: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  weekTrack: { width: '100%', maxWidth: 30, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  weekBar: { width: '100%', backgroundColor: colors.mint, borderRadius: 8, minHeight: 4 },
  weekValue: { fontFamily: font.bold, fontSize: 9, color: colors.textDim, height: 12 },
  weekLabel: { fontFamily: font.semibold, fontSize: 9.5, color: colors.textFaint },
  rank: { fontFamily: font.displaySoft, fontSize: 16, color: colors.yellow, width: 20 },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 },
  categoryTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  categoryFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primarySoft },
  cardLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: colors.textFaint, marginBottom: 6 },
  bigNumber: { fontFamily: font.display, fontSize: 40, color: colors.white },
  cardSub: { fontFamily: font.medium, fontSize: 12.5, color: colors.textDim, marginTop: 2, lineHeight: 18 },
  kidBars: { marginTop: 16, gap: 10 },
  kidBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kidBarName: { fontFamily: font.semibold, fontSize: 12, color: colors.white, width: 64 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.mint },
  kidBarMins: { fontFamily: font.bold, fontSize: 11, color: colors.textDim, width: 34, textAlign: 'right' },
  sectionLabel: { fontFamily: font.bold, fontSize: 12, color: colors.textFaint, marginLeft: 24, marginBottom: 8, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 14, gap: 0 },
  safety: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'rgba(63,224,176,0.1)', borderRadius: radius.md, padding: 16, gap: 6 },
  safetyTitle: { fontFamily: font.bold, fontSize: 14, color: colors.mint, marginBottom: 4 },
  safetyLine: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  kidCard: { marginHorizontal: 20, marginBottom: 12 },
  kidTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  kidName: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  kidMeta: { fontFamily: font.medium, fontSize: 11.5, color: colors.textDim, marginTop: 2 },
  deleteBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,94,108,0.15)', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontFamily: font.bold, fontSize: 11.5, color: colors.textFaint, marginBottom: 8, marginTop: 4 },
  kidActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  hint: { fontFamily: font.body, fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 10, lineHeight: 18, paddingHorizontal: 22 },
  controlsCard: { marginBottom: 18 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    fontFamily: font.semibold,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    outlineStyle: 'none',
  } as object,
  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  approvalName: { fontFamily: font.semibold, fontSize: 13.5, color: colors.white },
  approvalMeta: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint, marginTop: 1 },
  miniBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  miniBtnAllow: { backgroundColor: 'rgba(63,224,176,0.85)' },
  miniBtnBlock: { backgroundColor: 'rgba(255,94,108,0.85)' },
  miniText: { fontFamily: font.bold, fontSize: 14, color: colors.textDim },
  miniTextOn: { color: '#0B0619' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  historyName: { fontFamily: font.semibold, fontSize: 13.5, color: colors.white },
  historyMeta: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint, marginTop: 2 },
  accountEmail: { fontFamily: font.bold, fontSize: 16, color: colors.white, marginBottom: 8 },
  securityCard: { marginTop: 14, marginBottom: 8, gap: 10 },
  securityCopy: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  securityHint: { fontFamily: font.body, fontSize: 11, color: colors.textFaint, lineHeight: 16 },
  securityLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityMeta: { fontFamily: font.medium, fontSize: 12, color: colors.textDim },
  securityMessage: { fontFamily: font.medium, fontSize: 12, lineHeight: 17 },
  securitySuccess: { color: colors.mint },
  securityError: { color: '#FF9AA4' },
  diagnostics: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12, gap: 2 },
  diagnosticRow: { flexDirection: 'row', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  diagnosticTitle: { fontFamily: font.semibold, fontSize: 12.5, color: colors.white },
  diagnosticMeta: { fontFamily: font.medium, fontSize: 10.5, color: colors.textFaint, marginTop: 2, lineHeight: 15 },
  diagnosticError: { fontFamily: font.body, fontSize: 10.5, color: '#FF9AA4', marginTop: 2, lineHeight: 15 },
  legalCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: 16, marginVertical: 12, gap: 10 },
  legalTitle: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  legalText: { fontFamily: font.body, fontSize: 12, color: colors.textDim, lineHeight: 18 },
  sheetBody: { fontFamily: font.body, fontSize: 14, color: colors.textDim, lineHeight: 21, marginBottom: 18 },
});
