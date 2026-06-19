'use client';
import { useState } from 'react';
import { ChevronDown, Upload, ExternalLink, Pencil, Check, X, User } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

function shortAccount(account) {
    const source = account.institution_name || account.name || '';
    const words = source.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
    // If the name already starts with an acronym (e.g. "FNBO Direct"), use it as-is
    // rather than re-abbreviating every word down to its first letter.
    const firstWord = words[0] || '';
    const abbrev = /^[A-Z]{2,}$/.test(firstWord)
        ? firstWord.toLowerCase()
        : words.map((w) => w[0].toLowerCase()).join('');
    return account.mask ? `${abbrev}-${account.mask}` : abbrev;
}

const ACCOUNT_COLORS = [
    'text-blue-600 bg-blue-50',
    'text-green-600 bg-green-50',
    'text-purple-600 bg-purple-50',
    'text-orange-600 bg-orange-50',
    'text-pink-600 bg-pink-50',
    'text-teal-600 bg-teal-50',
    'text-amber-600 bg-amber-50',
    'text-indigo-600 bg-indigo-50',
];

function accountColor(account) {
    const key = account.institution_name || account.name || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return ACCOUNT_COLORS[Math.abs(hash) % ACCOUNT_COLORS.length];
}

export default function TransactionRow({
    transaction,
    onCategoryChange,
    onNameChange,
    onUploadReceipt,
    onPersonalToggle,
    animState,
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

    const animClass =
        animState === 'leaving' || animState === 'entering'
            ? 'opacity-0 scale-95'
            : 'opacity-100 scale-100';

    return (
        <tr className={`border-b last:border-0 hover:bg-gray-50 align-top transition-all duration-300 ${animClass}`}>
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
                            className="rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-sm font-medium text-gray-900 w-40 outline-none"
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
                        className="rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-gray-900 outline-none"
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
            <td className="py-3 px-2 whitespace-nowrap">
                {transaction.account ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accountColor(transaction.account)}`}>
                        {shortAccount(transaction.account)}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )}
            </td>
            <td className="py-3 pl-2 pr-4">
                <div className="flex items-center gap-1">
                    {!isIncoming && (
                        transaction.matched_receipt_id && transaction.receipts?.image_url ? (
                            <a
                                href={transaction.receipts.image_url}
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
