'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader, CheckCircle } from 'lucide-react';

export default function TransactionUploadModal({ transaction, onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [merchant, setMerchant] = useState(transaction.merchant_name || '');
    const [amount, setAmount] = useState(Math.abs(transaction.amount).toFixed(2));
    const [date, setDate] = useState(transaction.date || '');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const onDrop = useCallback((accepted) => {
        if (accepted[0]) setFile(accepted[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/heic': ['.heic'],
            'image/heif': ['.heif'],
            'application/pdf': ['.pdf'],
        },
        maxSize: 10 * 1024 * 1024,
        maxFiles: 1,
    });

    const handleSubmit = async () => {
        if (!file) return;
        setStatus('uploading');
        setError('');

        try {
            const form = new FormData();
            form.append('file', file);
            if (merchant) form.append('location', merchant);
            if (amount) form.append('total_amount', amount);
            if (date) form.append('receipt_datetime', `${date}T00:00:00.000Z`);

            const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: form });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error);

            setStatus('linking');
            const matchRes = await fetch('/api/receipts/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receipt_id: uploadData.receipt_id,
                    transaction_id: transaction.id,
                    action: 'match',
                }),
            });
            if (!matchRes.ok) {
                const matchData = await matchRes.json();
                throw new Error(matchData.error);
            }

            setStatus('done');
            setTimeout(() => {
                onUploaded?.();
                onClose?.();
            }, 800);
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    };

    const isWorking = status === 'uploading' || status === 'linking';
    const isDone = status === 'done';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Upload Receipt</h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Transaction reference */}
                <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                    <p className="mb-1 text-xs text-gray-400">Linking to transaction</p>
                    <p className="font-medium text-gray-800">{transaction.merchant_name || '—'}</p>
                    <p className="text-gray-500">
                        ${Math.abs(transaction.amount).toFixed(2)} · {transaction.date}
                    </p>
                </div>

                {/* Pre-filled editable fields */}
                <div className="mb-4 space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500">Merchant</label>
                        <input
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500">Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>
                </div>

                {/* File drop zone */}
                <div
                    {...getRootProps()}
                    className={`mb-4 cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                        isDragActive
                            ? 'border-blue-400 bg-blue-50'
                            : file
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <p className="text-sm font-medium text-green-700">{file.name}</p>
                    ) : (
                        <>
                            <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                            <p className="text-sm text-gray-600">Drop receipt or click to browse</p>
                            <p className="mt-1 text-xs text-gray-400">JPG, PNG, PDF — up to 10 MB</p>
                        </>
                    )}
                </div>

                {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={!file || isWorking || isDone}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50"
                >
                    {status === 'uploading' && <><Loader size={16} className="animate-spin" /> Uploading…</>}
                    {status === 'linking' && <><Loader size={16} className="animate-spin" /> Linking…</>}
                    {status === 'done' && <><CheckCircle size={16} /> Done!</>}
                    {(status === 'idle' || status === 'error') && 'Upload & Link'}
                </button>
            </div>
        </div>
    );
}
