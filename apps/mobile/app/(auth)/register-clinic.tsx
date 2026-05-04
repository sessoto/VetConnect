import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerClinicSchema, type RegisterClinicInput } from '@vetconnect/shared';
import { useAuth } from '../../src/auth/store';
import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterClinic() {
  const registerClinic = useAuth((s) => s.registerClinic);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterClinicInput>({
    resolver: zodResolver(registerClinicSchema),
    defaultValues: { clinicName: '', adminName: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterClinicInput) => {
    setLoading(true);
    try {
      await registerClinic(data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
        'No se pudo registrar la clínica';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Registrar clínica</Text>

        <Controller
          name="clinicName"
          control={control}
          render={({ field }) => (
            <Field label="Nombre de la clínica" value={field.value} onChangeText={field.onChange} error={errors.clinicName?.message} />
          )}
        />
        <Controller
          name="adminName"
          control={control}
          render={({ field }) => (
            <Field label="Nombre del administrador" value={field.value} onChangeText={field.onChange} error={errors.adminName?.message} />
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

        <Button title="Crear clínica" onPress={handleSubmit(onSubmit)} loading={loading} />
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={{ color: '#0e7c66' }}>Volver a iniciar sesión</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 20, gap: 4, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 16 },
  link: { marginTop: 16, alignSelf: 'center' },
});
