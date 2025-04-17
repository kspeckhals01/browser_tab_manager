import { Tab } from '../domain/Tab';
import { supabase } from '../lib/supabase';

export async function callSmartGroupTabs(tabs: Tab[]) {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;

    const response = await supabase.functions.invoke('smart-group-tabs', {
        body: { tabs },
        headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
    });

    if (response.error) {
        console.error('Smart grouping failed:', response.error);
        throw new Error('AI Smart Grouping failed');
    }

    return response.data as { name: string; tabs: Tab[] }[];
}

