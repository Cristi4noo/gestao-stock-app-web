import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase';
import { cores } from '../../src/tema';
import { useVerificarAdmin } from '../../src/verificarAdmin';

export default function Entradas() {
  useVerificarAdmin();
  const [quintas, setQuintas] = useState([]);
  const [quintaId, setQuintaId] = useState('');
  const [armazens, setArmazens] = useState([]);
  const [armazemId, setArmazemId] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState('');
  const [produto, setProduto] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [tipoEmbalagem, setTipoEmbalagem] = useState('caixa');
  const [unidadesEmbalagem, setUnidadesEmbalagem] = useState('1');
  const [numEmbalagens, setNumEmbalagens] = useState('1');
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

  async function procurarCodigo() {
    if (!codigoBarras) { Alert.alert('Erro', 'Insira um código de barras!'); return; }
    const { data } = await supabase.from('produtos').select('*').eq('codigo_barras', codigoBarras).maybeSingle();
    if (data) {
      setProduto(data.produto);
      setCategoria(data.categoria);
      setCapacidade(data.capacidade_litros?.toString() || '');
      setTipoEmbalagem(data.tipo_embalagem);
      setUnidadesEmbalagem(data.unidades_embalagem?.toString() || '1');
      Alert.alert('✅', `Produto encontrado: ${data.produto}`);
    } else {
      Alert.alert('⚠️', 'Produto não encontrado!');
    }
  }

  function adicionarProduto() {
    if (!produto) { Alert.alert('Erro', 'Preencha o produto!'); return; }
    if (!armazemId) { Alert.alert('Erro', 'Selecione um armazém!'); return; }
    const qtd = parseInt(numEmbalagens) * parseInt(unidadesEmbalagem || 1);
    if (qtd <= 0) { Alert.alert('Erro', 'Quantidade inválida!'); return; }

    setTabelaResumo([...tabelaResumo, {
      produto, quantidade: qtd, armazemId, quintaId,
      categoria, capacidadeLitros: capacidade, codigoBarras, tipoEmbalagem, unidadesEmbalagem
    }]);

    setProduto(''); setCategoria(''); setCapacidade('');
    setCodigoBarras(''); setNumEmbalagens('1'); setUnidadesEmbalagem('1');
  }

  function removerProduto(index) {
    setTabelaResumo(tabelaResumo.filter((_, i) => i !== index));
  }

  async function confirmar() {
    if (tabelaResumo.length === 0) { Alert.alert('Erro', 'Adicione pelo menos um produto!'); return; }
    setLoading(true);

    let sucessos = 0;
    let falhas = 0;

    for (const item of tabelaResumo) {
      try {
        let idProduto = null;

        if (item.codigoBarras) {
          const { data: pc } = await supabase.from('produtos').select('id_produto').eq('codigo_barras', item.codigoBarras).maybeSingle();
          if (pc) idProduto = pc.id_produto;
        }
        if (!idProduto) {
          const { data: pn } = await supabase.from('produtos').select('id_produto').eq('produto', item.produto).maybeSingle();
          if (pn) idProduto = pn.id_produto;
        }
        if (!idProduto) {
          const { data: novo, error: errInsert } = await supabase.from('produtos').insert({
            produto: item.produto, categoria: item.categoria || '',
            codigo_barras: item.codigoBarras || null,
            capacidade_litros: item.capacidadeLitros ? parseFloat(item.capacidadeLitros) : null,
            tipo_embalagem: item.tipoEmbalagem || 'caixa',
            unidades_embalagem: parseInt(item.unidadesEmbalagem) || 1
          }).select('id_produto').single();

          if (errInsert) { falhas++; continue; }
          if (novo) idProduto = novo.id_produto;
        }
        if (!idProduto) { falhas++; continue; }

        const { error: errMov } = await supabase.from('movimentos').insert({
          id_produto: idProduto, quantidade: parseInt(item.quantidade),
          tipo_movimento: 'entrada', id_armazem: parseInt(item.armazemId),
        });

        if (errMov) { falhas++; } else { sucessos++; }
      } catch (e) { falhas++; }
    }

    setLoading(false);
    if (sucessos > 0) {
      Alert.alert('✅', `${sucessos} produto(s) registado(s)!`);
      setTabelaResumo([]);
    } else {
      Alert.alert('❌', `Falha ao registar.`);
    }
  }

  const qtdTotal = parseInt(numEmbalagens) * parseInt(unidadesEmbalagem || 1);
  const quintaNome = quintas.find(q => q.id_quinta.toString() === quintaId)?.nome || '';

  if (!quintaId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📦 Entradas</Text>
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📦 Entradas</Text>

      <Text style={styles.label}>Quinta</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={quintaId} onValueChange={setQuintaId}>
          {quintas.map(q => <Picker.Item key={q.id_quinta} label={q.nome} value={q.id_quinta.toString()} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Armazém</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={armazemId} onValueChange={setArmazemId}>
          <Picker.Item label="Selecionar armazém" value="" />
          {armazens.map(a => <Picker.Item key={a.id_armazem} label={a.nome} value={a.id_armazem.toString()} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Código de Barras</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Scan" value={codigoBarras} onChangeText={setCodigoBarras} />
        <TouchableOpacity style={styles.btnProcurar} onPress={procurarCodigo}><Text style={styles.btnText}>🔍 Procurar</Text></TouchableOpacity>
      </View>

      <Text style={styles.label}>Categoria</Text>
      <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} />
      <Text style={styles.label}>Produto</Text>
      <TextInput style={styles.input} value={produto} onChangeText={setProduto} />
      <Text style={styles.label}>Capacidade (L)</Text>
      <TextInput style={styles.input} value={capacidade} onChangeText={setCapacidade} keyboardType="numeric" />

      <Text style={styles.label}>Tipo de Embalagem</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={tipoEmbalagem} onValueChange={setTipoEmbalagem}>
          <Picker.Item label="Caixa" value="caixa" />
          <Picker.Item label="Grade" value="grade" />
          <Picker.Item label="Pack" value="pack" />
        </Picker>
      </View>
      <Text style={styles.label}>Unidades por Embalagem</Text>
      <TextInput style={styles.input} value={unidadesEmbalagem} onChangeText={setUnidadesEmbalagem} keyboardType="numeric" />
      <Text style={styles.label}>Nº de Embalagens</Text>
      <TextInput style={styles.input} value={numEmbalagens} onChangeText={setNumEmbalagens} keyboardType="numeric" />

      <Text style={styles.qtdTotal}>Quantidade Total: {qtdTotal || 0} unidades</Text>

      <TouchableOpacity style={styles.btnAdd} onPress={adicionarProduto}><Text style={styles.btnText}>➕ Adicionar Produto</Text></TouchableOpacity>

      <Text style={styles.section}>📋 Produtos Adicionados</Text>
      {tabelaResumo.length === 0 ? <Text style={styles.empty}>Nenhum produto</Text> :
        tabelaResumo.map((item, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.nome}>{item.produto} - {item.quantidade} un.</Text>
            <Text>{armazens.find(a => a.id_armazem.toString() === item.armazemId)?.nome}</Text>
            <TouchableOpacity onPress={() => removerProduto(i)}><Text style={styles.remover}>🗑️</Text></TouchableOpacity>
          </View>
        ))
      }

      <TouchableOpacity style={styles.btnConfirmar} onPress={confirmar} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'A guardar...' : '✅ Confirmar Entrada'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: cores.fundo },
  title: { fontSize: 24, fontWeight: 'bold', color: cores.texto, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: cores.branco, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 14, marginBottom: 6 },
  pickerContainer: { backgroundColor: cores.branco, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnProcurar: { backgroundColor: cores.textoClaro, padding: 12, borderRadius: 10 },
  btnAdd: { backgroundColor: cores.secundario, padding: 14, borderRadius: 10, marginTop: 15 },
  btnConfirmar: { backgroundColor: cores.sucesso, padding: 16, borderRadius: 10, marginTop: 20 },
  btnText: { color: cores.branco, textAlign: 'center', fontWeight: 'bold', fontSize: 14 },
  qtdTotal: { fontSize: 16, fontWeight: 'bold', marginTop: 10, color: cores.primario },
  section: { fontSize: 18, fontWeight: 'bold', color: cores.primario, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  card: { backgroundColor: cores.card, padding: 14, borderRadius: 10, marginBottom: 8, elevation: 2 },
  nome: { fontSize: 16, fontWeight: 'bold', color: cores.texto },
  remover: { color: cores.perigo, marginTop: 5, fontWeight: '600' },
  empty: { fontSize: 14, color: cores.textoClaro, fontStyle: 'italic', textAlign: 'center', padding: 20 },
});