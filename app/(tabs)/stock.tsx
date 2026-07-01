import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';

export default function Stock() {
  const [quintas, setQuintas] = useState([]);
  const [quintaId, setQuintaId] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [armazens, setArmazens] = useState([]);
  const [stockArmazem, setStockArmazem] = useState({});
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [ordenar, setOrdenar] = useState('quantidade');
  const [seccao, setSeccao] = useState('total'); // 'total' | 'armazem'

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome').then(({ data }) => setQuintas(data || []));
  }, []);

  useEffect(() => {
    if (quintaId) carregarDados();
  }, [quintaId]);

  async function carregarDados() {
    setLoading(true);

    const { data: arm } = await supabase.from('armazens').select('*').eq('id_quinta', parseInt(quintaId)).order('nome');
    const armazensList = arm || [];
    setArmazens(armazensList);

    if (armazensList.length === 0) {
      setProdutos([]);
      setStockArmazem({});
      setLoading(false);
      return;
    }

    const { data: movs } = await supabase
      .from('movimentos')
      .select('id_produto, quantidade, id_armazem')
      .in('id_armazem', armazensList.map(a => a.id_armazem));

    const mapa: Record<number, number> = {};
    movs?.forEach(m => {
      mapa[m.id_produto] = (mapa[m.id_produto] || 0) + m.quantidade;
    });

    const ids = Object.keys(mapa).map(Number);
    const { data: prod } = ids.length > 0
      ? await supabase.from('produtos').select('*').in('id_produto', ids)
      : { data: [] };

    // extrair categorias únicas
    const unicas = [...new Set((prod || []).map(p => p.categoria).filter(Boolean))] as string[];
    setCategorias(unicas);

    const dados = (prod || []).map(p => ({
      ...p,
      stock_total: mapa[p.id_produto] || 0,
      movimentos: movs?.filter(m => m.id_produto === p.id_produto) || [],
    })).filter(p => p.stock_total > 0);

    setProdutos(dados);

    const porArmazem: Record<number, any[]> = {};
    armazensList.forEach(a => {
      porArmazem[a.id_armazem] = dados
        .map(p => {
          const qtd = (movs || []).filter(m => m.id_produto === p.id_produto && m.id_armazem === a.id_armazem).reduce((s, m) => s + (m.quantidade || 0), 0);
          return { ...p, quantidade: qtd };
        })
        .filter(p => p.quantidade > 0);
    });
    setStockArmazem(porArmazem);
    setLoading(false);
  }

  function filtrar(lista: any[]) {
    let f = lista.filter(p => {
      const matchNome = p.produto?.toLowerCase().includes(pesquisa.toLowerCase());
      const matchCat = !filtroCategoria || p.categoria === filtroCategoria;
      return matchNome && matchCat;
    });
    if (ordenar === 'quantidade') f.sort((a, b) => (b.stock_total || b.quantidade) - (a.stock_total || a.quantidade));
    return f;
  }

  if (!quintaId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📦 Stock</Text>
        <Text style={styles.label}>Selecione uma quinta</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={quintaId} onValueChange={setQuintaId}>
            <Picker.Item label="Selecionar quinta" value="" />
            {quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}
          </Picker>
        </View>
      </View>
    );
  }

  if (loading) return <ActivityIndicator size="large" color="#3498db" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={quintaId} onValueChange={setQuintaId}>
          {quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}
        </Picker>
      </View>

      {/* Filtros */}
      <TextInput style={styles.input} placeholder="🔍 Pesquisar produto..." value={pesquisa} onChangeText={setPesquisa} />
      <View style={styles.pickerContainer}>
        <Picker selectedValue={filtroCategoria} onValueChange={setFiltroCategoria}>
          <Picker.Item label="Categoria" value="" />
          {categorias.map(cat => <Picker.Item key={cat} label={cat} value={cat} />)}
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={ordenar} onValueChange={setOrdenar}>
          <Picker.Item label="Ordenar por quantidade" value="quantidade" />
        </Picker>
      </View>

      {/* Separador igual aos relatórios */}
      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
        <TouchableOpacity
          style={[styles.tab, seccao === 'total' && styles.tabAtivo]}
          onPress={() => setSeccao('total')}
        >
          <Text style={[styles.tabText, seccao === 'total' && styles.tabTextAtivo]}>📋 Stock Total</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, seccao === 'armazem' && styles.tabAtivo]}
          onPress={() => setSeccao('armazem')}
        >
          <Text style={[styles.tabText, seccao === 'armazem' && styles.tabTextAtivo]}>🏭 Por Armazém</Text>
        </TouchableOpacity>
      </View>

      {seccao === 'total' && (
        <>
          {filtrar(produtos).length === 0 ? <Text style={styles.empty}>Sem stock</Text> :
            filtrar(produtos).map(p => (
              <View key={p.id_produto} style={styles.card}>
                <Text style={styles.nome}>{p.produto}</Text>
                <Text>{p.categoria} | {p.tipo_embalagem} | {p.unidades_embalagem} un/emb</Text>
                <Text style={styles.qtd}>Stock: {p.stock_total} un.</Text>
              </View>
            ))
          }
        </>
      )}

      {seccao === 'armazem' && (
        <>
          {armazens.map(a => (
            <View key={a.id_armazem}>
              <Text style={styles.section}>🏠 {a.nome}</Text>
              {(stockArmazem[a.id_armazem] || []).length === 0 ? <Text style={styles.empty}>Sem stock</Text> :
                filtrar(stockArmazem[a.id_armazem] || []).map(p => (
                  <View key={p.id_produto} style={styles.card}>
                    <Text style={styles.nome}>{p.produto}</Text>
                    <Text>{p.categoria} | {p.tipo_embalagem}</Text>
                    <Text style={styles.qtd}>Stock: {p.quantidade} un.</Text>
                  </View>
                ))
              }
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  title: { fontSize: 24, fontWeight: 'bold', color: cores.texto, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 4, marginTop: 10 },
  section: { fontSize: 18, fontWeight: 'bold', color: cores.primario, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  input: { backgroundColor: cores.branco, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 14 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  card: { backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 8, elevation: 2 },
  nome: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  qtd: { fontSize: 14, color: cores.sucesso, marginTop: 4, fontWeight: '600' },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: cores.card, marginHorizontal: 4 },
  tabAtivo: { backgroundColor: cores.primario },
  tabText: { fontWeight: '600', color: cores.texto },
  tabTextAtivo: { color: '#fff' },
});