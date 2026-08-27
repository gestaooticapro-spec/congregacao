import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const query = `
    GRANT SELECT ON public.escala_limpeza TO anon;
    CREATE POLICY "Enable read access for anon users" ON public.escala_limpeza FOR SELECT TO anon USING (true);
  `;
  // We can't run raw query easily without postgres connection if we just have supabase client unless there's an rpc.
  // Wait, Supabase js client doesn't execute arbitrary SQL without an RPC. 
}

run();
