import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY secret not set');

    const body = await req.json();

    // Support both direct Claude format and { type:'send_email', ... } email format
    if (body.type === 'send_email') {
      // Email sending via Resend
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) throw new Error('RESEND_API_KEY secret not set');
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'RentSafe AI <documents@rentsafeai.co.uk>',
          to: [body.to],
          subject: body.subject,
          html: body.html,
        }),
      });
      const emailData = await emailRes.json();
      return new Response(JSON.stringify(emailData), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Default: Claude AI request
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-5',
        max_tokens: body.max_tokens || 1024,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = await claudeRes.json();
    return new Response(JSON.stringify(data), {
      status: claudeRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
