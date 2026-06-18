'use client';
import { useState } from 'react';
import { ChevronDown, Upload, Pencil, Check, X, User } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

export default function TransactionRow({
    transaction,
    onCategoryChange,
    onNameChange,
    onUploadReceipt,
    onPersonalToggle,
}) {
    const [editingCat, setEditingCat] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(transaction.merchant_name || '');

    const matchColor = transaction.matched_receipt_id
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500';
    const matchLabel = transaction.matched_receipt_id ? 'Matched' : 'Unmatched';

    // Plaid convention: positive = money out (expense), negative = money in (income)
    const isIncoming = transaction.amount < 0;
    const amountColor = isIncoming ? 'text-blue-600' : 'text-red-600';
    const amountDisplay = `${isIncoming ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}`;

    const commitName = async () => {
        setEditingName(false);
        if (nameVal !== transaction.merchant_name) {
            await onNameChange?.(transaction.id, nameVal);
        }
    };

    return (
        <tr className="border-b last:border-0 hover:bg-gray-50 align-top">
            <td className="py-3 pl-4 pr-2 text-sm text-gray-500 whitespace-nowrap">
                {transaction.date}
            </td>
            <td className="py-3 px-2 min-w-[180px]">
                {/* Editable merchant name */}
                {editingName ? (
                    <div className="flex items-center gap-1">
                        <input
                            autoFocus
                            value={nameVal}
                            onChange={(e) => setNameVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameVal(transaction.merchant_name || ''); setEditingName(false); } }}
                            className="rounded-lg border px-2 py-1 text-sm w-40 outline-none focus:border-blue-400"
                        />
                        <button onClick={commitName} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
                        <button onClick={() => { setNameVal(transaction.merchant_name || ''); setEditingName(false); }} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 group">
                        <span className="text-sm font-medium text-gray-800">
                            {transaction.merchant_name || '—'}
                        </span>
                        {transaction.is_recurring && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">recurring</span>
                        )}
                        <button
                            onClick={() => setEditingName(true)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
                            title="Edit name"
                        >
                            <Pencil size={12} />
                        </button>
                    </div>
                )}

            </td>
            <td className={`py-3 px-2 text-right text-sm font-semibold whitespace-nowrap ${amountColor}`}>
                {amountDisplay}
            </td>
            <td className="py-3 px-2">
                {editingCat ? (
                    <select
                        autoFocus
                        className="rounded-lg border px-2 py-1 text-xs"
                        defaultValue={transaction.custom_category || ''}
                        onChange={(e) => { setEditingCat(false); onCategoryChange?.(transaction.id, e.target.value); }}
                        onBlur={() => setEditingCat(false)}
                    >
                        <option value="">— Category —</option>
                        {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                ) : (
                    <button
                        onClick={() => setEditingCat(true)}
                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    >
                        {transaction.custom_category || 'Categorize'}
                        <ChevronDown size={12} />
                    </button>
                )}
            </td>
            <td className="py-3 px-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchColor}`}>
                    {matchLabel}
                </span>
            </td>
            <td className="py-3 pl-2 pr-4">
                <div className="flex items-center gap-1">
                    {!transaction.matched_receipt_id && (
                        <button
                            onClick={() => onUploadReceipt?.(transaction)}
                            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        >
                            <Upload size={12} />
                            Upload
                        </button>
                    )}
                    <button
                        onClick={() => onPersonalToggle?.(transaction.id, !transaction.is_personal)}
                        title={transaction.is_personal ? 'Marked personal — click to mark business' : 'Mark as personal'}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                            transaction.is_personal
                                ? 'border-purple-200 bg-purple-50 text-purple-600'
                                : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                        <User size={12} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
