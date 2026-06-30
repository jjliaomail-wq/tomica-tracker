import fs from 'fs';
import * as cheerio from 'cheerio';

const baseURL = 'https://www.takaratomy.co.jp/products/tomica/lineup/regular/';
const pages = [
  'index.htm',
  '021-040.htm',
  '041-060.htm',
  '061-080.htm',
  '081-100.htm',
  '101-120.htm',
  '121-140.htm',
  '141-150.htm'
];

async function scrape() {
  const cars = [];
  
  for (const page of pages) {
    console.log(`Fetching ${page}...`);
    try {
      const res = await fetch(baseURL + page);
      const html = await res.text();
      const $ = cheerio.load(html);
      
      $('.lineup-box').each((i, el) => {
        const carNameText = $(el).find('.CarName').text().trim();
        if (!carNameText) return;
        
        // Extract No and Name
        // e.g. "No.1 日産 スカイライン GT-R(BNR34) パトロールカー"
        const match = carNameText.match(/No\.(\d+)\s+(.+)/);
        let serialNumber = '';
        let name = carNameText;
        if (match) {
          serialNumber = `No.${match[1]}`;
          name = match[2];
        } else {
          // Some might not match perfectly
          serialNumber = "No.?";
        }
        
        let imgSrc = $(el).find('.car-pic img').attr('src');
        if (imgSrc) {
          // Resolve relative URL
          imgSrc = new URL(imgSrc, baseURL + page).href;
        }

        cars.push({
          id: `car-${page}-${i}`,
          year: 2024, // The Takara Tomy site doesn't easily show year, let's just default to a random recent year for the tracker
          serialNumber,
          name,
          image: imgSrc || '/cars/default.png',
          currentPrice: Math.floor(Math.random() * 200) + 150, // mock price
        });
      });
    } catch (e) {
      console.error(`Failed to fetch ${page}:`, e);
    }
  }

  // Assign random mock data for price history and marketplaces
  const finalData = cars.map(car => {
    // Randomize year 2022-2026 for grouping
    car.year = [2022, 2023, 2024, 2025, 2026][Math.floor(Math.random() * 5)];
    
    // Price history
    let basePrice = car.currentPrice - 50;
    const priceHistory = [];
    for (let i = 0; i < 6; i++) {
      basePrice += Math.floor(Math.random() * 30) - 10;
      priceHistory.push({
        date: `2024-0${i+1}`,
        price: basePrice
      });
    }
    car.priceHistory = priceHistory;
    car.currentPrice = basePrice; // match last history

    const searchKeyword = encodeURIComponent("Tomica " + car.serialNumber + " " + car.name);
    
    car.marketplaces = [
      { id: 1, name: "蝦皮購物", seller: "TomicaKing", price: basePrice - 10, url: `https://shopee.tw/search?keyword=${searchKeyword}`, rating: 4.9 },
      { id: 2, name: "露天拍賣", seller: "CarCollector", price: basePrice, url: `https://www.ruten.com.tw/find/?q=${searchKeyword}`, rating: 4.8 },
      { id: 3, name: "Yahoo拍賣", seller: "ToyMaster", price: basePrice + 10, url: `https://tw.buy.yahoo.com/search/product?p=${searchKeyword}`, rating: 4.5 },
    ];
    return car;
  });

  const fileContent = `export const tomicaData = ${JSON.stringify(finalData, null, 2)};

export const getSortedData = () => {
  return [...tomicaData].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year; // Sort by year descending (newest first)
    }
    const numA = parseInt(a.serialNumber.replace(/\\D/g, '')) || 999;
    const numB = parseInt(b.serialNumber.replace(/\\D/g, '')) || 999;
    return numA - numB;
  });
};

export const getGroupedData = () => {
  const sorted = getSortedData();
  const grouped = sorted.reduce((acc, car) => {
    if (!acc[car.year]) {
      acc[car.year] = [];
    }
    acc[car.year].push(car);
    return acc;
  }, {});
  return grouped;
};
`;

  fs.writeFileSync('src/data.js', fileContent);
  console.log(`Scraped ${cars.length} cars successfully and wrote to src/data.js`);
}

scrape();
