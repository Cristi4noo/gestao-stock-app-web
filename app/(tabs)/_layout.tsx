import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { cores } from '../../src/tema';

export default function TabLayout() {
  const papel = (globalThis as any).papel;
  const isAdmin = papel === 'administrador';

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: cores.tabAtivo,
      tabBarInactiveTintColor: cores.tabInativo,
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 5, height: 60 },
      headerStyle: { backgroundColor: cores.header },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📦</Text> }} />
      {isAdmin && <Tabs.Screen name="entradas" options={{ title: 'Entradas', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📥</Text> }} />}
      {isAdmin && <Tabs.Screen name="inserir_eventos" options={{ title: 'Eventos', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📅</Text> }} />}
      {isAdmin && <Tabs.Screen name="gerir_eventos" options={{ title: 'Gerir Eventos', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text> }} />}
      {isAdmin && <Tabs.Screen name="transferencias" options={{ title: 'Transferências', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🚚</Text> }} />}
      <Tabs.Screen name="relatorios" options={{ title: 'Relatórios', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="definicoes" options={{ title: 'Definições', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text> }} />
    </Tabs>
  );
}