'use client';
import { useState, useEffect } from 'react';
import { X, Link2 } from 'lucide-react';

export default function MatchPanel({ receipt, onClose, onMatched }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!receipt) return;
        setLoading(true);

        // Fetch unmatched transactions near the receipt date
        const params = new URLSearchParams();
        if (receipt.receipt_datetime) {
            const d = new Date(receipt.receipt_datetime);
            const before = new Date(d);
            before.setDate(before.getDate() - 4);
            const after = new Date(d);
            after.setDate(after.getDate() + 4);
            params.set('start', before.toISOString().split('T')[0]);
            params.set('end', after.toISOString().split('T')[0]);
        }
        params.set('matchStatus', 'unmatched');

        fetch(`/api/bookkeeper/transactions?${params}`)
            .then((r) => r.json())
            .then((data) => {
                setTransactions(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [receipt]);

    const handleMatch = async (tx) => {
        await fetch('/api/receipts/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                receipt_id: receipt.id,
                transaction_id: tx.id,
                action: 'match',
            }),
        });
        onMatched?.();
        onClose?.();
    };

    if (!receipt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
            <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">
                        Link Receipt to Transaction
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{receipt.location || 'Unknown'}</p>
                    <p className="text-gray-500">
                        ${Number(receipt.total_amount || 0).toFixed(2)} ·{' '}
                        {receipt.receipt_datetime
                            ? new Date(
                                  receipt.receipt_datetime
                              ).toLocaleDateString()
                            : '—'}
                    </p>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                        Loading transactions…
                    </p>
                ) : transactions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                        No nearby unmatched transactions found.
                    </p>
                ) : (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                        {transactions.map((tx) => (
                            <li
                                key={tx.id}
                                className="flex items-center justify-between rounded-xl border bg-white p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {tx.merchant_name || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {tx.date} · $
                                        {Math.abs(tx.amount).toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleMatch(tx)}
                                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                    <Link2 size={12} />
                                    Link
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
