'use client';
import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Plus, Loader } from 'lucide-react';

function PlaidLinkOpener({ token, onSuccess, onExit }) {
    const { open, ready } = usePlaidLink({ token, onSuccess, onExit });
    useEffect(() => {
        if (ready) open();
    }, [ready, open]);
    return null;
}

export default function PlaidLinkButton({ onSuccess }) {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSuccess = useCallback(async (publicToken, metadata) => {
        setLoading(true);
        try {
            const res = await fetch('/api/plaid/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_token: publicToken,
                    institution_id: metadata.institution?.institution_id,
                    institution_name: metadata.institution?.name,
                }),
            });
            if (res.ok) {
                onSuccess?.();
            }
        } finally {
            setLoading(false);
            setToken(null);
        }
    }, [onSuccess]);

    const handleExit = useCallback(() => setToken(null), []);

    const handleClick = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/plaid/create-link-token', { method: 'POST' });
            const data = await res.json();
            setToken(data.link_token);
        } catch {
            setLoading(false);
        }
    }, []);

    return (
        <>
            {token && (
                <PlaidLinkOpener token={token} onSuccess={handleSuccess} onExit={handleExit} />
            )}
            <button
                onClick={handleClick}
                disabled={loading || !!token}
                className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-80 disabled:opacity-50"
            >
                {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                Connect Bank Account
            </button>
        </>
    );
}
