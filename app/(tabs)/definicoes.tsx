import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';

export default function Definicoes() {
  const papel = (globalThis as any).papel;
  const isAdmin = papel === 'administrador';
  const router = useRouter();
  const [utilizadores, setUtilizadores] = useState([]);
  const [armazens, setArmazens] = useState([]);
  const [quintas, setQuintas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novoPapel, setNovoPapel] = useState('visualizador');
  const [novoArmazem, setNovoArmazem] = useState('');
  const [novaQuintaArmazem, setNovaQuintaArmazem] = useState('');
  const [novaQuinta, setNovaQuinta] = useState('');
  const [novaMorada, setNovaMorada] = useState('');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    const [{ data: u }, { data: a }, { data: q }] = await Promise.all([
      supabase.from('utilizadores').select('*').order('papel'),
      supabase.from('armazens').select('*, quintas(nome)').order('nome'),
      supabase.from('quintas').select('*').order('nome'),
    ]);
    setUtilizadores(u || []);
    setArmazens(a || []);
    setQuintas(q || []);
    setLoading(false);
  }

  async function confirmarAddUtilizador() {
    if (!novoNome) { Alert.alert('Erro', 'Preencha o nome!'); return; }
    Alert.alert('Adicionar', `Adicionar "${novoNome}"?`, [{ text: 'Cancelar' }, { text: 'Sim', onPress: async () => {
      await supabase.from('utilizadores').insert({ nome: novoNome, papel: novoPapel });
      Alert.alert('✅', 'Adicionado!'); setNovoNome(''); carregarDados();
    }}]);
  }

  async function removerUtilizador(id: number) {
    Alert.alert('Remover', 'Tem a certeza?', [{ text: 'Não' }, { text: 'Sim', onPress: async () => {
      await supabase.from('utilizadores').delete().eq('id_utilizador', id); carregarDados();
    }}]);
  }

  async function confirmarAddArmazem() {
    if (!novoArmazem || !novaQuintaArmazem) { Alert.alert('Erro', 'Preencha nome e quinta!'); return; }
    Alert.alert('Adicionar', `Adicionar "${novoArmazem}"?`, [{ text: 'Cancelar' }, { text: 'Sim', onPress: async () => {
      await supabase.from('armazens').insert({ nome: novoArmazem, id_quinta: parseInt(novaQuintaArmazem) });
      Alert.alert('✅', 'Adicionado!'); setNovoArmazem(''); setNovaQuintaArmazem(''); carregarDados();
    }}]);
  }

  async function removerArmazem(id: number) {
    Alert.alert('Remover', 'Tem a certeza?', [{ text: 'Não' }, { text: 'Sim', onPress: async () => {
      await supabase.from('armazens').delete().eq('id_armazem', id); carregarDados();
    }}]);
  }

  async function confirmarAddQuinta() {
    if (!novaQuinta) { Alert.alert('Erro', 'Preencha o nome!'); return; }
    Alert.alert('Adicionar', `Adicionar "${novaQuinta}"?`, [{ text: 'Cancelar' }, { text: 'Sim', onPress: async () => {
      await supabase.from('quintas').insert({ nome: novaQuinta, morada: novaMorada });
      Alert.alert('✅', 'Adicionada!'); setNovaQuinta(''); setNovaMorada(''); carregarDados();
    }}]);
  }

  async function removerQuinta(id: number) {
    Alert.alert('Remover', 'Tem a certeza?', [{ text: 'Não' }, { text: 'Sim', onPress: async () => {
      await supabase.from('quintas').delete().eq('id_quinta', id); carregarDados();
    }}]);
  }

  if (loading) return <ActivityIndicator size="large" color={cores.primario} style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      {/* Utilizadores */}
      <Text style={styles.section}>👤 Utilizadores</Text>
      {isAdmin && (
        <View style={{ gap: 8, marginBottom: 10 }}>
          <TextInput style={styles.input}
            placeholder="Nome"
            value={novoNome}
            onChangeText={setNovoNome}
          />

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={novoPapel}
              onValueChange={setNovoPapel}
            >
            <Picker.Item label="Administrador" value="administrador" />
            <Picker.Item label="Visualizador" value="visualizador" />
            </Picker>
          </View>

          <TouchableOpacity style={styles.btnAdd} onPress={confirmarAddUtilizador}>
            <Text style={styles.btnText}>➕ Adicionar</Text>
          </TouchableOpacity>
        </View>
      )}
      {utilizadores.map(u => <View key={u.id_utilizador} style={styles.cardRow}><Text>{u.nome} ({u.papel})</Text>{isAdmin && <TouchableOpacity onPress={() => removerUtilizador(u.id_utilizador)}><Text style={styles.remover}>🗑️</Text></TouchableOpacity>}</View>)}

      {/* Armazéns */}
      <Text style={styles.section}>🏭 Armazéns</Text>
      {isAdmin && <View style={{ gap: 8, marginBottom: 10 }}>
        <TextInput style={styles.input} placeholder="Nome do armazém" value={novoArmazem} onChangeText={setNovoArmazem} />
        <View style={styles.pickerContainer}><Picker selectedValue={novaQuintaArmazem} onValueChange={setNovaQuintaArmazem}><Picker.Item label="Selecionar quinta" value="" />{quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}</Picker></View>
        <TouchableOpacity style={styles.btnAdd} onPress={confirmarAddArmazem}><Text style={styles.btnText}>➕ Adicionar</Text></TouchableOpacity>
      </View>}
      {armazens.map(a => <View key={a.id_armazem} style={styles.cardRow}><Text>{a.nome} 🏠 {a.quintas?.nome}</Text>{isAdmin && <TouchableOpacity onPress={() => removerArmazem(a.id_armazem)}><Text style={styles.remover}>🗑️</Text></TouchableOpacity>}</View>)}

      {/* Quintas */}
      <Text style={styles.section}>🌍 Quintas</Text>
      {isAdmin && (
        <View style={{ gap: 8, marginBottom: 10 }}>
          <TextInput
            style={styles.input}
            placeholder="Nome"
            value={novaQuinta}
            onChangeText={setNovaQuinta}
          />

          <TextInput
            style={styles.input}
            placeholder="Morada"
            value={novaMorada}
            onChangeText={setNovaMorada}
          />

          <TouchableOpacity style={styles.btnAdd} onPress={confirmarAddQuinta}>
            <Text style={styles.btnText}>➕ Adicionar</Text>
          </TouchableOpacity>
        </View>
      )}
      {quintas.map(q => <View key={q.id_quinta} style={styles.cardRow}><Text>{q.nome} - {q.morada}</Text>{isAdmin && <TouchableOpacity onPress={() => removerQuinta(q.id_quinta)}><Text style={styles.remover}>🗑️</Text></TouchableOpacity>}</View>)}

      <Text style={styles.section}>🚪 Sessão</Text>
      <TouchableOpacity style={styles.btnLogout} onPress={() => { (globalThis as any).sessaoAtiva = false; router.replace('/'); }}>
        <Text style={styles.btnText}>🚪 Terminar Sessão</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  section: { fontSize: 16, fontWeight: 'bold', color: cores.primario, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  input: { backgroundColor: cores.branco, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 14 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  btnAdd: { backgroundColor: cores.sucesso, padding: 12, borderRadius: 10, alignSelf: 'flex-start' },
  btnText: { color: cores.branco, fontWeight: 'bold', fontSize: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 5, elevation: 1 },
  remover: { color: cores.perigo, fontSize: 18 },
  btnLogout: { backgroundColor: cores.perigo, padding: 16, borderRadius: 10, marginTop: 20 },
});