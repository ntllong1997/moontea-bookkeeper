import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaidClient';
import { createClient } from '@supabase/supabase-js';
import { autoMatchReceipts } from '@/lib/bookkeeperDb';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const targetItemId = body?.item_id || null;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase.from('plaid_items').select('*');
        if (targetItemId) query = query.eq('id', targetItemId);
        const { data: items, error: itemsError } = await query;
        if (itemsError) throw itemsError;

        let totalSynced = 0;

        for (const item of items || []) {
            let cursor = item.cursor || undefined;
            let hasMore = true;
            const added = [];
            const modified = [];
            const removed = [];

            while (hasMore) {
                const syncResp = await plaidClient.transactionsSync({
                    access_token: item.access_token,
                    cursor,
                });
                const { data } = syncResp;
                added.push(...data.added);
                modified.push(...data.modified);
                removed.push(...data.removed);
                cursor = data.next_cursor;
                hasMore = data.has_more;
            }

            const toUpsert = [...added, ...modified].map((t) => ({
                plaid_transaction_id: t.transaction_id,
                plaid_item_id: item.id,
                account_id: t.account_id,
                amount: t.amount,
                date: t.date,
                merchant_name: t.name || t.merchant_name,
                category: t.personal_finance_category
                    ? [t.personal_finance_category.primary, t.personal_finance_category.detailed].filter(Boolean)
                    : (t.category || []),
                pending: t.pending,
            }));

            if (toUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('bank_transactions')
                    .upsert(toUpsert, { onConflict: 'plaid_transaction_id' });
                if (upsertError) throw upsertError;
                totalSynced += toUpsert.length;
            }

            if (removed.length > 0) {
                const ids = removed.map((r) => r.transaction_id);
                await supabase
                    .from('bank_transactions')
                    .delete()
                    .in('plaid_transaction_id', ids);
            }

            // Update cursor
            await supabase
                .from('plaid_items')
                .update({ cursor })
                .eq('id', item.id);

            // Detect recurring
            await detectRecurring(supabase, item.id);
        }

        const matched = await autoMatchReceipts(supabase);

        return NextResponse.json({ synced: totalSynced, matched });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Sync failed.' },
            { status: 500 }
        );
    }
}

async function detectRecurring(supabase, plaidItemId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: txs } = await supabase
        .from('bank_transactions')
        .select('id, merchant_name, date, amount')
        .eq('plaid_item_id', plaidItemId)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .eq('pending', false)
        .order('date', { ascending: true });

    if (!txs) return;

    // Group by normalized merchant name
    const groups = {};
    for (const tx of txs) {
        const key = (tx.merchant_name || '').toLowerCase().trim();
        if (!key) continue;
        groups[key] = groups[key] || [];
        groups[key].push(tx);
    }

    const recurringIds = [];
    for (const [, group] of Object.entries(groups)) {
        if (group.length < 2) continue;
        // Check if any two transactions are ~7 or ~30 days apart
        for (let i = 1; i < group.length; i++) {
            const days = Math.abs(
                (new Date(group[i].date) - new Date(group[i - 1].date)) /
                    86400000
            );
            if ((days >= 6 && days <= 8) || (days >= 25 && days <= 35)) {
                recurringIds.push(...group.map((t) => t.id));
                break;
            }
        }
    }

    if (recurringIds.length > 0) {
        await supabase
            .from('bank_transactions')
            .update({ is_recurring: true })
            .in('id', [...new Set(recurringIds)]);
    }
}
