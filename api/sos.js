/**
 * api/sos.js — Vercel Serverless Edge Function for 100% Automated Emergency SOS Dispatch.
 * 
 * When the user presses SOS 3 times and doesn't undo within 5 seconds:
 *   1. Sends WhatsApp message via Meta WhatsApp Cloud API (Facebook Developer Account)
 *   2. Sends automated email via EmailJS REST API (no mailto: prompts)
 * 
 * Everything is background — zero manual taps from the user.
 */

export default async function handler(req, res) {
  // CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const {
      userName,
      userPhone,
      contactName,
      contactEmail,
      contactPhone,
      lat,
      lon,
      timestamp,
      // WhatsApp Cloud API credentials (from env or request)
      whatsappToken,
      whatsappPhoneId,
    } = req.body || {};

    const mapsUrl = `https://maps.google.com/?q=${lat || 13.07158},${lon || 77.59685}`;
    const formattedTime = timestamp || new Date().toISOString();
    const results = { whatsapp: false, email: false };

    // ─── 1. AUTOMATED WHATSAPP MESSAGE via Meta Cloud API ───
    const waToken = whatsappToken || process.env.WHATSAPP_TOKEN;
    const waPhoneId = whatsappPhoneId || process.env.WHATSAPP_PHONE_ID;
    const recipientPhone = (contactPhone || '+919820088990').replace(/[^0-9]/g, '');

    if (waToken && waPhoneId) {
      try {
        const waRes = await fetch(
          `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: recipientPhone,
              type: 'text',
              text: {
                body: `🚨 *AUTOMATED EMERGENCY SOS ALERT!*\n\n👤 *Patient:* ${userName || 'User'}\n📞 *Patient Phone:* ${userPhone || 'N/A'}\n🕐 *Time:* ${formattedTime}\n\n📍 *LIVE GPS LOCATION:*\n${mapsUrl}\n\n⚠️ This is an automated emergency alert from ResQ-Plus. Please respond immediately and send help to the GPS location above.\n\n_Sent automatically by ResQ-Plus Emergency Dispatch System_`
              }
            }),
          }
        );
        const waData = await waRes.json();
        results.whatsapp = waRes.ok;
        console.log('[SOS API] WhatsApp Cloud API response:', JSON.stringify(waData));
      } catch (waErr) {
        console.error('[SOS API] WhatsApp Cloud API error:', waErr.message);
      }
    } else {
      console.log('[SOS API] WhatsApp Cloud API credentials not configured. Skipping WhatsApp dispatch.');
    }

    // ─── 2. AUTOMATED EMAIL via EmailJS REST API ───
    const emailServiceId = process.env.EMAILJS_SERVICE_ID;
    const emailTemplateId = process.env.EMAILJS_TEMPLATE_ID;
    const emailPublicKey = process.env.EMAILJS_PUBLIC_KEY;

    if (emailServiceId && emailTemplateId && emailPublicKey) {
      try {
        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: emailServiceId,
            template_id: emailTemplateId,
            user_id: emailPublicKey,
            template_params: {
              to_email: contactEmail || 'emergency@resqplus.app',
              to_name: contactName || 'Emergency Contact',
              from_name: 'ResQ-Plus Emergency Dispatch',
              subject: `🚨 EMERGENCY SOS ALERT - ${userName || 'Patient'} Needs Immediate Help!`,
              patient_name: userName || 'Unknown',
              patient_phone: userPhone || 'N/A',
              timestamp: formattedTime,
              location_url: mapsUrl,
              lat: lat || '13.07158',
              lon: lon || '77.59685',
              message: `AUTOMATED EMERGENCY SOS DISTRESS ALERT!\n\nPatient Name: ${userName || 'Unknown'}\nPatient Phone: ${userPhone || 'N/A'}\nTime of SOS: ${formattedTime}\n\nLIVE GPS LOCATION:\n${mapsUrl}\n\nPlease send emergency medical aid immediately.\n\n— ResQ-Plus Automated Emergency Dispatch System`
            }
          }),
        });
        results.email = emailRes.ok;
        console.log('[SOS API] EmailJS response status:', emailRes.status);
      } catch (emailErr) {
        console.error('[SOS API] EmailJS error:', emailErr.message);
      }
    }

    // Fallback: Web3Forms free relay if EmailJS not configured
    if (!results.email) {
      try {
        const w3Res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: process.env.WEB3FORMS_KEY || 'c90b6910-18e3-472e-8c3b-74fa5a932d84',
            subject: `🚨 AUTOMATED EMERGENCY SOS ALERT - ${userName || 'Patient'} Needs Help!`,
            from_name: 'ResQ-Plus Emergency Dispatch',
            to: contactEmail || 'emergency@resqplus.app',
            message: `🚨 AUTOMATED EMERGENCY SOS DISTRESS ALERT!\n\nPatient: ${userName || 'Unknown'}\nPhone: ${userPhone || 'N/A'}\nEmergency Contact: ${contactName || 'N/A'}\nTime: ${formattedTime}\n\n📍 LIVE GPS LOCATION:\n${mapsUrl}\n\nPlease send emergency aid immediately.\n\n— ResQ-Plus Automated Dispatch`,
          }),
        });
        results.email = w3Res.ok;
      } catch (w3Err) {
        console.error('[SOS API] Web3Forms fallback error:', w3Err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Automated emergency SOS dispatch completed.',
      results,
      timestamp: formattedTime,
      mapsUrl,
    });
  } catch (error) {
    console.error('[SOS API] Fatal error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
