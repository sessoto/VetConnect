import { Stack } from 'expo-router';

export default function PatientsLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#0e7c66' }, headerTintColor: 'white' }}>
      <Stack.Screen name="index" options={{ title: 'Pacientes', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo paciente' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Paciente' }} />
      <Stack.Screen name="[id]/triage" options={{ title: 'Triaje' }} />
      <Stack.Screen name="[id]/task-new" options={{ title: 'Nueva tarea' }} />
      <Stack.Screen name="[id]/note-new" options={{ title: 'Nueva nota' }} />
      <Stack.Screen name="[id]/history" options={{ title: 'Historial de cuidados' }} />
    </Stack>
  );
}
