import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';

export default function Relatorios() {
  const [seccao, setSeccao] = useState('');

  if (seccao) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.btnVoltar} onPress={() => setSeccao('')}>
          <Text style={styles.btnText}>← Voltar</Text>
        </TouchableOpacity>

        {seccao === 'eventos' && <RelatorioEventos />}
        {seccao === 'entradas' && <RelatorioEntradas />}
        {seccao === 'transferencias' && <RelatorioTransferencias />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Relatórios</Text>

      <TouchableOpacity style={styles.card} onPress={() => setSeccao('eventos')}>
        <Text style={styles.cardTitle}>📅 Eventos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setSeccao('entradas')}>
        <Text style={styles.cardTitle}>📦 Entradas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setSeccao('transferencias')}>
        <Text style={styles.cardTitle}>🚚 Transferências</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ==================== EVENTOS ==================== */
function RelatorioEventos() {
  const [eventos, setEventos] = useState([]);
  const [quintas, setQuintas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandir, setExpandir] = useState(null);

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome')
      .then(({ data }) => setQuintas(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);

    let q = supabase
      .from('eventos')
      .select('*, quintas(nome)')
      .in('estado', ['fechado', 'cancelado'])
      .order('data', { ascending: false });

    if (filtroEstado) q = q.eq('estado', filtroEstado);
    if (filtroTipo) q = q.eq('tipo', filtroTipo);

    q.then(({ data }) => {
      setEventos(data || []);
      setLoading(false);
    });
  }, [filtroEstado, filtroTipo]);

  if (loading) return <ActivityIndicator size="large" color={cores.primario} />;

  return (
    <ScrollView>
      <View style={styles.pickerRow}>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={filtroEstado} onValueChange={setFiltroEstado}>
            <Picker.Item label="Estado" value="" />
            <Picker.Item label="Fechado" value="fechado" />
            <Picker.Item label="Cancelado" value="cancelado" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker selectedValue={filtroTipo} onValueChange={setFiltroTipo}>
            <Picker.Item label="Tipo" value="" />
            <Picker.Item label="Casamento" value="casamento" />
            <Picker.Item label="Comunhão" value="comunhao" />
            <Picker.Item label="Batizado" value="batizado" />
            <Picker.Item label="Festa de Natal" value="festa de natal" />
            <Picker.Item label="Festa de Empresa" value="festa de empresa" />
            <Picker.Item label="Baile de Finalistas" value="baile de finalistas" />
          </Picker>
        </View>
      </View>

      {eventos.map(e => (
        <View key={e.id_evento} style={styles.card}>
          <Text style={styles.nome}>{e.nome} ({e.data})</Text>
          <Text>{e.tipo} | {e.local || e.quintas?.nome} | {e.numero_pessoas} pessoas</Text>

          <Text style={{ color: e.estado === 'fechado' ? cores.sucesso : cores.perigo }}>
            {e.estado === 'fechado' ? '🟢 Fechado' : '🔴 Cancelado'}
          </Text>

          {e.estado === 'fechado' && (
            <TouchableOpacity onPress={() =>
              setExpandir(expandir === e.id_evento ? null : e.id_evento)
            }>
              <Text style={{ color: cores.primario }}>📋 Ver consumo</Text>
            </TouchableOpacity>
          )}

          {expandir === e.id_evento && <ConsumoEvento idEvento={e.id_evento} />}
        </View>
      ))}
    </ScrollView>
  );
}

/* ==================== CONSUMO (CORRIGIDO) ==================== */
function ConsumoEvento({ idEvento }) {
  const [consumos, setConsumos] = useState([]);

  useEffect(() => {
    supabase
      .from('movimentos')
      .select('id_produto, quantidade, produtos(produto)')
      .eq('id_evento', idEvento)
      .in('tipo_movimento', ['alocacao_evento', 'devolucao_evento'])
      .then(({ data }) => {
        const mapa = {};

        (data || []).forEach(m => {
          const id = m.id_produto;

          if (!mapa[id]) {
            mapa[id] = {
              produto: m.produtos?.produto,
              total: 0
            };
          }

          mapa[id].total += m.quantidade;
        });

        const resultado = Object.values(mapa)
          .filter(p => p.total < 0)
          .map(p => ({
            produto: p.produto,
            quantidade: Math.abs(p.total)
          }));

        setConsumos(resultado);
      });
  }, [idEvento]);

  if (consumos.length === 0)
    return <Text style={styles.empty}>Sem dados</Text>;

  return (
    <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: cores.primario }}>
      {consumos.map((c, i) => (
        <Text key={i} style={styles.row}>
          • {c.produto}: {c.quantidade} un.
        </Text>
      ))}
    </View>
  );
}

