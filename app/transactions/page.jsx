'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Search } from 'lucide-react';
import TransactionRow from '@/components/bookkeeper/TransactionRow';
import MatchPanel from '@/components/bookkeeper/MatchPanel';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

function exportToCsv(transactions) {
    const headers = [
        'Date',
        'Merchant',
        'Amount',
        'Category',
        'Recurring',
        'Match Status',
        'Receipt ID',
    ];
    const rows = transactions.map((t) => [
        t.date,
        t.merchant_name || '',
        Math.abs(t.amount).toFixed(2),
        t.custom_category || t.category?.[0] || '',
        t.is_recurring ? 'Yes' : 'No',
        t.matched_receipt_id ? 'Matched' : 'Unmatched',
        t.matched_receipt_id || '',
    ]);
    const csv = [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchTarget, setMatchTarget] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMatch, setFilterMatch] = useState('');

    const now = new Date();
    const [startDate, setStartDate] = useState(
        new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0]
    );
    const [endDate, setEndDate] = useState(
        now.toISOString().split('T')[0]
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ start: startDate, end: endDate });
            if (filterCategory) params.set('category', filterCategory);
            if (filterMatch) params.set('matchStatus', filterMatch);
            if (search) params.set('merchant', search);
            const res = await fetch(`/api/bookkeeper/transactions?${params}`);
            const data = await res.json();
            setTransactions(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, filterCategory, filterMatch, search]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCategoryChange = async (id, cat) => {
        await fetch(`/api/bookkeeper/transactions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custom_category: cat }),
        });
        setTransactions((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, custom_category: cat } : t
            )
        );
    };

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-5xl p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/bookkeeper" className="rounded-xl p-2 hover:bg-gray-200 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 flex-1">
                        Bank Transactions
                    </h1>
                    <button
                        onClick={() => exportToCsv(transactions)}
                        className="flex items-center gap-1 rounded-xl border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1 rounded-xl border bg-white px-3 py-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                            className="text-sm outline-none w-36"
                            placeholder="Search merchant…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm"
                    />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm"
                    >
                        <option value="">All Categories</option>
                        {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={filterMatch}
                        onChange={(e) => setFilterMatch(e.target.value)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm"
                    >
                        <option value="">All</option>
                        <option value="matched">Matched</option>
                        <option value="unmatched">Unmatched</option>
                    </select>
                </div>

                {/* Table */}
                <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-gray-400">
                            Loading…
                        </p>
                    ) : transactions.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-400">
                            No transactions found.
                        </p>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    <th className="py-3 pl-4 pr-2">Date</th>
                                    <th className="py-3 px-2">Merchant</th>
                                    <th className="py-3 px-2 text-right">Amount</th>
                                    <th className="py-3 px-2">Category</th>
                                    <th className="py-3 px-2">Status</th>
                                    <th className="py-3 pl-2 pr-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <TransactionRow
                                        key={tx.id}
                                        transaction={tx}
                                        onCategoryChange={handleCategoryChange}
                                        onLinkReceipt={setMatchTarget}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <p className="text-xs text-gray-400 text-right">
                    {transactions.length} transactions
                </p>
            </div>

            {matchTarget && (
                <MatchPanel
                    receipt={null}
                    transaction={matchTarget}
                    onClose={() => setMatchTarget(null)}
                    onMatched={() => { setMatchTarget(null); load(); }}
                />
            )}
        </main>
    );
}
