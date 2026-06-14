import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { error } = await supabase
            .from('plaid_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
