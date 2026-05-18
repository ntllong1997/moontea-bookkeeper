import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const updates = await request.json();
        const allowed = ['custom_category', 'notes'];
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([k]) => allowed.includes(k))
        );

        if (Object.keys(filtered).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { error } = await supabase
            .from('bank_transactions')
            .update(filtered)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Update failed.' },
            { status: 500 }
        );
    }
}
