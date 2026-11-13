import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, gradients, layout, radius } from '../theme';
import { useResponsive } from '../lib/responsive';
import { Logo, RoundIconButton } from './Logo';
import { Avatar } from './Avatar';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  bottomPadding = 130,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomPadding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingBottom: bottomPadding }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />
      <SafeAreaView edges={['top']} style={styles.safe}>
        {body}
      </SafeAreaView>
    </View>
  );
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { profile, t } = useApp();
  const nav = useNav();
  const responsive = useResponsive();
  return (
    <View style={[styles.topBar, { paddingHorizontal: responsive.gutter }]}>
      <View style={styles.topLeft}>
        {onBack ? (
          <RoundIconButton icon="←" onPress={onBack} accessibilityLabel="Go back" size={44} />
        ) : (
          <Pressable
            onPress={() => nav.setTab('home')}
            accessibilityRole="button"
            accessibilityLabel="KidsFlix home"
            hitSlop={6}
          >
            <Logo size={26} compact={responsive.width < 370} />
          </Pressable>
        )}
        {title ? (
          <Text numberOfLines={1} style={styles.topTitle}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={styles.topRight}>
        {right ?? (
          <>
            <RoundIconButton
              icon="🔍"
              accessibilityLabel={t('search')}
              onPress={() => nav.push({ name: 'search' })}
              size={44}
            />
            {profile ? (
              <Pressable
                onPress={() => nav.push({ name: 'profiles' })}
                accessibilityRole="button"
                accessibilityLabel={t('switchProfile')}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Avatar avatarId={profile.avatar} size={44} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

export function PageHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <View style={styles.pageHeader}>
      {onBack ? <RoundIconButton icon="←" onPress={onBack} accessibilityLabel="Go back" size={44} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 58 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyAction} accessibilityRole="button">
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SettingRow({
  icon,
  label,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon?: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View style={styles.settingRow}>
      {icon ? (
        <View style={styles.settingIcon}>
          <Text style={{ fontSize: 19 }}>{icon}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: colors.danger }]}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export const contentStyles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.maxContentWidth > 0 ? 20 : 20 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  safe: { flex: 1, width: '100%', maxWidth: layout.maxContentWidth + 80, alignSelf: 'center' },
  glowTop: {
    position: 'absolute',
    top: -160,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(124,77,255,0.26)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -200,
    left: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(255,92,168,0.14)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 10,
    gap: 12,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: { fontFamily: font.displaySoft, fontSize: 20, color: colors.white, flexShrink: 1 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  pageTitle: { fontFamily: font.display, fontSize: 28, color: colors.white, flexShrink: 1 },
  pageSubtitle: { fontFamily: font.medium, fontSize: 14, color: colors.textDim, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30, gap: 10 },
  emptyTitle: { fontFamily: font.displaySoft, fontSize: 22, color: colors.white, textAlign: 'center' },
  emptyBody: { fontFamily: font.body, fontSize: 15, color: colors.textDim, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: 10,
    backgroundColor: colors.cardStrong,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  emptyActionText: { fontFamily: font.bold, fontSize: 15, color: colors.white },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cardStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  settingSubtitle: { fontFamily: font.body, fontSize: 13, color: colors.textDim, marginTop: 2 },
  chevron: { fontFamily: font.bold, fontSize: 24, color: colors.textFaint },
});
