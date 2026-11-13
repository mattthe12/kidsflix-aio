import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';

interface State {
  error: Error | null;
}

/** Keeps a rendering error from turning the whole app into a blank screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('[kidsflixaio] render error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={{ fontSize: 56 }}>🧸</Text>
        <Text style={styles.title}>Something went wobbly</Text>
        <Text style={styles.body}>Your profiles and favourites are safe. Try opening this screen again.</Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => { if (typeof location !== 'undefined') location.reload(); }} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>Reload the app</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.bg, gap: 12 },
  title: { fontFamily: font.display, fontSize: 28, color: colors.white, textAlign: 'center' },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: colors.textDim, textAlign: 'center', maxWidth: 360 },
  button: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 26, paddingVertical: 14, borderRadius: radius.pill },
  buttonText: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  link: { padding: 10 },
  linkText: { fontFamily: font.semibold, fontSize: 13, color: colors.textFaint },
});
