import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0e7c66',
        headerStyle: { backgroundColor: '#0e7c66' },
        headerTintColor: 'white',
      }}
    >
      <Tabs.Screen name="triage" options={{ title: 'Triaje' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Mis tareas' }} />
      <Tabs.Screen name="patients" options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="more" options={{ title: 'Más' }} />
    </Tabs>
  );
}
