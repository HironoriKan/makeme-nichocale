import React from 'react';

const EventCell = ({ 
  dayIndex, 
  timeIndex, 
  isSelected, 
  isToday, 
  event, 
  isSelectable,
  isWeekend,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  handleCellTouchStart,
  handleCellTouchMove,
  handleCellTouchEnd
}) => {
  // スタイルの計算
  const getCellStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      border: '1px solid #e0e0e0',
      boxSizing: 'border-box',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      cursor: isSelectable ? 'pointer' : 'default',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease',
    };

    // 背景色の計算
    if (isSelected) {
      baseStyle.backgroundColor = '#e3f2fd';
      baseStyle.boxShadow = '0 0 0 2px #2196f3 inset';
      baseStyle.zIndex = 2;
    } else if (event) {
      // イベントがある場合の背景色
      if (event.isTentative) {
        // 未回答/未定の予定
        baseStyle.backgroundColor = '#fff9c4';
      } else if (event.isAllDay) {
        // 終日予定（祝日など）
        baseStyle.backgroundColor = '#ffebee';
      } else {
        // 通常予定
        baseStyle.backgroundColor = '#e8f5e9';
      }
    } else if (isToday) {
      // 今日の背景色
      baseStyle.backgroundColor = '#f3f3f3';
    } else if (isWeekend) {
      // 週末の背景色
      baseStyle.backgroundColor = '#f9f9f9';
    }

    return baseStyle;
  };

  const getEventLabel = () => {
    if (!event) return null;
    
    return (
      <div style={{
        fontSize: '12px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        textAlign: 'center',
        padding: '0 5px',
        color: event.isAllDay ? '#d32f2f' : (event.isTentative ? '#ff6f00' : '#388e3c')
      }}>
        {event.summary || '予定あり'}
      </div>
    );
  };

  return (
    <div
      style={getCellStyle()}
      onClick={() => handleCellClick(dayIndex, timeIndex)}
      onMouseDown={(e) => handleCellMouseDown(dayIndex, timeIndex, e)}
      onMouseEnter={() => handleCellMouseEnter(dayIndex, timeIndex)}
      onMouseUp={() => handleCellMouseUp(dayIndex, timeIndex)}
      onTouchStart={(e) => handleCellTouchStart(dayIndex, timeIndex, e)}
      onTouchMove={(e) => handleCellTouchMove(dayIndex, timeIndex, e)}
      onTouchEnd={() => handleCellTouchEnd(dayIndex, timeIndex)}
      data-day-index={dayIndex}
      data-time-index={timeIndex}
    >
      {getEventLabel()}
    </div>
  );
};

export default EventCell; 