import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const LEMON_SECRET = Deno.env.get('LEMON_WEBHOOK_SECRET')!;

interface ProfileUpdate {
    tier?: 'pro' | 'free' | 'expired';
    trial_ends_at?: string | null;
    subscription_ends_at?: string | null;
    subscription_expired?: string | null;
    upgraded_at?: string;
    customer_id?: number | null;
    subscription_cancelled_at?: string | null;
    subscription_paused_at: string | null;
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

serve(async (req) => {
    try {
        const signature = req.headers.get('X-Signature') || '';
        const rawBody = await req.text();

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(LEMON_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            hexToBytes(signature),
            new TextEncoder().encode(rawBody)
        );

        if (!isValid) {
            console.error('[webhook] Invalid Lemon Squeezy signature');
            return new Response('Unauthorized', { status: 401 });
        }

        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch (err) {
            console.error('[webhook] Invalid JSON:', err);
            return new Response('Bad request', { status: 400 });
        }

        const event = payload.meta?.event_name;
        const attributes = payload.data?.attributes;
        const email = attributes?.user_email;
        const subEnds =
            attributes?.renews_at ??
            attributes?.next_payment_attempt_at ??
            attributes?.resumes_at ??
            attributes?.ends_at ??
            null;
        const expiredAt = attributes?.expired_at ?? new Date().toISOString();
        const now = new Date().toISOString();
        const customerId = attributes?.customer_id;

        console.log(`[webhook] Event: ${event} for ${email}`);


        if (!email) {
            return new Response('Missing email', { status: 400 });
        }

        let update: ProfileUpdate | null = null;

        switch (event) {
            case 'subscription_created':
                update = {
                    tier: 'pro',
                    trial_ends_at: attributes?.trial_ends_at ?? null,
                    subscription_ends_at: subEnds,
                    subscription_expired: null,
                    upgraded_at: now,
                    customer_id: customerId,
                    subscription_paused_at: null
                };
                console.log('[webhook] Update object:', JSON.stringify(update, null, 2));
                console.log('[webhook] Raw Lemon fields:', {
                    status: attributes?.status,
                    ends_at: attributes?.ends_at,
                    renews_at: attributes?.renews_at,
                    resumes_at: attributes?.resumes_at,
                    next_payment_attempt_at: attributes?.next_payment_attempt_at
                });
                break;

            case 'subscription_resumed':
            case 'subscription_unpaused':
                update = {
                    tier: 'pro',
                    trial_ends_at: null,  
                    subscription_ends_at: subEnds,
                    subscription_expired: null,
                    subscription_paused_at: null,
                    upgraded_at: now,
                    customer_id: customerId,
                    subscription_cancelled_at: null
                };
                console.log('[webhook] Update object:', JSON.stringify(update, null, 2));
                console.log('[webhook] Raw Lemon fields:', {
                    status: attributes?.status,
                    ends_at: attributes?.ends_at,
                    renews_at: attributes?.renews_at,
                    resumes_at: attributes?.resumes_at,
                    next_payment_attempt_at: attributes?.next_payment_attempt_at
                });
                break;

            case 'subscription_cancelled':
                update = {
                    // Do NOT change tier here — user still has access
                    subscription_ends_at: subEnds, // the date when access ends
                    subscription_expired: null,
                    subscription_cancelled_at: now,
                    subscription_paused_at: null
                };
                console.log('[webhook] Update object:', JSON.stringify(update, null, 2));
                console.log('[webhook] Raw Lemon fields:', {
                    status: attributes?.status,
                    ends_at: attributes?.ends_at,
                    renews_at: attributes?.renews_at,
                    resumes_at: attributes?.resumes_at,
                    next_payment_attempt_at: attributes?.next_payment_attempt_at
                });
                break;

            case 'subscription_expired':
                update = {
                    tier: 'expired',
                    trial_ends_at: null,
                    subscription_ends_at: null,
                    subscription_expired: expiredAt,
                    subscription_paused_at: null
                };
                console.log('[webhook] Update object:', JSON.stringify(update, null, 2));
                console.log('[webhook] Raw Lemon fields:', {
                    status: attributes?.status,
                    ends_at: attributes?.ends_at,
                    renews_at: attributes?.renews_at,
                    resumes_at: attributes?.resumes_at,
                    next_payment_attempt_at: attributes?.next_payment_attempt_at
                });
                break;

            case 'subscription_updated':
                update = {
                    // Do NOT change tier here — just update billing dates
                    subscription_ends_at: subEnds,
                    subscription_expired: null,
                    subscription_paused_at: null
                };
                console.log('[webhook] Update object:', JSON.stringify(update, null, 2));
                console.log('[webhook] Raw Lemon fields:', {
                    status: attributes?.status,
                    ends_at: attributes?.ends_at,
                    renews_at: attributes?.renews_at,
                    resumes_at: attributes?.resumes_at,
                    next_payment_attempt_at: attributes?.next_payment_attempt_at
                });
                break;

            case 'subscription_paused':
                update = {
                    subscription_paused_at: now
                };
                break;
            case 'subscription_payment_failed':
                console.log('[webhook] No tier change for event:', event);
                return new Response('Ignored', { status: 200 });

            default:
                console.log('[webhook] Unhandled event:', event);
                return new Response('Unhandled event', { status: 200 });
        }

        console.log('[webhook] Update object:', update);

        const { error } = await supabase
            .from('user_profiles')
            .update(update)
            .eq('email', email);

        if (error) {
            console.error('[webhook] Supabase update failed:', error.message);
            return new Response('Update failed', { status: 500 });
        }

        console.log(`[webhook] Successfully updated ${email}`);
        return new Response('OK', { status: 200 });

    } catch (err) {
        console.error('[webhook] Uncaught error:', err);
        return new Response('Internal error', { status: 500 });
    }
});
