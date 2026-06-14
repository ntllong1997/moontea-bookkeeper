'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2, Building2 } from 'lucide-react';
import PlaidLinkButton from '@/components/bookkeeper/PlaidLinkButton';

export default function AccountsPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/plaid/accounts');
            const data = await res.json();
            setAccounts(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const syncAll = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/plaid/sync-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            alert(`Synced ${data.synced} transactions, matched ${data.matched} receipts.`);
        } finally {
            setSyncing(false);
        }
    };

    const syncOne = async (itemId) => {
        setSyncing(true);
        try {
            await fetch('/api/plaid/sync-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId }),
            });
        } finally {
            setSyncing(false);
        }
    };

    const remove = async (id) => {
        if (!confirm('Remove this bank connection? Imported transactions will remain.')) return;
        await fetch(`/api/plaid/accounts/${id}`, { method: 'DELETE' });
        load();
    };

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/bookkeeper" className="rounded-xl p-2 hover:bg-gray-200 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 flex-1">
                        Bank Accounts
                    </h1>
                    {accounts.length > 0 && (
                        <button
                            onClick={syncAll}
                            disabled={syncing}
                            className="flex items-center gap-1 rounded-xl border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={14}
                                className={syncing ? 'animate-spin' : ''}
                            />
                            Sync All
                        </button>
                    )}
                </div>

                {/* Connect Button */}
                <PlaidLinkButton onSuccess={load} />

                {/* Account List */}
                {loading ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                        Loading…
                    </p>
                ) : accounts.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center">
                        <Building2 className="mx-auto mb-3 text-gray-300" size={40} />
                        <p className="text-sm font-medium text-gray-500">
                            No bank accounts connected yet.
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Click "Connect Bank Account" to get started.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {accounts.map((acc) => (
                            <li
                                key={acc.id}
                                className="flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                                    🏦
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">
                                        {acc.institution_name || 'Bank'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Connected{' '}
                                        {new Date(
                                            acc.created_at
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => syncOne(acc.id)}
                                        disabled={syncing}
                                        className="rounded-xl border p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        title="Sync"
                                    >
                                        <RefreshCw
                                            size={16}
                                            className={
                                                syncing ? 'animate-spin' : ''
                                            }
                                        />
                                    </button>
                                    <button
                                        onClick={() => remove(acc.id)}
                                        className="rounded-xl border border-red-100 p-2 text-red-400 hover:bg-red-50"
                                        title="Remove"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}
