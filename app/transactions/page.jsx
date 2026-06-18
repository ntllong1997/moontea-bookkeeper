'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Search } from 'lucide-react';
import TransactionRow from '@/components/bookkeeper/TransactionRow';
import TransactionUploadModal from '@/components/bookkeeper/TransactionUploadModal';
import ModeToggle from '@/components/bookkeeper/ModeToggle';
import { useMode } from '@/components/bookkeeper/ModeProvider';
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
    const [uploadTarget, setUploadTarget] = useState(null);
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
    const { mode } = useMode();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ start: startDate, end: endDate, mode });
            if (filterCategory) params.set('category', filterCategory);
            if (filterMatch) params.set('matchStatus', filterMatch);
            if (search) params.set('merchant', search);
            const res = await fetch(`/api/bookkeeper/transactions?${params}`);
            const data = await res.json();
            setTransactions(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, filterCategory, filterMatch, search, mode]);

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
            prev.map((t) => t.id === id ? { ...t, custom_category: cat } : t)
        );
    };

    const handleNameChange = async (id, name) => {
        await fetch(`/api/bookkeeper/transactions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_name: name }),
        });
        setTransactions((prev) =>
            prev.map((t) => t.id === id ? { ...t, merchant_name: name } : t)
        );
    };

    const handlePersonalToggle = async (id, isPersonal) => {
        await fetch(`/api/bookkeeper/transactions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_personal: isPersonal }),
        });
        if (mode === 'business' && isPersonal) {
            setTransactions((prev) => prev.filter((t) => t.id !== id));
        } else {
            setTransactions((prev) =>
                prev.map((t) => t.id === id ? { ...t, is_personal: isPersonal } : t)
            );
        }
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
                    <ModeToggle />
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

                {/* Mobile card list — shown only below sm breakpoint */}
                <div className="sm:hidden rounded-2xl border bg-white shadow-sm divide-y divide-gray-100">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
                    ) : transactions.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-400">No transactions found.</p>
                    ) : transactions.map((tx) => {
                        const isIncoming = tx.amount < 0;
                        const amountColor = isIncoming ? 'text-blue-600' : 'text-red-600';
                        const amountDisplay = `${isIncoming ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}`;
                        return (
                            <div key={tx.id} className="flex items-center justify-between px-4 py-3 gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-gray-400">{tx.date}</p>
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {tx.merchant_name || '—'}
                                        {tx.is_recurring && (
                                            <span className="ml-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">recurring</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-sm font-semibold ${amountColor}`}>{amountDisplay}</span>
                                    {!tx.matched_receipt_id && (
                                        <button
                                            onClick={() => setUploadTarget(tx)}
                                            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            Upload
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handlePersonalToggle(tx.id, !tx.is_personal)}
                                        title={tx.is_personal ? 'Marked personal' : 'Mark as personal'}
                                        className={`rounded-lg border p-1.5 text-xs ${tx.is_personal ? 'border-purple-200 bg-purple-50 text-purple-600' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop table — hidden on mobile */}
                <div className="hidden sm:block rounded-2xl border bg-white shadow-sm overflow-x-auto">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
                    ) : transactions.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-400">No transactions found.</p>
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
                                        onNameChange={handleNameChange}
                                        onUploadReceipt={setUploadTarget}
                                        onPersonalToggle={handlePersonalToggle}
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

            {uploadTarget && (
                <TransactionUploadModal
                    transaction={uploadTarget}
                    onClose={() => setUploadTarget(null)}
                    onUploaded={() => { setUploadTarget(null); load(); }}
                />
            )}
        </main>
    );
}
