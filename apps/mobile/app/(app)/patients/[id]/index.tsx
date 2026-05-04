import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../../src/api/client';
import { TriageBadge } from '../../../../src/components/TriageBadge';
import { Button } from '../../../../src/components/Button';
import { fmtDateTime } from '../../../../src/lib/format';
import type { TriageLevel } from '@vetconnect/shared';

interface PatientDetail {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  ownerName: string;
  ownerContact: string;
  reasonForVisit: string;
  admittedAt: string;
  status: 'active' | 'discharged';
  currentTriage:
    | { id: string; level: TriageLevel; reason: string; createdAt: string; createdBy: { name: string } }
    | null;
}

interface CareTask {
  id: string;
  type: string;
  title: string;
  scheduledAt: string;
  status: string;
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
}

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const patient = useQuery<PatientDetail>({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get(`/patients/${id}`)).data,
    enabled: !!id,
  });

  const tasks = useQuery<CareTask[]>({
    queryKey: ['care-tasks', 'patient', id, 'pending'],
    queryFn: async () =>
      (await api.get(`/care-tasks?patientId=${id}&status=pending`)).data,
    enabled: !!id,
  });

  const notes = useQuery<Note[]>({
    queryKey: ['notes', id],
    queryFn: async () => (await api.get(`/patients/${id}/notes`)).data,
    enabled: !!id,
  });

  const refreshing = patient.isFetching || tasks.isFetching || notes.isFetching;
  const onRefresh = () => {
    patient.refetch();
    tasks.refetch();
    notes.refetch();
  };

  if (!patient.data) return null;
  const p = patient.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{p.name}</Text>
        <TriageBadge level={p.currentTriage?.level} />
      </View>
      <Text style={styles.meta}>
        {p.species}
        {p.breed ? ` · ${p.breed}` : ''} · {p.ownerName}
      </Text>
      <Text style={styles.meta}>Contacto: {p.ownerContact}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motivo de consulta</Text>
        <Text style={styles.body}>{p.reasonForVisit}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Triaje</Text>
          <Pressable onPress={() => router.push(`/(app)/patients/${id}/triage`)}>
            <Text style={styles.link}>Cambiar</Text>
          </Pressable>
        </View>
        {p.currentTriage ? (
          <Text style={styles.body}>
            {p.currentTriage.reason} ({fmtDateTime(p.currentTriage.createdAt)} · {p.currentTriage.createdBy.name})
          </Text>
        ) : (
          <Text style={styles.body}>Sin triaje asignado</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Próximas tareas</Text>
          <Pressable onPress={() => router.push(`/(app)/patients/${id}/task-new`)}>
            <Text style={styles.link}>Nueva</Text>
          </Pressable>
        </View>
        {(tasks.data ?? []).length === 0 ? (
          <Text style={styles.body}>Ninguna</Text>
        ) : (
          (tasks.data ?? []).map((t) => (
            <View key={t.id} style={styles.taskRow}>
              <Text style={styles.taskType}>{t.type.toUpperCase()}</Text>
              <Text style={styles.body}>{t.title}</Text>
              <Text style={styles.metaSm}>{fmtDateTime(t.scheduledAt)}</Text>
            </View>
          ))
        )}
        <View style={{ marginTop: 12 }}>
          <Button
            title="Ver historial de cuidados"
            variant="secondary"
            onPress={() => router.push(`/(app)/patients/${id}/history`)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Pressable onPress={() => router.push(`/(app)/patients/${id}/note-new`)}>
            <Text style={styles.link}>Nueva</Text>
          </Pressable>
        </View>
        {(notes.data ?? []).length === 0 ? (
          <Text style={styles.body}>Sin notas</Text>
        ) : (
          (notes.data ?? []).map((n) => (
            <View key={n.id} style={styles.noteRow}>
              <Text style={styles.body}>{n.body}</Text>
              <Text style={styles.metaSm}>
                {n.author.name} · {fmtDateTime(n.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 14, color: '#374151', marginTop: 4 },
  metaSm: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: {
    marginTop: 18,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0e7c66', letterSpacing: 0.5, marginBottom: 6 },
  body: { fontSize: 15, color: '#111827' },
  link: { color: '#0e7c66', fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskRow: { paddingVertical: 6, borderTopColor: '#f3f4f6', borderTopWidth: StyleSheet.hairlineWidth },
  taskType: { fontSize: 11, fontWeight: '700', color: '#0e7c66', letterSpacing: 1 },
  noteRow: { paddingVertical: 6, borderTopColor: '#f3f4f6', borderTopWidth: StyleSheet.hairlineWidth },
});
