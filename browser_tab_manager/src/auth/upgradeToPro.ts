import { supabase } from '../lib/supabase';

export async function upgradeToPro() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
    });

    if (error) {
        throw new Error('Authentication failed: ' + error.message);
    }

    return data; // Will redirect the user
}
