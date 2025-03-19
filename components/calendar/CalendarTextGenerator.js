'use client';

import React, { useState, useEffect, useRef } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import TextOutputArea from './TextOutputArea';
import SettingsPopup from './SettingsPopup';
import MiniCalendar from './MiniCalendar';
import useViewportHeight from './hooks/useViewportHeight';
import { calculateWeekDates, getDateTimeKey } from './utils/dateUtils';

const CalendarTextGenerator = ({ 
  events = [], 
  onDateSelect, 
  isAuthenticated = false, 
  userInfo = null, 
  handleLogin, 
  handleLogout, 
  isLoading = false, 
  isApiInitialized = false,
  calendars = [],
  toggleCalendarSelection,
  calendarSettings = { allowAllDayEvents: false, allowTentativeEvents: false },
  updateCalendarSettings
}) => {
  // カスタムログアウト処理
  const handleCustomLogout = () => {
    localStorage.removeItem('calendarAuth');
    handleLogout();
  };
  
  const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
  const timeSlots = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`);
  const [selectedDates, setSelectedDates] = useState([]);
  const [generatedText, setGeneratedText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [todayIndex, setTodayIndex] = useState(-1);
  const today = new Date();
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'select' または 'deselect'
  const [visitedCells, setVisitedCells] = useState({});
  const [touchStartCell, setTouchStartCell] = useState(null);
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [currentTouch, setCurrentTouch] = useState(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [popupMonth, setPopupMonth] = useState(new Date());
  const popupRef = useRef();
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const textAreaRef = useRef(null);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const settingsPopupRef = useRef();
  const [lastSelectedDay, setLastSelectedDay] = useState(-1);
  const [lastSelectedTime, setLastSelectedTime] = useState(-1);
  const [isDragToDeselect, setIsDragToDeselect] = useState(false);
  const [dragStartCell, setDragStartCell] = useState({ dayIndex: -1, timeIndex: -1 });
  const [lastDraggedCell, setLastDraggedCell] = useState({ dayIndex: -1, timeIndex: -1 });
  const [mouseDownTimer, setMouseDownTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [dragOperation, setDragOperation] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const gridRef = useRef(null);

  const { viewportHeight, isKeyboardVisible, keyboardHeight } = useViewportHeight();

  // 画面の描画後にのみ日付計算を行う
  useEffect(() => {
    const now = new Date();
    const dates = calculateWeekDates(currentDate);
    setWeekDates(dates);
    
    // 今日の日付のインデックスを計算
    const today = new Date();
    const todayIdx = dates.findIndex(date => 
      date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()
    );
    setTodayIndex(todayIdx);
  }, [currentDate]);

  // Navigation functions
  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Cell interaction handlers
  const handleCellClick = (dayIndex, timeIndex) => {
    // ドラッグ終了直後または長押し中はクリックイベントを無視する
    if (isDragging || isLongPress) {
      return;
    }
    
    const date = weekDates[dayIndex];
    if (!date) return;
    
    const dateTimeKey = getDateTimeKey(date, timeIndex);
    const newSelection = [...selectedDates];
    const existingIndex = newSelection.findIndex(item => item === dateTimeKey);
    
    // 選択状態を切り替え
    if (existingIndex !== -1) {
      // 既に選択されていれば解除
      newSelection.splice(existingIndex, 1);
    } else {
      // 選択されていなければ追加
      newSelection.push(dateTimeKey);
    }
    
    setSelectedDates(newSelection);
    setGeneratedText(generateText(newSelection));
    
    // デバッグ用ログ
    console.log('Cell clicked:', { dayIndex, timeIndex, isSelected: existingIndex === -1 });
  };

  const handleCellMouseDown = (dayIndex, timeIndex, e) => {
    // デフォルトの選択動作を防止
    e.preventDefault();
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    
    const date = weekDates[dayIndex];
    if (!date) return;
    
    // 既存のタイマーがあればクリア
    if (mouseDownTimer) {
      clearTimeout(mouseDownTimer);
    }
    
    // 開始セルと選択状態を記録
    const dateTimeKey = getDateTimeKey(date, timeIndex);
    const isSelected = selectedDates.includes(dateTimeKey);
    
    // 長押し判定用のタイマーを設定（500ms）
    const timer = setTimeout(() => {
      // 長押し検出時の処理
      setIsDragging(true);
      setIsDragToDeselect(isSelected);
      setDragStartCell({ dayIndex, timeIndex });
      setLastDraggedCell({ dayIndex, timeIndex });
      setIsLongPress(true);
      
      // 長押し開始時に最初のセルを選択/選択解除する
      const newSelection = [...selectedDates];
      const existingIndex = newSelection.findIndex(item => item === dateTimeKey);
      
      // ドラッグモードに基づいて選択/選択解除する
      if (isSelected) {
        // 選択解除モード
        if (existingIndex !== -1) {
          newSelection.splice(existingIndex, 1);
        }
      } else {
        // 選択モード
        if (existingIndex === -1) {
          newSelection.push(dateTimeKey);
        }
      }
      
      // 選択状態を更新
      setSelectedDates(newSelection);
      setGeneratedText(generateText(newSelection));
      
      console.log('Long press detected (desktop):', { dayIndex, timeIndex });
    }, 500); // 500msの長押しで複数選択モードに入る
    
    setMouseDownTimer(timer);
  };

  const handleCellMouseEnter = (dayIndex, timeIndex) => {
    // ドラッグ中でなければ何もしない
    if (!isDragging) return;
    
    // 同じセルの場合は処理しない（パフォーマンス向上）
    if (lastDraggedCell && lastDraggedCell.dayIndex === dayIndex && lastDraggedCell.timeIndex === timeIndex) {
      return;
    }
    
    const date = weekDates[dayIndex];
    if (!date) return;
    
    const dateTimeKey = getDateTimeKey(date, timeIndex);
    const newSelection = [...selectedDates];
    
    // ドラッグモードに基づいて選択/選択解除する
    if (isDragToDeselect) {
      // 選択解除モード
      const existingIndex = newSelection.findIndex(item => item === dateTimeKey);
      if (existingIndex !== -1) {
        newSelection.splice(existingIndex, 1);
      }
    } else {
      // 選択モード
      if (!newSelection.includes(dateTimeKey)) {
        newSelection.push(dateTimeKey);
      }
    }
    
    // 選択状態を更新
    setSelectedDates(newSelection);
    setGeneratedText(generateText(newSelection));
    setLastDraggedCell({ dayIndex, timeIndex });
  };

  const handleCellMouseUp = (dayIndex, timeIndex) => {
    // マウスアップでドラッグ終了
    if (isDragging) {
      setIsDragging(false);
      setIsLongPress(false);
      setDragStartCell({ dayIndex: -1, timeIndex: -1 });
      setLastDraggedCell({ dayIndex: -1, timeIndex: -1 });
    }
    
    // マウスダウンタイマーがあればクリア（長押しキャンセル）
    if (mouseDownTimer) {
      clearTimeout(mouseDownTimer);
      setMouseDownTimer(null);
    }
  };

  // モバイル用タッチイベントハンドラ
  const handleCellTouchStart = (dayIndex, timeIndex, e) => {
    e.preventDefault(); // デフォルトのタッチイベントを防止
    
    const date = weekDates[dayIndex];
    if (!date) return;
    
    setTouchStartCell({ dayIndex, timeIndex });
    
    // 既存のタイマーがあればクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // 選択状態を確認
    const dateTimeKey = getDateTimeKey(date, timeIndex);
    const isSelected = selectedDates.includes(dateTimeKey);
    
    // 長押し判定用のタイマーを設定
    const timer = setTimeout(() => {
      // 長押し検出時の処理
      setIsDragging(true);
      setIsDragToDeselect(isSelected);
      setDragStartCell({ dayIndex, timeIndex });
      setLastDraggedCell({ dayIndex, timeIndex });
      setIsLongPress(true);
      
      // バイブレーション（対応デバイスのみ）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // 長押し開始時に最初のセルを選択/選択解除する
      const newSelection = [...selectedDates];
      const existingIndex = newSelection.findIndex(item => item === dateTimeKey);
      
      // ドラッグモードに基づいて選択/選択解除する
      if (isSelected) {
        // 選択解除モード
        if (existingIndex !== -1) {
          newSelection.splice(existingIndex, 1);
        }
      } else {
        // 選択モード
        if (existingIndex === -1) {
          newSelection.push(dateTimeKey);
        }
      }
      
      // 選択状態を更新
      setSelectedDates(newSelection);
      setGeneratedText(generateText(newSelection));
      
      console.log('Long press detected (mobile):', { dayIndex, timeIndex });
    }, 500); // 500msの長押しで複数選択モードに入る
    
    setLongPressTimer(timer);
  };

  const handleCellTouchMove = (dayIndex, timeIndex, e) => {
    e.preventDefault(); // デフォルトのタッチイベントを防止
    
    // ドラッグ中でなければ何もしない
    if (!isDragging) return;
    
    // タッチ中のセル座標を取得
    const touch = e.touches[0];
    setCurrentTouch({ x: touch.clientX, y: touch.clientY });
    
    // タッチ位置からセルを特定
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // グリッド内の位置を計算
      const cellWidth = (rect.width - 50) / 7; // 最初の列（時間列）を除いた幅を7等分
      const cellHeight = (rect.height - 50) / 14; // 最初の行（日付行）を除いた高さを14等分
      
      // セルのインデックスを計算
      const touchDayIndex = Math.floor((x - 50) / cellWidth);
      const touchTimeIndex = Math.floor((y - 50) / cellHeight);
      
      // 有効範囲内であれば処理
      if (touchDayIndex >= 0 && touchDayIndex < 7 && touchTimeIndex >= 0 && touchTimeIndex < 14) {
        // 同じセルの場合は処理しない（パフォーマンス向上）
        if (lastDraggedCell && lastDraggedCell.dayIndex === touchDayIndex && lastDraggedCell.timeIndex === touchTimeIndex) {
          return;
        }
        
        const date = weekDates[touchDayIndex];
        if (!date) return;
        
        const dateTimeKey = getDateTimeKey(date, touchTimeIndex);
        const newSelection = [...selectedDates];
        
        // ドラッグモードに基づいて選択/選択解除する
        if (isDragToDeselect) {
          // 選択解除モード
          const existingIndex = newSelection.findIndex(item => item === dateTimeKey);
          if (existingIndex !== -1) {
            newSelection.splice(existingIndex, 1);
          }
        } else {
          // 選択モード
          if (!newSelection.includes(dateTimeKey)) {
            newSelection.push(dateTimeKey);
          }
        }
        
        // 選択状態を更新
        setSelectedDates(newSelection);
        setGeneratedText(generateText(newSelection));
        setLastDraggedCell({ dayIndex: touchDayIndex, timeIndex: touchTimeIndex });
      }
    }
  };

  const handleCellTouchEnd = (dayIndex, timeIndex) => {
    // タッチ終了でドラッグ終了
    if (isDragging) {
      setIsDragging(false);
      setIsLongPress(false);
      setDragStartCell({ dayIndex: -1, timeIndex: -1 });
      setLastDraggedCell({ dayIndex: -1, timeIndex: -1 });
    } else {
      // ドラッグでなければクリックとして処理（単一セルの選択/選択解除）
      const startCell = touchStartCell;
      if (startCell && startCell.dayIndex === dayIndex && startCell.timeIndex === timeIndex) {
        handleCellClick(dayIndex, timeIndex);
      }
    }
    
    // 長押しタイマーがあればクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    setTouchStartCell(null);
    setCurrentTouch(null);
  };
  
  // Popup close handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendarPopup && popupRef.current && !popupRef.current.contains(event.target)) {
        setShowCalendarPopup(false);
      }
      
      if (showSettingsPopup && settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
        setShowSettingsPopup(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendarPopup, showSettingsPopup]);
  
  // Current time position calculation
  useEffect(() => {
    const calculateCurrentTimePosition = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // 8:00から21:59までの時間を0%から100%にマッピング
      if (hour >= 8 && hour < 22) {
        const hourOffset = hour - 8;
        const minutePercentage = minute / 60;
        const position = ((hourOffset + minutePercentage) / 14) * 100;
        setCurrentTimePosition(position);
      } else {
        setCurrentTimePosition(0);
      }
    };
    
    calculateCurrentTimePosition();
    const timer = setInterval(calculateCurrentTimePosition, 60000); // 1分ごとに更新
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  
  // Text generation
  const generateText = (selectedDates) => {
    if (!selectedDates.length) return '';
    
    // 日付ごとに整理
    const dateMap = new Map();
    
    selectedDates.forEach(dateTimeStr => {
      const date = new Date(dateTimeStr);
      const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:00`;
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      
      dateMap.get(dateStr).push(timeStr);
    });
    
    // 日付順にソート
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    // テキスト生成
    let text = '';
    
    sortedDates.forEach(dateStr => {
      const times = dateMap.get(dateStr).sort();
      
      // 連続した時間をまとめる
      const timeRanges = [];
      let start = null;
      let end = null;
      
      times.forEach(time => {
        const hour = parseInt(time.split(':')[0], 10);
        
        if (start === null) {
          start = hour;
          end = hour;
        } else if (hour === end + 1) {
          end = hour;
        } else {
          timeRanges.push({ start, end });
          start = hour;
          end = hour;
        }
      });
      
      if (start !== null) {
        timeRanges.push({ start, end });
      }
      
      // 日付と時間範囲を追加
      const [year, month, day] = dateStr.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const weekdayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      
      text += `${month}/${day}(${weekdayName}) `;
      
      const timeTexts = timeRanges.map(range => {
        if (range.start === range.end) {
          return `${range.start}:00`;
        } else {
          return `${range.start}:00-${range.end + 1}:00`;
        }
      });
      
      text += timeTexts.join(', ');
      text += '\n';
    });
    
    return text;
  };
  
  // Selection reset
  const resetSelection = () => {
    setSelectedDates([]);
    setGeneratedText('');
  };
  
  // ポップオーバーの月を現在の週に合わせる
  useEffect(() => {
    if (weekDates.length > 0) {
      setPopupMonth(new Date(weekDates[0]));
    }
  }, [weekDates]);

  // Mobile layout detection
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  // Render for mobile or desktop
  const renderMobileLayout = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflow: 'hidden' 
      }}>
        {/* ヘッダー */}
        <CalendarHeader
          currentDate={currentDate}
          weekDates={weekDates}
          todayIndex={todayIndex}
          previousWeek={previousWeek}
          nextWeek={nextWeek}
          goToToday={goToToday}
          showCalendarPopup={showCalendarPopup}
          setShowCalendarPopup={setShowCalendarPopup}
          isAuthenticated={isAuthenticated}
          userInfo={userInfo}
          handleLogin={handleLogin}
          handleCustomLogout={handleCustomLogout}
        />
        
        {/* カレンダーグリッド */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CalendarGrid
            weekDates={weekDates}
            weekdays={weekdays}
            timeSlots={timeSlots}
            todayIndex={todayIndex}
            selectedDates={selectedDates}
            events={events}
            calendarSettings={calendarSettings}
            userInfo={userInfo}
            handleCellClick={handleCellClick}
            handleCellMouseDown={handleCellMouseDown}
            handleCellMouseEnter={handleCellMouseEnter}
            handleCellMouseUp={handleCellMouseUp}
            handleCellTouchStart={handleCellTouchStart}
            handleCellTouchMove={handleCellTouchMove}
            handleCellTouchEnd={handleCellTouchEnd}
            currentTimePosition={currentTimePosition}
            gridRef={gridRef}
          />
        </div>
        
        {/* テキスト出力エリア */}
        <TextOutputArea
          generatedText={generatedText}
          setGeneratedText={setGeneratedText}
          isTextAreaFocused={isTextAreaFocused}
          setIsTextAreaFocused={setIsTextAreaFocused}
          textAreaRef={textAreaRef}
          resetSelection={resetSelection}
        />
      </div>
    );
  };

  const renderDesktopLayout = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflow: 'hidden' 
      }}>
        {/* ヘッダー */}
        <CalendarHeader
          currentDate={currentDate}
          weekDates={weekDates}
          todayIndex={todayIndex}
          previousWeek={previousWeek}
          nextWeek={nextWeek}
          goToToday={goToToday}
          showCalendarPopup={showCalendarPopup}
          setShowCalendarPopup={setShowCalendarPopup}
          isAuthenticated={isAuthenticated}
          userInfo={userInfo}
          handleLogin={handleLogin}
          handleCustomLogout={handleCustomLogout}
        />
        
        {/* メインコンテンツエリア */}
        <div style={{ 
          display: 'flex', 
          flex: 1, 
          overflow: 'hidden' 
        }}>
          {/* カレンダーグリッド */}
          <div style={{ flex: 2, overflow: 'auto', minWidth: 0 }}>
            <CalendarGrid
              weekDates={weekDates}
              weekdays={weekdays}
              timeSlots={timeSlots}
              todayIndex={todayIndex}
              selectedDates={selectedDates}
              events={events}
              calendarSettings={calendarSettings}
              userInfo={userInfo}
              handleCellClick={handleCellClick}
              handleCellMouseDown={handleCellMouseDown}
              handleCellMouseEnter={handleCellMouseEnter}
              handleCellMouseUp={handleCellMouseUp}
              handleCellTouchStart={handleCellTouchStart}
              handleCellTouchMove={handleCellTouchMove}
              handleCellTouchEnd={handleCellTouchEnd}
              currentTimePosition={currentTimePosition}
              gridRef={gridRef}
            />
          </div>
          
          {/* テキスト出力エリア */}
          <div style={{ 
            flex: 1, 
            borderLeft: '1px solid #e0e0e0', 
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <TextOutputArea
              generatedText={generatedText}
              setGeneratedText={setGeneratedText}
              isTextAreaFocused={isTextAreaFocused}
              setIsTextAreaFocused={setIsTextAreaFocused}
              textAreaRef={textAreaRef}
              resetSelection={resetSelection}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      
      {/* ミニカレンダーポップアップ */}
      <MiniCalendar
        showCalendarPopup={showCalendarPopup}
        setShowCalendarPopup={setShowCalendarPopup}
        popupMonth={popupMonth}
        setPopupMonth={setPopupMonth}
        setCurrentDate={setCurrentDate}
        popupRef={popupRef}
        weekDates={weekDates}
      />
      
      {/* 設定ポップアップ */}
      <SettingsPopup
        showSettingsPopup={showSettingsPopup}
        setShowSettingsPopup={setShowSettingsPopup}
        calendarSettings={calendarSettings}
        updateCalendarSettings={updateCalendarSettings}
        calendars={calendars}
        toggleCalendarSelection={toggleCalendarSelection}
        settingsPopupRef={settingsPopupRef}
      />
      
      {/* ローディングインジケーター */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div>読み込み中...</div>
        </div>
      )}
    </div>
  );
};

export default CalendarTextGenerator; 