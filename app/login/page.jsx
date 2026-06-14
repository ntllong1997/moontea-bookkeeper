'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        router.push(searchParams.get('next') || '/');
        router.refresh();
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
            >
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Moon Tea Bookkeeper</h1>
                    <p className="text-sm text-gray-500">Sign in to continue</p>
                </div>

                {error && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div>
                    <label className="mb-1 block text-xs text-gray-500">Email</label>
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-xs text-gray-500">Password</label>
                    <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50"
                >
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
