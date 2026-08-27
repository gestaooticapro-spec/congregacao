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

async function checkSchema() {
    console.log('Checking schema for designacoes_suporte...');

    // Try to select the new columns
    const { data, error } = await supabase
        .from('designacoes_suporte')
        .select('data, funcao')
        .limit(1);

    if (error) {
        console.error('Error selecting columns:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('Migration 009 likely NOT applied.');
        }
    } else {
        console.log('Columns exist! Migration 009 likely applied.');
    }
}

checkSchema();
