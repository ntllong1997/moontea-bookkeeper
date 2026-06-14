import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessOnly = searchParams.get('mode') !== 'all';

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];

        let txQuery = supabase
            .from('bank_transactions')
            .select('amount, custom_category')
            .gte('date', startOfMonth)
            .eq('pending', false);
        let unmatchedTxQuery = supabase
            .from('bank_transactions')
            .select('id', { count: 'exact', head: true })
            .is('matched_receipt_id', null)
            .eq('pending', false);
        let unmatchedRxQuery = supabase
            .from('receipts')
            .select('id', { count: 'exact', head: true })
            .eq('match_status', 'unmatched')
            .eq('ai_status', 'processed');
        let pendingQuery = supabase
            .from('bank_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('pending', true);
        let revenueQuery = supabase
            .from('revenue_entries')
            .select('amount')
            .gte('date', startOfMonth);

        if (businessOnly) {
            txQuery = txQuery.eq('is_personal', false);
            unmatchedTxQuery = unmatchedTxQuery.eq('is_personal', false);
            unmatchedRxQuery = unmatchedRxQuery.eq('is_personal', false);
            pendingQuery = pendingQuery.eq('is_personal', false);
            revenueQuery = revenueQuery.eq('is_personal', false);
        }

        const [txResult, unmatchedTxResult, unmatchedRxResult, pendingResult, revenueResult] =
            await Promise.all([txQuery, unmatchedTxQuery, unmatchedRxQuery, pendingQuery, revenueQuery]);

        const totalExpenses = (txResult.data || []).reduce(
            (sum, t) => sum + Math.abs(t.amount),
            0
        );

        const categoryBreakdown = {};
        for (const t of txResult.data || []) {
            const cat = t.custom_category || 'Uncategorized';
            categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount);
        }
        const topCategories = Object.entries(categoryBreakdown)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const totalRevenue = (revenueResult.data || []).reduce(
            (sum, r) => sum + r.amount,
            0
        );

        return NextResponse.json({
            total_expenses_month: totalExpenses,
            total_revenue_month: totalRevenue,
            unmatched_transactions: unmatchedTxResult.count || 0,
            unmatched_receipts: unmatchedRxResult.count || 0,
            pending_transactions: pendingResult.count || 0,
            top_categories: topCategories,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch summary.' },
            { status: 500 }
        );
    }
}
