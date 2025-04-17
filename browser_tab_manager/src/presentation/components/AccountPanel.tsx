import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserProfile } from '../../infrastructure/supabaseTabStorage';
import { UserProfile } from '../../types/types';
import { getDaysRemaining } from '../../utils/subscriptionUtils';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { X } from 'lucide-react';

type Props = {
    onClose: () => void;
};

export default function AccountPanel({ onClose }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [emailInput, setEmailInput] = useState('');

    useEffect(() => {

        const init = async () => {

            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('[AccountPanel] Supabase session:', session);
            console.log('[AccountPanel] auth.uid():', session?.user?.id);

            if (error) {
                console.error('[AccountPanel] error getting session:', error);
                setLoading(false);
                return;
            }

            const user = session?.user;
            setUser(user ?? null);

            if (!user) {
                setLoading(false); 
                return;
            }

            try {
                const profile = await getUserProfile(user.id);
                setProfile(profile);

                if (profile) {
                    const subEnd = profile.subscription_ends_at || profile.trial_ends_at;
                    if (subEnd) {
                        const diff = getDaysRemaining(subEnd);
                        setDaysLeft(diff);
                    }

                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: profile.tier ?? 'free',
                    });
                } else {
                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: 'free',
                    });
                }
            } catch (err) {
                console.error('[AccountPanel] error fetching profile:', err);
                toast.error('Error loading account profile');
            } finally {
                setLoading(false); // Always unset loading, even if profile fails
            }
        };

        init();
    }, []);

    const handleLogin = async () => {
        if (!emailInput) {
            toast.error('Please enter your email');
            return;
        }

        const { error } = await supabase.auth.signInWithOtp({
            email: emailInput,
            options: {
                emailRedirectTo: chrome.runtime.getURL('login.html'),
            },
        });

        if (error) toast.error('Login failed.');
        else toast.success('Check your email to log in.');
    };

    const handleGoogleLogin = async () => {
        const loginUrl = chrome.runtime.getURL('login.html');
        window.open(loginUrl, '_blank');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await chrome.storage.local.remove(['userId', 'tier']);
        setUser(null);
        setProfile(null);
        toast.success('Logged out');
    };

    return (
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg z-50 p-4 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Account</h2>
                    <button onClick={onClose}>
                        <X className="w-5 h-5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white" />
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading account...</p>
                ) : !user ? (
                    <>
                        <input
                            type="email"
                            placeholder="Enter email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm mb-2 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                            onClick={handleLogin}
                            className="w-full px-3 py-2 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                            Sign In with Google
                        </button>
                    </>
                ) : !profile ? (
                    <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                            No Tabvana Pro account found.
                        </p>
                        <button
                            onClick={() => window.open('https://your-stripe-payment-link', '_blank')}
                            className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                            Sign Up for Pro
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Log Out
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Email:</strong> {profile.email}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Plan:</strong> {(profile.tier ?? 'free').toUpperCase()}
                        </p>
                        {daysLeft !== null && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {daysLeft > 0
                                    ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
                                    : 'Expired'}
                            </p>
                        )}

                        <button
                            onClick={() => window.open('https://billing.stripe.com/p/login-link-here', '_blank')}
                            className="w-full mt-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                            Manage Subscription
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Log Out
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
