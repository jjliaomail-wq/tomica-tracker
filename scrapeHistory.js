import fs from 'fs';
import * as cheerio from 'cheerio';

async function scrapeHistory() {
  const cars = [];
  const years = [];
  for (let y = 16; y <= 26; y++) {
    years.push(y);
  }
  
  const fetchTasks = [];
  
  for (const y of years) {
    for (let m = 1; m <= 12; m++) {
      const yy = y.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const url = `https://www.takaratomy.co.jp/products/tomica/new/${yy}${mm}.htm`;
      
      const task = (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) return; // Skip 404s
          
          const html = await res.text();
          const $ = cheerio.load(html);
          
          // The new car history uses .category_tomica or .CarName directly
          $('.category_tomica, .lineup-box, .section-new, .box-new').each((i, el) => {
             let textSource = $(el).find('.CarName').text() || $(el).find('h3, .ttl').text();
             if (!textSource) return;
             
             // Look for "No.XXX Name"
             const match = textSource.match(/No\.(\d+)\s+([^\n]+)/);
             if (match) {
                const serialNumber = `No.${match[1]}`;
                const name = match[2].trim();
                
                let imgSrc = $(el).find('img').first().attr('src');
                if (imgSrc && imgSrc.includes('pic_')) {
                  imgSrc = new URL(imgSrc, url).href;
                } else {
                   // Some images might not be the first img inside the block
                   imgSrc = $(el).find('.car-pic img').attr('src');
                   if (imgSrc) imgSrc = new URL(imgSrc, url).href;
                }

                if (!cars.some(c => c.serialNumber === serialNumber && c.name === name)) {
                  const currentPrice = Math.floor(Math.random() * 200) + 150;
                  cars.push({
                    id: `car-${y}-${m}-${i}`,
                    year: 2000 + y,
                    month: m,
                    serialNumber,
                    name,
                    image: imgSrc || '/cars/default.png',
                    currentPrice
                  });
                }
             }
          });
        } catch(e) {
          // ignore
        }
      })();
      fetchTasks.push(task);
    }
  }

  console.log(`Fetching ${fetchTasks.length} history pages in parallel...`);
  await Promise.all(fetchTasks);
  
  console.log(`Found ${cars.length} cars from history.`);
  
  // Group by serial number to find discontinued models
  const bySerial = {};
  cars.forEach(car => {
    if (!bySerial[car.serialNumber]) bySerial[car.serialNumber] = [];
    bySerial[car.serialNumber].push(car);
  });
  
  // Sort each serial group by date (newest first)
  Object.values(bySerial).forEach(group => {
    group.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // The first one is 'current', the rest are 'discontinued'
    group.forEach((car, index) => {
      car.isDiscontinued = index > 0;
    });
  });
  
  // Format the data
  const finalData = cars.map(car => {
    let basePrice;
    
    if (car.isDiscontinued) {
      // Discontinued cars: older = more expensive. 
      // e.g., 2020 car is 6 years old (2026-2020) => price can be 300 ~ 1500
      const ageYears = 2026 - car.year;
      basePrice = 150 + (ageYears * 100) + Math.floor(Math.random() * 200);
      car.name = `【絕版】${car.name}`;
    } else {
      // Current cars: normal price ~150
      basePrice = Math.floor(Math.random() * 50) + 120;
    }
    
    let currentTrend = basePrice - 50; // Start lower 3 years ago
    const priceHistory = [];
    
    // Generate data for 3 years (2024 to 2026)
    const yearsToPlot = [2024, 2025, 2026];
    yearsToPlot.forEach(plotYear => {
      [1, 7].forEach(plotMonth => {
        if (car.isDiscontinued) {
          // Discontinued models strictly go up in value
          currentTrend += Math.floor(Math.random() * 40) + 10; 
        } else {
          // Current models fluctuate around MSRP
          currentTrend = basePrice + Math.floor(Math.random() * 30) - 15;
        }
        priceHistory.push({
          date: `${plotYear}-0${plotMonth}`,
          price: currentTrend
        });
      });
    });
    
    car.priceHistory = priceHistory;
    // Set current price to the latest point in history
    car.currentPrice = priceHistory[priceHistory.length - 1].price;

    const searchKeyword = encodeURIComponent("Tomica " + car.serialNumber + " " + car.name.replace('【絕版】', ''));
    
    car.marketplaces = [
      { id: 1, name: "蝦皮購物", seller: "TomicaKing", price: car.currentPrice - 10, url: `https://shopee.tw/search?keyword=${searchKeyword}`, rating: 4.9 },
      { id: 2, name: "露天拍賣", seller: "CarCollector", price: car.currentPrice, url: `https://www.ruten.com.tw/find/?q=${searchKeyword}`, rating: 4.8 },
      { id: 3, name: "Yahoo拍賣", seller: "ToyMaster", price: car.currentPrice + 10, url: `https://tw.buy.yahoo.com/search/product?p=${searchKeyword}`, rating: 4.5 },
    ];
    
    // Default 0 for real views tracking later
    car.views = 0;
    car.comments = [];
    
    return car;
  });

  const fileContent = `export const tomicaData = ${JSON.stringify(finalData, null, 2)};

export const getSortedData = () => {
  return [...tomicaData].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year; // Sort by year descending
    }
    if (a.month !== b.month) {
      return b.month - a.month; // Sort by month descending
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
  console.log(`Wrote ${cars.length} historical cars to src/data.js`);
}

scrapeHistory();
