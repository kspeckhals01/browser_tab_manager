import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { XCircle } from 'lucide-react';

type Props = {
    onClose: () => void;
};

export default function LoginPanel({ onClose }: Props) {
    const [loading, setLoading] = useState(false);


    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });

        if (error) {
            toast.error('Google login failed.');
            setLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        const email = prompt('Enter your email:');
        if (!email) return;

        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/upgrade.html`
            }
        });

        if (error) {
            toast.error('Email login failed.');
        } else {
            toast.success('Check your email!');
        }

        setLoading(false);
    };

    return (
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg z-50 p-4 flex flex-col justify-between border-l dark:border-gray-700">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Log in</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
                >
                    Continue with Google
                </button>

                <button
                    onClick={handleEmailLogin}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Continue with Email
                </button>
            </div>

            <button
                onClick={onClose}
                className="w-full px-3 py-2 mt-4 text-xs text-gray-500 hover:underline"
            >
                Cancel
            </button>
        </div>
    );
}
