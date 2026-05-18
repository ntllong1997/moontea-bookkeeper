import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { manualMatch, unmatchReceipt } from '@/lib/bookkeeperDb';

export async function POST(request) {
    try {
        const { receipt_id, transaction_id, action } = await request.json();

        if (!receipt_id || !action) {
            return NextResponse.json(
                { error: 'Missing receipt_id or action.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (action === 'match') {
            if (!transaction_id)
                return NextResponse.json(
                    { error: 'Missing transaction_id.' },
                    { status: 400 }
                );
            await manualMatch(supabase, receipt_id, transaction_id);
        } else if (action === 'unmatch') {
            await unmatchReceipt(supabase, receipt_id);
        } else if (action === 'dismiss') {
            await supabase
                .from('receipts')
                .update({ match_status: 'dismissed' })
                .eq('id', receipt_id);
        } else {
            return NextResponse.json(
                { error: 'Invalid action.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Match operation failed.' },
            { status: 500 }
        );
    }
}
