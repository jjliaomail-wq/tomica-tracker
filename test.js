import fs from 'fs';
async function run() {
  const r = await fetch('https://www.takaratomy.co.jp/products/tomica/new/2301.htm');
  const t = await r.text();
  fs.writeFileSync('test.html', t);
}
run();
