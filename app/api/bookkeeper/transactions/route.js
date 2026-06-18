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
            .select('*, receipts!matched_receipt_id(image_url)')
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

        // Enrich with account name/mask from plaid_accounts
        const accountIds = [...new Set(data.map((t) => t.account_id).filter(Boolean))];
        const accountMap = {};
        if (accountIds.length > 0) {
            const { data: accounts } = await supabase
                .from('plaid_accounts')
                .select('account_id, name, mask')
                .in('account_id', accountIds);
            if (accounts) {
                for (const a of accounts) accountMap[a.account_id] = a;
            }
        }

        const enriched = data.map((t) => ({ ...t, account: accountMap[t.account_id] || null }));
        return NextResponse.json(enriched);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
