import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';
import { useVerificarAdmin } from '../../src/verificarAdmin';

export default function InserirEventos() {
  useVerificarAdmin();
  const [quintas, setQuintas] = useState([]);
  const [quintaId, setQuintaId] = useState('');
  const [armazens, setArmazens] = useState([]);
  const [armazemId, setArmazemId] = useState('');
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [localEvento, setLocalEvento] = useState('');
  const [dataEvento, setDataEvento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numPessoas, setNumPessoas] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState('');
  const [produto, setProduto] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [tabelaResumo, setTabelaResumo] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('quintas').select('*').order('nome').then(({ data }) => setQuintas(data || []));
  }, []);

  useEffect(() => {
    if (quintaId) {
      supabase.from('armazens').select('*').eq('id_quinta', parseInt(quintaId)).order('nome').then(({ data }) => {
        setArmazens(data || []);
        setArmazemId('');
      });
    }
  }, [quintaId]);

  function formatarData(date: Date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }

  function onDateChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDataEvento(selectedDate);
  }

  async function procurarCodigo() {
    if (!codigoBarras) { Alert.alert('Erro', 'Insira um código de barras!'); return; }
    const { data } = await supabase.from('produtos').select('*').eq('codigo_barras', codigoBarras).maybeSingle();
    if (data) {
      setProduto(data.produto); setCategoria(data.categoria);
      setCapacidade(data.capacidade_litros?.toString() || '');
      Alert.alert('✅', `Produto encontrado: ${data.produto}`);
    } else { Alert.alert('⚠️', 'Produto não encontrado!'); }
  }

  async function sugerirQuantidade() {
    if (!codigoBarras || !tipoEvento || !numPessoas) { Alert.alert('Erro', 'Preencha código, tipo e nº pessoas!'); return; }
    const { data: prod } = await supabase.from('produtos').select('id_produto').eq('codigo_barras', codigoBarras).maybeSingle();
    if (!prod) { Alert.alert('⚠️', 'Produto não encontrado!'); return; }

    const { data: historico } = await supabase.from('movimentos')
      .select('quantidade, eventos!inner(numero_pessoas)')
      .eq('id_produto', prod.id_produto).eq('tipo_movimento', 'consumo_evento')
      .eq('eventos.tipo', tipoEvento).eq('eventos.estado', 'fechado')
      .order('data_hora', { ascending: false }).limit(4);

    if (historico && historico.length > 0) {
      let totalConsumido = 0, totalPessoas = 0;
      historico.forEach(h => { totalConsumido += Math.abs(h.quantidade); totalPessoas += h.eventos.numero_pessoas; });
      const sugestao = Math.round(((totalConsumido / totalPessoas) * 100 / 100) * parseInt(numPessoas));
      setQuantidade(sugestao.toString());
      Alert.alert('💡', `Sugestão: ${sugestao} unidades`);
    } else { Alert.alert('⚠️', 'Sem histórico.'); }
  }

  function adicionarProduto() {
    if (!produto || !quantidade || parseInt(quantidade) <= 0) { Alert.alert('Erro', 'Preencha produto e quantidade!'); return; }
    if (!armazemId) { Alert.alert('Erro', 'Selecione um armazém!'); return; }
    setTabelaResumo([...tabelaResumo, { produto, quantidade: parseInt(quantidade), armazemId, categoria, capacidadeLitros: capacidade, codigoBarras }]);
    setProduto(''); setCategoria(''); setCapacidade(''); setCodigoBarras(''); setQuantidade('');
  }

  function removerProduto(index: number) { setTabelaResumo(tabelaResumo.filter((_, i) => i !== index)); }

  async function confirmar() {
    if (!nomeEvento || !dataEvento) { Alert.alert('Erro', 'Preencha nome e data!'); return; }
    if (!quintaId) { Alert.alert('Erro', 'Selecione a quinta responsável!'); return; }
    if (tabelaResumo.length === 0) { Alert.alert('Erro', 'Adicione pelo menos um produto!'); return; }
    setLoading(true);

    const errosStock: string[] = [];
    for (const item of tabelaResumo) {
      let idProduto = null;
      if (item.codigoBarras) { const { data: pc } = await supabase.from('produtos').select('id_produto').eq('codigo_barras', item.codigoBarras).maybeSingle(); if (pc) idProduto = pc.id_produto; }
      if (!idProduto) { const { data: pn } = await supabase.from('produtos').select('id_produto').eq('produto', item.produto).maybeSingle(); if (pn) idProduto = pn.id_produto; }
      if (idProduto) {
        const { data: stock } = await supabase.from('movimentos').select('quantidade').eq('id_produto', idProduto).eq('id_armazem', parseInt(item.armazemId));
        const stockTotal = stock?.reduce((s, m) => s + (m.quantidade || 0), 0) || 0;
        if (stockTotal < item.quantidade) errosStock.push(`${item.produto} (disp: ${stockTotal} un.)`);
      }
    }
    if (errosStock.length > 0) { setLoading(false); Alert.alert('⚠️ Stock insuficiente', errosStock.join('\n')); return; }

    const { data: evento, error: errEvento } = await supabase.from('eventos').insert({
      nome: nomeEvento, tipo: tipoEvento || null, local: localEvento || null,
      data: formatarData(dataEvento), numero_pessoas: parseInt(numPessoas) || 0,
      estado: 'em_preparacao', id_quinta: parseInt(quintaId)
    }).select('id_evento').single();
    if (errEvento || !evento) { setLoading(false); Alert.alert('❌', 'Erro ao criar evento.'); return; }

    let sucessos = 0;
    for (const item of tabelaResumo) {
      let idProduto = null;
      if (item.codigoBarras) { const { data: pc } = await supabase.from('produtos').select('id_produto').eq('codigo_barras', item.codigoBarras).maybeSingle(); if (pc) idProduto = pc.id_produto; }
      if (!idProduto) { const { data: pn } = await supabase.from('produtos').select('id_produto').eq('produto', item.produto).maybeSingle(); if (pn) idProduto = pn.id_produto; }
      if (!idProduto) {
        const { data: novo } = await supabase.from('produtos').insert({
          codigo_barras: item.codigoBarras || null, produto: item.produto, categoria: item.categoria || '',
          capacidade_litros: item.capacidadeLitros ? parseFloat(item.capacidadeLitros) : null,
          tipo_embalagem: 'unidade', unidades_embalagem: 1
        }).select('id_produto').single();
        if (novo) idProduto = novo.id_produto;
      }
      if (idProduto) {
        const { error: errMov } = await supabase.from('movimentos').insert({
          id_produto: idProduto, quantidade: -Math.abs(item.quantidade),
          tipo_movimento: 'alocacao_evento', id_armazem: parseInt(item.armazemId), id_evento: evento.id_evento,
        });
        if (!errMov) sucessos++;
      }
    }
    setLoading(false);
    Alert.alert('✅', `Evento criado! ${sucessos} produto(s).`);
    setTabelaResumo([]); setNomeEvento(''); setTipoEvento(''); setLocalEvento(''); setNumPessoas('');
  }

  if (!quintaId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📅 Novo Evento</Text>
        <Text style={styles.label}>Selecione a quinta responsável</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={quintaId} onValueChange={setQuintaId}>
            <Picker.Item label="Selecionar quinta" value="" />
            {quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}
          </Picker>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.section}>DADOS DO EVENTO</Text>
      <Text style={styles.label}>Quinta Responsável</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={quintaId} onValueChange={setQuintaId}>
          {quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Nome do Evento</Text>
      <TextInput style={styles.input} value={nomeEvento} onChangeText={setNomeEvento} />
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={tipoEvento} onValueChange={setTipoEvento}>
          <Picker.Item label="Selecionar tipo" value="" />
          <Picker.Item label="Casamento" value="casamento" /><Picker.Item label="Comunhão" value="comunhao" />
          <Picker.Item label="Batizado" value="batizado" /><Picker.Item label="Festa de Natal" value="festa de natal" />
          <Picker.Item label="Festa de Empresa" value="festa de empresa" /><Picker.Item label="Baile de Finalistas" value="baile de finalistas" />
        </Picker>
      </View>
      <Text style={styles.label}>Local</Text>
      <TextInput style={styles.input} value={localEvento} onChangeText={setLocalEvento} />

      {/* DATA - FUNCIONA NA WEB E NO TELEMÓVEL */}
      <Text style={styles.label}>Data</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={formatarData(dataEvento)}
          onChange={(e) => setDataEvento(new Date(e.target.value))}
          style={{
            width: '100%', padding: 12, borderRadius: 10, border: '1px solid #ddd',
            fontSize: 14, backgroundColor: '#fff', marginBottom: 8,
          }}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>📅 {formatarData(dataEvento)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <DateTimePicker value={dataEvento} mode="date" display="inline" onChange={onDateChange} />
              <TouchableOpacity style={{ backgroundColor: cores.primario, padding: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirmar Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <Text style={styles.label}>Nº de Pessoas</Text>
      <TextInput style={styles.input} value={numPessoas} onChangeText={setNumPessoas} keyboardType="numeric" />

      <Text style={[styles.section, { marginTop: 20 }]}>ALOCAR STOCK</Text>
      <Text style={styles.label}>Armazém</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={armazemId} onValueChange={setArmazemId}>
          <Picker.Item label="Selecionar armazém" value="" />
          {armazens.map(a => <Picker.Item key={a.id_armazem} label={a.nome} value={a.id_armazem.toString()} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Código de Barras</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} value={codigoBarras} onChangeText={setCodigoBarras} />
        <TouchableOpacity style={styles.btnProcurar} onPress={procurarCodigo}><Text style={styles.btnText}>🔍</Text></TouchableOpacity>
      </View>
      <Text style={styles.label}>Categoria</Text>
      <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} />
      <Text style={styles.label}>Produto</Text>
      <TextInput style={styles.input} value={produto} onChangeText={setProduto} />
      <Text style={styles.label}>Capacidade (L)</Text>
      <TextInput style={styles.input} value={capacidade} onChangeText={setCapacidade} keyboardType="numeric" />
      <Text style={styles.label}>Quantidade</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" />
        <TouchableOpacity style={styles.btnSugestao} onPress={sugerirQuantidade}><Text style={styles.btnText}>💡</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.btnAdd} onPress={adicionarProduto}><Text style={styles.btnText}>➕ Adicionar</Text></TouchableOpacity>
      <Text style={styles.section}>📋 Produtos Alocados</Text>
      {tabelaResumo.length === 0 ? <Text style={styles.empty}>Nenhum</Text> :
        tabelaResumo.map((item, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.nome}>{item.produto} - {item.quantidade} un.</Text>
            <TouchableOpacity onPress={() => removerProduto(i)}><Text style={styles.remover}>🗑️</Text></TouchableOpacity>
          </View>
        ))
      }
      <TouchableOpacity style={styles.btnConfirmar} onPress={confirmar} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'A guardar...' : '✅ Confirmar Evento'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  title: { fontSize: 24, fontWeight: 'bold', color: cores.texto, marginBottom: 15 },
  section: { fontSize: 16, fontWeight: 'bold', color: cores.primario, marginBottom: 10, marginTop: 5, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: cores.branco, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, fontSize: 14 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnProcurar: { backgroundColor: cores.textoClaro, padding: 12, borderRadius: 10 },
  btnSugestao: { backgroundColor: cores.aviso, padding: 12, borderRadius: 10 },
  btnAdd: { backgroundColor: cores.secundario, padding: 14, borderRadius: 10, marginTop: 10 },
  btnConfirmar: { backgroundColor: cores.sucesso, padding: 16, borderRadius: 10, marginTop: 20 },
  btnText: { color: cores.branco, textAlign: 'center', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 8, elevation: 2 },
  nome: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  remover: { color: cores.perigo, marginTop: 5, fontWeight: '600' },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic', textAlign: 'center', padding: 20 },
});