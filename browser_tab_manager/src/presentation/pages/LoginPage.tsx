import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function LoginPage() {
    console.log('🧠 LoginPage component rendered');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        console.log('🟡 handleGoogleLogin triggered'); // 👈

        setLoading(true);

        const redirectUri = chrome.identity.getRedirectURL('login.html');
        const authUrl = `https://xaqhhwnuxlzdusmlsbkx.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}`;

        console.log('🔗 Redirect URI:', redirectUri);
        console.log('🌐 Auth URL:', authUrl);

        chrome.identity.launchWebAuthFlow(
            {
                url: authUrl,
                interactive: true,
            },
            (responseUrl) => {
                setLoading(false);

                if (chrome.runtime.lastError || !responseUrl) {
                    toast.error('Google login failed.');
                    console.error('[login] launchWebAuthFlow error:', chrome.runtime.lastError);
                    return;
                }

                console.log('✅ Supabase redirected to:', responseUrl);
            }
        );
    };





    const handleEmailLogin = async () => {
        const email = prompt('Enter your email to receive a magic link:');
        if (!email) return;

        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: chrome.identity.getRedirectURL('login.html'),
            },
        });

        if (error) {
            toast.error('Email login failed.');
        } else {
            toast.success('Check your email for the login link.');
        }

        setLoading(false);
    };

    return (
        <div className="p-6 text-center text-gray-800 dark:text-white max-w-sm mx-auto mt-10">
            <h1 className="text-xl font-bold mb-4">Login to Upgrade</h1>
            <p className="text-sm mb-6 text-gray-600 dark:text-gray-400">
                To upgrade to Tabvana Pro, you must be logged in.
            </p>

            <button
                onClick={handleGoogleLogin}
                className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
            >
                Sign in with Google
            </button>

            <button
                onClick={handleEmailLogin}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                disabled={loading}
            >
                Sign in with Email
            </button>
        </div>
    );
}
