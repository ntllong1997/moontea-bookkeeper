'use client';
import { Eye, Link2, XCircle, FileText, User } from 'lucide-react';

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-gray-100 text-gray-500' },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-600' },
    processed: { label: 'Processed', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-600' },
};

const matchConfig = {
    unmatched: { label: 'Unmatched', color: 'bg-yellow-100 text-yellow-700' },
    auto_matched: {
        label: 'Auto-matched',
        color: 'bg-green-100 text-green-700',
    },
    manually_matched: {
        label: 'Matched',
        color: 'bg-green-100 text-green-700',
    },
    dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-400' },
};

export default function ReceiptRow({ receipt, onView, onMatch, onDismiss, onPersonalToggle }) {
    const ocr = statusConfig[receipt.ai_status] || statusConfig.pending;
    const match =
        matchConfig[receipt.match_status] || matchConfig.unmatched;

    return (
        <div className="flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm">
            {receipt.image_url && (
                <img
                    src={receipt.image_url}
                    alt="receipt"
                    className="h-14 w-14 rounded-xl object-cover"
                />
            )}
            <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-800">
                    {receipt.location || 'Unknown merchant'}
                </p>
                <p className="text-sm text-gray-500">
                    {receipt.total_amount != null
                        ? `$${Number(receipt.total_amount).toFixed(2)}`
                        : '—'}{' '}
                    ·{' '}
                    {receipt.receipt_datetime
                        ? new Date(
                              receipt.receipt_datetime
                          ).toLocaleDateString()
                        : 'No date'}
                </p>
                <div className="mt-1 flex gap-2">
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ocr.color}`}
                    >
                        {ocr.label}
                    </span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${match.color}`}
                    >
                        {match.label}
                    </span>
                    {receipt.ai_confidence != null && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {Math.round(receipt.ai_confidence * 100)}% confidence
                        </span>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 gap-2">
                <button
                    onClick={() => onView?.(receipt)}
                    className="rounded-xl border p-2 text-gray-500 hover:bg-gray-50"
                    title="View"
                >
                    <Eye size={16} />
                </button>
                {receipt.scan_pdf_url && (
                    <a
                        href={receipt.scan_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border p-2 text-gray-500 hover:bg-gray-50"
                        title="View scan (PDF)"
                    >
                        <FileText size={16} />
                    </a>
                )}
                <button
                    onClick={() => onPersonalToggle?.(receipt.id, !receipt.is_personal)}
                    title={receipt.is_personal ? 'Marked personal — click to mark business' : 'Mark as personal'}
                    className={`rounded-xl border p-2 ${
                        receipt.is_personal
                            ? 'border-purple-200 bg-purple-50 text-purple-600'
                            : 'text-gray-400 hover:bg-gray-50'
                    }`}
                >
                    <User size={16} />
                </button>
                {receipt.match_status === 'unmatched' &&
                    receipt.ai_status === 'processed' && (
                        <>
                            <button
                                onClick={() => onMatch?.(receipt)}
                                className="rounded-xl border border-blue-200 p-2 text-blue-500 hover:bg-blue-50"
                                title="Link to transaction"
                            >
                                <Link2 size={16} />
                            </button>
                            <button
                                onClick={() => onDismiss?.(receipt)}
                                className="rounded-xl border border-red-100 p-2 text-red-400 hover:bg-red-50"
                                title="Dismiss"
                            >
                                <XCircle size={16} />
                            </button>
                        </>
                    )}
            </div>
        </div>
    );
}
