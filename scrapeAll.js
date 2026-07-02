import fs from 'fs';
import * as cheerio from 'cheerio';

// ===== CONFIG =====
const NOW_YEAR = new Date().getFullYear();
const NOW_MONTH = new Date().getMonth() + 1; // 1-12

// Takara Tomy "new products" pages (organized by YYMM)
const newProductBaseURL = 'https://www.takaratomy.co.jp/products/tomica/new/';

// Regular lineup pages (for current models only, no year/month info)
const regularBaseURL = 'https://www.takaratomy.co.jp/products/tomica/lineup/regular/';
const regularPages = [
  'index.htm', '021-040.htm', '041-060.htm', '061-080.htm',
  '081-100.htm', '101-120.htm', '121-140.htm', '141-150.htm'
];

// Generate YYMM codes for the past ~10 years of new product pages
function generateNewProductPages() {
  const pages = [];
  for (let year = 2017; year <= NOW_YEAR; year++) {
    for (const month of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      if (year === NOW_YEAR && month > NOW_MONTH + 2) break; // Don't go too far ahead
      const yy = String(year).slice(2);
      const mm = String(month).padStart(2, '0');
      pages.push({ code: `${yy}${mm}`, year, month });
    }
  }
  return pages;
}

// ===== PRICE HISTORY GENERATOR =====
function generatePriceHistory(car) {
  const releaseYear = car.year;
  const releaseMonth = car.month || 1;

  // Generate half-year data points STARTING FROM the first half-year AFTER release
  const points = [];
  let startYear, startMonth;
  if (releaseMonth <= 6) {
    startYear = releaseYear;
    startMonth = 7;
  } else {
    startYear = releaseYear + 1;
    startMonth = 1;
  }

  let y = startYear;
  let m = startMonth;
  while (y < NOW_YEAR || (y === NOW_YEAR && m <= NOW_MONTH)) {
    points.push(`${y}-${String(m).padStart(2, '0')}`);
    if (m === 1) { m = 7; } else { m = 1; y++; }
  }

  // If less than 2 points, add the release month itself as the first point
  if (points.length < 2) {
    const releaseLabel = `${releaseYear}-${String(releaseMonth).padStart(2, '0')}`;
    if (!points.includes(releaseLabel)) {
      points.unshift(releaseLabel);
    }
  }

  const currentPrice = car.currentPrice;

  if (car.isDiscontinued) {
    // Discontinued: price trends UP over time (collector value appreciation)
    const priceHistory = [];
    for (let i = 0; i < points.length; i++) {
      const periodsFromEnd = points.length - 1 - i;
      const depreciation = periodsFromEnd * (0.03 + Math.random() * 0.02);
      const price = Math.round(currentPrice * (1 - depreciation));
      priceHistory.push({ date: points[i], price: Math.max(price, Math.round(currentPrice * 0.5)) });
    }
    return priceHistory;
  } else {
    // In-production: price fluctuates around currentPrice
    const priceHistory = [];
    for (let i = 0; i < points.length; i++) {
      const fluctuation = (Math.random() - 0.5) * 0.15;
      let price = Math.round(currentPrice * (1 + fluctuation));
      if (i === points.length - 1) price = currentPrice; // Last point = current
      priceHistory.push({ date: points[i], price });
    }
    return priceHistory;
  }
}

// ===== SCRAPING =====
async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.log(`Fetch failed for ${url}:`, e.message);
    return null;
  }
}

