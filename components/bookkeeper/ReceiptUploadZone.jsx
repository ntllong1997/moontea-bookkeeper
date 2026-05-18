'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function ReceiptUploadZone({ onUploaded }) {
    const [files, setFiles] = useState([]);

    const processFile = useCallback(
        async (file) => {
            const id = Math.random().toString(36).slice(2);
            setFiles((prev) => [
                { id, name: file.name, status: 'uploading' },
                ...prev,
            ]);

            try {
                const form = new FormData();
                form.append('file', file);

                const uploadRes = await fetch('/api/receipts/upload', {
                    method: 'POST',
                    body: form,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error);

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === id ? { ...f, status: 'processing' } : f
                    )
                );

                const processRes = await fetch('/api/receipts/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt_id: uploadData.receipt_id }),
                });
                const processData = await processRes.json();
                if (!processRes.ok) throw new Error(processData.error);

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === id ? { ...f, status: 'done' } : f
                    )
                );
                onUploaded?.();
            } catch (err) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === id
                            ? { ...f, status: 'error', error: err.message }
                            : f
                    )
                );
            }
        },
        [onUploaded]
    );

    const onDrop = useCallback(
        (accepted) => {
            accepted.forEach(processFile);
        },
        [processFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [], 'application/pdf': [] },
        maxSize: 10 * 1024 * 1024,
    });

    const statusIcon = (status) => {
        if (status === 'uploading' || status === 'processing')
            return <Loader size={16} className="animate-spin text-blue-500" />;
        if (status === 'done')
            return <CheckCircle size={16} className="text-green-500" />;
        return <XCircle size={16} className="text-red-500" />;
    };

    const statusLabel = {
        uploading: 'Uploading…',
        processing: 'Analyzing…',
        done: 'Done',
        error: 'Failed',
    };

    return (
        <div className="space-y-3">
            <div
                {...getRootProps()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                    isDragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                <p className="text-sm font-medium text-gray-700">
                    {isDragActive
                        ? 'Drop receipts here'
                        : 'Drag & drop receipts, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    JPG, PNG, PDF — up to 10 MB each
                </p>
            </div>

            {files.length > 0 && (
                <ul className="space-y-2">
                    {files.map((f) => (
                        <li
                            key={f.id}
                            className="flex items-center justify-between rounded-xl border bg-white px-4 py-2 text-sm"
                        >
                            <span className="truncate text-gray-700">
                                {f.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={`text-xs ${
                                        f.status === 'error'
                                            ? 'text-red-500'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    {f.status === 'error'
                                        ? f.error
                                        : statusLabel[f.status]}
                                </span>
                                {statusIcon(f.status)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
