import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaidClient';
import { CountryCode, Products } from 'plaid';

export async function POST() {
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: 'moontea-owner' },
            client_name: 'Moon Tea Bookkeeper',
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: 'en',
        });
        return NextResponse.json({ link_token: response.data.link_token });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || 'Failed to create link token.' },
            { status: 500 }
        );
    }
}
