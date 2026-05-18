import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaidClient';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { public_token, institution_id, institution_name } =
            await request.json();

        if (!public_token) {
            return NextResponse.json(
                { error: 'Missing public_token.' },
                { status: 400 }
            );
        }

        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
            public_token,
        });
        const { access_token, item_id } = exchangeResponse.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { error } = await supabase.from('plaid_items').upsert(
            {
                item_id,
                access_token,
                institution_id,
                institution_name,
            },
            { onConflict: 'item_id' }
        );

        if (error) throw error;

        return NextResponse.json({ success: true, institution_name });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Token exchange failed.' },
            { status: 500 }
        );
    }
}
