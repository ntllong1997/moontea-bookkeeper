'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/bookkeeper/StatCard';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function BookkeeperPage() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bookkeeper/summary');
            const data = await res.json();
            setSummary(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const fmt = (n) =>
        typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="rounded-xl p-2 hover:bg-gray-200 text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Bookkeeper
                        </h1>
                        <p className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                    <button
                        onClick={fetchSummary}
                        disabled={loading}
                        className="ml-auto rounded-xl border p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? 'animate-spin' : ''}
                        />
                    </button>
                </div>

                {/* P&L Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Revenue (Month)"
                        value={fmt(summary?.total_revenue_month)}
                        color="green"
                        icon="💰"
                    />
                    <StatCard
                        label="Expenses (Month)"
                        value={fmt(summary?.total_expenses_month)}
                        color="red"
                        icon="💳"
                    />
                    <StatCard
                        label="Net"
                        value={
                            summary
                                ? fmt(
                                      summary.total_revenue_month -
                                          summary.total_expenses_month
                                  )
                                : '—'
                        }
                        color={
                            summary &&
                            summary.total_revenue_month -
                                summary.total_expenses_month >=
                                0
                                ? 'green'
                                : 'red'
                        }
                        icon="📊"
                    />
                    <StatCard
                        label="Unmatched Receipts"
                        value={summary?.unmatched_receipts ?? '—'}
                        color={
                            summary?.unmatched_receipts > 0
                                ? 'yellow'
                                : 'gray'
                        }
                        icon="🧾"
                    />
                    <StatCard
                        label="Unmatched Transactions"
                        value={summary?.unmatched_transactions ?? '—'}
                        color={
                            summary?.unmatched_transactions > 0
                                ? 'yellow'
                                : 'gray'
                        }
                        icon="🏦"
                    />
                    <StatCard
                        label="Pending Transactions"
                        value={summary?.pending_transactions ?? '—'}
                        color="blue"
                        icon="⏳"
                    />
                </div>

                {/* Top Categories */}
                {summary?.top_categories?.length > 0 && (
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-700">
                            Top Expense Categories
                        </h2>
                        <ul className="space-y-3">
                            {summary.top_categories.map((cat) => {
                                const pct = summary.total_expenses_month
                                    ? (cat.total /
                                          summary.total_expenses_month) *
                                      100
                                    : 0;
                                return (
                                    <li key={cat.category}>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700">
                                                {cat.category}
                                            </span>
                                            <span className="font-medium">
                                                ${cat.total.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                                            <div
                                                className="h-1.5 rounded-full bg-blue-500"
                                                style={{
                                                    width: `${pct.toFixed(1)}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="grid gap-3">
                    <Link
                        href="/transactions"
                        className="flex items-center justify-between rounded-2xl bg-black px-6 py-5 text-white shadow-sm hover:opacity-80"
                    >
                        <span className="font-semibold">Bank Transactions</span>
                        <span>→</span>
                    </Link>
                    <Link
                        href="/receipts"
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 text-gray-800 shadow-sm hover:bg-gray-50"
                    >
                        <span className="font-semibold">Receipts</span>
                        <span>→</span>
                    </Link>
                    <Link
                        href="/accounts"
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 text-gray-800 shadow-sm hover:bg-gray-50"
                    >
                        <span className="font-semibold">Bank Accounts</span>
                        <span>→</span>
                    </Link>
                    <Link
                        href="/revenue"
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 text-gray-800 shadow-sm hover:bg-gray-50"
                    >
                        <span className="font-semibold">Revenue Entries</span>
                        <span>→</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
