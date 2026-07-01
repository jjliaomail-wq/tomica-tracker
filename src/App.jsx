import React, { useState, useMemo } from 'react';
import { getGroupedData, getSortedData, tomicaData } from './data';
import CarDetails from './components/CarDetails';
import { ArrowDownUp, Info, Eye } from 'lucide-react';

function App() {
  const [selectedCar, setSelectedCar] = useState(null);
  const [sortMode, setSortMode] = useState('year'); // 'year' or 'number'
  const [userComments, setUserComments] = useState({});
  const [realViews, setRealViews] = useState({});

  // Inject user comments into the base data
  const mergedData = useMemo(() => {
    return tomicaData.map(car => ({
      ...car,
      comments: [...(car.comments || []), ...(userComments[car.id] || [])]
    }));
  }, [userComments]);

  // Data for Year Sort
  const groupedDataByYear = useMemo(() => {
    const sorted = [...mergedData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      const numA = parseInt(a.serialNumber.replace(/\D/g, '')) || 999;
      const numB = parseInt(b.serialNumber.replace(/\D/g, '')) || 999;
      return numA - numB;
    });
    return sorted.reduce((acc, car) => {
      if (!acc[car.year]) acc[car.year] = [];
      acc[car.year].push(car);
      return acc;
    }, {});
  }, [mergedData]);
  
  const years = Object.keys(groupedDataByYear).sort((a, b) => b - a);

  // Data for Number Sort
  const groupedDataByNumber = useMemo(() => {
    const allCars = [...mergedData].sort((a, b) => {
      const numA = parseInt(a.serialNumber.replace(/\D/g, '')) || 999;
      const numB = parseInt(b.serialNumber.replace(/\D/g, '')) || 999;
      return numA - numB;
    });

    const grouped = {};
    allCars.forEach(car => {
      const num = parseInt(car.serialNumber.replace(/\D/g, ''));
      if (isNaN(num)) {
        if (!grouped['其他 (Special/Set)']) grouped['其他 (Special/Set)'] = [];
        grouped['其他 (Special/Set)'].push(car);
      } else {
        const lower = Math.floor((num - 1) / 30) * 30 + 1;
        const upper = lower + 29;
        const range = `No.${lower} ~ No.${upper}`;
        if (!grouped[range]) grouped[range] = [];
        grouped[range].push(car);
      }
    });
    return grouped;
  }, [mergedData]);

  const numberRanges = Object.keys(groupedDataByNumber).sort((a, b) => {
    if (a.includes('其他')) return 1;
    if (b.includes('其他')) return -1;
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  const handleAddComment = (carId, text) => {
    const newComment = {
      id: Date.now(),
      user: "訪客 (You)",
      text: text,
      date: new Date().toISOString().split('T')[0]
    };
    setUserComments(prev => ({
      ...prev,
      [carId]: [...(prev[carId] || []), newComment]
    }));
    
    setSelectedCar(prev => ({
      ...prev,
      comments: [...(prev.comments || []), newComment]
    }));
  };

  const handleCarClick = async (car) => {
    setSelectedCar(car); // Open immediately for responsiveness
    try {
      const res = await fetch(`https://api.counterapi.dev/v1/tomica-tracker-v1/${car.id}/up`);
      if (res.ok) {
        const data = await res.json();
        setRealViews(prev => ({ ...prev, [car.id]: data.count }));
      }
    } catch(e) {
      console.log('Failed to fetch real views');
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>TOMICA Price Tracker</h1>
        <p className="subtitle">即時追蹤您的TOMICA小汽車市場價格與比價</p>
        
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#a0a0b5' }}><ArrowDownUp size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>排序方式：</span>
          <button 
            className={`sort-btn ${sortMode === 'year' ? 'active' : ''}`}
            onClick={() => setSortMode('year')}
          >
            依發行年份 (最新到最舊)
          </button>
          <button 
            className={`sort-btn ${sortMode === 'number' ? 'active' : ''}`}
            onClick={() => setSortMode('number')}
          >
            依小車號碼 (No.1 ~ No.150)
          </button>
        </div>
      </header>

      {sortMode === 'number' && (
        <div className="info-notice">
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>為什麼會漏號？因為 Takara Tomy 當推出新款取代舊號碼時，舊款便會「絕版」從常規目錄移除。這裡展示的是近十年內佔據過該號碼的所有歷史車款！</span>
        </div>
      )}

      <main>
        {sortMode === 'year' ? (
          years.map(year => (
            <section key={year} className="year-section">
              <h2 className="year-title">{year} 年度發行</h2>
              <div className="car-grid">
                {groupedDataByYear[year].map(car => (
                  <CarCard key={car.id} car={car} views={realViews[car.id]} onClick={() => handleCarClick(car)} />
                ))}
              </div>
            </section>
          ))
        ) : (
          numberRanges.map(range => (
            <section key={range} className="year-section">
              <h2 className="year-title">{range}</h2>
              <div className="car-grid">
                {groupedDataByNumber[range].map(car => (
                  <CarCard key={car.id} car={car} views={realViews[car.id]} onClick={() => handleCarClick(car)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {selectedCar && (
        <CarDetails 
          car={{...selectedCar, realViews: realViews[selectedCar.id]}} 
          onClose={() => setSelectedCar(null)} 
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

// Sub-component for the card
function CarCard({ car, views, onClick }) {
  return (
    <div className="car-card" onClick={onClick}>
      <div className="car-badge">{car.serialNumber}</div>
      <div className="car-image-container">
        <img src={car.image} alt={car.name} className="car-image" />
      </div>
      <div className="car-info">
        <h3>{car.name}</h3>
        <div style={{ color: '#a0a0b5', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>發行於 {car.year} 年 {car.month} 月</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: views ? '#ffb300' : '#a0a0b5' }}>
            <Eye size={14} /> {(views || 0).toLocaleString()} 人看過
          </span>
        </div>
        <div className="car-price">
          NT$ {car.currentPrice} <span>/ 最新均價</span>
        </div>
      </div>
    </div>
  );
}

export default App;
