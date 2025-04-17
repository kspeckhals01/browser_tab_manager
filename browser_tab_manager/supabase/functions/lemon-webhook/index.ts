import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface ProfileUpdate {
    tier?: 'pro' | 'free';
    trial_ends_at?: string | null;
    subscription_ends_at?: string | null;
    upgraded_at?: string;
    customer_id?: number | null;
}

const LEMON_SECRET = Deno.env.get('LEMON_WEBHOOK_SECRET')!

serve(async (req) => {
    const signature = req.headers.get('X-Signature') || ''
    const rawBody = await req.text()

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(LEMON_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    )

    const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        hexToBytes(signature),
        new TextEncoder().encode(rawBody)
    )

    if (!isValid) {
        console.error('Invalid Lemon Squeezy webhook signature')
        return new Response('Unauthorized', { status: 401 })
    }

    let payload
    try {
        payload = JSON.parse(rawBody)
    } catch (err) {
        console.error('Invalid JSON:', err)
        return new Response('Bad request', { status: 400 })
    }

    const event = payload.meta?.event_name
    const attributes = payload.data?.attributes
    const email = attributes?.user_email
    const trialEnds = attributes?.trial_ends_at ?? null
    const subEnds = attributes?.ends_at ?? attributes?.renews_at ?? null
    const now = new Date().toISOString()
    const customerId = attributes?.customer_id;

    console.log(`Event: ${event} for ${email}`)

    if (!email) {
        return new Response('Missing email', { status: 400 })
    }

    // Decide what to update based on event
    let update: ProfileUpdate | null = null;

    switch (event) {
        case 'subscription_created':
        case 'subscription_resumed':
        case 'subscription_unpaused':
            update = {
                tier: 'pro',
                trial_ends_at: trialEnds,
                subscription_ends_at: subEnds,
                upgraded_at: now,
                customer_id: customerId
            }
            break

        case 'subscription_cancelled':
            update = {
                subscription_ends_at: subEnds
            }
            break

        case 'subscription_expired':
            update = {
                tier: 'free',
                subscription_ends_at: null
            }
            break

        case 'subscription_paused':
        case 'subscription_payment_failed':
            console.log('Subscription paused or payment failed — no tier change')
            return new Response('Ignored (no downgrade)', { status: 200 })

        default:
            console.log('Unhandled event:', event)
            return new Response('Unhandled event', { status: 200 })
    }

    if (update) {
        const { error } = await supabase
            .from('user_profiles')
            .update(update)
            .eq('email', email)

        if (error) {
            console.error('Supabase update failed:', error.message)
            return new Response('Update failed', { status: 500 })
        }

        console.log(`Updated ${email}:`, update)
    }

    return new Response('OK', { status: 200 })
})

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
}
