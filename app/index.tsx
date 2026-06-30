import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/supabase';
import { cores } from '../src/tema';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }
    setLoading(true);
  
    const { data, error } = await supabase
      .from('utilizadores')
      .select('*')
      .eq('nome', email)
      .single();
  
    setLoading(false);
  
    if (error || !data) {
      Alert.alert('Erro', 'Utilizador não encontrado!');
      return;
    }
  
    if (password !== '1234') {
      Alert.alert('Erro', 'Password incorreta!');
      return;
    }
  
    (globalThis as any).sessaoAtiva = true;
    (globalThis as any).papel = data.papel;
    router.replace('/(tabs)/dashboard');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍾 Stock Bebidas</Text>
      <TextInput
        style={styles.input}
        placeholder="Utilizador"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'A entrar...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: cores.fundo },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: cores.secundario, marginBottom: 5 },
  subtitle: { fontSize: 14, textAlign: 'center', color: cores.textoClaro, marginBottom: 40 },
  input: { backgroundColor: cores.branco, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: cores.secundario, padding: 16, borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});