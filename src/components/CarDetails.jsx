import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, Store, Star, MessageSquare, Send, Eye } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div style={{ background: 'rgba(25, 25, 35, 0.9)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff' }}>
        <p style={{ margin: 0, color: '#a0a0b5' }}>{label}</p>
        <p style={{ margin: 0, color: val != null ? '#00e676' : '#a0a0b5', fontWeight: 'bold' }}>
          {val != null ? `NT$ ${val}` : '***'}
        </p>
      </div>
    );
  }
  return null;
};

const CarDetails = ({ car, onClose, onAddComment }) => {
  const [commentText, setCommentText] = useState('');

  // Sort marketplaces by price low to high
  const sortedMarketplaces = useMemo(() => {
    return [...car.marketplaces].sort((a, b) => a.price - b.price);
  }, [car.marketplaces]);

  if (!car) return null;

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(car.id, commentText);
    setCommentText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
              <span className="car-badge" style={{ position: 'static' }}>{car.serialNumber}</span>
              <span style={{ color: '#a0a0b5' }}>{car.year}年{car.month}月</span>
              <span style={{ color: '#ffb300', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={16} /> {(car.realViews || 0).toLocaleString()} 人看過
              </span>
            </div>
            <h2 style={{ fontSize: '2rem', margin: 0, color: car.isDiscontinued ? '#ff3366' : '#fff' }}>{car.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="chart-container">
            <h3 className="chart-title">
              <TrendingUp size={20} color="#ff3366" />
              市場價格走勢 (Price History)
            </h3>
            {car.priceHistory && car.priceHistory.length > 0 ? (
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={car.priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#a0a0b5" 
                      tick={{ fill: '#a0a0b5', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#a0a0b5" 
                      tick={{ fill: '#a0a0b5', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin - 20', 'dataMax + 20']}
                      tickFormatter={(value) => `NT$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={car.isDiscontinued ? '#ff3366' : '#00e676'}
                      strokeWidth={3}
                      dot={{ fill: car.isDiscontinued ? '#ff3366' : '#00e676', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      animationDuration={1500}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#a0a0b5' }}>
                <p style={{ fontSize: '2rem', margin: 0 }}>***</p>
                <p>尚無價格歷史資料</p>
              </div>
            )}
          </div>

          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={20} color="#00e676" />
            比價搜尋 (最低價排序)
          </h3>
          
          <div className="market-list" style={{ marginBottom: '2rem' }}>
            <div className="market-header">
              <div>平台 (Platform)</div>
              <div>賣家 (Seller)</div>
              <div>價格 (Price)</div>
              <div style={{ textAlign: 'right' }}>操作 (Action)</div>
            </div>
            {sortedMarketplaces.map((market) => (
              <div key={market.id} className="market-item">
                <div className="market-platform">
                  {market.name}
                </div>
                <div className="market-seller">
                  {market.seller}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem', color: '#ffb300' }}>
                    <Star size={12} fill="#ffb300" /> {market.rating}
                  </span>
                </div>
                <div className="market-price">NT$ {market.price}</div>
                <div style={{ textAlign: 'right' }}>
                  <a href={market.url} target="_blank" rel="noreferrer" className="buy-btn">
                    前往查看
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Comments Section */}
          <div className="chart-container" style={{ marginTop: '2rem' }}>
            <h3 className="chart-title">
              <MessageSquare size={20} color="#3399ff" />
              車款討論區 (Comments)
            </h3>
            
            <div className="comments-list" style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
              {car.comments && car.comments.length > 0 ? (
                car.comments.map(comment => (
                  <div key={comment.id} style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#f0f0f5' }}>{comment.user}</span>
                      <span style={{ fontSize: '0.8rem', color: '#a0a0b5' }}>{comment.date}</span>
                    </div>
                    <p style={{ margin: 0, color: '#d0d0e5', lineHeight: 1.5 }}>{comment.text}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#a0a0b5', textAlign: 'center', padding: '1rem' }}>目前還沒有討論，來搶頭香吧！</p>
              )}
            </div>

            <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="留下您對這台車的看法..."
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '0.8rem 1rem',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button 
                type="submit" 
                className="buy-btn" 
                style={{ 
                  background: 'var(--accent-color)', 
                  color: 'white', 
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 1.5rem'
                }}
              >
                <Send size={16} /> 送出
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CarDetails;
