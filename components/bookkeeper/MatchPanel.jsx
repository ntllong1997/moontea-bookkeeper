'use client';
import { useState, useEffect } from 'react';
import { X, Link2 } from 'lucide-react';

function scoreCandidate(receipt, tx) {
    let score = 0;

    // Amount (50 pts) — highest priority
    const diff = Math.abs(Math.abs(receipt.total_amount) - Math.abs(tx.amount));
    if (diff === 0) score += 50;
    else if (diff <= 0.01) score += 48;
    else if (diff <= 1.0) score += 35;
    else if (diff <= 5.0) score += 15;

    // Date proximity (30 pts)
    if (receipt.receipt_datetime) {
        const rxDate = new Date(receipt.receipt_datetime);
        const txDate = new Date(tx.date);
        const days = Math.abs((rxDate.setHours(0,0,0,0) - txDate.setHours(0,0,0,0)) / 86400000);
        if (days === 0) score += 30;
        else if (days <= 1) score += 25;
        else if (days <= 3) score += 15;
        else if (days <= 7) score += 5;
    }

    // Vendor name similarity (20 pts)
    const normalize = (s) =>
        (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\b(llc|inc|the|store|shop|co|corp)\b/g, '').trim();
    const aWords = new Set(normalize(receipt.location).split(/\s+/).filter(Boolean));
    const bWords = new Set(normalize(tx.merchant_name).split(/\s+/).filter(Boolean));
    if (aWords.size > 0 && bWords.size > 0) {
        const intersection = [...aWords].filter((w) => bWords.has(w)).length;
        const union = new Set([...aWords, ...bWords]).size;
        score += Math.floor((intersection / union) * 20);
    }

    return score;
}

export default function MatchPanel({ receipt, onClose, onMatched }) {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!receipt) return;
        setLoading(true);

        // Fetch all unmatched transactions — score/sort client-side
        fetch('/api/bookkeeper/transactions?matchStatus=unmatched')
            .then((r) => r.json())
            .then((data) => {
                const txs = Array.isArray(data) ? data : [];
                const scored = txs
                    .map((tx) => ({ tx, score: scoreCandidate(receipt, tx) }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 15);
                setCandidates(scored);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [receipt]);

    const handleMatch = async (tx) => {
        await fetch('/api/receipts/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt_id: receipt.id, transaction_id: tx.id, action: 'match' }),
        });
        onMatched?.();
        onClose?.();
    };

    if (!receipt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
            <div className="flex w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
                style={{ maxHeight: '85vh' }}>
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between p-6 pb-3">
                    <h2 className="text-lg font-bold">Link Receipt to Transaction</h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Receipt summary */}
                <div className="mx-6 mb-3 shrink-0 rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{receipt.location || 'Unknown'}</p>
                    <p className="text-gray-500">
                        ${Number(receipt.total_amount || 0).toFixed(2)} ·{' '}
                        {receipt.receipt_datetime
                            ? receipt.receipt_datetime.slice(0, 10)
                            : '—'}
                    </p>
                </div>

                {/* Scrollable list */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
                    ) : candidates.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                            No unmatched transactions found.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {candidates.map(({ tx, score }) => (
                                <li
                                    key={tx.id}
                                    className="flex items-center justify-between rounded-xl border bg-white p-3"
                                >
                                    <div className="min-w-0 flex-1 pr-3">
                                        <p className="truncate text-sm font-medium">
                                            {tx.merchant_name || '—'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {tx.date} · ${Math.abs(tx.amount).toFixed(2)}
                                            {tx.institution_name && (
                                                <span className="ml-1 text-gray-400">
                                                    · {tx.institution_name}{tx.account_mask ? ` ••${tx.account_mask}` : ''}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className={`text-xs font-medium ${score >= 50 ? 'text-green-600' : score >= 25 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                            {score}% match
                                        </span>
                                        <button
                                            onClick={() => handleMatch(tx)}
                                            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                        >
                                            <Link2 size={12} />
                                            Link
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
