import fs from 'fs';

async function inspectHtml() {
  const url = 'https://www.takaratomy.co.jp/products/tomica/lineup/regular/index.htm';
  try {
    const res = await fetch(url);
    const html = await res.text();
    fs.writeFileSync('site.html', html);
    console.log('Saved site.html');
  } catch (err) {
    console.error(err);
  }
}
inspectHtml();
