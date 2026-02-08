
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runVerification() {
    console.log('--- VERIFYING RLS FIX (Public Access) ---');

    try {
        console.log('Attempting to read "eventos" as ANONYMOUS user...');
        const { data: events, error } = await supabase
            .from('eventos')
            .select('*')
            .limit(1);

        if (error) {
            console.error('FAIL: Still cannot read events.', error);
            console.log('Did you run the SQL script in Supabase?');
        } else {
            console.log('SUCCESS: Read events as anonymous user!');
            console.log(`Read ${events.length} event(s).`);
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
    console.log('--- VERIFICATION COMPLETE ---');
}

runVerification();
