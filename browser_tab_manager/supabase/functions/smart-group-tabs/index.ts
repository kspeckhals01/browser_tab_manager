import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type Tab = {
    title: string;
    url: string;
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: corsHeaders,
        });
    }

    const apiKey = Deno.env.get('COHERE_API_KEY');
    if (!apiKey) {
        console.error('[Cohere] Missing API key');
        return new Response('Missing API key', {
            status: 500,
            headers: corsHeaders,
        });
    }

    try {
        const { tabs }: { tabs: Tab[] } = await req.json();

        const prompt = `
You are a smart tab grouping assistant.

Given this list of browser tabs (titles and URLs), organize them into logical groups.

Respond ONLY with a valid JSON array in the following structure. Do NOT include any explanation, preamble, or markdown formatting:

[
  {
    "group_name": "Group Name",
    "tabs": [
      { "title": "Tab Title", "url": "https://example.com" }
    ]
  }
]

Here are the tabs:
${JSON.stringify(tabs.map(t => ({ title: t.title, url: t.url })))}
    `.trim();

        const cohereRes = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Cohere-Version': '2022-12-06',
            },
            body: JSON.stringify({
                model: 'command-r-plus',
                message: prompt,
                temperature: 0.3,
                max_tokens: 1200,
            }),
        });

        const status = cohereRes.status;
        const cohereJson = await cohereRes.json();

        console.log('[Cohere Debug] Status:', status);
        console.log('[Cohere Debug] Raw JSON:', JSON.stringify(cohereJson, null, 2));

        const rawText = cohereJson?.text?.trim() || cohereJson?.generations?.[0]?.text?.trim();

        if (!rawText) {
            console.error('[Cohere Error] No generation received');
            return new Response(
                JSON.stringify({
                    error: 'No valid generation received from Cohere',
                    status,
                    raw: cohereJson,
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const cleaned = rawText.replace(/```json/i, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            return new Response(JSON.stringify(parsed), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (err) {
            console.error('[Cohere Parse Error]', err, cleaned);
            return new Response(
                JSON.stringify({
                    error: 'Failed to parse Cohere generation',
                    message: err.message,
                    raw: cleaned,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    } catch (err) {
        console.error('[Cohere Smart Grouping] Unexpected error:', err);
        return new Response(
            JSON.stringify({
                error: 'Unexpected server error',
                message: err.message,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
