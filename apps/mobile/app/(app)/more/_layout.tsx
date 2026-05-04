import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Más', headerShown: false }} />
      <Stack.Screen name="users" options={{ title: 'Usuarios' }} />
      <Stack.Screen name="audit" options={{ title: 'Auditoría' }} />
    </Stack>
  );
}
