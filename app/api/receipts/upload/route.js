import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enhanceReceiptImage, imageToPdf } from '@/lib/receiptScan';

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
        const isPdf = file.type === 'application/pdf';
        const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        let imageBuffer = buffer;
        let imageContentType = file.type;
        let imageExt = file.name.split('.').pop();

        if (!isPdf) {
            imageBuffer = await enhanceReceiptImage(buffer);
            imageContentType = 'image/png';
            imageExt = 'png';
        }

        const imagePath = `receipts/${baseName}.${imageExt}`;
        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(imagePath, imageBuffer, { contentType: imageContentType });

        if (uploadError) throw uploadError;

        const { data: imageUrlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(imagePath);

        let scanPdfUrl = isPdf ? imageUrlData.publicUrl : null;

        if (!isPdf) {
            const pdfBuffer = await imageToPdf(imageBuffer);
            const pdfPath = `receipts/${baseName}.pdf`;

            const { error: pdfUploadError } = await supabase.storage
                .from('receipts')
                .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' });

            if (pdfUploadError) throw pdfUploadError;

            const { data: pdfUrlData } = supabase.storage
                .from('receipts')
                .getPublicUrl(pdfPath);

            scanPdfUrl = pdfUrlData.publicUrl;
        }

        const { data: receipt, error: insertError } = await supabase
            .from('receipts')
            .insert({
                image_url: imageUrlData.publicUrl,
                scan_pdf_url: scanPdfUrl,
                ai_status: 'pending',
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
