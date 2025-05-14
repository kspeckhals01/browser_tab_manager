import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserProfile } from '../../infrastructure/supabaseTabStorage';
import { UserProfile } from '../../types/types';
import { getDaysRemaining } from '../../utils/subscriptionUtils';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { migrateLocalGroupsToCloud } from '../../utils/migrateLocalGroupsToCloud'
import { IS_PRO_ENABLED } from '../../config';

type Props = {
    onUpgrade: () => void;
};

export default function AccountPage({ onUpgrade }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [emailInput, setEmailInput] = useState('');
    useEffect(() => {
        const init = async () => {
            const { loginSuccess } = await chrome.storage.local.get('loginSuccess');
            const shouldShowWelcome = loginSuccess === true || loginSuccess === 'true';

            if (loginSuccess) {
                await chrome.storage.local.remove('loginSuccess');
            }

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session?.user) {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            const user = session.user;
            setUser(user);

            try {
                const profile = await getUserProfile(user.id);

                if (!profile) {
                    // New user, no profile yet
                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: 'free',
                    });
                    toast.info("You're new here! Sign up for Tabvana Pro to enable cloud sync.");
                    setProfile(null); // triggers "Sign up for Pro" UI
                    return;
                }

                // Profile found — check for expired
                if (profile.tier === 'expired') {
                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: 'expired',
                    });
                    toast.warning("Your Pro subscription has expired. Cloud sync is paused.");
                } else {
                    // Active user (free or pro)
                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: profile.tier ?? 'free',
                    });

                    if (shouldShowWelcome) {
                        toast.success('Welcome back, ' + user.email);
                    }

                    if (profile.subscription_cancelled_at) {
                        const end = profile.subscription_ends_at
                            ? new Date(profile.subscription_ends_at).toLocaleDateString()
                            : 'soon';

                        const canceled = new Date(profile.subscription_cancelled_at).toLocaleDateString();
                        toast.info(`You cancelled your subscription on ${canceled}. Access continues until ${end}.`);
                    }
                }

                setProfile(profile);

                const subEnd = profile.subscription_ends_at || profile.trial_ends_at;
                if (subEnd) {
                    const days = getDaysRemaining(subEnd);
                    setDaysLeft(Math.max(0, days ?? 0));
                }
            } catch (err) {
                console.error('[AccountPage] error fetching profile:', err);

                await chrome.storage.local.set({ tier: 'expired' });
                toast.warning(
                    'Your session may have expired. Cloud syncing is paused, but you can still view your saved data.'
                );
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    useEffect(() => {
        const poll = setInterval(async () => {
            const { loginSuccess } = await chrome.storage.local.get('loginSuccess');

            if (loginSuccess === 'pending') {

                await chrome.storage.local.set({ loginSuccess: false });

                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session?.user) {
                    console.error('[AccountPage] Failed to get user session after login');
                    return;
                }

                const user = session.user;
                setUser(user);

                try {
                    const profile = await getUserProfile(user.id);
                    setProfile(profile);

                    const subEnd = profile?.subscription_ends_at || profile?.trial_ends_at;
                    if (subEnd) setDaysLeft(getDaysRemaining(subEnd));

                    await chrome.storage.local.set({
                        userId: user.id,
                        tier: profile?.tier ?? 'free',
                    });

                    toast.success('Welcome back, ' + user.email);
                } catch (err) {
                    console.error('[AccountPage] error fetching profile:', err);
                    toast.error('Failed to fetch account details after login.');
                }

                setLoading(false);
            }
        }, 1000); // Poll every 1000ms

        return () => clearInterval(poll);
    }, []);
    if (!IS_PRO_ENABLED) {
        return (
            <div className="p-4 animate-slide-in h-full flex flex-col">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-center text-gray-700 dark:text-gray-300">
                        Tabvana Free Edition
                    </h2>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    You're using the free version of Tabvana.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Pro features launching soon:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <li>Cloud backup and sync</li>
                    <li>Smart AI tab grouping</li>
                    <li>Unlimited sessions and groups</li>
                    <li>Cross-browser sync (Chrome, Firefox, Edge)</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Estimated price: <strong>$4.99/month</strong>
                </p>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Stay tuned for the next release!
                </p>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                    Questions, bugs, or feature ideas? <br />
                    <a
                        href="mailto:baconneckapplications@gmail.com"
                        className="text-blue-600 dark:text-blue-400 underline"
                    >
                        Contact us
                    </a>
                </p>
            </div>
        );
    }


    chrome.storage.local.get('loginSuccess').then(({ loginSuccess }) => {
        console.log('[AccountPage] loginSuccess value on mount:', loginSuccess);
    });

   



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

    const handleGoogleLogin = () => {
        const redirectUri = chrome.identity.getRedirectURL('login.html');
        const authUrl = `https://xaqhhwnuxlzdusmlsbkx.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}`;

        chrome.identity.launchWebAuthFlow(
            {
                url: authUrl,
                interactive: true,
            },
            (responseUrl) => {
                if (chrome.runtime.lastError) {

                    supabase.auth.getUser().then(({ data }) => {
                        if (data?.user) {
                            console.log('[auth] Logged in despite error. User:', data.user.email);
                            
                        } else {
                            toast.error('Login was cancelled or failed.');
                        }
                    });

                    return;
                }

                console.log('Redirect successful:', responseUrl);
            }
        );

    };

    const handleLogout = async () => {
        await supabase.auth.signOut();

        await chrome.storage.local.set({
            userId: null,
            tier: 'free',
            currentView: 'account', 
        });

        setUser(null);         
        setProfile(null);      
        setDaysLeft(null);     

        toast.success('Logged out');
    };

    const handleUpgrade = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        const user = session?.user;

        if (error || !user?.email) {
            toast.error('You must be logged in to upgrade.');
            return;
        }

        try {
            // Step 1: Upsert the user profile
            const { error: upsertError } = await supabase.from('user_profiles').upsert({
                id: user.id,
                email: user.email,
                tier: 'free',
            });

            if (upsertError) {
                console.error('Upsert failed:', upsertError.message);
                toast.error('Failed to prepare your account.');
                return;
            }

            // Step 2: Open Lemon Squeezy checkout in popup
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                'https://tabvanapro.lemonsqueezy.com/buy/ad015705-80d2-40df-8742-8533fcd86f1a', // Replace with your real Lemon Squeezy link
                'LemonSqueezyCheckout',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                toast.error('Popup blocked. Please allow popups to continue.');
                return;
            }

            // Step 3: Poll for popup close and refresh profile
            const pollTimer = setInterval(async () => {
                if (popup.closed) {
                    clearInterval(pollTimer);

                    const updated = await getUserProfile(user.id);
                    setProfile(updated);

                    if (updated?.tier === 'pro') {
                        await migrateLocalGroupsToCloud();
                        toast.success('You’re now a Pro user! Your groups have been synced to the cloud.');
                    } else {
                        toast.info('Upgrade not yet completed. Please wait or try again.');
                    }
                }
            }, 1000);

        } catch (err) {
            console.error('[handleUpgrade] Unexpected error:', err);
            toast.error('Something went wrong. Please try again.');
        }
    };

    const handleManageSubscription = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        const user = session?.user;

        if (error || !user) {
            toast.error('You must be logged in to manage your subscription.');
            return;
        }

        try {
            const res = await fetch('https://xaqhhwnuxlzdusmlsbkx.supabase.co/functions/v1/get-customer-portal', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('[handleManageSubscription] Fetch failed:', errorText);
                toast.error('Failed to fetch customer portal.');
                return;
            }

            const { url } = await res.json();

            // Open in centered popup
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                url,
                'ManageSubscription',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                toast.error('Popup blocked. Please allow popups to continue.');
            }

        } catch (err) {
            console.error('[handleManageSubscription] Error:', err);
            toast.error('Could not open subscription portal.');
        }
    };






    return (
        <div className="p-4 animate-slide-in h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg text-gray-700 dark:text-gray-300 font-semibold flex-1 text-center">Account</h2>
                <span className="w-5 h-5" />
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
                        onClick={handleUpgrade}
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
                                        {profile.tier === 'pro' && profile.subscription_ends_at ? (
                                            profile.subscription_cancelled_at ? (
                                                <>
                                                    You canceled on{' '}
                                                    {new Date(profile.subscription_cancelled_at).toLocaleDateString()}. Access continues until{' '}
                                                    {new Date(profile.subscription_ends_at).toLocaleDateString()}.
                                                </>
                                            ) : profile.subscription_paused_at ? (
                                                <>
                                                    Your subscription was paused on{' '}
                                                    {new Date(profile.subscription_paused_at).toLocaleDateString()}. Access continues until{' '}
                                                    {new Date(profile.subscription_ends_at).toLocaleDateString()}.
                                                </>
                                            ) : (
                                                <>
                                                    Subscription renews in {daysLeft} day{daysLeft !== 1 ? 's' : ''} (
                                                    {new Date(profile.subscription_ends_at).toLocaleDateString()}).
                                                </>
                                            )
                                        ) : profile.tier === 'free' && profile.trial_ends_at ? (
                                            daysLeft > 0 ? (
                                                <>Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</>
                                            ) : (
                                                <>Your free trial has ended.</>
                                            )
                                        ) : null}
                                    </p>
                                )}

                    <button
                        onClick={handleManageSubscription}
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
    );
}
