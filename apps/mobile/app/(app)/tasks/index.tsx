import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { fmtDateTime } from '../../../src/lib/format';

interface CareTask {
  id: string;
  type: string;
  title: string;
  details: string | null;
  dosage: string | null;
  scheduledAt: string;
  patient: { id: string; name: string; species: string };
}

export default function MyTasks() {
  const router = useRouter();
  const qc = useQueryClient();
  const [completing, setCompleting] = useState<string | null>(null);

  const { data, isFetching, refetch } = useQuery<CareTask[]>({
    queryKey: ['care-tasks', 'mine'],
    queryFn: async () => (await api.get('/care-tasks?assignedToMe=1&status=pending')).data,
  });

  const complete = useMutation({
    mutationFn: async (id: string) => (await api.post(`/care-tasks/${id}/complete`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care-tasks'] }),
    onError: () => Alert.alert('Error', 'No se pudo completar la tarea'),
    onSettled: () => setCompleting(null),
  });

  return (
    <FlatList
      style={styles.list}
      data={data ?? []}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No tienes tareas pendientes.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.type}>{item.type.toUpperCase()}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>Paciente: {item.patient.name}</Text>
          {item.dosage ? <Text style={styles.meta}>Dosis: {item.dosage}</Text> : null}
          {item.details ? <Text style={styles.meta}>{item.details}</Text> : null}
          <Text style={styles.meta}>Programado: {fmtDateTime(item.scheduledAt)}</Text>

          <View style={styles.actions}>
            <Button
              title="Ver paciente"
              variant="secondary"
              onPress={() => router.push(`/(app)/patients/${item.patient.id}`)}
            />
            <Button
              title="Completar"
              loading={completing === item.id}
              onPress={() => {
                setCompleting(item.id);
                complete.mutate(item.id);
              }}
            />
          </View>
        </View>
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
    gap: 4,
  },
  type: { fontSize: 11, fontWeight: '700', color: '#0e7c66', letterSpacing: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#374151' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
