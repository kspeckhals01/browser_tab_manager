import { createClient } from '@supabase/supabase-js';

console.log('🔥 login-init.ts loaded');

const supabase = createClient(
    'https://xaqhhwnuxlzdusmlsbkx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcWhod251eGx6ZHVzbWxzYmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNzExNzQsImV4cCI6MjA1OTc0NzE3NH0.Axf5DzujX9HiS8OY0VSAF6x8sKIt2Xo4sLeKjmksCac',
    {
        auth: {
            persistSession: true,
            storage: localStorage,
        },
    }
);

// Parse URL
const url = location.search || location.hash;
const params = new URLSearchParams(url.startsWith('?') ? url : url.slice(1));

const code = params.get('code');
const access_token = params.get('access_token');
const refresh_token = params.get('refresh_token');

console.log('[login] Params:', { code, access_token, refresh_token });

(async () => {
    if (access_token && refresh_token) {
        console.log('[login] Using magic link tokens');
        await supabase.auth.setSession({ access_token, refresh_token });
    } else if (code) {
        console.log('[login] Using code exchange');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('[login] exchangeCodeForSession failed:', error.message);
            alert('Login failed.');
            return;
        }
    } else {
        console.error('[login] No valid auth data');
        document.getElementById('status')!.textContent = 'Login failed.';
        return;
    }

    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;

    if (!user) {
        alert('Login failed: No user returned.');
        return;
    }

    console.log('[login-init] Setting loginSuccess flag');

    await chrome.storage.local.set({
        userId: user.id,
        tier: 'free',
        loginSuccess: 'pending',
    });

    const result = await chrome.storage.local.get('loginSuccess');
    console.log('[login-init] loginSuccess stored as:', result.loginSuccess);
    chrome.runtime.sendMessage({ type: 'login-success', userId: user.id });
    window.close();
})();
