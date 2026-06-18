'use client';
import { useState } from 'react';
import { Check, X, Upload, ExternalLink, User } from 'lucide-react';

export default function MobileTransactionCard({
    transaction,
    onNameChange,
    onUploadReceipt,
    onPersonalToggle,
}) {
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(transaction.merchant_name || '');

    const isIncoming = transaction.amount < 0;
    const amountColor = isIncoming ? 'text-blue-600' : 'text-red-600';
    const amountDisplay = `${isIncoming ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}`;
    const receiptImageUrl = transaction.receipts?.image_url;

    const commitName = async () => {
        setEditingName(false);
        if (nameVal !== transaction.merchant_name) {
            await onNameChange?.(transaction.id, nameVal);
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 gap-3">
            {/* Left: date + editable merchant */}
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">{transaction.date}</p>
                {editingName ? (
                    <div className="mt-0.5 flex items-center gap-1">
                        <input
                            autoFocus
                            value={nameVal}
                            onChange={(e) => setNameVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitName();
                                if (e.key === 'Escape') {
                                    setNameVal(transaction.merchant_name || '');
                                    setEditingName(false);
                                }
                            }}
                            className="w-36 rounded-lg border-2 border-blue-400 bg-white px-2 py-0.5 text-sm font-medium text-gray-900 outline-none"
                        />
                        <button onClick={commitName} className="text-green-600">
                            <Check size={14} />
                        </button>
                        <button
                            onClick={() => { setNameVal(transaction.merchant_name || ''); setEditingName(false); }}
                            className="text-gray-400"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditingName(true)}
                        className="mt-0.5 text-left text-sm font-medium text-gray-800"
                    >
                        {transaction.merchant_name || '—'}
                        {transaction.is_recurring && (
                            <span className="ml-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                                recurring
                            </span>
                        )}
                    </button>
                )}
                {transaction.account && (
                    <p className="mt-0.5 text-xs text-gray-400">
                        {transaction.account.name}
                        {transaction.account.mask ? ` ••••${transaction.account.mask}` : ''}
                    </p>
                )}
            </div>

            {/* Right: amount + actions */}
            <div className="flex shrink-0 items-center gap-2">
                <span className={`text-sm font-semibold ${amountColor}`}>{amountDisplay}</span>

                {/* Receipt actions — only for outgoing money */}
                {!isIncoming && (
                    transaction.matched_receipt_id && receiptImageUrl ? (
                        <a
                            href={receiptImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                        >
                            <ExternalLink size={12} />
                            Receipt
                        </a>
                    ) : !transaction.matched_receipt_id ? (
                        <button
                            onClick={() => onUploadReceipt?.(transaction)}
                            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        >
                            <Upload size={12} />
                            Upload
                        </button>
                    ) : null
                )}

                <button
                    onClick={() => onPersonalToggle?.(transaction.id, !transaction.is_personal)}
                    title={transaction.is_personal ? 'Marked personal — click to undo' : 'Mark as personal'}
                    className={`rounded-lg border p-1.5 ${
                        transaction.is_personal
                            ? 'border-purple-200 bg-purple-50 text-purple-600'
                            : 'text-gray-400 hover:bg-gray-50'
                    }`}
                >
                    <User size={12} />
                </button>
            </div>
        </div>
    );
}
