import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Screen, Card } from '../components/Screen';
import { Logo } from '../components/Logo';
import { BigButton, Chip } from '../components/BigButton';
import { CATEGORY_MAP, allTitles } from '../data/catalog';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { supabase } from '../lib/supabase';
import {
  getAdminHealth,
  getAdminOverview,
  listAdminUsers,
  setAdminUserSuspended,
  type AdminHealth,
  type AdminOverview,
  type AdminUserRow,
} from '../lib/admin';

type AdminTab = 'overview' | 'users' | 'content' | 'testing' | 'health';

const TABS: { id: AdminTab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'users', label: 'Users', emoji: '👥' },
  { id: 'content', label: 'Content', emoji: '🎬' },
  { id: 'testing', label: 'Testing', emoji: '🧪' },
  { id: 'health', label: 'Health', emoji: '🩺' },
];

const APP_URL = 'https://mattthe12.github.io/kidsflix-aio/';

function dateLabel(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
    </View>
  );
}

export function AdminDashboardScreen() {
  const { admin, account, signOut } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const [overviewBusy, setOverviewBusy] = useState(true);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthBusy, setHealthBusy] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [pendingSuspend, setPendingSuspend] = useState<AdminUserRow | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [linkStates, setLinkStates] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<{ action: string; created_at: string }[]>([]);

  const loadOverview = useCallback(async () => {
    setOverviewBusy(true);
    setOverviewError('');
    const data = await getAdminOverview();
    if (!data) setOverviewError('The admin overview RPC did not return data. Check the deployed SQL migration and your session.');
    setOverview(data);
    setOverviewBusy(false);
  }, []);

  const loadUsers = useCallback(async (search: string) => {
    setUsersBusy(true);
    setUsersError('');
    const rows = await listAdminUsers(search);
    setUsers(rows);
    setUsersBusy(false);
    if (!rows.length && search.trim()) setUsersError('No accounts matched that search.');
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthBusy(true);
    setHealthError('');
    const data = await getAdminHealth();
    if (!data) setHealthError('The admin health RPC is unavailable. The SQL migration may not be deployed yet.');
    setHealth(data);
    setHealthBusy(false);
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadHealth();
    void loadUsers('');
    if (supabase) {
      void supabase
        .from('admin_actions')
        .select('action,created_at')
        .order('created_at', { ascending: false })
        .limit(8)
        .then(({ data }) => setAudit((data ?? []) as { action: string; created_at: string }[]));
    }
  }, [loadHealth, loadOverview, loadUsers]);

  const filteredTitles = useMemo(() => {
    const query = contentSearch.trim().toLowerCase();
    if (!query) return allTitles;
    return allTitles.filter((title) => `${title.name} ${title.category} ${title.subcategory}`.toLowerCase().includes(query));
  }, [contentSearch]);

  const setSuspended = async (row: AdminUserRow) => {
    setPendingSuspend(null);
    setActionNotice('');
    const result = await setAdminUserSuspended(row.user_id, !row.suspended);
    if (!result.ok) {
      setActionNotice(result.message);
      return;
    }
    setActionNotice(result.message);
    await loadUsers(userSearch);
    await loadOverview();
  };

  const checkPlaybackLink = async (titleId: string) => {
    const title = allTitles.find((item) => item.id === titleId);
    const url = title?.episodes[0]?.mp4Url;
    if (!url) {
      setLinkStates((prev) => ({ ...prev, [titleId]: 'No playback URL configured' }));
      return;
    }
    setLinkStates((prev) => ({ ...prev, [titleId]: 'Checking…' }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      setLinkStates((prev) => ({
        ...prev,
        [titleId]: response.ok
          ? `HTTP ${response.status}`
          : `HTTP ${response.status} — host may block browser checks`,
      }));
    } catch {
      setLinkStates((prev) => ({ ...prev, [titleId]: 'Could not verify from this browser' }));
    } finally {
      clearTimeout(timer);
    }
  };

  const openApp = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    else void Linking.openURL(url);
  };

  const renderOverview = () => (
    <>
      <SectionTitle title="Live overview" body="Counts come from the admin_overview RPC. Nothing on this screen is sample data." />
      {overviewBusy ? <ActivityIndicator color={colors.pink} /> : null}
      {overviewError ? <Text style={styles.error}>{overviewError}</Text> : null}
      {overview ? (
        <>
          <View style={styles.statGrid}>
            <Stat label="Parent accounts" value={overview.totalParents} emoji="👨‍👩‍👧" />
            <Stat label="Kid profiles" value={overview.totalKids} emoji="🧒" />
            <Stat label="Active (30 days)" value={overview.activeUsers30d} emoji="🟢" />
            <Stat label="Administrators" value={overview.totalAdmins} emoji="🛡️" />
            <Stat label="Catalogue titles" value={allTitles.length} emoji="🎬" />
            <Stat label="Watch-history rows" value={overview.watchHistoryEntries} emoji="🕒" />
          </View>
          <Card style={styles.panel}>
            <Text style={styles.panelTitle}>Application status</Text>
            <Text style={styles.okLine}>✅ Database RPC reachable</Text>
            <Text style={styles.mutedLine}>Auth session: {account?.email ?? 'signed in'}</Text>
            <Text style={styles.mutedLine}>Last refreshed: {dateLabel(overview.generatedAt)}</Text>
            <Text style={styles.mutedLine}>Email delivery is checked separately in Health; no delivery claim is made here.</Text>
          </Card>
          <Card style={styles.panel}>
            <Text style={styles.panelTitle}>Recent admin actions</Text>
            {audit.length ? (
              audit.map((entry, index) => (
                <Text key={`${entry.created_at}:${index}`} style={styles.mutedLine}>
                  {entry.action.replaceAll('_', ' ')} · {dateLabel(entry.created_at)}
                </Text>
              ))
            ) : (
              <Text style={styles.mutedLine}>No administrator actions recorded yet.</Text>
            )}
          </Card>
        </>
      ) : null}
    </>
  );

  const renderUsers = () => (
    <>
      <SectionTitle title="Parent accounts" body="Emails and status are only available through the admin_list_users RPC. Passwords, hashes, PINs and tokens are never selected." />
      <View style={styles.searchRow}>
        <TextInput
          value={userSearch}
          onChangeText={setUserSearch}
          onSubmitEditing={() => void loadUsers(userSearch)}
          placeholder="Search by email"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel="Search parent accounts by email"
        />
        <BigButton label="Search" onPress={() => void loadUsers(userSearch)} full={false} size="sm" />
      </View>
      {usersBusy ? <ActivityIndicator color={colors.pink} style={{ marginVertical: 16 }} /> : null}
      {usersError ? <Text style={styles.error}>{usersError}</Text> : null}
      {actionNotice ? <Text style={styles.notice}>{actionNotice}</Text> : null}
      {users.map((row) => (
        <Card key={row.user_id} style={styles.userCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userEmail} numberOfLines={1}>{row.email}</Text>
            <Text style={styles.mutedLine}>Created {dateLabel(row.created_at)}</Text>
            <Text style={styles.mutedLine}>Last sign-in {dateLabel(row.last_sign_in_at)}</Text>
            <Text style={row.suspended ? styles.warnLine : styles.okLine}>
              {row.suspended ? 'Suspended' : 'Active'}{row.is_admin ? ' · Administrator' : ''}
            </Text>
          </View>
          {!row.is_admin ? (
            <Pressable
              onPress={() => setPendingSuspend(row)}
              accessibilityRole="button"
              accessibilityLabel={`${row.suspended ? 'Reactivate' : 'Suspend'} ${row.email}`}
              style={styles.smallAction}
            >
              <Text style={styles.smallActionText}>{row.suspended ? 'Reactivate' : 'Suspend'}</Text>
            </Pressable>
          ) : null}
          {pendingSuspend?.user_id === row.user_id ? (
            <View style={styles.confirmBox}>
              <Text style={styles.mutedLine}>Confirm {row.suspended ? 'reactivation' : 'suspension'}?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Pressable onPress={() => void setSuspended(row)} style={styles.confirmAction}>
                  <Text style={styles.confirmActionText}>Confirm</Text>
                </Pressable>
                <Pressable onPress={() => setPendingSuspend(null)} style={styles.smallAction}>
                  <Text style={styles.smallActionText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </Card>
      ))}
    </>
  );

  const renderContent = () => (
    <>
      <SectionTitle title="Catalogue" body="These are the real bundled titles. The catalogue is code-managed, so this build does not claim to edit it from the browser." />
      <TextInput
        value={contentSearch}
        onChangeText={setContentSearch}
        placeholder="Search titles or categories"
        placeholderTextColor={colors.textFaint}
        style={styles.searchInput}
        accessibilityLabel="Search catalogue"
      />
      <Text style={styles.mutedLine}>{filteredTitles.length} titles shown · {Object.keys(CATEGORY_MAP).length} categories</Text>
      {filteredTitles.slice(0, 80).map((title) => (
        <Card key={title.id} style={styles.contentCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userEmail} numberOfLines={1}>{title.emoji} {title.name}</Text>
            <Text style={styles.mutedLine}>{title.category} / {title.subcategory} · {title.rating} · {title.episodes.length} episode(s)</Text>
            <Text style={styles.mutedLine} numberOfLines={1}>{title.episodes[0]?.mp4Url ?? 'No playback URL'}</Text>
          </View>
          <Pressable onPress={() => void checkPlaybackLink(title.id)} style={styles.smallAction} accessibilityRole="button">
            <Text style={styles.smallActionText}>{linkStates[title.id] ?? 'Check link'}</Text>
          </Pressable>
        </Card>
      ))}
    </>
  );

  const renderTesting = () => (
    <>
      <SectionTitle title="Protected test mode" body="These controls open the same live app in a separate tab. They do not create, edit or delete real family data." />
      <Card style={styles.panel}>
        <Text style={styles.panelTitle}>Preview the live app</Text>
        <BigButton label="Open live app" icon="🌐" onPress={() => openApp(APP_URL)} size="sm" />
        <View style={styles.deviceRow}>
          {[320, 375, 390, 430].map((widthValue) => (
            <Chip key={widthValue} label={`${widthValue}px`} onPress={() => openApp(APP_URL)} />
          ))}
        </View>
        <Text style={styles.mutedLine}>
          The width buttons open the real app; desktop browser tabs do not emulate a phone. Use your browser’s responsive device toolbar for a true viewport check.
        </Text>
      </Card>
      <Card style={styles.panel}>
        <Text style={styles.panelTitle}>Manual checks (no results are invented)</Text>
        {['Parent login and logout', 'Registration confirmation', 'Password reset', 'Parent PIN', 'Profile creation', 'Video playback', 'Favorites and downloads', 'Search', '320–430px layouts'].map((item) => (
          <Text key={item} style={styles.mutedLine}>☐ {item} — run manually on the live app</Text>
        ))}
        <Text style={styles.mutedLine}>Disposable test principals must be created and removed by an administrator; this screen does not silently create them.</Text>
      </Card>
    </>
  );

  const renderHealth = () => (
    <>
      <SectionTitle title="System health" body="Server checks are real. Email delivery is reported as not checked because Gmail SMTP has no delivery callback." />
      {healthBusy ? <ActivityIndicator color={colors.pink} /> : null}
      {healthError ? <Text style={styles.error}>{healthError}</Text> : null}
      {health ? (
        <Card style={styles.panel}>
          <Text style={health.databaseOk ? styles.okLine : styles.warnLine}>
            {health.databaseOk ? '✅ Database reachable' : '❌ Database check failed'}
          </Text>
          <Text style={health.authReachable ? styles.okLine : styles.warnLine}>
            {health.authReachable ? '✅ Auth service reachable' : '❌ Auth service check failed'}
          </Text>
          <Text style={styles.mutedLine}>Kid profiles: {health.kidProfiles}</Text>
          <Text style={styles.mutedLine}>Watch-history rows: {health.watchRows}</Text>
          <Text style={styles.mutedLine}>Email delivery: {health.emailDelivery.replaceAll('_', ' ')}</Text>
          <Text style={styles.mutedLine}>Checked: {dateLabel(health.checkedAt)}</Text>
          <BigButton label="Run health check again" onPress={() => void loadHealth()} size="sm" variant="soft" />
        </Card>
      ) : null}
      <Card style={styles.panel}>
        <Text style={styles.panelTitle}>Recent application errors</Text>
        <Text style={styles.mutedLine}>No server-side error feed is configured in this project. This is not a “no errors” result; it is an unavailable diagnostic.</Text>
      </Card>
    </>
  );

  return (
    <Screen contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Logo size={compact ? 25 : 29} />
          <Text style={styles.adminTag}>🛡️ ADMINISTRATOR</Text>
          <Text style={styles.username} numberOfLines={1}>@{admin?.username ?? 'admin'} · {account?.email ?? ''}</Text>
        </View>
        <Pressable onPress={() => void signOut()} accessibilityRole="button" style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsInner}>
        {TABS.map((item) => (
          <Chip key={item.id} label={`${item.emoji} ${item.label}`} active={tab === item.id} onPress={() => setTab(item.id)} />
        ))}
      </ScrollView>

      {tab === 'overview' ? renderOverview() : null}
      {tab === 'users' ? renderUsers() : null}
      {tab === 'content' ? renderContent() : null}
      {tab === 'testing' ? renderTesting() : null}
      {tab === 'health' ? renderHealth() : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 24, maxWidth: 1080, width: '100%', alignSelf: 'center' },
  contentCompact: { paddingHorizontal: 16, paddingTop: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  adminTag: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, color: colors.yellow, marginTop: 10 },
  username: { fontFamily: font.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  signOutText: { fontFamily: font.bold, fontSize: 12, color: colors.white },
  tabs: { marginBottom: 20, flexGrow: 0 },
  tabsInner: { paddingRight: 8 },
  sectionTitle: { fontFamily: font.display, fontSize: 24, color: colors.white },
  sectionBody: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: colors.textDim, marginTop: 5 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: { flexGrow: 1, flexBasis: 145, minWidth: 130, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: font.display, fontSize: 25, color: colors.white, marginTop: 4 },
  statLabel: { fontFamily: font.semibold, fontSize: 11, color: colors.textDim, marginTop: 2 },
  panel: { padding: 16, marginBottom: 14, gap: 7 },
  panelTitle: { fontFamily: font.bold, fontSize: 15, color: colors.white, marginBottom: 3 },
  okLine: { fontFamily: font.semibold, fontSize: 13, color: colors.mint, lineHeight: 19 },
  warnLine: { fontFamily: font.semibold, fontSize: 13, color: colors.yellow, lineHeight: 19 },
  mutedLine: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: colors.textDim },
  error: { fontFamily: font.semibold, fontSize: 13, color: '#FFB3B9', backgroundColor: 'rgba(255,94,108,0.16)', padding: 12, borderRadius: radius.sm, marginBottom: 12 },
  notice: { fontFamily: font.semibold, fontSize: 13, color: colors.mint, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.white, fontFamily: font.semibold, fontSize: 14, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 12 },
  userCard: { padding: 14, marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  contentCard: { padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  userEmail: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  smallAction: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, paddingVertical: 8, marginTop: 8 },
  smallActionText: { fontFamily: font.bold, fontSize: 12, color: colors.primarySoft },
  confirmBox: { width: '100%', paddingTop: 8 },
  confirmAction: { borderRadius: radius.pill, backgroundColor: colors.danger, paddingHorizontal: 12, paddingVertical: 8 },
  confirmActionText: { fontFamily: font.bold, fontSize: 12, color: colors.white },
  deviceRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
});
