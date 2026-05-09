const http = require('http');

async function check(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      resolve(res.statusCode);
    }).on('error', (err) => resolve(err.message));
  });
}

async function test() {
  console.log('Health:', await check('/api/health'));
  console.log('Categories:', await check('/api/categories'));
  console.log('Test-Cat:', await check('/test-cat'));
}

test();
