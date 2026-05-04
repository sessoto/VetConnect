import { ScrollView, StyleSheet, Alert, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createNoteSchema, type CreateNoteInput } from '@vetconnect/shared';
import { api } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Field } from '../../../../src/components/Field';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewNote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { control, handleSubmit, formState: { errors } } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { body: '' },
  });

  const create = useMutation({
    mutationFn: async (data: CreateNoteInput) =>
      (await api.post(`/patients/${id}/notes`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', id] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'No se pudo crear la nota'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Nueva nota clínica</Text>
        <Controller
          name="body"
          control={control}
          render={({ field }) => (
            <Field
              label="Nota"
              multiline
              value={field.value}
              onChangeText={field.onChange}
              error={errors.body?.message}
            />
          )}
        />
        <Button title="Guardar nota" onPress={handleSubmit((d) => create.mutate(d))} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
});
