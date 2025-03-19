import React from 'react';
import EventCell from './EventCell';
import { isTimeSlotOccupied, getEventForTimeSlot } from './utils/eventUtils';

const CalendarGrid = ({
  weekDates,
  weekdays,
  timeSlots,
  todayIndex,
  selectedDates,
  events,
  calendarSettings,
  userInfo,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  handleCellTouchStart,
  handleCellTouchMove,
  handleCellTouchEnd,
  currentTimePosition,
  gridRef
}) => {
  // セルが選択されているかをチェック
  const isCellSelected = (dayIndex, timeIndex) => {
    if (!weekDates || !weekDates[dayIndex]) return false;

    const date = weekDates[dayIndex];
    const key = new Date(date);
    key.setHours(timeIndex + 8, 0, 0, 0);

    return selectedDates.some(selectedDate => {
      const d = new Date(selectedDate);
      return (
        d.getFullYear() === key.getFullYear() &&
        d.getMonth() === key.getMonth() &&
        d.getDate() === key.getDate() &&
        d.getHours() === key.getHours()
      );
    });
  };

  // 特定の日のヘッダーを生成（曜日と日付）
  const renderDayHeader = (dayIndex) => {
    if (!weekDates || !weekDates[dayIndex]) return null;

    const date = weekDates[dayIndex];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const isToday = dayIndex === todayIndex;
    const isWeekend = dayIndex === 5 || dayIndex === 6; // 土曜日か日曜日

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '5px 0',
          backgroundColor: isToday ? '#e3f2fd' : (isWeekend ? '#f9f9f9' : '#f5f5f5'),
          borderBottom: '1px solid #e0e0e0',
          color: isWeekend ? (dayIndex === 5 ? '#1976d2' : '#d32f2f') : '#333333',
          fontWeight: isToday ? 'bold' : 'normal',
        }}
      >
        <div>{weekdays[dayIndex]}</div>
        <div>{month}/{day}</div>
      </div>
    );
  };

  // 時間スロットのラベルを生成
  const renderTimeLabel = (timeIndex) => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '5px',
          height: '100%',
          fontSize: '12px',
          color: '#666666'
        }}
      >
        {timeSlots[timeIndex]}
      </div>
    );
  };

  return (
    <div 
      style={{ 
        display: 'grid',
        gridTemplateColumns: '50px repeat(7, 1fr)',
        gridTemplateRows: '50px repeat(14, 1fr)',
        height: 'calc(100% - 10px)',
        overflow: 'hidden',
        position: 'relative'
      }}
      ref={gridRef}
    >
      {/* 左上の空白セル */}
      <div style={{ 
        gridColumn: '1', 
        gridRow: '1',
        borderBottom: '1px solid #e0e0e0',
        borderRight: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5'
      }} />

      {/* 曜日ヘッダー */}
      {weekdays.map((_, dayIndex) => (
        <div
          key={`day-header-${dayIndex}`}
          style={{
            gridColumn: dayIndex + 2,
            gridRow: '1',
          }}
        >
          {renderDayHeader(dayIndex)}
        </div>
      ))}

      {/* 時間ラベルと予定セル */}
      {timeSlots.map((_, timeIndex) => (
        <React.Fragment key={`time-row-${timeIndex}`}>
          {/* 時間ラベル */}
          <div
            style={{
              gridColumn: '1',
              gridRow: timeIndex + 2,
              borderRight: '1px solid #e0e0e0',
              borderBottom: timeIndex === timeSlots.length - 1 ? 'none' : '1px solid #e0e0e0',
              backgroundColor: '#f5f5f5'
            }}
          >
            {renderTimeLabel(timeIndex)}
          </div>

          {/* 各曜日の時間枠 */}
          {weekdays.map((_, dayIndex) => {
            const date = weekDates[dayIndex];
            const hour = timeIndex + 8;
            const isOccupied = isTimeSlotOccupied(date, hour, events, calendarSettings, userInfo);
            const event = getEventForTimeSlot(date, hour, events, calendarSettings, userInfo);
            const isSelected = isCellSelected(dayIndex, timeIndex);
            const isToday = dayIndex === todayIndex;
            const isWeekend = dayIndex === 5 || dayIndex === 6; // 土曜日か日曜日
            const isSelectable = !isOccupied;

            return (
              <div
                key={`cell-${dayIndex}-${timeIndex}`}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: timeIndex + 2,
                  border: '1px solid #e0e0e0',
                  borderTop: 'none',
                  borderLeft: 'none',
                  position: 'relative'
                }}
              >
                <EventCell
                  dayIndex={dayIndex}
                  timeIndex={timeIndex}
                  isSelected={isSelected}
                  isToday={isToday}
                  event={event}
                  isSelectable={isSelectable}
                  isWeekend={isWeekend}
                  handleCellClick={handleCellClick}
                  handleCellMouseDown={handleCellMouseDown}
                  handleCellMouseEnter={handleCellMouseEnter}
                  handleCellMouseUp={handleCellMouseUp}
                  handleCellTouchStart={handleCellTouchStart}
                  handleCellTouchMove={handleCellTouchMove}
                  handleCellTouchEnd={handleCellTouchEnd}
                />
              </div>
            );
          })}
        </React.Fragment>
      ))}

      {/* 現在時刻のインジケーター */}
      {todayIndex !== -1 && currentTimePosition > 0 && (
        <div 
          style={{
            position: 'absolute',
            left: `calc(50px + ${todayIndex} * (100% - 50px) / 7)`,
            right: `calc(100% - 50px - (${todayIndex + 1}) * (100% - 50px) / 7)`,
            top: `calc(50px + ${currentTimePosition}% * (100% - 50px) / 100)`,
            height: '2px',
            backgroundColor: '#f44336',
            zIndex: 5,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
};

export default CalendarGrid; 