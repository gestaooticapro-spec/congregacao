const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl, supabaseKey;

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value.trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = value.trim();
        }
    });
} catch (e) {
    console.error('Error reading .env.local:', e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHistoryTable() {
    console.log('Checking for historico_designacoes table...');

    const { data, error } = await supabase
        .from('historico_designacoes')
        .select('id')
        .limit(1);

    if (error) {
        console.error('Error accessing table:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('Table historico_designacoes does NOT exist.');
        }
    } else {
        console.log('Table historico_designacoes exists!');
    }
}

checkHistoryTable();
