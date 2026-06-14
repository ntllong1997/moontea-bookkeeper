import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const category = searchParams.get('category');
        const matchStatus = searchParams.get('matchStatus');
        const merchant = searchParams.get('merchant');
        const mode = searchParams.get('mode');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase
            .from('bank_transactions')
            .select('*')
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (category) query = query.eq('custom_category', category);
        if (matchStatus === 'matched') query = query.not('matched_receipt_id', 'is', null);
        if (matchStatus === 'unmatched') query = query.is('matched_receipt_id', null);
        if (merchant) query = query.ilike('merchant_name', `%${merchant}%`);
        if (mode === 'business') query = query.eq('is_personal', false);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
