import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useCooldown() {
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  // Fonction pour récupérer le cooldown depuis le serveur
  const fetchCooldown = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/cooldown');
      if (response.ok) {
        const data = await response.json();
        setCooldown(data.cooldownRemaining || 0);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du cooldown:', error);
    }
  }, [session?.user?.id]);

  // Fonction pour valider un pixel
  const validatePixel = useCallback(async (x: number, y: number, color: string) => {
    if (!session?.user?.id) {
      throw new Error('Non authentifié');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/validate-pixel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y, color }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setCooldown(data.cooldownRemaining || 60);
        }
        throw new Error(data.message || 'Erreur lors de la validation');
      }

      // Succès - démarrer le nouveau cooldown
      setCooldown(60);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Timer pour décrémenter le cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => Math.max(0, prev - 1)), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Récupérer le cooldown initial quand l'utilisateur se connecte
  useEffect(() => {
    if (session?.user?.id) {
      fetchCooldown();
    }
  }, [session?.user?.id, fetchCooldown]);

  return {
    cooldown,
    isLoading,
    validatePixel,
    refreshCooldown: fetchCooldown,
  };
}
