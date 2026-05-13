import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .limit(1);
    
  if (data && data.length > 0) {
    const firstId = data[0].id;
    const prefix = firstId.substring(0, 8);
    
    // Try ilike
    const { data: d2, error: e2 } = await supabase
        .from('enrollments')
        .select('id')
        .ilike('id', `${prefix}%`)
    console.log("ilike result:", { data: d2, error: e2 });
  }
}
test();
