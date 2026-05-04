import { ScrollView, StyleSheet, Alert, View, Text, Pressable } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createTriageSchema, type CreateTriageInput, TRIAGE_LEVELS, type TriageLevel } from '@vetconnect/shared';
import { api } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Field } from '../../../../src/components/Field';
import { TriageBadge } from '../../../../src/components/TriageBadge';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewTriage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateTriageInput>({
    resolver: zodResolver(createTriageSchema),
    defaultValues: { level: 'yellow', reason: '' },
  });

  const create = useMutation({
    mutationFn: async (data: CreateTriageInput) =>
      (await api.post(`/patients/${id}/triage`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'No se pudo registrar el triaje'),
  });

  const level = watch('level');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Asignar nivel de triaje</Text>

        <View style={styles.levelRow}>
          {TRIAGE_LEVELS.map((l: TriageLevel) => (
            <Pressable key={l} onPress={() => setValue('level', l)} style={styles.levelPick}>
              <View style={{ opacity: level === l ? 1 : 0.4 }}>
                <TriageBadge level={l} />
              </View>
            </Pressable>
          ))}
        </View>

        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <Field
              label="Motivo / criterios clínicos"
              multiline
              value={field.value}
              onChangeText={field.onChange}
              error={errors.reason?.message}
            />
          )}
        />

        <Button title="Guardar triaje" onPress={handleSubmit((d) => create.mutate(d))} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  levelRow: { flexDirection: 'row', gap: 12, marginBottom: 16, justifyContent: 'center' },
  levelPick: { padding: 6 },
});
