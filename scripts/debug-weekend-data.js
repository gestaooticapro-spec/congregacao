const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const dateStr = '2026-01-03';
    console.log(`Checking data for date: ${dateStr}`);

    // 1. Check Programacao Semanal
    const { data: schedule, error: scheduleError } = await supabase
        .from('programacao_semanal')
        .select(`
      id,
      data_reuniao,
      designacoes_suporte(
        funcao,
        membro_id
      )
    `)
        .eq('data_reuniao', dateStr);

    if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError);
    } else {
        console.log('Schedule Data:', JSON.stringify(schedule, null, 2));
    }

    // 2. Check Assignments directly if schedule found
    if (schedule && schedule.length > 0) {
        const scheduleId = schedule[0].id;
        const { data: assignments, error: assignError } = await supabase
            .from('designacoes_suporte')
            .select('*')
            .eq('programacao_id', scheduleId);

        if (assignError) {
            console.error('Error fetching assignments directly:', assignError);
        } else {
            console.log('Assignments Direct Check:', JSON.stringify(assignments, null, 2));
        }
    }
}

checkData();
