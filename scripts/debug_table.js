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

async function debugTable() {
    console.log('Debugging designacoes_suporte...');

    // 1. Check if table exists and get columns
    const { data: columns, error: colError } = await supabase
        .from('designacoes_suporte')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('Error accessing table:', colError.message);
        return;
    }

    console.log('Table accessible. Columns found.');

    // 2. Check row count
    const { count, error: countError } = await supabase
        .from('designacoes_suporte')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting rows:', countError.message);
    } else {
        console.log('Total rows:', count);
    }

    // 3. Try to insert a dummy record to test permissions
    const testDate = '2099-01-01';
    console.log('Attempting insert...');
    const { data: insertData, error: insertError } = await supabase
        .from('designacoes_suporte')
        .insert({
            data: testDate,
            funcao: 'SOM',
            membro_id: null // Assuming nullable
        })
        .select();

    if (insertError) {
        console.error('Insert failed:', insertError.message);
    } else {
        console.log('Insert successful:', insertData);

        // Cleanup
        await supabase.from('designacoes_suporte').delete().eq('data', testDate);
    }
}

debugTable();
