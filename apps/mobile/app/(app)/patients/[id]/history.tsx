import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { CARE_TASK_TYPES, type CareTaskType } from '@vetconnect/shared';
import { api } from '../../../../src/api/client';
import { fmtDateTime } from '../../../../src/lib/format';

interface HistoryItem {
  id: string;
  type: CareTaskType;
  title: string;
  details: string | null;
  dosage: string | null;
  scheduledAt: string;
  completedAt: string;
  completionNotes: string | null;
  completedBy: { name: string } | null;
}

export default function CareHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<CareTaskType | 'all'>('all');

  const { data, isFetching, refetch } = useQuery<HistoryItem[]>({
    queryKey: ['care-history', id, filter],
    queryFn: async () =>
      (
        await api.get(
          `/patients/${id}/care-history${filter !== 'all' ? `?type=${filter}` : ''}`,
        )
      ).data,
    enabled: !!id,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.filterRow}>
        {(['all', ...CARE_TASK_TYPES] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setFilter(t)}
            style={[styles.chip, filter === t && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === t && styles.chipTextActive]}>
              {t === 'all' ? 'todos' : t}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(h) => h.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin registros aún.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.type.toUpperCase()}</Text>
            <Text style={styles.title}>{item.title}</Text>
            {item.dosage ? <Text style={styles.meta}>Dosis: {item.dosage}</Text> : null}
            {item.details ? <Text style={styles.meta}>{item.details}</Text> : null}
            <Text style={styles.meta}>
              Realizado {fmtDateTime(item.completedAt)} · {item.completedBy?.name ?? '—'}
            </Text>
            {item.completionNotes ? (
              <Text style={styles.notes}>"{item.completionNotes}"</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  chipActive: { backgroundColor: '#0e7c66', borderColor: '#0e7c66' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: 'white', fontWeight: '600' },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  type: { fontSize: 11, fontWeight: '700', color: '#0e7c66', letterSpacing: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  meta: { fontSize: 13, color: '#374151', marginTop: 2 },
  notes: { fontSize: 13, color: '#0e7c66', marginTop: 6, fontStyle: 'italic' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