async function scrapeNewProducts() {
  const pages = generateNewProductPages();
  const carMap = new Map(); // serialNumber -> latest car data (to detect discontinued)
  const allCars = [];

  console.log(`Scanning ${pages.length} monthly pages...`);
  
  for (const { code, year, month } of pages) {
    const url = `${newProductBaseURL}${code}.htm`;
    const html = await fetchHTML(url);
    if (!html) continue;

    const $ = cheerio.load(html);
    let found = 0;

    // Try multiple selectors for new product pages
    $('.firing-firing-box, .firing-box, .lineup-box, .newCar-box').each((i, el) => {
      const nameEl = $(el).find('.firing-firing-name, .firing-name, .CarName, h3').first();
      const carNameText = nameEl.text().trim();
      if (!carNameText) return;

      const match = carNameText.match(/No[\.．](\d+)\s+(.+)/);
      if (!match) return;

      const serialNumber = `No.${match[1]}`;
      const name = match[2].trim();

      let imgSrc = $(el).find('img').first().attr('src');
      if (imgSrc) {
        imgSrc = new URL(imgSrc, url).href;
      }

      const car = {
        id: `car-${String(year).slice(2)}-${month}-${i}`,
        year,
        month,
        serialNumber,
        name,
        image: imgSrc || '',
        currentPrice: Math.floor(Math.random() * 100) + 100, // Mock base ~100-200 NTD
        isDiscontinued: false,
      };

      allCars.push(car);
      carMap.set(serialNumber, { year, month }); // Track latest appearance
      found++;
    });

    if (found > 0) {
      console.log(`  ${code} (${year}/${month}): Found ${found} cars`);
    }
  }

  return { allCars, carMap };
}

async function scrapeRegularLineup() {
  const cars = [];

  console.log('\nScraping current regular lineup...');
  
  for (const page of regularPages) {
    const url = regularBaseURL + page;
    const html = await fetchHTML(url);
    if (!html) continue;

    const $ = cheerio.load(html);

    $('.lineup-box').each((i, el) => {
      const carNameText = $(el).find('.CarName').text().trim();
      if (!carNameText) return;

      const match = carNameText.match(/No\.(\d+)\s+(.+)/);
      let serialNumber = '', name = carNameText;
      if (match) {
        serialNumber = `No.${match[1]}`;
        name = match[2];
      } else {
        serialNumber = 'No.?';
      }

      let imgSrc = $(el).find('.car-pic img').attr('src');
      if (imgSrc) {
        imgSrc = new URL(imgSrc, url).href;
      }

      cars.push({
        serialNumber,
        name,
        image: imgSrc || '',
      });
    });
  }

  console.log(`  Found ${cars.length} cars in current lineup`);
  return cars;
}

