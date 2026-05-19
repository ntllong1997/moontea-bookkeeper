import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { categorizeTransaction } from '@/lib/categorize';

export async function POST() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: txs, error } = await supabase
            .from('bank_transactions')
            .select('id, merchant_name, raw_name, amount');
        if (error) throw error;

        let updated = 0;
        const batchSize = 100;

        for (let i = 0; i < txs.length; i += batchSize) {
            const batch = txs.slice(i, i + batchSize);
            await Promise.all(
                batch.map((t) =>
                    supabase
                        .from('bank_transactions')
                        .update({ custom_category: categorizeTransaction(t.raw_name || t.merchant_name, t.amount) })
                        .eq('id', t.id)
                )
            );
            updated += batch.length;
        }

        return NextResponse.json({ updated });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
