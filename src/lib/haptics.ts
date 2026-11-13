import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Platform } from 'react-native';

/** Tiny tactile confirmation on touch devices; silently skipped on web. */
export function tap(style: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  const run =
    style === 'success'
      ? notificationAsync(NotificationFeedbackType.Success)
      : impactAsync(style === 'medium' ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Light);
  run.catch(() => undefined);
}
