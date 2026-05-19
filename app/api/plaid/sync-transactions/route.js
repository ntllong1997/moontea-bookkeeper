import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaidClient';
import { createClient } from '@supabase/supabase-js';
import { autoMatchReceipts } from '@/lib/bookkeeperDb';
import { categorizeTransaction } from '@/lib/categorize';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const targetItemId = body?.item_id || null;
        const startDate = body?.start_date || null;
        const endDate = body?.end_date || null;
        const useRange = !!(startDate && endDate);

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
            let allTransactions = [];

            if (useRange) {
                // Date-range fetch using transactionsGet (historical pull)
                let offset = 0;
                const count = 500;
                while (true) {
                    const resp = await plaidClient.transactionsGet({
                        access_token: item.access_token,
                        start_date: startDate,
                        end_date: endDate,
                        options: { count, offset },
                    });
                    allTransactions.push(...resp.data.transactions);
                    if (allTransactions.length >= resp.data.total_transactions) break;
                    offset += count;
                }
            } else {
                // Cursor-based incremental sync
                let cursor = item.cursor || undefined;
                let hasMore = true;
                const added = [], modified = [], removed = [];

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

                if (removed.length > 0) {
                    const ids = removed.map((r) => r.transaction_id);
                    await supabase.from('bank_transactions').delete().in('plaid_transaction_id', ids);
                }

                // Modified rows preserve user-edited categories
                const modifiedRows = modified.map((t) => ({
                    plaid_transaction_id: t.transaction_id,
                    plaid_item_id: item.id,
                    account_id: t.account_id,
                    amount: t.amount,
                    date: t.date,
                    raw_name: t.name,
                    merchant_name: t.merchant_name || t.name,
                    category: t.category || [],
                    pending: t.pending,
                }));
                if (modifiedRows.length > 0) {
                    const { error } = await supabase
                        .from('bank_transactions')
                        .upsert(modifiedRows, { onConflict: 'plaid_transaction_id' });
                    if (error) throw error;
                }

                await supabase.from('plaid_items').update({ cursor }).eq('id', item.id);
                allTransactions = added;
            }

            const baseRow = (t) => ({
                plaid_transaction_id: t.transaction_id,
                plaid_item_id: item.id,
                account_id: t.account_id,
                amount: t.amount,
                date: t.date,
                raw_name: t.name,
                merchant_name: t.merchant_name || t.name,
                category: t.category || [],
                pending: t.pending,
            });

            const newRows = allTransactions.map((t) => ({
                ...baseRow(t),
                custom_category: categorizeTransaction(t.merchant_name || t.name, t.amount),
            }));

            if (newRows.length > 0) {
                const { error } = await supabase
                    .from('bank_transactions')
                    .upsert(newRows, { onConflict: 'plaid_transaction_id', ignoreDuplicates: true });
                if (error) throw error;
                totalSynced += newRows.length;
            }

            // Upsert account details (mask/last4, name)
            const accountsResp = await plaidClient.accountsGet({ access_token: item.access_token });
            const accountRows = accountsResp.data.accounts.map((a) => ({
                account_id: a.account_id,
                plaid_item_id: item.id,
                name: a.name,
                mask: a.mask,
                type: a.type,
                subtype: a.subtype,
            }));
            if (accountRows.length > 0) {
                await supabase.from('plaid_accounts').upsert(accountRows, { onConflict: 'account_id' });
            }

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

