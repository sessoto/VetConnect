import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { fmtDateTime } from '../../../src/lib/format';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  payload: unknown;
}

export default function AuditList() {
  const { data, isFetching, refetch } = useQuery<AuditEntry[]>({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/audit')).data,
  });

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      data={data ?? []}
      keyExtractor={(e) => e.id}
      onRefresh={refetch}
      refreshing={isFetching}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin entradas.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.action}>
            {item.entity}.{item.action}
          </Text>
          <Text style={styles.meta}>
            {item.user?.name ?? 'sistema'} · {fmtDateTime(item.createdAt)}
          </Text>
          <Text style={styles.id}>id: {item.entityId}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  action: { fontSize: 14, fontWeight: '700', color: '#0e7c66' },
  meta: { fontSize: 12, color: '#374151', marginTop: 2 },
  id: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
