'use client';
import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Plus, Loader } from 'lucide-react';

export default function PlaidLinkButton({ onSuccess }) {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    const { open, ready } = usePlaidLink({
        token,
        onSuccess: async (publicToken, metadata) => {
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
        },
        onExit: () => setToken(null),
    });

    const handleClick = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/plaid/create-link-token', {
                method: 'POST',
            });
            const data = await res.json();
            setToken(data.link_token);
        } finally {
            setLoading(false);
        }
    }, []);

    // Once token is set, open Plaid Link
    const handleOpen = useCallback(() => {
        if (token && ready) open();
    }, [token, ready, open]);

    return (
        <button
            onClick={token ? handleOpen : handleClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-80 disabled:opacity-50"
        >
            {loading ? (
                <Loader size={16} className="animate-spin" />
            ) : (
                <Plus size={16} />
            )}
            Connect Bank Account
        </button>
    );
}
