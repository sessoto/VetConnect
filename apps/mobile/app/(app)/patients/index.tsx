import { View, Text, FlatList, RefreshControl, StyleSheet, Pressable, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '../../../src/api/client';
import { TriageBadge } from '../../../src/components/TriageBadge';
import { Button } from '../../../src/components/Button';
import type { TriageLevel } from '@vetconnect/shared';

interface PatientListItem {
  id: string;
  name: string;
  species: string;
  ownerName: string;
  reasonForVisit: string;
  currentTriage: { level: TriageLevel } | null;
}

export default function PatientsList() {
  const [q, setQ] = useState('');
  const router = useRouter();
  const { data, isFetching, refetch } = useQuery<PatientListItem[]>({
    queryKey: ['patients', q],
    queryFn: async () =>
      (await api.get(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`)).data,
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Buscar por nombre, dueño o motivo"
          value={q}
          onChangeText={setQ}
          style={styles.search}
        />
        <Button title="Nuevo" onPress={() => router.push('/(app)/patients/new')} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin pacientes.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/patients/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.name}>{item.name}</Text>
              <TriageBadge level={item.currentTriage?.level} />
            </View>
            <Text style={styles.meta}>{item.species} · Dueño: {item.ownerName}</Text>
            <Text style={styles.reason}>Motivo: {item.reasonForVisit}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  search: {
    flex: 1,
    backgroundColor: 'white',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#374151', marginTop: 2 },
  reason: { fontSize: 13, color: '#374151', marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