async function main() {
  // Step 1: Try to load existing data to preserve price history
  let existingData = [];
  try {
    const raw = fs.readFileSync('src/data.js', 'utf-8');
    const funcStart = raw.indexOf('export const getSortedData');
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']', funcStart !== -1 ? funcStart : raw.length);
    if (jsonStart !== -1 && jsonEnd !== -1) {
      existingData = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));
      console.log(`Loaded ${existingData.length} existing cars from data.js`);
    }
  } catch (e) {
    console.log('Error parsing existing data.js:', e.message);
  }
  const existingMap = new Map(existingData.map(c => [c.id, c]));

  // Step 2: Scrape current regular lineup (to know what's still in production)
  const currentLineup = await scrapeRegularLineup();
  const currentSerials = new Set(currentLineup.map(c => c.serialNumber));

  // Step 3: Scrape new product pages for historical data
  const { allCars } = await scrapeNewProducts();

  if (allCars.length === 0 && existingData.length > 0) {
    console.log('\nNo new cars scraped, keeping existing data and updating discontinued status...');
    // Just update discontinued status based on current lineup if we got any
    const updatedData = existingData.map(car => {
      const isDisc = currentLineup.length > 0 ? !currentSerials.has(car.serialNumber) : car.isDiscontinued;
      return {
      ...car,
      isDiscontinued: isDisc,
      name: (isDisc && !car.name.includes('【絕版】'))
        ? `【絕版】${car.name}` : car.name,
      };
    });
    writeDataFile(updatedData);
    return;
  }

  // Step 4: Deduplicate - keep unique cars by id, merge with existing
  const finalMap = new Map();
  
  // Start with scraped data
  for (const car of allCars) {
    finalMap.set(car.id, car);
  }
  
  // Merge existing data (preserve price history, views, comments for known cars)
  for (const [id, existing] of existingMap) {
    if (finalMap.has(id)) {
      const scraped = finalMap.get(id);
      // Preserve existing price/marketplace data if available
      scraped.currentPrice = existing.currentPrice || scraped.currentPrice;
      scraped.views = existing.views || 0;
      scraped.comments = existing.comments || [];
      // Keep existing priceHistory if it exists and starts after release date
      if (existing.priceHistory && existing.priceHistory.length > 0) {
        const [fy, fm] = existing.priceHistory[0].date.split('-').map(Number);
        if (fy > existing.year || (fy === existing.year && fm >= (existing.month || 1))) {
          scraped.priceHistory = existing.priceHistory;
        }
      }
    } else {
      // Car exists in data but wasn't scraped - keep it
      finalMap.set(id, existing);
    }
  }

  // Step 5: Mark discontinued, generate missing data
  const finalCars = [...finalMap.values()].map(car => {
    // Mark discontinued if not in current regular lineup (only if we successfully fetched the lineup)
    if (currentLineup.length > 0) {
      car.isDiscontinued = !currentSerials.has(car.serialNumber);
    }
    
    // Add 【絕版】 prefix if discontinued and not already there
    if (car.isDiscontinued && !car.name.includes('【絕版】')) {
      car.name = `【絕版】${car.name}`;
    }
    // Remove 【絕版】 if back in production
    if (!car.isDiscontinued && car.name.includes('【絕版】')) {
      car.name = car.name.replace('【絕版】', '');
    }

    // Generate price history if missing (dates MUST be >= release date)
    if (!car.priceHistory || car.priceHistory.length === 0) {
      car.priceHistory = generatePriceHistory(car);
    }

    // Generate marketplaces if missing
    if (!car.marketplaces || car.marketplaces.length === 0) {
      const searchKeyword = encodeURIComponent(`Tomica ${car.serialNumber} ${car.name.replace('【絕版】', '')}`);
      const basePrice = car.currentPrice;
      car.marketplaces = [
        { id: 1, name: '蝦皮購物', seller: 'TomicaKing', price: basePrice - 10, url: `https://shopee.tw/search?keyword=${searchKeyword}`, rating: 4.9 },
        { id: 2, name: '露天拍賣', seller: 'CarCollector', price: basePrice, url: `https://www.ruten.com.tw/find/?q=${searchKeyword}`, rating: 4.8 },
        { id: 3, name: 'Yahoo拍賣', seller: 'ToyMaster', price: basePrice + 10, url: `https://tw.buy.yahoo.com/search/product?p=${searchKeyword}`, rating: 4.5 },
      ];
    }

    car.views = car.views || 0;
    car.comments = car.comments || [];

    return car;
  });

  writeDataFile(finalCars);
}

function writeDataFile(data) {
  const fileContent = `export const tomicaData = ${JSON.stringify(data, null, 2)};

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
  console.log(`\n✅ Wrote ${data.length} cars to src/data.js`);
  
  // Stats
  const disc = data.filter(c => c.isDiscontinued).length;
  const years = [...new Set(data.map(c => c.year))].sort();
  console.log(`   ${disc} discontinued, ${data.length - disc} current`);
  console.log(`   Years: ${years.join(', ')}`);
  
  // Validate: no price history before release
  const violations = data.filter(c => {
    if (!c.priceHistory || c.priceHistory.length === 0) return false;
    const [fy, fm] = c.priceHistory[0].date.split('-').map(Number);
    return fy < c.year || (fy === c.year && fm < (c.month || 1));
  });
  if (violations.length > 0) {
    console.log(`   ⚠️ WARNING: ${violations.length} cars have price data before release!`);
    violations.forEach(c => console.log(`     ${c.id} ${c.name} release:${c.year}-${c.month} first:${c.priceHistory[0].date}`));
  } else {
    console.log(`   ✅ All price histories start at or after release date`);
  }
}

main();
