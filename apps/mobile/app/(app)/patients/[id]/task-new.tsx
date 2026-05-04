import { ScrollView, StyleSheet, Alert, View, Text, Pressable } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  createCareTaskSchema,
  type CreateCareTaskInput,
  CARE_TASK_TYPES,
  type CareTaskType,
} from '@vetconnect/shared';
import { api } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Field } from '../../../../src/components/Field';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewCareTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { control, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<CreateCareTaskInput>({
      resolver: zodResolver(createCareTaskSchema),
      defaultValues: {
        patientId: id ?? '',
        type: 'medication',
        title: '',
        details: '',
        dosage: '',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        recurrence: 'none',
        recurrenceN: null,
        assignedToId: null,
      },
    });

  const create = useMutation({
    mutationFn: async (data: CreateCareTaskInput) => (await api.post('/care-tasks', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-tasks'] });
      qc.invalidateQueries({ queryKey: ['patient', id] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'No se pudo crear la tarea'),
  });

  const type = watch('type');
  const recurrence = watch('recurrence');
  const scheduledAt = watch('scheduledAt');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Nueva tarea de cuidado</Text>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.row}>
          {CARE_TASK_TYPES.map((t: CareTaskType) => (
            <Pressable
              key={t}
              onPress={() => setValue('type', t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Field label="Título" value={field.value} onChangeText={field.onChange} error={errors.title?.message} />
          )}
        />
        <Controller
          name="dosage"
          control={control}
          render={({ field }) => (
            <Field
              label="Dosis / cantidad (opcional)"
              placeholder="ej. 0.1mg/kg, ración 100g"
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          name="details"
          control={control}
          render={({ field }) => (
            <Field
              label="Detalles (opcional)"
              multiline
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />

        <Text style={styles.label}>Programación</Text>
        <View style={styles.row}>
          {[
            { label: 'En 5 min', mins: 5 },
            { label: 'En 1 h', mins: 60 },
            { label: 'En 8 h', mins: 480 },
          ].map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() =>
                setValue('scheduledAt', new Date(Date.now() + opt.mins * 60 * 1000))
              }
              style={styles.chip}
            >
              <Text style={styles.chipText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helper}>
          Programado para: {new Date(scheduledAt).toLocaleString('es-CL')}
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Recurrencia</Text>
        <View style={styles.row}>
          {(['none', 'every_n_hours', 'daily'] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => {
                setValue('recurrence', r);
                if (r !== 'every_n_hours') setValue('recurrenceN', null);
              }}
              style={[styles.chip, recurrence === r && styles.chipActive]}
            >
              <Text style={[styles.chipText, recurrence === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
        {recurrence === 'every_n_hours' && (
          <Controller
            name="recurrenceN"
            control={control}
            render={({ field }) => (
              <Field
                label="Cada N horas"
                keyboardType="numeric"
                value={field.value?.toString() ?? ''}
                onChangeText={(v) => field.onChange(v ? Number(v) : null)}
                error={errors.recurrenceN?.message}
              />
            )}
          />
        )}

        <Button title="Crear tarea" onPress={handleSubmit((d) => create.mutate(d))} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#0e7c66', borderColor: '#0e7c66' },
  chipText: { color: '#374151', fontSize: 13 },
  chipTextActive: { color: 'white', fontWeight: '600' },
  helper: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
});
