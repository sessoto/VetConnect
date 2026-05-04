import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';

export function Field({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor="#9ca3af"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#374151', marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: 'white',
  },
  inputError: { borderColor: '#dc2626' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 4 },
});
