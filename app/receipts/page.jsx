'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import ReceiptUploadZone from '@/components/bookkeeper/ReceiptUploadZone';
import ReceiptRow from '@/components/bookkeeper/ReceiptRow';
import MatchPanel from '@/components/bookkeeper/MatchPanel';
import ModeToggle from '@/components/bookkeeper/ModeToggle';
import { useMode } from '@/components/bookkeeper/ModeProvider';

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchTarget, setMatchTarget] = useState(null);
    const [viewTarget, setViewTarget] = useState(null);
    const { mode } = useMode();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/receipts?mode=${mode}`);
            const data = await res.json();
            setReceipts(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        load();
    }, [load]);

    const handleDismiss = async (receipt) => {
        await fetch('/api/receipts/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                receipt_id: receipt.id,
                action: 'dismiss',
            }),
        });
        load();
    };

    const handlePersonalToggle = async (id, isPersonal) => {
        await fetch(`/api/receipts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_personal: isPersonal }),
        });
        if (mode === 'business' && isPersonal) {
            setReceipts((prev) => prev.filter((r) => r.id !== id));
        } else {
            setReceipts((prev) =>
                prev.map((r) => r.id === id ? { ...r, is_personal: isPersonal } : r)
            );
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/bookkeeper" className="rounded-xl p-2 hover:bg-gray-200 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 flex-1">Receipts</h1>
                    <ModeToggle />
                </div>

                {/* Upload Zone */}
                <ReceiptUploadZone onUploaded={load} />

                {/* Receipt List */}
                <div className="space-y-3">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
                    ) : receipts.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                            No receipts yet. Upload one above.
                        </p>
                    ) : (
                        receipts.map((r) => (
                            <ReceiptRow
                                key={r.id}
                                receipt={r}
                                onView={setViewTarget}
                                onMatch={setMatchTarget}
                                onDismiss={handleDismiss}
                                onPersonalToggle={handlePersonalToggle}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Match Panel */}
            {matchTarget && (
                <MatchPanel
                    receipt={matchTarget}
                    onClose={() => setMatchTarget(null)}
                    onMatched={() => { setMatchTarget(null); load(); }}
                />
            )}

            {/* View Modal */}
            {viewTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setViewTarget(null)}
                >
                    <div
                        className="max-w-lg w-full rounded-3xl bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={viewTarget.image_url}
                            alt="receipt"
                            className="w-full rounded-2xl object-contain max-h-96"
                        />
                        <div className="mt-4 space-y-1 text-sm text-gray-700">
                            <p><strong>Merchant:</strong> {viewTarget.location || '—'}</p>
                            <p><strong>Total:</strong> ${Number(viewTarget.total_amount || 0).toFixed(2)}</p>
                            <p><strong>Date:</strong> {viewTarget.receipt_datetime ? new Date(viewTarget.receipt_datetime).toLocaleString() : '—'}</p>
                            <p><strong>Payment:</strong> {viewTarget.payment_method_type || '—'} {viewTarget.payment_method_last4 ? `····${viewTarget.payment_method_last4}` : ''}</p>
                            {viewTarget.scan_pdf_url && (
                                <p>
                                    <a
                                        href={viewTarget.scan_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        <FileText size={14} />
                                        View scanned PDF
                                    </a>
                                </p>
                            )}
                        </div>
                        {viewTarget.receipt_items?.length > 0 && (
                            <table className="mt-4 w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-400">
                                        <th>Item</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewTarget.receipt_items.map((item, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="py-1">{item.item_name}</td>
                                            <td className="py-1 text-right">{item.quantity}</td>
                                            <td className="py-1 text-right">${Number(item.line_total || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <button
                            onClick={() => setViewTarget(null)}
                            className="mt-5 w-full rounded-2xl bg-gray-100 py-2.5 text-sm font-medium hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
