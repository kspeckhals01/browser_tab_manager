
export type UserTier = 'free' | 'pro' | 'expired';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    tier: UserTier;
    sessions_used: number;
    groups_used: number;
    upgraded_at?: string;
    created_at: string;
    subscription_cancelled_at?: string | null;
    subscription_expired?: string | null;
    subscription_ends_at?: string;
    trial_ends_at?: string;
    subscription_paused_at?: string | null;
}
