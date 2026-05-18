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

        // Fetch image and convert to base64
        const imageResp = await fetch(receipt.image_url);
        if (!imageResp.ok) throw new Error('Failed to fetch receipt image.');
        const imageBuffer = await imageResp.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const contentType = imageResp.headers.get('content-type') || 'image/jpeg';

        // Claude vision OCR
        const message = await anthropic.messages.create({
            model: process.env.RECEIPT_OCR_MODEL || 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: contentType,
                                data: base64Image,
                            },
                        },
                        {
                            type: 'text',
                            text: `You are an expert receipt parser. Extract all information from this receipt image and return ONLY a valid JSON object with these exact fields (use null for any field you cannot determine):
{
  "location": "string — merchant/store name",
  "total_amount": number — final total paid after tax and tip,
  "receipt_datetime": "ISO 8601 string — date and time of purchase, use T00:00:00 if no time visible",
  "payment_method_type": "visa|mastercard|amex|discover|cash|check|other",
  "payment_method_last4": "string — last 4 digits if card, else null",
  "ai_confidence": number between 0 and 1,
  "items": [
    { "item_name": "string", "quantity": number, "unit_price": number, "line_total": number }
  ]
}
Rules: total_amount must be the final charged amount including tax/tip. Extract ALL line items. Discounts are negative. Return ONLY the JSON, no other text.`,
                        },
                    ],
                },
            ],
        });

        const rawText = message.content[0].text.trim();
        let extraction;
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            extraction = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
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

        await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);

        if (extraction.items?.length) {
            const { error: insertError } = await supabase
                .from('receipt_items')
                .insert(
                    extraction.items.map((item) => ({
                        receipt_id: receiptId,
                        item_name: item.item_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        line_total: item.line_total,
                    }))
                );
            if (insertError) throw insertError;
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
