import { Text, View, StyleSheet } from 'react-native';
import type { TriageLevel } from '@vetconnect/shared';

const COLORS: Record<TriageLevel, string> = {
  red: '#dc2626',
  yellow: '#eab308',
  green: '#16a34a',
};

const LABELS: Record<TriageLevel, string> = {
  red: 'ROJO',
  yellow: 'AMARILLO',
  green: 'VERDE',
};

export function TriageBadge({ level }: { level: TriageLevel | null | undefined }) {
  if (!level) {
    return (
      <View style={[styles.badge, { backgroundColor: '#9ca3af' }]}>
        <Text style={styles.text}>SIN TRIAJE</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: COLORS[level] }]}>
      <Text style={styles.text}>{LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: { color: 'white', fontWeight: '700', fontSize: 11 },
});
