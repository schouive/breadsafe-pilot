import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OperatorProfile {
  id: string;
  full_name: string;
}

export function useOperatorNames(operatorIds: string[]) {
  return useQuery({
    queryKey: ['operator_names', operatorIds],
    queryFn: async () => {
      if (operatorIds.length === 0) return {};
      
      const uniqueIds = [...new Set(operatorIds)];
      
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', uniqueIds);
      
      if (error) throw error;
      
      const nameMap: Record<string, string> = {};
      (data as OperatorProfile[]).forEach(profile => {
        nameMap[profile.id] = profile.full_name;
      });
      
      return nameMap;
    },
    enabled: operatorIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
