const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function test() {
  try {
    const health = await get('http://localhost:5000/api/health');
    console.log('Backend Health Status:', health.status);
    console.log('Backend Health Body:', health.data);
    
    const cat = await get('http://localhost:5000/api/categories');
    console.log('Categories Status:', cat.status);
    console.log('Categories Body:', cat.data);
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
