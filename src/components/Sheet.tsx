import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';

export function Sheet({
  visible,
  onClose,
  title,
  children,
  heightRatio,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  heightRatio?: number;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      // React Native Web can leave a closing slide Modal mounted after its CSS
      // animation ends, which puts an invisible full-screen layer over the
      // player. Closing instantly on web avoids that stuck overlay.
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, heightRatio ? { maxHeight: `${heightRatio * 100}%` } : null]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,2,15,0.7)' },
  sheet: {
    backgroundColor: '#241447',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  handle: { width: 46, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: font.displaySoft, fontSize: 24, color: colors.white, flex: 1 },
  close: { fontFamily: font.bold, fontSize: 22, color: colors.textDim },
});
