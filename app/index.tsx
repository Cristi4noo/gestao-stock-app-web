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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      Alert.alert('Erro', 'Email ou password incorretos!');
      return;
    }

    // Buscar papel na tabela utilizadores
    const { data: userData } = await supabase
      .from('utilizadores')
      .select('nome, papel')
      .eq('auth_id', data.user.id)
      .single();

    setLoading(false);

    (globalThis as any).sessaoAtiva = true;
    (globalThis as any).papel = userData?.papel || 'visualizador';
    (globalThis as any).nome = userData?.nome || email;

    router.replace('/(tabs)/dashboard');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍾 Stock Bebidas</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
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
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: cores.primario, marginBottom: 40 },
  input: { backgroundColor: cores.branco, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: cores.primario, padding: 16, borderRadius: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});