import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

let _client;

export function getSupabaseClient() {
    if (!_client) {
        _client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
    }
    return _client;
}

// Named export for backwards compatibility in bookkeeperDb.js
export const supabase = new Proxy(
    {},
    {
        get(_, prop) {
            return getSupabaseClient()[prop];
        },
    }
);

export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}
