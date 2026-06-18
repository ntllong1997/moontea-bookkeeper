import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
        const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const filePath = `${baseName}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, buffer, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: imageUrlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        const prefillLocation = formData.get('location');
        const prefillAmount = formData.get('total_amount');
        const prefillDatetime = formData.get('receipt_datetime');

        const { data: receipt, error: insertError } = await supabase
            .from('receipts')
            .insert({
                image_url: imageUrlData.publicUrl,
                ai_status: 'skipped',
                ...(prefillLocation && { location: prefillLocation }),
                ...(prefillAmount && { total_amount: parseFloat(prefillAmount) }),
                ...(prefillDatetime && { receipt_datetime: prefillDatetime }),
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            receipt_id: receipt.id,
            image_url: receipt.image_url,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Upload failed.' },
            { status: 500 }
        );
    }
}
