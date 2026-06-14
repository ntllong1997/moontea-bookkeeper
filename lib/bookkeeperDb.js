import { supabase } from './supabase/client';

// ── Accounts ────────────────────────────────────────────────────────────────

export async function getConnectedAccounts() {
    const { data, error } = await supabase
        .from('plaid_items')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function deletePlaidItem(id) {
    const { error } = await supabase
        .from('plaid_items')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function getBankTransactions(filters = {}) {
    let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });

    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.category) query = query.eq('custom_category', filters.category);
    if (filters.matchStatus === 'matched') query = query.not('matched_receipt_id', 'is', null);
    if (filters.matchStatus === 'unmatched') query = query.is('matched_receipt_id', null);
    if (filters.merchant) query = query.ilike('merchant_name', `%${filters.merchant}%`);
    if (filters.mode === 'business') query = query.eq('is_personal', false);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function updateTransactionCategory(id, category) {
    const { error } = await supabase
        .from('bank_transactions')
        .update({ custom_category: category })
        .eq('id', id);
    if (error) throw error;
}

export async function updateTransactionNotes(id, notes) {
    const { error } = await supabase
        .from('bank_transactions')
        .update({ notes })
        .eq('id', id);
    if (error) throw error;
}

// ── Receipts ─────────────────────────────────────────────────────────────────

export async function getReceipts(filters = {}) {
    let query = supabase
        .from('receipts')
        .select('*, receipt_items(*)')
        .order('created_at', { ascending: false });

    if (filters.mode === 'business') query = query.eq('is_personal', false);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getUnmatchedReceipts() {
    const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('match_status', 'unmatched')
        .eq('ai_status', 'processed');
    if (error) throw error;
    return data;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getBookkeeperSummary(mode = 'business') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    const businessOnly = mode === 'business';

    let txQuery = supabase
        .from('bank_transactions')
        .select('amount, custom_category')
        .gte('date', startOfMonth)
        .eq('pending', false);
    let unmatchedTxQuery = supabase
        .from('bank_transactions')
        .select('id', { count: 'exact' })
        .is('matched_receipt_id', null)
        .eq('pending', false);
    let unmatchedRxQuery = supabase
        .from('receipts')
        .select('id', { count: 'exact' })
        .eq('match_status', 'unmatched')
        .eq('ai_status', 'processed');
    let pendingQuery = supabase
        .from('bank_transactions')
        .select('id', { count: 'exact' })
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

    return {
        total_expenses_month: totalExpenses,
        total_revenue_month: totalRevenue,
        unmatched_transactions: unmatchedTxResult.count || 0,
        unmatched_receipts: unmatchedRxResult.count || 0,
        pending_transactions: pendingResult.count || 0,
        top_categories: topCategories,
    };
}

// ── Matching ──────────────────────────────────────────────────────────────────

function normalizeText(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(llc|inc|the|store|shop|co|corp)\b/g, '')
        .trim();
}

function tokenSimilarity(a, b) {
    const setA = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
    const setB = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
}

function scoreMatch(receipt, tx) {
    let score = 0;

    // Amount (40 pts)
    const diff = Math.abs(
        Math.abs(receipt.total_amount) - Math.abs(tx.amount)
    );
    if (diff === 0) score += 40;
    else if (diff <= 0.01) score += 38;
    else if (diff <= 1.0) score += 25;
    else if (diff <= 5.0) score += 10;

    // Date proximity (35 pts)
    const rxDate = new Date(receipt.receipt_datetime || receipt.created_at);
    const txDate = new Date(tx.date);
    const daysDiff = Math.abs(
        (rxDate.setHours(0, 0, 0, 0) - txDate.setHours(0, 0, 0, 0)) /
            86400000
    );
    if (daysDiff === 0) score += 35;
    else if (daysDiff === 1) score += 30;
    else if (daysDiff === 2) score += 20;
    else if (daysDiff === 3) score += 10;
    else return 0; // outside 3-day window

    // Merchant name (25 pts)
    const sim = tokenSimilarity(receipt.location, tx.merchant_name);
    score += Math.floor(sim * 25);

    return score;
}

export async function autoMatchReceipts(supabaseClient) {
    const client = supabaseClient || supabase;

    const [rxResult, txResult] = await Promise.all([
        client
            .from('receipts')
            .select('*')
            .eq('match_status', 'unmatched')
            .eq('ai_status', 'processed'),
        client
            .from('bank_transactions')
            .select('*')
            .is('matched_receipt_id', null)
            .eq('pending', false),
    ]);

    const receipts = rxResult.data || [];
    const transactions = txResult.data || [];
    let matchCount = 0;

    for (const receipt of receipts) {
        let best = null;
        let bestScore = 0;

        for (const tx of transactions) {
            const score = scoreMatch(receipt, tx);
            if (score > bestScore) {
                bestScore = score;
                best = tx;
            }
        }

        if (best && bestScore >= 70) {
            const confidence = Math.min(bestScore / 100, 1);
            await Promise.all([
                client
                    .from('receipts')
                    .update({
                        matched_transaction_id: best.id,
                        match_status: 'auto_matched',
                        match_confidence: confidence,
                    })
                    .eq('id', receipt.id),
                client
                    .from('bank_transactions')
                    .update({ matched_receipt_id: receipt.id })
                    .eq('id', best.id),
            ]);
            matchCount++;
            // Remove matched tx from candidates for next receipt
            transactions.splice(transactions.indexOf(best), 1);
        }
    }

    return matchCount;
}

export async function manualMatch(supabaseClient, receiptId, transactionId) {
    const client = supabaseClient || supabase;

    // Clear old links
    const { data: oldReceipt } = await client
        .from('receipts')
        .select('matched_transaction_id')
        .eq('id', receiptId)
        .single();

    if (oldReceipt?.matched_transaction_id) {
        await client
            .from('bank_transactions')
            .update({ matched_receipt_id: null })
            .eq('id', oldReceipt.matched_transaction_id);
    }

    await Promise.all([
        client
            .from('receipts')
            .update({
                matched_transaction_id: transactionId,
                match_status: 'manually_matched',
                match_confidence: 1.0,
            })
            .eq('id', receiptId),
        client
            .from('bank_transactions')
            .update({ matched_receipt_id: receiptId })
            .eq('id', transactionId),
    ]);
}

export async function unmatchReceipt(supabaseClient, receiptId) {
    const client = supabaseClient || supabase;

    const { data: receipt } = await client
        .from('receipts')
        .select('matched_transaction_id')
        .eq('id', receiptId)
        .single();

    if (receipt?.matched_transaction_id) {
        await client
            .from('bank_transactions')
            .update({ matched_receipt_id: null })
            .eq('id', receipt.matched_transaction_id);
    }

    await client
        .from('receipts')
        .update({
            matched_transaction_id: null,
            match_status: 'unmatched',
            match_confidence: null,
        })
        .eq('id', receiptId);
}
