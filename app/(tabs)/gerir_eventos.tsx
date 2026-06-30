import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';
import { useVerificarAdmin } from '../../src/verificarAdmin';

export default function GerirEventos() {
  useVerificarAdmin();
  const [quintas, setQuintas] = useState([]);
  const [eventosPreparacao, setEventosPreparacao] = useState([]);
  const [eventosSemiFechado, setEventosSemiFechado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandir, setExpandir] = useState({});
  const [novoProduto, setNovoProduto] = useState({});
  const [sobrou, setSobrou] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome').then(({ data }) => setQuintas(data || []));
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    const { data: prep } = await supabase.from('eventos').select('*').eq('estado', 'em_preparacao').order('data');
    const { data: semi } = await supabase.from('eventos').select('*').eq('estado', 'semi_fechado').order('data', { ascending: false });
    setEventosPreparacao(prep || []);
    setEventosSemiFechado(semi || []);
    setLoading(false);
  }

  function toggle(id) { setExpandir(prev => ({ ...prev, [id]: !prev[id] })); }
  function toggleAlterar(id) { setExpandir(prev => ({ ...prev, [`alterar_${id}`]: !prev[`alterar_${id}`] })); }
  function toggleConsumo(id) { setExpandir(prev => ({ ...prev, [`consumo_${id}`]: !prev[`consumo_${id}`] })); }

  async function cancelarEvento(id) {
    Alert.alert('Cancelar', 'Tem a certeza?', [
      { text: 'Não' },
      { text: 'Sim', onPress: async () => {
        const { data: movs } = await supabase.from('movimentos').select('*').eq('id_evento', id).eq('tipo_movimento', 'alocacao_evento');
        for (const m of movs || []) {
          await supabase.from('movimentos').insert({
            id_produto: m.id_produto, quantidade: Math.abs(m.quantidade),
            tipo_movimento: 'devolucao_evento', id_armazem: m.id_armazem, id_evento: id
          });
        }
        await supabase.from('eventos').update({ estado: 'cancelado' }).eq('id_evento', id);
        Alert.alert('✅', 'Evento cancelado!');
        carregarDados();
      }}
    ]);
  }

  async function confirmarAlterar(idEvento) {
    const removerKey = `remover_${idEvento}`;
    const tabelaKey = `tabela_${idEvento}`;
    const removerIds = novoProduto[removerKey] || [];
    const tabela = novoProduto[tabelaKey] || [];

    if (removerIds.length === 0 && tabela.length === 0) { Alert.alert('Erro', 'Nenhuma alteração!'); return; }

    for (const item of tabela) {
      const { data: existe } = await supabase.from('produtos').select('id_produto').eq('produto', item.produto).maybeSingle();
      if (existe) {
        const { data: stock } = await supabase.from('movimentos').select('quantidade').eq('id_produto', existe.id_produto).eq('id_armazem', item.armazemId);
        const stockTotal = stock?.reduce((s, m) => s + (m.quantidade || 0), 0) || 0;
        if (stockTotal < item.qtd) { Alert.alert('⚠️', `Stock insuficiente para ${item.produto}! Disp: ${stockTotal}`); return; }
      }
    }

    for (const idProduto of removerIds) {
      const { data: movs } = await supabase.from('movimentos').select('*').eq('id_evento', idEvento).eq('id_produto', idProduto).eq('tipo_movimento', 'alocacao_evento');
      for (const m of movs || []) {
        await supabase.from('movimentos').insert({ id_produto: m.id_produto, quantidade: Math.abs(m.quantidade), tipo_movimento: 'devolucao_evento', id_armazem: m.id_armazem, id_evento: idEvento });
      }
    }

    for (const item of tabela) {
      let idProduto = null;
      const { data: existe } = await supabase.from('produtos').select('id_produto').eq('produto', item.produto).maybeSingle();
      if (existe) idProduto = existe.id_produto;
      else {
        const { data: novo } = await supabase.from('produtos').insert({ produto: item.produto, categoria: '', tipo_embalagem: 'unidade', unidades_embalagem: 1 }).select('id_produto').single();
        if (novo) idProduto = novo.id_produto;
      }
      if (idProduto) await supabase.from('movimentos').insert({ id_produto: idProduto, quantidade: -Math.abs(item.qtd), tipo_movimento: 'alocacao_evento', id_armazem: item.armazemId, id_evento: idEvento });
    }

    setNovoProduto(prev => ({ ...prev, [removerKey]: [], [tabelaKey]: [] }));
    setRefreshKey(prev => prev + 1);
    Alert.alert('✅', 'Stock atualizado!');
  }

  function adicionarProdutoTabela(idEvento) {
    const key = `novo_${idEvento}`;
    const tabelaKey = `tabela_${idEvento}`;
    const p = novoProduto[key] || {};
    if (!p.produto || !p.qtd || !p.armazemId) { Alert.alert('Erro', 'Preencha todos os campos!'); return; }
    setNovoProduto(prev => ({ ...prev, [tabelaKey]: [...(prev[tabelaKey] || []), { produto: p.produto, qtd: parseInt(p.qtd), armazemId: p.armazemId }], [key]: { produto: '', qtd: '', armazemId: '' } }));
  }

  function removerProdutoTabela(idEvento, index) { const k = `tabela_${idEvento}`; setNovoProduto(prev => ({ ...prev, [k]: (prev[k] || []).filter((_, i) => i !== index) })); }

  function marcarRemoverExistente(idEvento, idProduto) { const k = `remover_${idEvento}`; setNovoProduto(prev => ({ ...prev, [k]: [...(prev[k] || []), Number(idProduto)] })); }

  async function registarConsumo(idEvento) {
    const chaves = Object.keys(sobrou).filter(k => k.startsWith(`${idEvento}_`) && !k.includes('_alocado') && !k.includes('_armazem'));
    if (chaves.length === 0) { Alert.alert('Erro', 'Nenhum produto!'); return; }
    for (const key of chaves) {
      const idProduto = key.split('_')[1];
      const alocado = parseInt(sobrou[`${idEvento}_${idProduto}_alocado`] || 0);
      const s = parseInt(sobrou[key] || 0);
      const consumido = alocado - s;
      const idArmazem = parseInt(sobrou[`${idEvento}_${idProduto}_armazem`] || 0);
      if (consumido > 0) await supabase.from('movimentos').insert({ id_produto: idProduto, quantidade: -consumido, tipo_movimento: 'consumo_evento', id_armazem: idArmazem, id_evento: idEvento });
      if (s > 0) await supabase.from('movimentos').insert({ id_produto: idProduto, quantidade: s, tipo_movimento: 'devolucao_evento', id_armazem: idArmazem, id_evento: idEvento });
    }
    await supabase.from('eventos').update({ estado: 'fechado' }).eq('id_evento', idEvento);
    Alert.alert('✅', 'Consumo registado!'); setSobrou({}); carregarDados();
  }

  if (loading) return <ActivityIndicator size="large" color={cores.primario} style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.section}>🟡 Em Preparação</Text>
      {eventosPreparacao.map(e => (
        <View key={e.id_evento} style={styles.card}>
          <Text style={styles.nome}>{e.nome} ({e.data})</Text>
          {e.id_quinta && <Text style={{ fontSize: 12, color: cores.textoClaro, marginBottom: 4 }}>🏠 {quintas.find(q => q.id_quinta === e.id_quinta)?.nome}</Text>}
          <View style={styles.rowBotoes}>
            <TouchableOpacity style={styles.btnPequeno} onPress={() => toggle(e.id_evento)}><Text>📦</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnPequeno} onPress={() => toggleAlterar(e.id_evento)}><Text>✏️</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnPequeno} onPress={() => cancelarEvento(e.id_evento)}><Text>❌</Text></TouchableOpacity>
          </View>
          {expandir[e.id_evento] && <StockEvento key={`stock_${e.id_evento}_${refreshKey}`} idEvento={e.id_evento} refreshKey={refreshKey} />}
          {expandir[`alterar_${e.id_evento}`] && (
            <AlterarStock key={`alterar_${e.id_evento}_${refreshKey}`} idEvento={e.id_evento} idQuinta={e.id_quinta} refreshKey={refreshKey}
              novoProduto={novoProduto} setNovoProduto={setNovoProduto} adicionarProdutoTabela={adicionarProdutoTabela}
              removerProdutoTabela={removerProdutoTabela} marcarRemoverExistente={marcarRemoverExistente} confirmarAlterar={confirmarAlterar} />
          )}
        </View>
      ))}
      {eventosPreparacao.length === 0 && <Text style={styles.empty}>Nenhum evento</Text>}

      <Text style={[styles.section, { marginTop: 20 }]}>🟠 Semi-Fechados</Text>
      {eventosSemiFechado.map(e => (
        <View key={e.id_evento} style={styles.card}>
          <Text style={styles.nome}>{e.nome} ({e.data})</Text>
          {e.id_quinta && <Text style={{ fontSize: 12, color: cores.textoClaro, marginBottom: 4 }}>🏠 {quintas.find(q => q.id_quinta === e.id_quinta)?.nome}</Text>}
          <TouchableOpacity style={styles.btnPequeno} onPress={() => toggleConsumo(e.id_evento)}><Text>📝 Registar</Text></TouchableOpacity>
          {expandir[`consumo_${e.id_evento}`] && <RegistarConsumo idEvento={e.id_evento} sobrou={sobrou} setSobrou={setSobrou} registarConsumo={registarConsumo} />}
        </View>
      ))}
      {eventosSemiFechado.length === 0 && <Text style={styles.empty}>Nenhum evento</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

async function buscarStockLiquidoEvento(idEvento) {
  const { data } = await supabase.from('movimentos').select('*, produtos(produto, categoria), armazens(nome)').eq('id_evento', idEvento).in('tipo_movimento', ['alocacao_evento', 'devolucao_evento']);
  if (!data) return [];
  const mapa = {};
  for (const m of data) {
    const chave = `${m.id_produto}_${m.id_armazem}`;
    if (!mapa[chave]) mapa[chave] = { ...m, quantidade: 0 };
    mapa[chave].quantidade += m.quantidade;
  }
  return Object.values(mapa).filter(m => m.quantidade < 0);
}

function StockEvento({ idEvento, refreshKey }) {
  const [produtos, setProdutos] = useState([]);
  useEffect(() => { buscarStockLiquidoEvento(idEvento).then(setProdutos); }, [idEvento, refreshKey]);
  return produtos.length === 0 ? <Text style={styles.empty}>Sem produtos</Text> :
    produtos.map(p => <Text key={`${p.id_produto}_${p.id_armazem}`} style={styles.row}>• {p.produtos?.produto}: {Math.abs(p.quantidade)} un. ({p.armazens?.nome})</Text>);
}

function AlterarStock({ idEvento, idQuinta, refreshKey, novoProduto, setNovoProduto, adicionarProdutoTabela, removerProdutoTabela, marcarRemoverExistente, confirmarAlterar }) {
  const key = `novo_${idEvento}`;
  const tabelaKey = `tabela_${idEvento}`;
  const removerKey = `remover_${idEvento}`;
  const [armazens, setArmazens] = useState([]);
  const [produtosExistentes, setProdutosExistentes] = useState([]);

  useEffect(() => {
    if (idQuinta) supabase.from('armazens').select('*').eq('id_quinta', idQuinta).order('nome').then(({ data }) => setArmazens(data || []));
    buscarStockLiquidoEvento(idEvento).then(setProdutosExistentes);
  }, [idEvento, refreshKey, idQuinta]);

  const tabela = novoProduto[tabelaKey] || [];
  const removerIds = novoProduto[removerKey] || [];

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>Produtos atuais</Text>
      {produtosExistentes.length === 0 ? <Text style={styles.empty}>Nenhum</Text> :
        produtosExistentes.map(p => {
          const marcado = removerIds.includes(Number(p.id_produto));
          return (<View key={`${p.id_produto}_${p.id_armazem}`} style={[styles.row, marcado && { opacity: 0.4 }]}>
            <Text style={{ flex: 1, textDecorationLine: marcado ? 'line-through' : 'none' }}>{p.produtos?.produto}: {Math.abs(p.quantidade)} un.</Text>
            {!marcado && <TouchableOpacity onPress={() => marcarRemoverExistente(idEvento, p.id_produto)}><Text style={{ color: cores.perigo }}>🗑️</Text></TouchableOpacity>}
          </View>);
        })
      }
      {tabela.length > 0 && (<><Text style={[styles.label, { marginTop: 10 }]}>Produtos a adicionar</Text>
        {tabela.map((item, i) => (<View key={i} style={styles.row}><Text style={{ flex: 1 }}>{item.produto}: {item.qtd} un.</Text><TouchableOpacity onPress={() => removerProdutoTabela(idEvento, i)}><Text style={{ color: cores.perigo }}>🗑️</Text></TouchableOpacity></View>))}
      </>)}
      <Text style={[styles.label, { marginTop: 10 }]}>Adicionar produto</Text>
      <TextInput style={styles.input} placeholder="Produto" value={novoProduto[key]?.produto || ''} onChangeText={t => setNovoProduto(prev => ({ ...prev, [key]: { ...prev[key], produto: t } }))} />
      <TextInput style={styles.input} placeholder="Qtd" keyboardType="numeric" value={novoProduto[key]?.qtd || ''} onChangeText={t => setNovoProduto(prev => ({ ...prev, [key]: { ...prev[key], qtd: t } }))} />
      <View style={styles.pickerContainer}><Picker selectedValue={novoProduto[key]?.armazemId || ''} onValueChange={t => setNovoProduto(prev => ({ ...prev, [key]: { ...prev[key], armazemId: t } }))}><Picker.Item label="Selecionar armazém" value="" />{armazens.map(a => <Picker.Item key={a.id_armazem} label={a.nome} value={a.id_armazem.toString()} />)}</Picker></View>
      <TouchableOpacity style={styles.btnAdd} onPress={() => adicionarProdutoTabela(idEvento)}><Text style={styles.btnText}>➕ Adicionar</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btnAdd, { backgroundColor: cores.primario }]} onPress={() => confirmarAlterar(idEvento)}><Text style={styles.btnText}>✅ Confirmar Alterações</Text></TouchableOpacity>
    </View>
  );
}

