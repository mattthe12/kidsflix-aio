import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, PageHeader, Card } from '../components/Screen';
import { Chip } from '../components/BigButton';
import { colors, font, radius } from '../theme';
import { useApp } from '../state/AppProvider';
import { useNav } from '../nav';
import { STRIPE_CHECKOUT_URL } from '../lib/supabase';
import { Sheet } from '../components/Sheet';
import { BigButton } from '../components/BigButton';

export function SubscriptionScreen() {
  const { settings, t, isDemo, account } = useApp();
  const nav = useNav();
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [notice, setNotice] = useState(false);
  const daysLeft = Math.max(0, Math.ceil((settings.trialEndsAt - Date.now()) / 864e5));

  const startCheckout = async () => {
    if (!STRIPE_CHECKOUT_URL) {
      setNotice(true);
      return;
    }
    const url = `${STRIPE_CHECKOUT_URL}${STRIPE_CHECKOUT_URL.includes('?') ? '&' : '?'}plan=${selected}`;
    await Linking.openURL(url).catch(() => setNotice(true));
  };

  return (
    <Screen>
      <PageHeader title="KidsFlix Family" subtitle="One plan, every kid profile" onBack={() => nav.back()} />

      <View style={styles.hero}>
        <LinearGradient colors={['#7C4DFF', '#FF5CA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 44 }}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.heroTitle}>
          {settings.subscriptionStatus === 'active' ? 'Your plan is active' : settings.plan === 'trial' ? `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Subscription'}
        </Text>
        <Text style={styles.heroSub}>Unlimited streaming, up to 6 kid profiles, offline downloads and full parental controls.</Text>
        <View style={styles.heroBadges}>
          <Text style={styles.heroBadge}>✓ No ads for kids</Text>
          <Text style={styles.heroBadge}>✓ Cancel anytime</Text>
        </View>
      </View>

      <View style={styles.plans}>
        <Pressable
          onPress={() => setSelected('monthly')}
          style={[styles.plan, selected === 'monthly' && styles.planOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === 'monthly' }}
        >
          <Text style={styles.planName}>{t('monthly')}</Text>
          <Text style={styles.planPrice}>$7.99<Text style={styles.planPer}>{t('perMonth')}</Text></Text>
          <Text style={styles.planNote}>7-day free trial</Text>
          {selected === 'monthly' ? <View style={styles.checkDot}><Text style={{ fontSize: 10 }}>✓</Text></View> : null}
        </Pressable>

        <Pressable
          onPress={() => setSelected('yearly')}
          style={[styles.plan, selected === 'yearly' && styles.planOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === 'yearly' }}
        >
          <View style={styles.saveBadge}><Text style={styles.saveText}>SAVE 27%</Text></View>
          <Text style={styles.planName}>{t('yearly')}</Text>
          <Text style={styles.planPrice}>$69.99<Text style={styles.planPer}>{t('perYear')}</Text></Text>
          <Text style={styles.planNote}>just $5.83 a month</Text>
          {selected === 'yearly' ? <View style={styles.checkDot}><Text style={{ fontSize: 10 }}>✓</Text></View> : null}
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <BigButton label={settings.plan === 'trial' ? t('endTrial') : 'Update plan'} icon="✨" onPress={startCheckout} size="lg" />
        <Text style={styles.note}>{t('trialNote')} {t('cardNote')}</Text>
        <Text style={styles.noteSmall}>
          Purchases are only available inside this parent area and are protected by the parent PIN. Kids can never start a purchase.
        </Text>
      </View>

      <Card style={styles.features}>
        <Text style={styles.featureTitle}>Everything included</Text>
        {[
          'Unlimited shows, movies and learning videos',
          'Up to 6 personalised kid profiles',
          'Offline downloads on phones and tablets',
          'Daily screen-time limits and age levels',
          'Per-show approve and block controls',
          'No ads, no chat, no comments — ever',
        ].map((item) => (
          <Text key={item} style={styles.featureLine}>✓ {item}</Text>
        ))}
      </Card>

      <Card style={styles.accountCard}>
        <Text style={styles.featureTitle}>Billing details</Text>
        <Text style={styles.billingLine}>Account: {account?.email}</Text>
        <Text style={styles.billingLine}>Plan: {settings.plan === 'trial' ? 'Free trial' : settings.plan}</Text>
        <Text style={styles.billingLine}>Status: {settings.subscriptionStatus}</Text>
        <Text style={styles.billingLine}>Renews: {new Date(settings.trialEndsAt).toLocaleDateString()}</Text>
        {isDemo ? <Text style={styles.demoNote}>Demo mode: no payment provider is connected, so no charge can be made.</Text> : null}
      </Card>

      <Sheet visible={notice} onClose={() => setNotice(false)} title="Connect secure payments">
        <Text style={styles.sheetBody}>
          Payments are handled by Stripe Checkout on the web, so no card details ever touch the app or the kids’ devices.
        </Text>
        <Text style={styles.sheetLabel}>To enable subscriptions:</Text>
        {[
          'Deploy supabase/functions/stripe-checkout with STRIPE_SECRET_KEY.',
          'Create monthly and yearly prices in Stripe and set STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY.',
          'Set EXPO_PUBLIC_STRIPE_CHECKOUT_URL to the function URL (or your web checkout page).',
          'Add the stripe-webhook function so subscriptions stay in sync.',
        ].map((step, i) => (
          <Text key={step} style={styles.sheetStep}>{i + 1}. {step}</Text>
        ))}
        <Text style={styles.sheetBody}>
          Until then KidsFlix stays in its free trial and never pretends a payment succeeded. Children cannot purchase anything
          from the kid area.
        </Text>
        <BigButton label="Got it" onPress={() => setNotice(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 20,
    borderRadius: radius.xl,
    padding: 22,
    overflow: 'hidden',
    gap: 6,
    marginBottom: 20,
  },
  heroTitle: { fontFamily: font.display, fontSize: 28, color: colors.white },
  heroSub: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 19, maxWidth: 520 },
  heroBadges: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  heroBadge: { fontFamily: font.bold, fontSize: 11, color: 'rgba(255,255,255,0.95)' },
  plans: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  plan: {
    flex: 1,
    flexBasis: 132,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
    overflow: 'hidden',
  },
  planOn: { borderColor: colors.mint, backgroundColor: 'rgba(63,224,176,0.1)' },
  planName: { fontFamily: font.bold, fontSize: 13, color: colors.textDim },
  planPrice: { fontFamily: font.display, fontSize: 26, color: colors.white },
  planPer: { fontFamily: font.semibold, fontSize: 12, color: colors.textFaint },
  planNote: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint },
  checkDot: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBadge: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.yellow,
    borderBottomRightRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveText: { fontFamily: font.bold, fontSize: 8.5, color: '#3B1A00', letterSpacing: 0.5 },
  note: { fontFamily: font.body, fontSize: 12, color: colors.textDim, textAlign: 'center' },
  noteSmall: { fontFamily: font.body, fontSize: 11, color: colors.textFaint, textAlign: 'center', lineHeight: 16 },
  features: { marginHorizontal: 20, marginTop: 18, gap: 6 },
  featureTitle: { fontFamily: font.bold, fontSize: 15, color: colors.white, marginBottom: 6 },
  featureLine: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 19 },
  accountCard: { marginHorizontal: 20, marginTop: 12, marginBottom: 10, gap: 4 },
  billingLine: { fontFamily: font.medium, fontSize: 12.5, color: colors.textDim },
  demoNote: { fontFamily: font.semibold, fontSize: 11, color: colors.yellow, marginTop: 8 },
  sheetBody: { fontFamily: font.body, fontSize: 13.5, color: colors.textDim, lineHeight: 20, marginBottom: 12 },
  sheetLabel: { fontFamily: font.bold, fontSize: 12, color: colors.white, marginBottom: 6 },
  sheetStep: { fontFamily: font.body, fontSize: 12.5, color: colors.textDim, lineHeight: 19, marginBottom: 5 },
});
