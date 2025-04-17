import { useEffect, useState } from 'react';
import { getUserProfile } from '../../infrastructure/supabaseTabStorage';
import { UserTier } from '../../types/types';

export default function useUserTier() {
    const [tier, setTier] = useState<UserTier>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTier() {
            try {
                const { userId } = await chrome.storage.local.get(['userId']);
                if (!userId) {
                    setTier('free');
                    setLoading(false);
                    return;
                }

                const profile = await getUserProfile(userId);
                const userTier = profile?.tier ?? 'free';

                // Update local cache to reflect true value
                await chrome.storage.local.set({ tier: userTier });

                setTier(userTier);
            } catch (err) {
                console.error('Failed to load user tier:', err);
                setTier('free');
            } finally {
                setLoading(false);
            }
        }

        fetchTier();
    }, []);

    return { tier, loading, isPro: tier === 'pro' };
}
