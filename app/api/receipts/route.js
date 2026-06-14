import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase
            .from('receipts')
            .select('*, receipt_items(*)')
            .order('created_at', { ascending: false });

        if (mode === 'business') query = query.eq('is_personal', false);

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
