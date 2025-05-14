// src/utils/validateUserTier.ts
import { getUserProfile } from '../infrastructure/supabaseTabStorage';
import { UserTier } from '../types/types';
import { IS_PRO_ENABLED } from '../config';

export async function validateUserTier(): Promise<UserTier> {
    const { userId } = await chrome.storage.local.get(['userId']);

    if (!userId) return 'free';

    if (!IS_PRO_ENABLED) {
        await chrome.storage.local.set({ tier: 'free' });
        return 'free';
    }

    let profile;
    try {
        profile = await getUserProfile(userId);
    } catch (err) {
        console.error('[validateUserTier] Failed to fetch user profile:', err);
        await chrome.storage.local.set({ tier: 'expired' });
        return 'expired';
    }

    if (!profile) {
        console.log('[validateUserTier] No profile found — assuming expired');
        await chrome.storage.local.set({ tier: 'expired' });
        return 'expired';
    }

    const now = new Date();
    const subEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
    const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

    const isTrialActive = trialEnd && now < trialEnd;
    const isSubActive = subEnd && now < subEnd;
    const wasPro = profile.tier === 'pro';

    let newTier: UserTier = 'free';

    if (isTrialActive || isSubActive) {
        newTier = 'pro';
    } else if (wasPro && !isSubActive && !isTrialActive) {
        newTier = 'expired';
    }

    await chrome.storage.local.set({ tier: newTier });
    return newTier;
}