import { ScrollView, StyleSheet, Alert, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { createPatientSchema, type CreatePatientInput } from '@vetconnect/shared';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Field } from '../../../src/components/Field';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewPatient() {
  const qc = useQueryClient();
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      ownerName: '',
      ownerContact: '',
      reasonForVisit: '',
    },
  });

  const create = useMutation({
    mutationFn: async (data: CreatePatientInput) => (await api.post('/patients', data)).data,
    onSuccess: (p: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      router.replace(`/(app)/patients/${p.id}`);
    },
    onError: () => Alert.alert('Error', 'No se pudo crear el paciente'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Nuevo paciente</Text>
        <Controller
          name="name" control={control}
          render={({ field }) => (
            <Field label="Nombre" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
          )}
        />
        <Controller
          name="species" control={control}
          render={({ field }) => (
            <Field label="Especie" placeholder="perro, gato, ave..." value={field.value} onChangeText={field.onChange} error={errors.species?.message} />
          )}
        />
        <Controller
          name="breed" control={control}
          render={({ field }) => (
            <Field label="Raza (opcional)" value={field.value ?? ''} onChangeText={field.onChange} />
          )}
        />
        <Controller
          name="ownerName" control={control}
          render={({ field }) => (
            <Field label="Dueño/a" value={field.value} onChangeText={field.onChange} error={errors.ownerName?.message} />
          )}
        />
        <Controller
          name="ownerContact" control={control}
          render={({ field }) => (
            <Field label="Contacto del dueño" value={field.value} onChangeText={field.onChange} error={errors.ownerContact?.message} />
          )}
        />
        <Controller
          name="reasonForVisit" control={control}
          render={({ field }) => (
            <Field
              label="Motivo de consulta"
              placeholder="atropello, dolor de estómago, vómitos..."
              multiline
              value={field.value}
              onChangeText={field.onChange}
              error={errors.reasonForVisit?.message}
            />
          )}
        />

        <Button title="Crear paciente" onPress={handleSubmit((d) => create.mutate(d))} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
});
