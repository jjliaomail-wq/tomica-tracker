// Fix priceHistory dates so they start from the car's release date
// Also ensure discontinued cars have proper price data
import fs from 'fs';

const raw = fs.readFileSync('src/data.js', 'utf-8');

// Extract the JSON array portion
const dataStart = raw.indexOf('[');
const dataEnd = raw.indexOf('];\n\nexport const getSortedData');
const jsonStr = raw.substring(dataStart, dataEnd + 1);
const cars = JSON.parse(jsonStr);

// Current date reference: 2026-07
const NOW_YEAR = 2026;
const NOW_MONTH = 7;

function generatePriceHistory(car) {
  const releaseYear = car.year;
  const releaseMonth = car.month || 1;

  // Generate date points from release to now (every 6 months)
  // Start from the first half-year after release
  const points = [];

  // Determine start point - round to nearest Jan or Jul AFTER release
  let startYear, startMonth;
  if (releaseMonth <= 6) {
    startYear = releaseYear;
    startMonth = 7; // First data point after H1 release
  } else {
    startYear = releaseYear + 1;
    startMonth = 1; // First data point after H2 release
  }

  // Generate points every 6 months until 2026-07
  let y = startYear;
  let m = startMonth;
  while (y < NOW_YEAR || (y === NOW_YEAR && m <= NOW_MONTH)) {
    points.push({
      year: y,
      month: m,
      label: `${y}-${String(m).padStart(2, '0')}`
    });
    if (m === 1) {
      m = 7;
    } else {
      m = 1;
      y++;
    }
  }

  // If less than 2 points, add the release month itself
  if (points.length < 2) {
    points.unshift({
      year: releaseYear,
      month: releaseMonth,
      label: `${releaseYear}-${String(releaseMonth).padStart(2, '0')}`
    });
  }

  // For discontinued cars: price should trend UP over time (collector value)
  // For current cars: price stays roughly around currentPrice
  const currentPrice = car.currentPrice;

  if (car.isDiscontinued) {
    // Discontinued cars appreciate in value over time
    // Work backwards from current price
    const priceHistory = [];
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
      // Price grows ~3-5% per half-year period for discontinued
      const periodsFromEnd = numPoints - 1 - i;
      const depreciation = periodsFromEnd * (0.03 + Math.random() * 0.02);
      const price = Math.round(currentPrice * (1 - depreciation));
      priceHistory.push({
        date: points[i].label,
        price: Math.max(price, Math.round(currentPrice * 0.5)) // Floor at 50% of current
      });
    }
    return priceHistory;
  } else {
    // Current production cars - price fluctuates around currentPrice
    const priceHistory = [];
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
      const fluctuation = (Math.random() - 0.5) * 0.15; // ±7.5%
      let price = Math.round(currentPrice * (1 + fluctuation));
      // Last point should match currentPrice
      if (i === numPoints - 1) {
        price = currentPrice;
      }
      priceHistory.push({
        date: points[i].label,
        price
      });
    }
    return priceHistory;
  }
}

// Fix all cars
const fixedCars = cars.map(car => {
  car.priceHistory = generatePriceHistory(car);
  return car;
});

// Reconstruct the file
const restOfFile = raw.substring(dataEnd + 2); // After "];\n"
const newContent = `export const tomicaData = ${JSON.stringify(fixedCars, null, 2)};\n${restOfFile}`;

fs.writeFileSync('src/data.js', newContent);
console.log(`Fixed priceHistory for ${fixedCars.length} cars`);

// Show sample results
const car2026 = fixedCars.find(c => c.year === 2026);
const car2025 = fixedCars.find(c => c.year === 2025);
const carDisc = fixedCars.find(c => c.isDiscontinued && c.year <= 2021);

console.log('\n--- 2026 car sample ---');
console.log(car2026.name, car2026.year, car2026.month);
console.log(car2026.priceHistory);

console.log('\n--- 2025 car sample ---');
console.log(car2025.name, car2025.year, car2025.month);
console.log(car2025.priceHistory);

console.log('\n--- Old discontinued car sample ---');
console.log(carDisc.name, carDisc.year, carDisc.month);
console.log(carDisc.priceHistory);
