import { Tab } from '../domain/Tab';
import { supabase } from '../lib/supabase';

export async function smartGroupTabs(tabs: Tab[]): Promise<{ group_name: string; tabs: Tab[] }[]> {
    const session = (await supabase.auth.getSession()).data?.session;
    const response = await fetch('https://xaqhhwnuxlzdusmlsbkx.functions.supabase.co/smart-group-tabs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ tabs }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Smart grouping failed:', text);
        throw new Error('Failed to generate smart groups from AI');
    }

    const result = await response.json();
    return result;
}
