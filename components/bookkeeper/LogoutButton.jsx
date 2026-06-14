'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            title="Sign out"
            className="rounded-xl border p-2 text-gray-500 hover:bg-gray-100"
        >
            <LogOut size={16} />
        </button>
    );
}
