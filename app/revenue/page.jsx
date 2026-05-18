'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

export default function RevenuePage() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        source: '',
    });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/revenue');
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/revenue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    amount: parseFloat(form.amount),
                }),
            });
            if (res.ok) {
                setForm({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    source: '',
                });
                load();
            }
        } finally {
            setSaving(false);
        }
    };

    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/bookkeeper" className="rounded-xl p-2 hover:bg-gray-200 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Revenue Entries</h1>
                </div>

                {/* Add Revenue Form */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border bg-white p-5 shadow-sm space-y-4"
                >
                    <h2 className="text-sm font-semibold text-gray-700">
                        Add Revenue Entry
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-gray-500">
                                Amount ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={form.amount}
                                onChange={(e) =>
                                    setForm({ ...form, amount: e.target.value })
                                }
                                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-gray-500">
                                Date
                            </label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) =>
                                    setForm({ ...form, date: e.target.value })
                                }
                                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">
                            Source
                        </label>
                        <input
                            type="text"
                            value={form.source}
                            onChange={(e) =>
                                setForm({ ...form, source: e.target.value })
                            }
                            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                            placeholder="e.g. Cash sales, Square POS, Venmo"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">
                            Description
                        </label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    description: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                            placeholder="Optional note"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50"
                    >
                        <Plus size={14} />
                        {saving ? 'Saving…' : 'Add Entry'}
                    </button>
                </form>

                {/* Summary */}
                {entries.length > 0 && (
                    <div className="rounded-2xl border bg-green-50 p-4 text-sm">
                        <span className="font-semibold text-green-800">
                            Total shown: ${total.toFixed(2)}
                        </span>
                        <span className="ml-2 text-green-600">
                            ({entries.length} entries)
                        </span>
                    </div>
                )}

                {/* Entries List */}
                <div className="space-y-2">
                    {loading ? (
                        <p className="py-6 text-center text-sm text-gray-400">
                            Loading…
                        </p>
                    ) : entries.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-400">
                            No revenue entries yet.
                        </p>
                    ) : (
                        entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {entry.source || 'Revenue'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {entry.date}
                                        {entry.description
                                            ? ` · ${entry.description}`
                                            : ''}
                                    </p>
                                </div>
                                <span className="font-semibold text-green-700">
                                    +${Number(entry.amount).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
