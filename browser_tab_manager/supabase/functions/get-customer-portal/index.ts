import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const LEMON_API_KEY = Deno.env.get('LEMON_API_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

serve(async (req) => {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
        return new Response('Unauthorized', {
            status: 401,
            headers: corsHeaders,
        })
    }

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
        console.error('Failed to authenticate user:', authError?.message)
        return new Response('Invalid token', {
            status: 401,
            headers: corsHeaders,
        })
    }

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('customer_id')
        .eq('id', user.id)
        .single()

    if (error || !profile?.customer_id) {
        console.error('No customer_id found for user:', error?.message)
        return new Response('Customer ID not found', {
            status: 404,
            headers: corsHeaders,
        })
    }

    const lemonRes = await fetch(
        `https://api.lemonsqueezy.com/v1/customers/${profile.customer_id}`,
        {
            headers: {
                Authorization: `Bearer ${LEMON_API_KEY}`,
                Accept: 'application/json',
            },
        }
    )

    if (!lemonRes.ok) {
        const text = await lemonRes.text()
        console.error('Failed to fetch LemonSqueezy customer:', text)
        return new Response('Lemon Squeezy error', {
            status: 500,
            headers: corsHeaders,
        })
    }

    const lemonData = await lemonRes.json()
    const portalUrl = lemonData?.data?.attributes?.urls?.customer_portal

    if (!portalUrl) {
        return new Response('No portal URL found', {
            status: 404,
            headers: corsHeaders,
        })
    }

    return new Response(JSON.stringify({ url: portalUrl }), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    })
})
