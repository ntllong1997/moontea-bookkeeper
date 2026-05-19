'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Link2, ArrowDownLeft, ArrowUpRight, Receipt, X } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

export default function TransactionRow({
    transaction,
    onCategoryChange,
    onLinkReceipt,
}) {
    const [editing, setEditing] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);

    // In Plaid: positive amount = money out (debit), negative = money in (credit/refund)
    const isMoneyIn = transaction.amount < 0;
    const displayAmount = Math.abs(transaction.amount).toFixed(2);

    const matchColor = transaction.matched_receipt_id
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500';
    const matchLabel = transaction.matched_receipt_id ? 'Matched' : 'Unmatched';

    const handleCategoryChange = async (e) => {
        const cat = e.target.value;
        setEditing(false);
        await onCategoryChange?.(transaction.id, cat);
    };

    const accountLabel = transaction.institution_name
        ? `${transaction.institution_name}${transaction.account_mask ? ` ••${transaction.account_mask}` : ''}`
        : transaction.account_mask
        ? `••${transaction.account_mask}`
        : null;

    return (
        <>
        {showReceipt && transaction.receipt_image_url && createPortal(
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                onClick={() => setShowReceipt(false)}
            >
                <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setShowReceipt(false)}
                        className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-1 shadow"
                    >
                        <X size={16} />
                    </button>
                    <img
                        src={transaction.receipt_image_url}
                        alt="receipt"
                        className="w-full rounded-2xl object-contain max-h-[80vh] shadow-xl"
                    />
                </div>
            </div>,
            document.body
        )}
        <tr className="border-b last:border-0 hover:bg-gray-50">
            <td className="py-3 pl-4 pr-2 text-sm text-gray-500 whitespace-nowrap">
                {transaction.date}
            </td>
            <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                    <div>
                        <p className="text-sm font-medium text-gray-800">
                            {transaction.raw_name || transaction.merchant_name || '—'}
                        </p>
                        {transaction.merchant_name && transaction.raw_name && transaction.raw_name !== transaction.merchant_name && (
                            <p className="text-xs text-gray-400 truncate max-w-48">
                                {transaction.merchant_name}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-3 px-2 text-right text-sm font-semibold whitespace-nowrap">
                <div className={`flex items-center justify-end gap-1 ${isMoneyIn ? 'text-green-600' : 'text-gray-800'}`}>
                    {isMoneyIn
                        ? <ArrowDownLeft size={14} className="shrink-0" />
                        : <ArrowUpRight size={14} className="shrink-0 text-gray-400" />
                    }
                    ${displayAmount}
                </div>
            </td>
            <td className="py-3 px-2">
                {accountLabel ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 whitespace-nowrap">
                        {accountLabel}
                    </span>
                ) : (
                    <span className="text-xs text-gray-300">—</span>
                )}
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
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchColor}`}>
                        {matchLabel}
                    </span>
                    {transaction.matched_receipt_id && transaction.receipt_image_url && (
                        <button
                            onClick={() => setShowReceipt(true)}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View receipt"
                        >
                            <Receipt size={14} />
                        </button>
                    )}
                </div>
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
        </>
    );
}
