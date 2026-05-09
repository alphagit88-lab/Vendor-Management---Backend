const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    console.log('Backend Health:', data);
    
    const catRes = await fetch('http://localhost:5000/api/categories');
    console.log('Categories Status:', catRes.status);
    const catData = await catRes.json();
    console.log('Categories Data:', catData);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

test();
