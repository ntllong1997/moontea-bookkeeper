'use client';
import { useState } from 'react';
import { ChevronDown, RefreshCw, Link2 } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

export default function TransactionRow({
    transaction,
    onCategoryChange,
    onLinkReceipt,
}) {
    const [editing, setEditing] = useState(false);

    const matchColor = transaction.matched_receipt_id
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500';
    const matchLabel = transaction.matched_receipt_id ? 'Matched' : 'Unmatched';

    const handleCategoryChange = async (e) => {
        const cat = e.target.value;
        setEditing(false);
        await onCategoryChange?.(transaction.id, cat);
    };

    return (
        <tr className="border-b last:border-0 hover:bg-gray-50">
            <td className="py-3 pl-4 pr-2 text-sm text-gray-500">
                {transaction.date}
            </td>
            <td className="py-3 px-2 text-sm font-medium text-gray-800">
                <div className="flex items-center gap-2">
                    {transaction.merchant_name || '—'}
                    {transaction.is_recurring && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                            recurring
                        </span>
                    )}
                </div>
            </td>
            <td className="py-3 px-2 text-right text-sm font-semibold text-gray-800">
                ${Math.abs(transaction.amount).toFixed(2)}
            </td>
            <td className="py-3 px-2">
                {editing ? (
                    <select
                        autoFocus
                        className="rounded-lg border px-2 py-1 text-xs"
                        defaultValue={transaction.custom_category || ''}
                        onChange={handleCategoryChange}
                        onBlur={() => setEditing(false)}
                    >
                        <option value="">— Category —</option>
                        {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    >
                        {transaction.custom_category || 'Categorize'}
                        <ChevronDown size={12} />
                    </button>
                )}
            </td>
            <td className="py-3 px-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchColor}`}
                >
                    {matchLabel}
                </span>
            </td>
            <td className="py-3 pl-2 pr-4">
                {!transaction.matched_receipt_id && (
                    <button
                        onClick={() => onLinkReceipt?.(transaction)}
                        className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                        <Link2 size={12} />
                        Link
                    </button>
                )}
            </td>
        </tr>
    );
}
