// src/utils/validateUserTier.ts
import { getUserProfile } from '../infrastructure/supabaseTabStorage';
import { UserTier } from '../types/types';

export async function validateUserTier(): Promise<UserTier> {
    const result = await chrome.storage.local.get(['userId']);
    const userId = result.userId;

    if (!userId) {
        return 'free';
    }

    const profile = await getUserProfile(userId);

    if (!profile) {
        return 'free';
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