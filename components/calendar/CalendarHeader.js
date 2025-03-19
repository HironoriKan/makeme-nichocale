import React from 'react';
import { formatDate } from './utils/dateUtils';

const CalendarHeader = ({
  currentDate,
  weekDates,
  todayIndex,
  previousWeek,
  nextWeek,
  goToToday,
  showCalendarPopup,
  setShowCalendarPopup,
  isAuthenticated,
  userInfo,
  handleLogin,
  handleCustomLogout
}) => {
  // 週の日付範囲を表示する文字列を生成
  const getDateRangeText = () => {
    if (!weekDates || weekDates.length === 0) return '';
    
    const firstDate = weekDates[0];
    const lastDate = weekDates[weekDates.length - 1];
    
    const firstMonth = firstDate.getMonth() + 1;
    const lastMonth = lastDate.getMonth() + 1;
    
    if (firstMonth === lastMonth) {
      // 同じ月の場合
      return `${firstDate.getFullYear()}年${firstMonth}月`;
    } else {
      // 月をまたぐ場合
      if (firstDate.getFullYear() === lastDate.getFullYear()) {
        // 同じ年の場合
        return `${firstDate.getFullYear()}年${firstMonth}月～${lastMonth}月`;
      } else {
        // 年をまたぐ場合
        return `${firstDate.getFullYear()}年${firstMonth}月～${lastDate.getFullYear()}年${lastMonth}月`;
      }
    }
  };
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 15px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      height: '48px',
      boxSizing: 'border-box'
    }}>
      {/* タイトルと日付選択部分 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>スケジュール調整</h1>
        <div 
          style={{ 
            cursor: 'pointer', 
            padding: '5px 10px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
          onClick={() => setShowCalendarPopup(!showCalendarPopup)}
        >
          {getDateRangeText()}
        </div>
      </div>
      
      {/* ナビゲーションボタン */}
      <div style={{ display: 'flex', gap: '5px' }}>
        <button 
          onClick={previousWeek} 
          style={{ 
            padding: '5px 10px', 
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          前の週
        </button>
        <button 
          onClick={goToToday} 
          style={{ 
            padding: '5px 10px', 
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          今日
        </button>
        <button 
          onClick={nextWeek} 
          style={{ 
            padding: '5px 10px', 
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          次の週
        </button>
      </div>
      
      {/* ログイン/ユーザー情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAuthenticated ? (
          <>
            {userInfo?.picture && (
              <img 
                src={userInfo.picture} 
                alt="ユーザー" 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%' 
                }} 
              />
            )}
            <button
              onClick={handleCustomLogout}
              style={{
                padding: '3px 8px',
                fontSize: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            style={{
              padding: '5px 10px',
              border: '1px solid #4285f4',
              borderRadius: '4px',
              backgroundColor: '#4285f4',
              color: '#fff',
              cursor: 'pointer'
            }}
            disabled={!navigator.onLine}
          >
            Googleでログイン
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarHeader; 