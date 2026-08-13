const SUPABASE_URL = 'https://bjcigdhyiruqhrxysqmy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J_4svbtRHdQf89tUWa873g_GKiASymL';

async function run() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sns_metrics?select=*&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await res.json();
    data.forEach((row, i) => {
      console.log(`\n--- Row ${i} (ID: ${row.id}) ---`);
      console.log(JSON.stringify(row, null, 2));
    });
  } catch (err) {
    console.error(err);
  }
}

run();
