import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';

export default function Dashboard() {
  const [eventos, setEventos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [stockZero, setStockZero] = useState([]);
  const [stockCategoria, setStockCategoria] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    await Promise.all([
      carregarEventos(),
      carregarEntradas(),
      carregarTransferencias(),
      carregarStockZero(),
      carregarStockCategoria(),
    ]);
    setLoading(false);
  }

  async function carregarEventos() {
    const { data } = await supabase
      .from('eventos')
      .select('*, quintas(nome)')
      .eq('estado', 'em_preparacao')
      .order('data', { ascending: true })
      .limit(5);
    setEventos(data || []);
  }

  async function carregarEntradas() {
    const { data } = await supabase
      .from('movimentos')
      .select('quantidade, data_hora, produtos(produto), armazens(nome, quintas(nome))')
      .eq('tipo_movimento', 'entrada')
      .order('data_hora', { ascending: false })
      .limit(5);
    setEntradas(data || []);
  }

  async function carregarTransferencias() {
    const { data, error } = await supabase
      .from('movimentos')
      .select(`
        quantidade,
        produtos(produto),
        transferencias(
          quintas_origem:id_quinta_origem(nome),
          quintas_destino:id_quinta_destino(nome)
        )
      `)
      .eq('tipo_movimento', 'transferencia_saida')
      .order('data_hora', { ascending: false })
      .limit(5);

    if (error) console.log(error);

    setTransferencias(data || []);
  }

  async function carregarStockZero() {
    const { data } = await supabase
      .from('produtos')
      .select('id_produto, produto, categoria, movimentos(quantidade, armazens(quintas(nome)))');
    
    const zeros = data?.filter(p => {
      const total = p.movimentos?.reduce((sum, m) => sum + (m.quantidade || 0), 0) || 0;
      return total === 0;
    }) || [];
    setStockZero(zeros);
  }

  async function carregarStockCategoria() {
    const { data } = await supabase
      .from('produtos')
      .select('categoria, movimentos(quantidade)');
    
    const categorias = {};
    data?.forEach(p => {
      const total = p.movimentos?.reduce((sum, m) => sum + (m.quantidade || 0), 0) || 0;
      categorias[p.categoria] = (categorias[p.categoria] || 0) + total;
    });
    setStockCategoria(Object.entries(categorias).map(([categoria, total]) => ({ categoria, total })));
  }

  if (loading) return <ActivityIndicator size="large" color="#3498db" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      
      {/* Próximos Eventos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Próximos Eventos</Text>
        {eventos.length === 0 ? <Text style={styles.empty}>Sem eventos</Text> :
          eventos.map(e => (
            <Text key={e.id_evento} style={styles.row}>
              • {e.nome} ({e.data}) - {e.local || e.quintas?.nome}
            </Text>
          ))
        }
      </View>

      {/* Últimas Entradas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Últimas Entradas</Text>
        {entradas.length === 0 ? <Text style={styles.empty}>Sem entradas</Text> :
          entradas.map((e, i) => (
            <Text key={i} style={styles.row}>
              • {e.produtos?.produto}: {e.quantidade} un. ({e.armazens?.quintas?.nome || e.armazens?.nome})
            </Text>
          ))
        }
      </View>

      {/* Últimas Transferências */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚚 Últimas Transferências</Text>
        {transferencias.length === 0 ? <Text style={styles.empty}>Sem transferências</Text> :
          transferencias.map((t, i) => (
            <Text key={i} style={styles.row}>
              • {t.produtos?.produto}: {Math.abs(t.quantidade)} un. |
                {t.transferencias?.quintas_origem?.nome} →
                {t.transferencias?.quintas_destino?.nome}
            </Text>
          ))
        }
      </View>

      {/* Stock Zero */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ Stock Zero</Text>
        {stockZero.length === 0 ? <Text style={styles.empty}>✅ Nenhum produto com stock zero</Text> :
          stockZero.map(p => (
            <Text key={p.id_produto} style={styles.row}>
              🔴 {p.produto} ({p.movimentos?.[0]?.armazens?.quintas?.nome || 'Sem quinta'})
            </Text>
          ))
        }
      </View>

      {/* Stock por Categoria */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Stock por Categoria</Text>
        {stockCategoria.length === 0 ? <Text style={styles.empty}>Sem stock</Text> :
          stockCategoria.map((c, i) => (
            <Text key={i} style={styles.row}>• {c.categoria}: {c.total} un.</Text>
          ))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  card: { backgroundColor: cores.card, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: cores.primario, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  row: { fontSize: 14, color: cores.texto, marginBottom: 4 },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic' },
});