/* ==================== ENTRADAS ==================== */
function RelatorioEntradas() {
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(new Date(Date.now() - 30 * 86400000));
  const [dataFim, setDataFim] = useState(new Date());
  const [filtroQuinta, setFiltroQuinta] = useState('');
  const [quintas, setQuintas] = useState([]);

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome')
      .then(({ data }) => setQuintas(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);

    const inicio = dataInicio.toISOString().split('T')[0];
    const fim = dataFim.toISOString().split('T')[0];

    let q = supabase
      .from('movimentos')
      .select('quantidade, data_hora, produtos(produto), armazens!inner(nome, quintas!inner(nome))')
      .eq('tipo_movimento', 'entrada')
      .gte('data_hora', inicio)
      .lte('data_hora', fim + 'T23:59:59')
      .order('data_hora', { ascending: false })
      .limit(50);

    if (filtroQuinta)
      q = q.eq('armazens.id_quinta', parseInt(filtroQuinta));

    q.then(({ data }) => {
      setEntradas(data || []);
      setLoading(false);
    });
  }, [dataInicio, dataFim, filtroQuinta]);

  if (loading) return <ActivityIndicator size="large" color={cores.primario} />;

  return (
    <ScrollView>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={filtroQuinta} onValueChange={setFiltroQuinta}>
          <Picker.Item label="Quinta" value="" />
          {quintas.map(q => (
            <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />
          ))}
        </Picker>
      </View>

      {entradas.map((e, i) => (
        <View key={i} style={styles.card}>
          <Text>{e.produtos?.produto}: {e.quantidade} un.</Text>
          <Text>{e.armazens?.nome} | {new Date(e.data_hora).toLocaleDateString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ==================== TRANSFERÊNCIAS ==================== */
function RelatorioTransferencias() {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dataInicio, setDataInicio] = useState(new Date(Date.now() - 30 * 86400000));
  const [dataFim, setDataFim] = useState(new Date());
  const [filtroQuintaOrigem, setFiltroQuintaOrigem] = useState('');
  const [quintas, setQuintas] = useState([]);

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome')
      .then(({ data }) => setQuintas(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);

    const inicio = dataInicio.toISOString().split('T')[0];
    const fim = dataFim.toISOString().split('T')[0];

    let q = supabase
      .from('movimentos')
      .select(`
        quantidade,
        data_hora,
        produtos(produto),
        transferencias(
          quintas_origem:id_quinta_origem(nome),
          quintas_destino:id_quinta_destino(nome)
        )
      `)
      .eq('tipo_movimento', 'transferencia_saida')
      .gte('data_hora', inicio)
      .lte('data_hora', fim + 'T23:59:59')
      .order('data_hora', { ascending: false })
      .limit(50);

    if (filtroQuintaOrigem)
      q = q.eq('transferencias.id_quinta_origem', parseInt(filtroQuintaOrigem));

    q.then(({ data }) => {
      setTransferencias(data || []);
      setLoading(false);
    });
  }, [dataInicio, dataFim, filtroQuintaOrigem]);

  if (loading) return <ActivityIndicator size="large" color={cores.primario} />;

  return (
    <ScrollView>
      {transferencias.map((t, i) => (
        <View key={i} style={styles.card}>
          <Text>
            {t.produtos?.produto}: {Math.abs(t.quantidade)} un.
          </Text>
          <Text>
            {t.transferencias?.quintas_origem?.nome} → {t.transferencias?.quintas_destino?.nome} | {new Date(t.data_hora).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ==================== STYLES ==================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  title: { fontSize: 24, fontWeight: 'bold', color: cores.texto, marginBottom: 20 },
  card: { backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: cores.primario },
  nome: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  row: { fontSize: 14, marginVertical: 2 },
  input: { backgroundColor: cores.branco, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', gap: 10 },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic', padding: 10 },
  btnVoltar: { backgroundColor: cores.primario, padding: 10, borderRadius: 8, marginBottom: 15, alignSelf: 'flex-start' },
  btnText: { color: cores.branco, fontWeight: 'bold' },
});