function RegistarConsumo({ idEvento, sobrou, setSobrou, registarConsumo }) {
  const [produtos, setProdutos] = useState([]);
  useEffect(() => { supabase.from('movimentos').select('*, produtos(produto), armazens(nome)').eq('id_evento', idEvento).eq('tipo_movimento', 'alocacao_evento').then(({ data }) => { setProdutos(data || []); const init: any = {}; (data || []).forEach(p => { init[`${idEvento}_${p.id_produto}_alocado`] = Math.abs(p.quantidade); init[`${idEvento}_${p.id_produto}_armazem`] = p.id_armazem; }); setSobrou(prev => ({ ...init, ...prev })); }); }, []);
  return (
    <View style={{ marginTop: 10 }}>
      {produtos.map(p => { const key = `${idEvento}_${p.id_produto}`; const alocado = Math.abs(p.quantidade); return (<View key={p.id_movimento} style={styles.row}><Text style={{ flex: 2 }}>{p.produtos?.produto}: {alocado} un.</Text><TextInput style={[styles.input, { flex: 1 }]} placeholder="Sobrou" keyboardType="numeric" value={sobrou[key] || ''} onChangeText={t => setSobrou(prev => ({ ...prev, [key]: t }))} /><Text style={{ flex: 1, color: cores.primario }}>Cons: {alocado - parseInt(sobrou[key] || 0)}</Text></View>); })}
      <TouchableOpacity style={styles.btnAdd} onPress={() => registarConsumo(idEvento)}><Text style={styles.btnText}>✅ Confirmar Consumo</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  section: { fontSize: 16, fontWeight: 'bold', color: cores.primario, marginBottom: 10, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  card: { backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 8, elevation: 2 },
  nome: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginVertical: 5 },
  rowBotoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnPequeno: { padding: 10, backgroundColor: '#eef2f5', borderRadius: 8 },
  btnAdd: { backgroundColor: cores.sucesso, padding: 12, borderRadius: 10, marginTop: 10 },
  btnText: { color: cores.branco, textAlign: 'center', fontWeight: 'bold', fontSize: 14 },
  input: { backgroundColor: cores.branco, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginVertical: 4, fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: cores.texto, marginTop: 6 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginVertical: 4 },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic', textAlign: 'center', padding: 20 },
});