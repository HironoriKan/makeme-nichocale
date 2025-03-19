import React from 'react';
import { getFirstDayOfMonth, getLastDayOfMonth, isSameDate } from './utils/dateUtils';

const MiniCalendar = ({
  showCalendarPopup,
  setShowCalendarPopup,
  popupMonth,
  setPopupMonth,
  setCurrentDate,
  popupRef,
  weekDates
}) => {
  if (!showCalendarPopup) return null;

  const today = new Date();
  const daysInMonth = getLastDayOfMonth(popupMonth.getFullYear(), popupMonth.getMonth()).getDate();
  const firstDayOfMonth = getFirstDayOfMonth(popupMonth.getFullYear(), popupMonth.getMonth());
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 月曜日を0とするため

  // 前の月に移動
  const handlePrevMonth = () => {
    const newMonth = new Date(popupMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setPopupMonth(newMonth);
  };

  // 次の月に移動
  const handleNextMonth = () => {
    const newMonth = new Date(popupMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setPopupMonth(newMonth);
  };

  // 日付クリック時のハンドラ
  const handleDateClick = (day) => {
    const date = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), day);
    setCurrentDate(date);
    setShowCalendarPopup(false);
  };

  // 日付が現在表示中の週に含まれているかをチェック
  const isDateInCurrentWeek = (date) => {
    return weekDates.some(weekDate => isSameDate(date, weekDate));
  };

  // カレンダーのグリッドを生成
  const generateCalendarGrid = () => {
    const days = [];

    // 前月の日を埋める
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`prev-${i}`} className="calendar-day empty"></div>);
    }

    // 当月の日を埋める
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), day);
      const isToday = isSameDate(date, today);
      const isInCurrentWeek = isDateInCurrentWeek(date);

      days.push(
        <div
          key={`current-${day}`}
          className={`calendar-day ${isToday ? 'today' : ''} ${isInCurrentWeek ? 'in-week' : ''}`}
          onClick={() => handleDateClick(day)}
          style={{
            padding: '5px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isInCurrentWeek ? '#e3f2fd' : (isToday ? '#f3f3f3' : 'white'),
            color: isToday ? '#1976d2' : 'black',
            fontWeight: isToday ? 'bold' : 'normal',
            border: '1px solid #f0f0f0',
            borderRadius: '4px'
          }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={() => setShowCalendarPopup(false)}
    >
      <div
        ref={popupRef}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          minWidth: '300px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}
        >
          <button
            onClick={handlePrevMonth}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            &#9664;
          </button>
          <div>
            {popupMonth.getFullYear()}年 {monthNames[popupMonth.getMonth()]}
          </div>
          <button
            onClick={handleNextMonth}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            &#9654;
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '5px'
          }}
        >
          {['月', '火', '水', '木', '金', '土', '日'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '5px',
                color: day === '土' ? '#1976d2' : (day === '日' ? '#d32f2f' : '#333')
              }}
            >
              {day}
            </div>
          ))}
          {generateCalendarGrid()}
        </div>

        <div
          style={{
            marginTop: '15px',
            textAlign: 'right'
          }}
        >
          <button
            onClick={() => setShowCalendarPopup(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniCalendar; 