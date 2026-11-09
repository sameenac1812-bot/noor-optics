'use strict';
const SUPABASE_URL = 'https://czajxtgwsxbrrymrhauz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';

async function test() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/orders?select=*&source=eq.website&order=created_at.desc&limit=5', {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const data = await res.json();
  console.log('Website orders count in Supabase:', data.length);
  data.forEach((o, idx) => {
    console.log(`--- Order ${idx+1}: ${o.order_ref || o.order_number || o.id} ---`);
    console.log('created_at:', o.created_at);
    console.log('customer:', o.customer_name, o.customer_phone);
    console.log('prescription_pref:', o.prescription_pref);
    console.log('prescription_id:', o.prescription_id);
    console.log('prescription:', o.prescription);
    console.log('od_sph:', o.od_sph, 'os_sph:', o.os_sph);
    console.log('items count:', (o.items||[]).length);
    if ((o.items||[])[0]) {
      console.log('item[0] prescription:', o.items[0].prescription);
      console.log('item[0] rx:', o.items[0].rx);
    }
  });
}
test().catch(console.error);
