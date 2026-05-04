import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@vetconnect/shared';
import { useAuth } from '../../src/auth/store';
import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
        'No se pudo iniciar sesión';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>VetConnect</Text>
        <Text style={styles.subtitle}>Iniciar sesión</Text>

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Field
              label="Contraseña"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Button title="Entrar" onPress={handleSubmit(onSubmit)} loading={loading} />

        <Link href="/(auth)/register-clinic" style={styles.link}>
          <Text style={{ color: '#0e7c66' }}>¿Eres una clínica nueva? Regístrate</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 20, gap: 4, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 32, fontWeight: '800', color: '#0e7c66', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  link: { marginTop: 16, alignSelf: 'center' },
});
