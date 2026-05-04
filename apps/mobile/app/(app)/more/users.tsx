import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Modal, ScrollView, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, ROLES, type CreateUserInput, type Role } from '@vetconnect/shared';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Field } from '../../../src/components/Field';

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export default function UsersAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isFetching, refetch } = useQuery<Member[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => Alert.alert('Error', 'No se pudo eliminar'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 12 }}>
        <Button title="Crear usuario" onPress={() => setOpen(true)} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(u) => u.id}
        onRefresh={refetch}
        refreshing={isFetching}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>Rol: {item.role}</Text>
            <View style={{ marginTop: 8 }}>
              <Button
                title="Eliminar"
                variant="danger"
                onPress={() =>
                  Alert.alert('Confirmar', `Eliminar a ${item.name}?`, [
                    { text: 'Cancelar' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(item.id) },
                  ])
                }
              />
            </View>
          </View>
        )}
      />

      <CreateUserModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function CreateUserModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<CreateUserInput>({
      resolver: zodResolver(createUserSchema),
      defaultValues: { name: '', email: '', password: '', role: 'assistant' },
    });

  const create = useMutation({
    mutationFn: async (data: CreateUserInput) => (await api.post('/users', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
    },
    onError: () => Alert.alert('Error', 'No se pudo crear el usuario'),
  });

  const role = watch('role');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Nuevo usuario</Text>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Field label="Nombre" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Field label="Contraseña" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
          )}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Rol</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {ROLES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setValue('role', r)}
              style={[styles.chip, role === r && styles.chipActive]}
            >
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <Button title="Crear" loading={create.isPending} onPress={handleSubmit((d) => create.mutate(d))} />
        <View style={{ height: 8 }} />
        <Button title="Cancelar" variant="secondary" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#374151', marginTop: 2 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#111827' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  chipActive: { backgroundColor: '#0e7c66', borderColor: '#0e7c66' },
  chipText: { color: '#374151' },
  chipTextActive: { color: 'white', fontWeight: '600' },
});
