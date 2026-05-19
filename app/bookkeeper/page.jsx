'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/bookkeeper/StatCard';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316',
];

function DonutChart({ categories, total }) {
    const r = 70;
    const cx = 90;
    const cy = 90;
    const circumference = 2 * Math.PI * r;

    let accumulated = 0;
    const segments = categories.map((cat, i) => {
        const pct = total > 0 ? cat.total / total : 0;
        const dashLen = pct * circumference;
        const gapLen = circumference - dashLen;
        const rotation = -90 + accumulated * 360;
        accumulated += pct;
        return { ...cat, pct, dashLen, gapLen, rotation, color: CHART_COLORS[i % CHART_COLORS.length] };
    });

    return (
        <svg viewBox="0 0 180 180" className="w-full max-w-40">
            {segments.map((seg) => (
                <circle
                    key={seg.category}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={28}
                    strokeDasharray={`${seg.dashLen} ${seg.gapLen}`}
                    strokeDashoffset={0}
                    transform={`rotate(${seg.rotation} ${cx} ${cy})`}
                />
            ))}
            {/* Center hole label */}
            <circle cx={cx} cy={cy} r={42} fill="white" />
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="500">
                Expenses
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="#111827" fontWeight="700">
                ${total.toFixed(0)}
            </text>
        </svg>
    );
}

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

    const fmt = (n) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

    const totalRevenue = summary
        ? (summary.revenue_entries_month || 0) +
          (summary.bank_online_sales_month || 0) +
          (summary.bank_deposits_month || 0)
        : 0;

    const netProfit = summary ? totalRevenue - (summary.total_expenses_month || 0) : null;

    const revenueSources = summary
        ? [
              { label: 'Online Sales', amount: summary.bank_online_sales_month || 0 },
              { label: 'Cash / Deposits', amount: summary.bank_deposits_month || 0 },
              { label: 'Revenue Entries', amount: summary.revenue_entries_month || 0 },
          ]
        : [];

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="rounded-xl p-2 hover:bg-gray-200 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bookkeeper</h1>
                        <p className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={fetchSummary}
                        disabled={loading}
                        className="ml-auto rounded-xl border p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* P&L Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Revenue (Month)"
                        value={summary ? fmt(totalRevenue) : '—'}
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
                        value={netProfit !== null ? fmt(netProfit) : '—'}
                        color={netProfit !== null && netProfit >= 0 ? 'green' : 'red'}
                        icon="📊"
                    />
                    <StatCard
                        label="Unmatched Receipts"
                        value={summary?.unmatched_receipts ?? '—'}
                        color={summary?.unmatched_receipts > 0 ? 'yellow' : 'gray'}
                        icon="🧾"
                    />
                    <StatCard
                        label="Unmatched Transactions"
                        value={summary?.unmatched_transactions ?? '—'}
                        color={summary?.unmatched_transactions > 0 ? 'yellow' : 'gray'}
                        icon="🏦"
                    />
                    <StatCard
                        label="Pending Transactions"
                        value={summary?.pending_transactions ?? '—'}
                        color="blue"
                        icon="⏳"
                    />
                </div>

                {/* Revenue Breakdown */}
                {summary && (
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-700">Revenue Breakdown</h2>
                        <ul className="space-y-3">
                            {revenueSources.map((src) => {
                                const pct = totalRevenue > 0 ? (src.amount / totalRevenue) * 100 : 0;
                                return (
                                    <li key={src.label}>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700">{src.label}</span>
                                            <span className="font-medium">
                                                {fmt(src.amount)}{' '}
                                                <span className="text-gray-400 font-normal">
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                                            <div
                                                className="h-1.5 rounded-full bg-green-500"
                                                style={{ width: `${pct.toFixed(1)}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Expense Categories Donut Chart */}
                {summary?.top_categories?.length > 0 && (
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-700">
                            Top Expense Categories
                        </h2>
                        <div className="flex items-center gap-6">
                            <DonutChart
                                categories={summary.top_categories}
                                total={summary.total_expenses_month || 0}
                            />
                            <ul className="flex-1 space-y-2">
                                {summary.top_categories.map((cat, i) => {
                                    const pct = summary.total_expenses_month
                                        ? (cat.total / summary.total_expenses_month) * 100
                                        : 0;
                                    return (
                                        <li key={cat.category} className="flex items-center gap-2 text-sm">
                                            <span
                                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                            />
                                            <span className="flex-1 truncate text-gray-700">
                                                {cat.category}
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {pct.toFixed(1)}%
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
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
