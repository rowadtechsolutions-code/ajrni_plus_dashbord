import axios from 'axios';

const url = 'https://slglklsyrbgcsdgruunk.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZ2xrbHN5cmJnY3NkZ3J1dW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzM2MjcsImV4cCI6MjA5NjkwOTYyN30.Q96l5nkezgZrrawdfU2QR_wQ3iKeRH-Ue6_ctYV9YwE';

async function main() {
  // Get full UUIDs of offices with null CRN
  const r1 = await axios.get(url + '/Offices', { 
    params: { select: 'id,office_name', 'commercial_registration_number': 'is.null' },
    headers: { apikey: key }
  });
  console.log('=== Offices with CRN=null (full IDs) ===');
  r1.data.forEach(o => console.log(o.id + ' | ' + o.office_name));

  if (r1.data.length > 0) {
    const allIds = r1.data.map(o => o.id);
    console.log('\nAll null-CRN IDs:', allIds);
    
    // Test not.in with actual IDs
    const idFilter = 'not.in.(' + allIds.join(',') + ')';
    const r2 = await axios.get(url + '/Offices', {
      params: { select: 'id', limit: '1', id: idFilter },
      headers: { apikey: key, Prefer: 'count=exact' }
    });
    console.log('\nFilter:', idFilter);
    console.log('Offices excl ' + allIds.length + ' IDs:', r2.headers['content-range']);

    // Also test with single ID
    const singleFilter = 'not.in.(' + allIds[0] + ')';
    const r3 = await axios.get(url + '/Offices', {
      params: { select: 'id', limit: '1', id: singleFilter },
      headers: { apikey: key, Prefer: 'count=exact' }
    });
    console.log('Offices excl 1 ID (' + allIds[0].slice(0,8) + '...):', r3.headers['content-range']);
  }

  // Check the "فرع جديد" office fully
  const r4 = await axios.get(url + '/Offices', {
    params: { select: 'id,office_name,email,country,city,is_active,commercial_registration_number,bio,image,cover', id: 'eq.6914f1dc-0c1b-4f58-8577-baf8ac533d74' },
    headers: { apikey: key }
  });
  console.log('\n=== Full data for فرع جديد ===');
  if (r4.data.length > 0) console.log(JSON.stringify(r4.data[0], null, 2));
  else console.log('Office not found with that partial UUID');
}

main().catch(e => console.error('Error:', e.message, e.response?.data || ''));
