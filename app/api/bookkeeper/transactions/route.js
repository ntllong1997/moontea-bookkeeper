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

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase
            .from('bank_transactions')
            .select('*, plaid_items(institution_name)')
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (category) query = query.eq('custom_category', category);
        if (matchStatus === 'matched') query = query.not('matched_receipt_id', 'is', null);
        if (matchStatus === 'unmatched') query = query.is('matched_receipt_id', null);
        if (merchant) query = query.ilike('merchant_name', `%${merchant}%`);

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with account mask
        const accountIds = [...new Set((data || []).map((t) => t.account_id).filter(Boolean))];
        let accountMap = {};
        if (accountIds.length > 0) {
            const { data: accounts } = await supabase
                .from('plaid_accounts')
                .select('account_id, mask, name')
                .in('account_id', accountIds);
            for (const a of accounts || []) {
                accountMap[a.account_id] = { mask: a.mask, account_name: a.name };
            }
        }

        // Fetch receipt image URLs for matched transactions
        const receiptIds = [...new Set((data || []).map((t) => t.matched_receipt_id).filter(Boolean))];
        let receiptMap = {};
        if (receiptIds.length > 0) {
            const { data: receipts } = await supabase
                .from('receipts')
                .select('id, image_url')
                .in('id', receiptIds);
            for (const r of receipts || []) {
                receiptMap[r.id] = r.image_url;
            }
        }

        const enriched = (data || []).map((t) => ({
            ...t,
            institution_name: t.plaid_items?.institution_name || null,
            account_mask: accountMap[t.account_id]?.mask || null,
            account_name: accountMap[t.account_id]?.account_name || null,
            receipt_image_url: t.matched_receipt_id ? (receiptMap[t.matched_receipt_id] || null) : null,
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
