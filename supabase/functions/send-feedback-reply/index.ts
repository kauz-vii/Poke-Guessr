// supabase/functions/send-feedback-reply/index.ts
// Supabase Edge Function — sends an email notification when admin replies to feedback.
// Deploy with: npx supabase functions deploy send-feedback-reply

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = 'Poke-Guessr <noreply@poke-guessr.com>';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { to, username, message, reply } = await req.json();

    if (!to || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing email or API key' }), { status: 400 });
    }

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f0c1c; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px 32px; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 1.6rem;">🎮 Poke-Guessr</h1>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">Admin Reply to Your Feedback</p>
        </div>
        <div style="padding: 28px 32px;">
          <p style="color: #94a3b8; margin: 0 0 4px 0; font-size: 0.85rem;">Hi <strong style="color: #e2e8f0;">${username || 'Trainer'}</strong>,</p>
          <p style="color: #94a3b8; margin: 0 0 20px 0; font-size: 0.85rem;">The admin has replied to your feedback!</p>

          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
            <p style="color: #64748b; font-size: 0.75rem; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your original message</p>
            <p style="color: #94a3b8; margin: 0; font-size: 0.88rem; font-style: italic;">"${message}"</p>
          </div>

          <div style="background: rgba(52,211,153,0.07); border: 1px solid rgba(52,211,153,0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="color: #34d399; font-size: 0.78rem; margin: 0 0 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">🛡️ Admin Reply</p>
            <p style="color: #e2e8f0; margin: 0; font-size: 0.9rem;">${reply}</p>
          </div>

          <div style="text-align: center;">
            <a href="https://poke-guessr-kaushik07oct2004-1414s-projects.vercel.app/" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 0.9rem;">
              Visit Poke-Guessr
            </a>
          </div>
        </div>
        <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="color: #334155; font-size: 0.75rem; margin: 0;">You're receiving this because you submitted feedback on Poke-Guessr.</p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   [to],
        subject: '💬 Admin replied to your feedback — Poke-Guessr',
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
