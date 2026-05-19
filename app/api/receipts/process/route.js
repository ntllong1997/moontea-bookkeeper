import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { autoMatchReceipts } from '@/lib/bookkeeperDb';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
    let receiptId;

    try {
        const body = await request.json();
        receiptId = body.receipt_id;

        if (!receiptId) {
            return NextResponse.json(
                { error: 'Missing receipt_id.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: receipt, error: receiptError } = await supabase
            .from('receipts')
            .select('id, image_url')
            .eq('id', receiptId)
            .single();

        if (receiptError || !receipt) {
            return NextResponse.json(
                { error: 'Receipt not found.' },
                { status: 404 }
            );
        }

        // Claude vision OCR
        const today = new Date().toISOString().split('T')[0];
        const message = await anthropic.messages.create({
            model: process.env.RECEIPT_OCR_MODEL || 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'url',
                                url: receipt.image_url,
                            },
                        },
                        {
                            type: 'text',
                            text: `You are an expert receipt parser. Extract all information from this receipt image and return ONLY a valid JSON object with these exact fields (use null for any field you cannot determine):
{
  "location": "string — merchant/store name",
  "total_amount": number — final total paid after tax and tip,
  "receipt_datetime": "ISO 8601 string — date and time of purchase",
  "payment_method_type": "visa|mastercard|amex|discover|cash|check|other",
  "payment_method_last4": "string — last 4 digits if card, else null",
  "ai_confidence": number between 0 and 1,
  "items": [
    {
      "item_name": "string",
      "quantity": number or null,
      "unit_price": number or null,
      "line_total": number
    }
  ]
}
Rules:
- total_amount: the final charged amount including tax and tip. Never use subtotal.
- receipt_datetime: find the purchase date on the receipt. It may appear as MM/DD/YYYY, DD/MM/YYYY, "May 19 2026", or YYYY-MM-DD. Output as ISO 8601 (YYYY-MM-DDTHH:MM:SS). If no time is visible use T00:00:00. Use today's date (${today}) only to resolve ambiguous 2-digit years — pick the century that makes the date closest to today. Do NOT guess or invent a date.
- items: list every line item on the receipt. If no individual items are visible, return an empty array [].
- ai_confidence: your overall confidence (0–1) that location, total_amount, and receipt_datetime are all correct.
- Return ONLY raw JSON — no markdown, no code fences, no explanation.

Example output:
{"location":"Blue Bottle Coffee","total_amount":14.75,"receipt_datetime":"2026-05-19T09:32:00","payment_method_type":"visa","payment_method_last4":"4242","ai_confidence":0.95,"items":[{"item_name":"Latte","quantity":1,"unit_price":6.50,"line_total":6.50},{"item_name":"Croissant","quantity":2,"unit_price":3.75,"line_total":7.50}]}`,
                        },
                    ],
                },
            ],
        });

        const rawText = message.content[0].text.trim();
        let extraction;
        try {
            const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
                || rawText.match(/```(?:json)?\s*([\s\S]*)/)
                || rawText.match(/(\{[\s\S]*\})/);
            extraction = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
        } catch {
            throw new Error(`Failed to parse OCR response: ${rawText.slice(0, 200)}`);
        }

        const { error: updateError } = await supabase
            .from('receipts')
            .update({
                location: extraction.location,
                total_amount: extraction.total_amount,
                receipt_datetime: extraction.receipt_datetime,
                payment_method_type: extraction.payment_method_type,
                payment_method_last4: extraction.payment_method_last4,
                ai_status: 'processed',
                ai_confidence: extraction.ai_confidence,
                raw_ocr_text: rawText,
            })
            .eq('id', receiptId);

        if (updateError) throw updateError;

        // Insert line items (delete any stale items from a previous attempt first)
        if (Array.isArray(extraction.items) && extraction.items.length > 0) {
            await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);
            const { error: itemsError } = await supabase.from('receipt_items').insert(
                extraction.items
                    .filter((item) => item.item_name && item.line_total != null)
                    .map((item) => ({
                        receipt_id: receiptId,
                        item_name: item.item_name,
                        quantity: item.quantity ?? null,
                        unit_price: item.unit_price ?? null,
                        line_total: item.line_total,
                    }))
            );
            if (itemsError) throw itemsError;
        }

        // Run auto-match after successful OCR
        await autoMatchReceipts(supabase);

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        const message = error?.message || 'OCR processing failed.';
        if (receiptId) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            await supabase
                .from('receipts')
                .update({ ai_status: 'failed', raw_ocr_text: message })
                .eq('id', receiptId);
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
