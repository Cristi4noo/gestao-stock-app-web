import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export function useVerificarAdmin() {
  const router = useRouter();

  useEffect(() => {
    const papel = (globalThis as any).papel;
    if (papel !== 'administrador') {
      Alert.alert('Acesso negado', 'Apenas administradores podem fazer esta operação.');
      router.back();
    }
  }, []);
}