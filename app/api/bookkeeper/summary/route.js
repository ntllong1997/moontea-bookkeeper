import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];

        const [txResult, unmatchedTxResult, unmatchedRxResult, pendingResult, revenueResult] =
            await Promise.all([
                supabase
                    .from('bank_transactions')
                    .select('amount, custom_category')
                    .gte('date', startOfMonth)
                    .eq('pending', false),
                supabase
                    .from('bank_transactions')
                    .select('id', { count: 'exact', head: true })
                    .is('matched_receipt_id', null)
                    .eq('pending', false),
                supabase
                    .from('receipts')
                    .select('id', { count: 'exact', head: true })
                    .eq('match_status', 'unmatched')
                    .eq('ai_status', 'processed'),
                supabase
                    .from('bank_transactions')
                    .select('id', { count: 'exact', head: true })
                    .eq('pending', true),
                supabase
                    .from('revenue_entries')
                    .select('amount')
                    .gte('date', startOfMonth),
            ]);

        // Exclude transfers/payments that would double-count credit card spending
        const EXCLUDE_FROM_EXPENSES = new Set([
            'Credit Card Payment', 'Deposit', 'Cash Deposit', 'Online Sales',
            'Owner Withdraw', 'Other/Review',
        ]);

        const expenseTxs = (txResult.data || []).filter(
            (t) => t.amount > 0 && !EXCLUDE_FROM_EXPENSES.has(t.custom_category)
        );

        const totalExpenses = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown = {};
        for (const t of expenseTxs) {
            const cat = t.custom_category || 'Uncategorized';
            categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + t.amount;
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
