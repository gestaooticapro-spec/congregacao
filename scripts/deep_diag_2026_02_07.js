
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runDiagnosis() {
    console.log('--- STARTING DEEP DIAGNOSIS (PHASE 4: ROLES) ---');
    const targetMembroId = '0cd1047f-b5a2-4435-88fb-1139a4087bbe'; // From previous run

    try {
        console.log(`Checking roles for Membro ID: ${targetMembroId}`);

        const { data: perfis, error } = await supabase
            .from('membro_perfis')
            .select('*')
            .eq('membro_id', targetMembroId);

        if (error) {
            console.error('FAIL:', error);
        } else {
            console.log(`SUCCESS: Found ${perfis.length} roles.`);
            console.log(perfis);
            if (perfis.length === 0) {
                console.warn('WARNING: User has NO roles. This explains why they see only public menu.');
            }
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
    console.log('--- DIAGNOSIS PHASE 4 COMPLETE ---');
}

runDiagnosis();
