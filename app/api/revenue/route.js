import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const mode = searchParams.get('mode');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let query = supabase
            .from('revenue_entries')
            .select('*')
            .order('date', { ascending: false });
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (mode === 'business') query = query.eq('is_personal', false);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, date, description, source, is_personal } = body;

        if (!amount || !date) {
            return NextResponse.json(
                { error: 'Missing amount or date.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase
            .from('revenue_entries')
            .insert({ amount, date, description, source, is_personal: !!is_personal })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
