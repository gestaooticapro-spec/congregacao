const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl, supabaseKey;

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value.trim();
        }
    });
} catch (e) {
    console.error('Error reading .env.local:', e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    console.log('Checking buckets...');
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    const bucket = data.find(b => b.name === 'mapas-territorios');
    if (bucket) {
        console.log('Bucket "mapas-territorios" FOUND.');
        console.log('Public:', bucket.public);
    } else {
        console.log('Bucket "mapas-territorios" NOT FOUND.');
        console.log('Available buckets:', data.map(b => b.name));
    }
}

checkBucket();
