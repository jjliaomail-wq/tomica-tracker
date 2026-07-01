export const tomicaData = [];

export const getSortedData = () => {
  return [...tomicaData].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year; // Sort by year descending
    }
    if (a.month !== b.month) {
      return b.month - a.month; // Sort by month descending
    }
    const numA = parseInt(a.serialNumber.replace(/\D/g, '')) || 999;
    const numB = parseInt(b.serialNumber.replace(/\D/g, '')) || 999;
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
