import { View, Text, FlatList, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { TRIAGE_LEVEL_ORDER, type TriageLevel } from '@vetconnect/shared';
import { api } from '../../../src/api/client';
import { TriageBadge } from '../../../src/components/TriageBadge';
import { fmtRelative } from '../../../src/lib/format';

interface PatientListItem {
  id: string;
  name: string;
  species: string;
  reasonForVisit: string;
  admittedAt: string;
  currentTriage: { level: TriageLevel; reason: string; createdAt: string } | null;
}

export default function TriageQueue() {
  const router = useRouter();
  const { data, isFetching, refetch } = useQuery<PatientListItem[]>({
    queryKey: ['patients', 'triage-queue'],
    queryFn: async () => (await api.get('/patients?status=active')).data,
  });

  const sorted = (data ?? []).slice().sort((a, b) => {
    const al = a.currentTriage ? TRIAGE_LEVEL_ORDER[a.currentTriage.level] : 99;
    const bl = b.currentTriage ? TRIAGE_LEVEL_ORDER[b.currentTriage.level] : 99;
    if (al !== bl) return al - bl;
    return new Date(a.admittedAt).getTime() - new Date(b.admittedAt).getTime();
  });

  return (
    <FlatList
      style={styles.list}
      data={sorted}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay pacientes activos.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/(app)/patients/${item.id}`)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.cardHeader}>
            <TriageBadge level={item.currentTriage?.level} />
            <Text style={styles.relative}>{fmtRelative(item.admittedAt)}</Text>
          </View>
          <Text style={styles.name}>
            {item.name} · {item.species}
          </Text>
          <Text style={styles.reason} numberOfLines={2}>
            Motivo: {item.reasonForVisit}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f9fafb' },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  reason: { fontSize: 14, color: '#374151', marginTop: 2 },
  relative: { fontSize: 12, color: '#6b7280' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
