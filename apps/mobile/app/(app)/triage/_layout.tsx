import { Stack } from 'expo-router';

export default function TriageLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Triaje', headerShown: false }} />
    </Stack>
  );
}
