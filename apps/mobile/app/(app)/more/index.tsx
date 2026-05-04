import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/auth/store';
import { Button } from '../../../src/components/Button';

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Sesión</Text>
        <Text style={styles.value}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Rol: {user?.role}</Text>
      </View>

      {user?.role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.label}>Administración</Text>
          <Pressable onPress={() => router.push('/(app)/more/users')}>
            <Text style={styles.link}>Gestionar usuarios</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/more/audit')}>
            <Text style={styles.link}>Registro de auditoría</Text>
          </Pressable>
        </View>
      )}

      <View style={{ padding: 16 }}>
        <Button title="Cerrar sesión" variant="danger" onPress={logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: {
    margin: 12,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '700', letterSpacing: 1 },
  value: { fontSize: 16, color: '#111827', fontWeight: '700' },
  meta: { fontSize: 13, color: '#374151' },
  link: { color: '#0e7c66', fontWeight: '600', paddingVertical: 6 },
});
