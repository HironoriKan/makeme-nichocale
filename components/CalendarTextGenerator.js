'use client';

import React, { useState, useEffect, useRef } from 'react';

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

  // Custom hook for viewport height
  const useViewportHeight = () => {
    const [viewportHeight, setViewportHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        // 初期値を設定
        setViewportHeight(window.innerHeight);
        
        const handleResize = () => {
          const vh = window.innerHeight;
          const previousHeight = viewportHeight;
          
          if (previousHeight - vh > 100) {
            setIsKeyboardVisible(true);
            setKeyboardHeight(previousHeight - vh);
          } else if (vh - previousHeight > 100) {
            setIsKeyboardVisible(false);
            setKeyboardHeight(0);
          }
          
          setViewportHeight(vh);
          document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
          setTimeout(handleResize, 100);
        });
        window.addEventListener('scroll', () => {
          setTimeout(handleResize, 100);
        });

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('orientationchange', handleResize);
          window.removeEventListener('scroll', handleResize);
        };
      }
    }, [viewportHeight]);

    return { viewportHeight, isKeyboardVisible, keyboardHeight };
  };

  const { viewportHeight, isKeyboardVisible, keyboardHeight } = useViewportHeight();

  // 現在の週の日付を計算
  const calculateWeekDates = (startDate) => {
    const dates = [];
    const date = new Date(startDate);
    date.setDate(date.getDate() - date.getDay() + 1); // 月曜日から開始
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return dates;
  };
  
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

  // Date-time key generation
  const getDateTimeKey = (date, timeIndex) => {
    const d = new Date(date);
    d.setHours(timeIndex + 8, 0, 0, 0);
    return d.toISOString();
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
    
    // 開始セルから現在のセルまでのすべてのセルを処理
    const startCell = dragStartCell;
    const currentCell = { dayIndex, timeIndex };
    
    // 開始セルと現在のセルの間にあるすべてのセルを計算
    const minDayIndex = Math.min(startCell.dayIndex, currentCell.dayIndex);
    const maxDayIndex = Math.max(startCell.dayIndex, currentCell.dayIndex);
    const minTimeIndex = Math.min(startCell.timeIndex, currentCell.timeIndex);
    const maxTimeIndex = Math.max(startCell.timeIndex, currentCell.timeIndex);
    
    // 新しい選択を開始
    let newSelection = [...selectedDates];
    
    // 範囲内のすべてのセルを処理
    for (let di = minDayIndex; di <= maxDayIndex; di++) {
      const rangeDate = weekDates[di];
      if (!rangeDate) continue;
      
      for (let ti = minTimeIndex; ti <= maxTimeIndex; ti++) {
        const rangeDateTimeKey = getDateTimeKey(rangeDate, ti);
        const existingIndex = newSelection.findIndex(item => item === rangeDateTimeKey);
        
        // ドラッグモードに基づいて選択/選択解除
        if (isDragToDeselect) {
          // 選択解除モード
          if (existingIndex !== -1) {
            newSelection.splice(existingIndex, 1);
          }
        } else {
          // 選択モード
          if (existingIndex === -1) {
            newSelection.push(rangeDateTimeKey);
          }
        }
      }
    }
    
    // 状態を更新
    setSelectedDates(newSelection);
    setLastDraggedCell(currentCell);
    setGeneratedText(generateText(newSelection));
    
    console.log('Drag over cell', { minDayIndex, maxDayIndex, minTimeIndex, maxTimeIndex, selectedCount: newSelection.length });
  };

  const handleMouseUp = (dayIndex, timeIndex) => {
    // タイマーをクリア
    if (mouseDownTimer) {
      clearTimeout(mouseDownTimer);
      setMouseDownTimer(null);
    }
    
    // 長押しではなく、ドラッグもしていない場合は通常のクリック処理
    if (!isLongPress && !isDragging) {
      handleCellClick(dayIndex, timeIndex);
    }
    
    // ドラッグ操作の終了
    if (isDragging) {
      setIsDragging(false);
    }
    
    // 長押し状態をリセット
    setIsLongPress(false);
  };

  // Touch event handlers
  const handleCellTouchStart = (dayIndex, timeIndex, e) => {
    // クリック同様のタップ処理を実装
    const date = weekDates[dayIndex];
    if (!date) return;
    
    // 長押しによる複数選択のためのタイマーを設定
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    const timer = setTimeout(() => {
      // 長押し検出（複数選択モード）
      const dateTimeKey = getDateTimeKey(date, timeIndex);
      const isSelected = selectedDates.includes(dateTimeKey);
      
      setIsDragging(true);
      setIsDragToDeselect(isSelected);
      setDragStartCell({ dayIndex, timeIndex });
      setLastDraggedCell({ dayIndex, timeIndex });
      setIsLongPress(true);
      
      // 視覚的フィードバック（振動など）
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50); // 50msの振動フィードバック
      }
      
      // 重要: 長押し開始時に最初のセルを選択/選択解除する
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
      
      console.log('Long press detected:', { dayIndex, timeIndex });
    }, 500); // 500msの長押しで複数選択モードに入る
    
    setLongPressTimer(timer);
  };
  
  // 通常のタップ終了（長押しではない）
  const handleCellTouchEnd = (dayIndex, timeIndex, e) => {
    // 長押しタイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 長押しフラグがセットされていない場合は、通常のタップとして処理
    if (!isLongPress && !isDragging) {
      handleCellClick(dayIndex, timeIndex);
    }
    
    // 長押し状態をリセット
    setTimeout(() => {
      setIsLongPress(false);
    }, 50);
  };

  // タッチムーブイベント - ドラッグ選択用
  const handleTouchMove = (e) => {
    if (!isLongPress) return; // 長押し後のみドラッグ選択を許可
    
    if (isDragging && typeof document !== 'undefined') {
      try {
        e.preventDefault(); // スクロールを防止
        
        if (e.touches && e.touches.length > 0) {
          const touch = e.touches[0];
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          
          if (element && element.dataset && 
              element.dataset.dayIndex !== undefined && 
              element.dataset.timeIndex !== undefined) {
            const dayIndex = parseInt(element.dataset.dayIndex);
            const timeIndex = parseInt(element.dataset.timeIndex);
            
            // 開始セルから現在のセルまでの範囲を選択するロジックを使用
            handleCellMouseEnter(dayIndex, timeIndex);
          }
        }
      } catch (error) {
        console.error('タッチ移動処理中にエラーが発生しました:', error);
      }
    }
  };

  // ドキュメントレベルのタッチ終了イベント
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isDragging) {
      setIsDragging(false);
      
      setTimeout(() => {
        setIsLongPress(false);
      }, 50);
    }
  };

  // グローバルなタッチイベント処理を追加
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // 長押し中のスクロールを防止
    const preventScroll = (e) => {
      if (isLongPress && isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isLongPress, isDragging]);

  // Text generation
  const generateText = (dates = selectedDates) => {
    let text = '';
    const dateGroups = new Map();
    
    dates.forEach((dateTimeKey) => {
      const date = new Date(dateTimeKey);
      const dateKey = date.toDateString();
      const hour = date.getHours();
      
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey).push(hour);
    });

    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      const hours = dateGroups.get(dateKey).sort((a, b) => a - b);
      
      if (hours.length > 0) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const jpWeekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        
        text += `${month}月${day}日(${jpWeekday}) `;
        
        let startHour = null;
        let endHour = null;
        
        hours.forEach(hour => {
          if (startHour === null) {
            startHour = hour;
            endHour = hour + 1;
          } else if (hour === endHour) {
            endHour = hour + 1;
          } else {
            text += `${startHour}:00-${endHour}:00 `;
            startHour = hour;
            endHour = hour + 1;
          }
        });
        
        if (startHour !== null) {
          text += `${startHour}:00-${endHour}:00 `;
        }
        
        text += '\n';
      }
    });
    
    setGeneratedText(text.trim());
    return text.trim();
  };

  // Effect for text generation
  useEffect(() => {
    generateText();
  }, [selectedDates, weekDates]);

  // Utility functions
  const resetSelection = () => {
    setSelectedDates([]);
    setGeneratedText('');
  };

  // モバイルデバイスかどうかを判定
  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // テキストをクリップボードにコピー
  const copyToClipboard = () => {
    if (!generatedText) return;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(generatedText)
          .then(() => {
            alert('コピーしました！');
          })
          .catch(err => {
            console.error('クリップボードへのコピーに失敗しました:', err);
            fallbackCopyToClipboard();
          });
      } else {
        fallbackCopyToClipboard();
      }
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
      fallbackCopyToClipboard();
    }
  };

  // クリップボードコピーのフォールバック
  const fallbackCopyToClipboard = () => {
    if (typeof document === 'undefined' || !textAreaRef.current) return;
    
    try {
      // テキストエリアの内容を選択してコピー
      const range = document.createRange();
      range.selectNodeContents(textAreaRef.current);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      document.execCommand('copy');
      selection.removeAllRanges();
      
      alert('コピーしました！');
    } catch (err) {
      console.error('フォールバックコピーに失敗しました:', err);
      alert('コピーできませんでした。テキストを手動で選択してコピーしてください。');
    }
  };

  // Check if time slot is occupied by an event
  const isTimeSlotOccupied = (date, hour) => {
    if (!date || !events || !events.length) return false;

    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    for (const event of events) {
      // 終日予定の場合は特別処理
      if (isAllDayEvent(event)) {
        const eventDate = new Date(event.start.date);
        // 日付のみを比較（時間は無視）
        const isSameDay = 
          date.getFullYear() === eventDate.getFullYear() && 
          date.getMonth() === eventDate.getMonth() && 
          date.getDate() === eventDate.getDate();
        
        // 終日予定があっても、チェックが入っていればfalseを返す（選択可能）
        if (isSameDay) {
          if (calendarSettings.allowAllDayEvents) {
            continue; // 終日予定は無視して次のイベントをチェック
          } else {
            return true; // チェックがなければ選択不可
          }
        }
      }

      // 未回答予定の場合
      if (isTentativeEvent(event)) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        if (slotStart < eventEnd && slotEnd > eventStart) {
          // 未回答予定があっても、チェックが入っていればfalseを返す（選択可能）
          if (calendarSettings.allowTentativeEvents) {
            continue; // 未回答予定は無視して次のイベントをチェック
          } else {
            return true; // チェックがなければ選択不可
          }
        }
      }
      
      // その他の通常予定の場合
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        return true; // 通常予定は常に選択不可
      }
    }
    
    return false; // どのイベントにも該当しない場合は選択可能
  };

  // Get event for a specific time slot
  const getEventForTimeSlot = (date, hour) => {
    if (!date || !events || !events.length) return null;

    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    for (const event of events) {
      // 終日予定の場合
      if (isAllDayEvent(event)) {
        const eventDate = new Date(event.start.date);
        // 日付のみを比較（時間は無視）
        const isSameDay = 
          date.getFullYear() === eventDate.getFullYear() && 
          date.getMonth() === eventDate.getMonth() && 
          date.getDate() === eventDate.getDate();
        
        // 終日予定がある日で、チェックされていない場合のみイベントを返す
        if (isSameDay && !calendarSettings.allowAllDayEvents) {
          event.isAllDay = true;
          event.isTentative = isTentativeEvent(event);
          event.isSelectable = false;
          return event;
        }
        // チェックがついている場合は、この日の終日予定は無視
        if (isSameDay) {
          continue;
        }
      }

      // 未回答予定の場合
      if (isTentativeEvent(event)) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        if (slotStart < eventEnd && slotEnd > eventStart) {
          // 未回答予定で、チェックされていない場合のみイベントを返す
          if (!calendarSettings.allowTentativeEvents) {
            event.isAllDay = isAllDayEvent(event);
            event.isTentative = true;
            event.isSelectable = false;
            return event;
          }
          // チェックがついている場合は、この時間の未回答予定は無視
          continue;
        }
      }

      // 通常予定の場合
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        event.isAllDay = isAllDayEvent(event);
        event.isTentative = isTentativeEvent(event);
        event.isSelectable = true;
        return event;
      }
    }
    
    return null;
  };

  // Format event time
  const formatEventTime = (event) => {
    if (!event) return '';
    
    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);
    
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    
    const startTime = `${startHour}:${startMinute === 0 ? '00' : startMinute}`;
    const endTime = `${endHour}:${endMinute === 0 ? '00' : endMinute}`;
    
    return `${startTime}-${endTime}`;
  };

  // Format event title
  const formatEventTitle = (event) => {
    if (!event || !event.summary) return '';
    
    // 長いタイトルを省略（より短く）
    return event.summary.length > 6 ? `${event.summary.substring(0, 4)}..` : event.summary;
  };

  // Selected slots calculation
  const getSelectedSlots = () => {
    const slots = Array(7).fill().map(() => Array(14).fill(false));
    
    weekDates.forEach((date, dayIndex) => {
      if (!date) return;
      
      for (let timeIndex = 0; timeIndex < 14; timeIndex++) {
        const key = getDateTimeKey(date, timeIndex);
        if (selectedDates.includes(key)) {
          slots[dayIndex][timeIndex] = true;
        }
      }
    });
    
    return slots;
  };

  // Calendar popup rendering
  const renderCalendarPopup = () => {
    if (!showCalendarPopup) return null;
    
    const firstDayOfMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth() + 1, 0);
    let firstDayOfWeek = firstDayOfMonth.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = lastDayOfMonth.getDate();
    const lastDayOfPrevMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), 0);
    const daysInPrevMonth = lastDayOfPrevMonth.getDate();
    const rows = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
    const weekdaysForPopup = ['月', '火', '水', '木', '金', '土', '日'];
    
    return (
      <div 
        ref={popupRef}
        className="absolute top-10 left-0 bg-white shadow-lg rounded-lg z-50 p-2"
        style={{ 
          width: '300px',
          border: '1px solid #CB8585'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => {
              const newMonth = new Date(popupMonth);
              newMonth.setMonth(popupMonth.getMonth() - 1);
              setPopupMonth(newMonth);
            }}
            className="p-1"
          >
            &lt;
          </button>
          <div className="font-bold">
            {popupMonth.getFullYear()}年{popupMonth.getMonth() + 1}月
          </div>
          <button 
            onClick={() => {
              const newMonth = new Date(popupMonth);
              newMonth.setMonth(popupMonth.getMonth() + 1);
              setPopupMonth(newMonth);
            }}
            className="p-1"
          >
            &gt;
          </button>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {weekdaysForPopup.map((day, index) => (
                <th key={index} className="text-center text-xs p-1">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 7 }).map((_, colIndex) => {
                  const dayNumber = rowIndex * 7 + colIndex - firstDayOfWeek + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                  const prevMonthDay = daysInPrevMonth - firstDayOfWeek + colIndex + 1;
                  const nextMonthDay = dayNumber - daysInMonth;
                  const displayDay = isCurrentMonth 
                    ? dayNumber 
                    : (dayNumber <= 0 ? prevMonthDay : nextMonthDay);
                  
                  let dateObj;
                  if (isCurrentMonth) {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), dayNumber);
                  } else if (dayNumber <= 0) {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth() - 1, prevMonthDay);
                  } else {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth() + 1, nextMonthDay);
                  }
                  
                  const isToday = dateObj.getDate() === today.getDate() && 
                                dateObj.getMonth() === today.getMonth() && 
                                dateObj.getFullYear() === today.getFullYear();
                  
                  const isInSelectedWeek = weekDates.some(date => 
                    date && date.getDate() === dateObj.getDate() && 
                    date.getMonth() === dateObj.getMonth() && 
                    date.getFullYear() === dateObj.getFullYear()
                  );
                  
                  return (
                    <td 
                      key={colIndex} 
                      className={`text-center p-1 cursor-pointer ${
                        isCurrentMonth ? '' : 'text-gray-400'
                      } ${
                        isInSelectedWeek ? 'bg-red-100' : ''
                      }`}
                      onClick={() => {
                        setCurrentDate(dateObj);
                        setShowCalendarPopup(false);
                      }}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 mx-auto ${
                        isToday ? 'bg-red-400 text-white rounded-full' : ''
                      }`}>
                        {displayDay}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Current time position calculation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const calculateTimePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours >= 8 && hours < 22) {
        const fiveMinuteInterval = Math.floor(minutes / 5);
        const cellHeight = 36; // 調整されたセルの高さ
        const hourPosition = (hours - 8) * cellHeight;
        const minutePosition = (fiveMinuteInterval * 5 / 60) * cellHeight;
        
        setCurrentTimePosition(hourPosition + minutePosition);
      } else {
        setCurrentTimePosition(-1);
      }
    };
    
    calculateTimePosition();
    const interval = setInterval(calculateTimePosition, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Click outside popup handler
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowCalendarPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popupRef]);

  // Document-level event listeners
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // マウスアップでドラッグ操作を終了する
    const handleDocumentMouseUp = () => {
      if (mouseDownTimer) {
        clearTimeout(mouseDownTimer);
        setMouseDownTimer(null);
      }
      
      if (isDragging) {
        setIsDragging(false);
        console.log('Drag ended - selections:', selectedDates.length);
      }
      
      // 長押し状態をリセット
      setIsLongPress(false);
    };
    
    // タッチ終了時の処理（ローカル関数として定義）
    const handleDocumentTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      
      if (isDragging) {
        setIsDragging(false);
        
        setTimeout(() => {
          setIsLongPress(false);
        }, 50);
      }
    };
    
    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('touchend', handleDocumentTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      document.removeEventListener('touchend', handleDocumentTouchEnd);
    };
  }, [isDragging, selectedDates.length, longPressTimer, mouseDownTimer]);

  // Touch event handler for document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleDocumentTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleDocumentTouchMove);
    };
  }, [isDragging]);

  // Text area focus handler
  const handleTextAreaFocus = () => {
    setIsTextAreaFocused(true);
    
    // iOSの場合、フォーカス時にスクロールを調整
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && typeof window !== 'undefined') {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  };

  // Settings popup click handler
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // ポップアップ外のクリックを処理する関数
    const handleClickOutside = (event) => {
      // 直接の親要素（設定ボタン）をクリックした場合は無視
      // これにより、ボタンクリックでの開閉が正常に動作する
      const settingsButton = document.querySelector('.settings-button');
      if (settingsButton && settingsButton.contains(event.target)) {
        return;
      }
      
      // ポップアップ内のクリックでなければ閉じる
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
        setShowSettingsPopup(false);
      }
    };
    
    // ポップアップが表示されている場合のみイベントリスナーを追加
    if (showSettingsPopup) {
      // タイミングを遅らせてイベントリスナーを追加（即座の誤クリックを防止）
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
    
    return () => {};
  }, [settingsPopupRef, showSettingsPopup]);

  // Settings popup rendering
  const renderSettingsPopup = () => {
    if (!showSettingsPopup || !isAuthenticated) return null;
    
    // ポップアップ内のクリックイベントを完全に阻止
    const preventPopupClose = (e) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    };
    
    return (
      <div 
        ref={settingsPopupRef}
        className="absolute top-12 right-2 bg-white shadow-lg rounded-lg z-50 p-3"
        style={{ 
          width: '280px',
          border: '1px solid #ddd',
          maxHeight: '540px',
          overflowY: 'auto'
        }}
        onClick={preventPopupClose}
        onTouchStart={preventPopupClose}
        onMouseDown={preventPopupClose}
      >
        <div className="font-bold mb-2 pb-2 border-b border-gray-200">カレンダー設定</div>
        
        <div className="text-sm text-gray-700 mb-2">表示するカレンダーを選択</div>
        
        {/* カレンダー選択の操作ボタン */}
        <div className="flex justify-end mb-2">
          <button
            onClick={(e) => {
              preventPopupClose(e);
              calendars.forEach(calendar => {
                if (calendar.selected) {
                  toggleCalendarSelection(calendar.id);
                }
              });
            }}
            className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
          >
            すべて解除
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {calendars.map(calendar => (
            <div key={calendar.id} className="flex items-center" onClick={preventPopupClose}>
              <input
                type="checkbox"
                id={`calendar-${calendar.id}`}
                checked={calendar.selected}
                onChange={(e) => {
                  preventPopupClose(e);
                  toggleCalendarSelection(calendar.id);
                }}
                className="mr-2"
              />
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: calendar.color }}
              ></div>
              <label 
                htmlFor={`calendar-${calendar.id}`}
                className="text-sm text-gray-800 truncate"
                style={{ maxWidth: '200px' }}
              >
                {calendar.name}
              </label>
            </div>
          ))}
        </div>
        
        {calendars.length <= 1 && (
          <div className="text-xs text-gray-500 mt-2 mb-4">
            共有カレンダーがありません。Google カレンダーで他の人のカレンダーを追加すると、ここに表示されます。
          </div>
        )}

        {/* 終日予定や未回答予定の設定 */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <div className="font-bold text-sm mb-2">予定の表示設定</div>
          
          {/* 終日予定の設定 */}
          <div className="flex items-center my-3" onClick={preventPopupClose}>
            <input
              type="checkbox"
              id="allow-all-day-events"
              checked={calendarSettings.allowAllDayEvents}
              onChange={(e) => {
                preventPopupClose(e);
                updateCalendarSettings('allowAllDayEvents', e.target.checked);
              }}
              className="mr-2"
            />
            <label htmlFor="allow-all-day-events" className="text-sm text-gray-800">
              終日予定がある日を表示しない
            </label>
          </div>
          
          {/* 未回答予定の設定 */}
          <div className="flex items-center my-3" onClick={preventPopupClose}>
            <input
              type="checkbox"
              id="allow-tentative-events"
              checked={calendarSettings.allowTentativeEvents}
              onChange={(e) => {
                preventPopupClose(e);
                updateCalendarSettings('allowTentativeEvents', e.target.checked);
              }}
              className="mr-2"
            />
            <label htmlFor="allow-tentative-events" className="text-sm text-gray-800">
              未回答/未定の予定がある時間を表示しない
            </label>
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            チェックを入れると、その予定がある時間も選択できるようになります。
          </div>
        </div>
      </div>
    );
  };

  // Event color
  const getEventColor = (event) => {
    return event.calendarColor || '#4285F4';
  };

  // 予定の種類を判定する関数
  const isAllDayEvent = (event) => {
    return event.start.date !== undefined;
  };

  const isTentativeEvent = (event) => {
    return event.status === 'tentative' || 
           (event.attendees && event.attendees.some(attendee => 
             (attendee.email === userInfo?.emailAddresses?.[0]?.value) && 
             (attendee.responseStatus === 'needsAction' || attendee.responseStatus === 'tentative')
           ));
  };

  // イベントがスロットで選択可能かどうかを判定
  const isEventSelectable = (event) => {
    if (isAllDayEvent(event) && !calendarSettings.allowAllDayEvents) {
      return false;
    }
    
    if (isTentativeEvent(event) && !calendarSettings.allowTentativeEvents) {
      return false;
    }
    
    return true;
  };

  // イベントセルをレンダリング
  const renderEventCell = (event, isOccupied, isSelected) => {
    let bgColor = isOccupied ? getEventColor(event) : (isSelected ? '#FDA4AF' : '#FEE2E2');
    let opacity = isOccupied ? (event?.isAllDay ? 0.6 : event?.isTentative ? 0.5 : 0.7) : 1;
    
    // スタイリングを適用
    const cellStyle = {
      backgroundColor: bgColor,
      opacity: opacity,
      // 選択状態の場合、予定の有無に関わらず明確な枠線を表示
      boxShadow: isSelected ? '0 0 0 2px #E11D48' : 'none',
      // 枠線のコントラストを高める
      border: isSelected ? '1px solid #ffffff' : 'none',
      width: '94%',
      height: '94%',
      borderRadius: '8px',
      position: 'relative',
      zIndex: isSelected ? 2 : 1,
    };
    
    return (
      <div 
        className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden"
        style={cellStyle}
      >
        {isOccupied && (
          <div className="text-xs text-white p-1 overflow-hidden text-center leading-none select-none">
            {event?.isAllDay && <span className="text-[8px] opacity-80 select-none">終日</span>}
            {event?.isTentative && <span className="text-[8px] opacity-80 select-none">未定</span>}
            <span className="select-none">{formatEventTitle(event)}</span>
          </div>
        )}
      </div>
    );
  };

  // テキストエリアの内容変更ハンドラ
  const handleTextAreaChange = (e) => {
    if (e.currentTarget) {
      setGeneratedText(e.currentTarget.textContent || '');
    }
  };

  // ビューポートの高さを計算して調整する
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // ビューポート高さと要素の高さを設定する関数
    const adjustHeights = () => {
      try {
        // iPhoneのセーフエリア対応
        const safeBottom = window.innerHeight - document.documentElement.clientHeight;
        document.documentElement.style.setProperty('--safe-bottom', `${safeBottom > 0 ? safeBottom : 0}px`);
        
        // ビューポートの高さを設定
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // 固定高さの合計を計算（DOM参照を避けて固定値を使用）
        const headerHeight = 48;         // ヘッダー
        const navHeight = 48;            // ナビゲーションバー
        const calendarHeaderHeight = 50; // カレンダーヘッダー
        const textAreaHeight = 110;      // テキストエリア
        const buttonAreaHeight = 60;     // ボタンエリア
        const footerHeight = 20;         // 下部スペース
        
        // 合計固定高さ
        const fixedHeight = headerHeight + navHeight + calendarHeaderHeight + textAreaHeight + buttonAreaHeight + footerHeight;
        
        // 利用可能な高さを計算
        const availableHeight = window.innerHeight - fixedHeight;
        
        // 画面幅からグリッドの幅を計算（左右のマージンを考慮）
        const screenWidth = window.innerWidth;
        const timeColumnWidth = 40; // 時間列の幅
        const availableWidth = screenWidth - timeColumnWidth - 16; // 左右の余白を考慮
        
        // セルの幅を計算（7日分で割る）
        const cellWidth = Math.floor(availableWidth / 7);
        
        // 正方形のセルにするため、高さ＝幅に設定
        const cellHeight = cellWidth;
        
        // グリッドの表示高さ（スクロールコンテナの高さ）を設定
        // 利用可能な高さの範囲内で、かつ少なくとも3つのセルが見えるようにする
        const gridContainerHeight = Math.min(availableHeight, Math.max(cellHeight * 3, availableHeight));
        
        // グリッドの高さをCSSカスタムプロパティに設定
        document.documentElement.style.setProperty('--grid-container-height', `${gridContainerHeight}px`);
        document.documentElement.style.setProperty('--cell-height', `${cellHeight}px`);
        document.documentElement.style.setProperty('--cell-width', `${cellWidth}px`);
      } catch (error) {
        console.error('Error adjusting heights:', error);
      }
    };
    
    // 初期化時に高さを調整
    adjustHeights();
    
    // イベントリスナーを設定
    window.addEventListener('resize', adjustHeights);
    window.addEventListener('orientationchange', () => setTimeout(adjustHeights, 100));
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', adjustHeights);
      window.removeEventListener('orientationchange', () => setTimeout(adjustHeights, 100));
    };
  }, []);

  // ミニカレンダーのポップアップを描画する
  const renderMiniCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const weeks = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
    const days = [];
    
    for (let i = 0; i < weeks * 7; i++) {
      const dayNumber = i - firstDayOfWeek + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        days.push(null);
      } else {
        days.push(new Date(year, month, dayNumber));
      }
    }

    const selectedWeekIndex = Array.from({ length: weeks }).findIndex((_, weekIndex) => {
      return Array.from({ length: 7 }).some((_, dayIndex) => {
        const day = days[weekIndex * 7 + dayIndex];
        return day && weekDates.some(date => 
          date.getDate() === day.getDate() &&
          date.getMonth() === day.getMonth() &&
          date.getFullYear() === day.getFullYear()
        );
      });
    });

    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">カレンダー</h2>
          <p className="text-sm text-gray-600">選択した週間カレンダーを表示します。</p>
        </div>
        <div className="flex justify-between items-center mb-4">
          <button onClick={previousWeek} className="text-gray-600">&lt;</button>
          <span className="font-bold">{`${year}年 ${month + 1}月`}</span>
          <button onClick={nextWeek} className="text-gray-600">&gt;</button>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              {weekdays.map(day => (
                <th key={day} className="text-center py-2 text-sm">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weeks }).map((_, weekIndex) => (
              <tr key={weekIndex} className={weekIndex === selectedWeekIndex ? 'bg-red-100' : ''}>
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = days[weekIndex * 7 + dayIndex];
                  return (
                    <td 
                      key={dayIndex}
                      className="text-center py-2 text-sm cursor-pointer"
                      onClick={() => day && setCurrentDate(day)}
                    >
                      {day?.getDate() || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // モバイル用のレイアウト
  const renderMobileLayout = () => {
    return (
      <div className="min-h-screen overflow-hidden bg-white">
        {/* ヘッダー */}
        <div className="app-header bg-white border-b p-3 fixed top-0 left-0 right-0 z-20">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">メイクミー日程調整</h1>
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center">
                  {userInfo?.photos?.[0]?.url && (
                    <img
                      src={userInfo.photos[0].url}
                      alt="User"
                      className="h-8 w-8 rounded-full cursor-pointer"
                      onClick={handleLogout}
                      title="ログアウト"
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoading || !isApiInitialized}
                  className="flex items-center justify-center rounded-full bg-red-400 text-white w-8 h-8 focus:outline-none"
                  title="Googleでログイン"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#ffffff"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ナビゲーションヘッダー */}
        <div className="nav-header fixed top-[48px] left-0 right-0 z-10 bg-white border-b">
          <div className="flex justify-between items-center p-3">
            <div className="text-lg font-semibold">
              {weekDates.length > 0 ? `${weekDates[0].getFullYear()}年 ${weekDates[0].getMonth() + 1}月` : ''}
            </div>
            <div className="flex space-x-4 items-center">
              <button onClick={previousWeek} className="text-gray-600 text-lg">&lt;</button>
              <button onClick={goToToday} className="px-3 py-1 text-xs bg-gray-100 rounded">
                今日
              </button>
              <button onClick={nextWeek} className="text-gray-600 text-lg">&gt;</button>
            </div>
          </div>
        </div>

        {/* カレンダーヘッダー (曜日) */}
        <div className="calendar-header fixed top-[96px] left-0 right-0 z-10 bg-white border-b">
          <div className="grid grid-cols-7 text-center py-3">
            {weekdays.map((weekday, index) => {
              const date = weekDates[index];
              const isToday = date && 
                date.getDate() === today.getDate() && 
                date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear();
              
              return (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500">{weekday}</div>
                  <div className={`text-base font-semibold ${isToday ? 'bg-red-400 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                    {date ? date.getDate() : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* カレンダーグリッド - モバイル最適化 */}
        <div 
          className="pt-[146px] overflow-y-auto"
          style={{ height: 'calc(var(--vh, 1vh) * 100)', overflowY: 'auto' }}
        >
          <div className="grid-container" style={{ height: 'var(--grid-height, 340px)' }}>
            <div className="grid grid-cols-7 text-center">
              {timeSlots.map((time, timeIndex) => (
                <React.Fragment key={timeIndex}>
                  <div className="text-right pr-1 text-xs text-gray-500 border-r border-t py-1">
                    {time}
                  </div>
                  {weekdays.map((_, dayIndex) => {
                    const date = weekDates[dayIndex];
                    const event = date && getEventForTimeSlot(date, timeIndex + 8);
                    const isOccupied = !!event;
                    const isSelected = getSelectedSlots()[dayIndex][timeIndex];
                    
                    return (
                      <div
                        key={dayIndex}
                        className="border-t py-1 relative h-10"
                        onTouchStart={(e) => handleCellTouchStart(dayIndex, timeIndex, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleCellTouchEnd(dayIndex, timeIndex)}
                        onClick={(e) => {
                          // タッチデバイスの場合はhandleCellTouchEndに任せる
                          if (e.nativeEvent && e.nativeEvent.pointerType !== 'touch') {
                            // マウスクリックの場合のみ処理
                            handleCellClick(dayIndex, timeIndex);
                          }
                        }}
                        data-day-index={dayIndex}
                        data-time-index={timeIndex}
                      >
                        <div className="absolute inset-0.5 flex items-center justify-center">
                          {renderEventCell(event, isOccupied, isSelected)}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* テキストエリアとボタン */}
          <div className="text-area px-4 py-3" style={{ height: '110px' }}>
            <div 
              className="bg-gray-50 p-2 rounded h-full text-sm overflow-auto"
              ref={textAreaRef}
              contentEditable={true}
              onFocus={() => setIsTextAreaFocused(true)}
              onBlur={() => setIsTextAreaFocused(false)}
              onInput={handleTextAreaChange}
            >
              {generatedText ? generatedText.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              )) : <div className="text-gray-400">カレンダーで選択した日時が、自動で入力されます。</div>}
            </div>
          </div>

          {/* ボタンエリア */}
          <div className="button-area px-4 py-3 bg-white" style={{ height: '60px' }}>
            <div className="flex space-x-3">
              <button 
                onClick={copyToClipboard} 
                disabled={!generatedText}
                className="flex-1 py-2 bg-red-400 text-white rounded-full text-sm font-bold disabled:opacity-50"
              >
                文字をコピー
              </button>
              <button 
                onClick={resetSelection}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-bold"
              >
                リセット
              </button>
            </div>
          </div>
          
          {/* 追加の下部スペース */}
          <div className="footer-space" style={{ height: '20px' }}></div>
        </div>

        {/* ミニカレンダーのポップアップ */}
        {showMiniCalendar && renderMiniCalendar()}
      </div>
    );
  };

  // デスクトップ用のレイアウト
  const renderDesktopLayout = () => {
    return (
      <div className="min-h-screen bg-gray-50 p-4 overflow-hidden">
        <div className="max-w-[1500px] mx-auto">
          {/* ヘッダー */}
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">メイクミー日程調整</h1>
            
            {/* 右側：ログインボタンまたはユーザー情報 */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center">
                  {userInfo?.photos?.[0]?.url && (
                    <img
                      src={userInfo.photos[0].url}
                      alt="ユーザー"
                      className="h-9 w-9 rounded-full cursor-pointer"
                      onClick={handleLogout}
                      title="ログアウト"
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoading || !isApiInitialized}
                  className="flex items-center justify-center rounded-full bg-red-400 text-white w-10 h-10 focus:outline-none"
                  title="Googleでログイン"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#ffffff"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* メインコンテンツ */}
          <div className="flex flex-row gap-4 overflow-hidden" style={{ height: 'calc(100vh - 150px)', minHeight: '600px' }}>
            {/* 左側：カレンダーグリッド */}
            <div className="bg-white rounded-lg shadow-sm p-4 overflow-hidden" style={{ width: 'calc(67% - 8px)', minWidth: '600px', maxWidth: '1000px' }}>
              {/* ナビゲーションと日付表示 - 左寄せに変更 */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold">
                  {weekDates.length > 0 ? `${weekDates[0].getFullYear()}年 ${weekDates[0].getMonth() + 1}月` : ''}
                </div>
                
                <div className="flex items-center space-x-4">
                  <button onClick={previousWeek} className="text-gray-600 text-lg">&lt;</button>
                  <button onClick={goToToday} className="px-4 py-1 text-sm bg-gray-100 rounded">
                    今日
                  </button>
                  <button onClick={nextWeek} className="text-gray-600 text-lg">&gt;</button>
                  
                  {/* 設定アイコン */}
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                      className="settings-button ml-2 p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* 設定ポップアップ */}
              {showSettingsPopup && isAuthenticated && (
                <div 
                  ref={settingsPopupRef}
                  className="absolute right-8 top-36 bg-white shadow-lg rounded-lg z-50 p-3"
                  style={{ 
                    width: '280px',
                    border: '1px solid #ddd',
                    maxHeight: '540px',
                    overflowY: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 設定ポップアップの内容は既存のままで問題なし */}
                  <div className="font-bold mb-2 pb-2 border-b border-gray-200">カレンダー設定</div>
                  
                  <div className="text-sm text-gray-700 mb-2">表示するカレンダーを選択</div>
                  
                  {/* カレンダー選択の操作ボタン */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        calendars.forEach(calendar => {
                          if (calendar.selected) {
                            toggleCalendarSelection(calendar.id);
                          }
                        });
                      }}
                      className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                    >
                      すべて解除
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {calendars.map(calendar => (
                      <div key={calendar.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`calendar-desktop-${calendar.id}`}
                          checked={calendar.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCalendarSelection(calendar.id);
                          }}
                          className="mr-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: calendar.color }}
                        ></div>
                        <label 
                          htmlFor={`calendar-desktop-${calendar.id}`}
                          className="text-sm text-gray-800 truncate"
                          style={{ maxWidth: '200px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {calendar.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {calendars.length <= 1 && (
                    <div className="text-xs text-gray-500 mt-2 mb-4">
                      共有カレンダーがありません。Google カレンダーで他の人のカレンダーを追加すると、ここに表示されます。
                    </div>
                  )}

                  {/* 終日予定や未回答予定の設定 */}
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <div className="font-bold text-sm mb-2">予定の表示設定</div>
                    
                    {/* 終日予定の設定 */}
                    <div className="flex items-center my-3">
                      <input
                        type="checkbox"
                        id="allow-all-day-events-desktop"
                        checked={calendarSettings.allowAllDayEvents}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateCalendarSettings('allowAllDayEvents', e.target.checked);
                        }}
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor="allow-all-day-events-desktop" className="text-sm text-gray-800" onClick={(e) => e.stopPropagation()}>
                        終日予定がある日を表示しない
                      </label>
                    </div>
                    
                    {/* 未回答予定の設定 */}
                    <div className="flex items-center my-3">
                      <input
                        type="checkbox"
                        id="allow-tentative-events-desktop"
                        checked={calendarSettings.allowTentativeEvents}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateCalendarSettings('allowTentativeEvents', e.target.checked);
                        }}
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor="allow-tentative-events-desktop" className="text-sm text-gray-800" onClick={(e) => e.stopPropagation()}>
                        未回答/未定の予定がある時間を表示しない
                      </label>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      チェックを入れると、その予定がある時間も選択できるようになります。
                    </div>
                  </div>
                </div>
              )}

              {/* カレンダーのグリッド - スクロール機能強化 */}
              <div className="overflow-y-auto h-[calc(100%-80px)]" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 250px)' }}>
                <table className="w-full border-collapse table-fixed select-none">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr>
                      <th className="w-[60px]"></th>
                      {weekdays.map((weekday, index) => {
                        const date = weekDates[index];
                        const isToday = date && 
                          date.getDate() === today.getDate() && 
                          date.getMonth() === today.getMonth() && 
                          date.getFullYear() === today.getFullYear();
                        
                        return (
                          <th key={index} className="p-2 text-center border-b select-none" style={{ width: `calc((100% - 60px) / 7)` }}>
                            <div className="text-sm text-gray-500 select-none">{weekday}</div>
                            <div className={`text-lg font-bold select-none ${isToday ? 'bg-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                              {date ? date.getDate() : ''}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((time, timeIndex) => (
                      <tr key={timeIndex}>
                        <td className="p-2 text-sm text-gray-500 text-right w-[60px] select-none">
                          {time}
                        </td>
                        {weekdays.map((_, dayIndex) => {
                          const date = weekDates[dayIndex];
                          const event = date && getEventForTimeSlot(date, timeIndex + 8);
                          const isOccupied = !!event;
                          const isSelected = getSelectedSlots()[dayIndex][timeIndex];
                          
                          return (
                            <td
                              key={dayIndex}
                              className="p-1 cursor-pointer select-none"
                              onClick={() => {
                                // クリックイベントはhandleMouseUpで処理するため、ここでは何もしない
                              }}
                              onMouseDown={(e) => handleCellMouseDown(dayIndex, timeIndex, e)}
                              onMouseUp={() => handleMouseUp(dayIndex, timeIndex)}
                              onMouseEnter={() => handleCellMouseEnter(dayIndex, timeIndex)}
                              style={{ width: `calc((100% - 60px) / 7)` }}
                              data-day-index={dayIndex}
                              data-time-index={timeIndex}
                            >
                              <div className="h-16 w-full flex items-center justify-center">
                                {renderEventCell(event, isOccupied, isSelected)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 右側：ミニカレンダーと日程候補 */}
            <div style={{ width: 'calc(33% - 8px)', minWidth: '300px', maxWidth: '500px' }} className="flex flex-col gap-4 overflow-hidden">
              {/* 右上：ミニカレンダー */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={previousMonth} className="text-gray-600 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full">&lt;</button>
                  <span className="font-bold text-lg">{`${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`}</span>
                  <button onClick={nextMonth} className="text-gray-600 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full">&gt;</button>
                </div>
                
                <table className="w-full table-fixed table-fixed">
                  <thead>
                    <tr>
                      {weekdays.map(day => (
                        <th key={day} className="text-center py-2 text-xs font-medium w-[14.28%]">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renderMiniCalendarBody()}
                  </tbody>
                </table>
              </div>

              {/* 右下：日程候補の出力 */}
              <div className="bg-white rounded-lg p-4 shadow-sm flex-1 overflow-hidden">
                <h2 className="text-lg font-bold mb-2">日程候補の作成</h2>
                <p className="text-sm text-gray-600 mb-4">カレンダーで選んだ日時を出力します。</p>
                <div 
                  className="bg-gray-50 p-3 rounded min-h-[100px] mb-4 text-sm whitespace-pre-wrap overflow-auto"
                  style={{ height: '200px' }}
                  ref={textAreaRef}
                  contentEditable={true}
                  onFocus={() => setIsTextAreaFocused(true)}
                  onBlur={() => setIsTextAreaFocused(false)}
                  onInput={handleTextAreaChange}
                >
                  {generatedText ? (
                    generatedText.split('\n').map((line, index) => (
                      <div key={index} className="text-sm">{line}</div>
                    ))
                  ) : (
                    <div className="text-gray-400">
                      カレンダーで選択した日時が、自動で入力されます。
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={copyToClipboard}
                    disabled={!generatedText}
                    className="w-full py-2 bg-red-400 text-white rounded-full font-bold disabled:opacity-50"
                  >
                    文字をコピーする
                  </button>
                  <button
                    onClick={resetSelection}
                    className="w-full py-2 bg-gray-200 text-gray-700 rounded-full font-bold"
                  >
                    リセット
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ミニカレンダーの本体部分をレンダリングする関数
  const renderMiniCalendarBody = () => {
    if (!currentDate) return null;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const weeks = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
    const days = [];
    
    for (let i = 0; i < weeks * 7; i++) {
      const dayNumber = i - firstDayOfWeek + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        days.push(null);
      } else {
        days.push(new Date(year, month, dayNumber));
      }
    }

    const selectedWeekIndex = Array.from({ length: weeks }).findIndex((_, weekIndex) => {
      return Array.from({ length: 7 }).some((_, dayIndex) => {
        const day = days[weekIndex * 7 + dayIndex];
        return day && weekDates.some(date => 
          date && day && date.getDate() === day.getDate() &&
          date.getMonth() === day.getMonth() &&
          date.getFullYear() === day.getFullYear()
        );
      });
    });

    return Array.from({ length: weeks }).map((_, weekIndex) => (
      <tr key={weekIndex} className={weekIndex === selectedWeekIndex ? 'bg-red-100' : ''}>
        {Array.from({ length: 7 }).map((_, dayIndex) => {
          const day = days[weekIndex * 7 + dayIndex];
          
          // 今日の日付かどうかチェック
          const isToday = day && 
            day.getDate() === today.getDate() && 
            day.getMonth() === today.getMonth() && 
            day.getFullYear() === today.getFullYear();
          
          return (
            <td 
              key={dayIndex}
              className={`text-center py-2 cursor-pointer w-[14.28%] ${isToday ? 'relative' : ''}`}
              onClick={() => day && setCurrentDate(day)}
            >
              {day && (
                <span className={`text-sm inline-flex items-center justify-center ${
                  isToday ? 'bg-red-400 text-white rounded-full w-7 h-7' : ''
                }`}>
                  {day.getDate()}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    ));
  };

  // 月の移動関数を追加
  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col justify-center bg-gray-50 w-full min-h-screen" style={{ 
      minHeight: 'calc(100vh - var(--safe-bottom, 0px))', 
      overscrollBehavior: 'none',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* モバイル表示（750px未満） */}
      <div className="md:hidden h-full flex flex-col">
        {/* インライン関数としてモバイルレイアウトをレンダリング */}
        <div className="relative flex flex-col w-full sm:max-w-lg h-full" style={{maxWidth: '100%'}}>
          {/* ①画面のヘッダー：高さ固定 */}
          <div className="app-header bg-white p-1 sm:p-2 flex justify-between items-center shadow-sm border-b border-gray-200 flex-shrink-0" 
            style={{ height: 'auto', minHeight: '48px' }}>
            {/* 左側：アプリタイトル */}
            <div className="text-sm sm:text-base font-bold text-gray-800">
              メイクミー日程調整
            </div>
            
            {/* 右側：ログインボタンまたはユーザー情報 */}
            <div className="flex items-center space-x-2">
              {/* ログイン/ユーザー情報 */}
              {isAuthenticated ? (
                <div className="flex items-center">
                  {userInfo?.photos?.[0]?.url && (
                    <img
                      src={userInfo.photos[0].url}
                      alt="ユーザー"
                      className="h-7 w-7 rounded-full cursor-pointer"
                      onClick={handleLogout}
                      title="ログアウト"
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoading || !isApiInitialized}
                  className="flex items-center justify-center rounded-full bg-red-400 text-white w-8 h-8 focus:outline-none"
                  title="Googleでログイン"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#ffffff"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* ②ナビゲーションバー：高さ固定 */}
          <div className="nav-header bg-white p-2 sm:p-3 flex justify-between items-center border-b border-gray-200 flex-shrink-0">
            {/* 左端：月表示と選択ボタン */}
            <div className="flex items-center relative w-1/3 justify-start">
              <button 
                onClick={() => {
                  setShowCalendarPopup(!showCalendarPopup);
                  setPopupMonth(new Date(currentDate));
                }}
                className="flex items-center p-1 rounded"
              >
                <span className="text-sm sm:text-base font-bold">
                  {weekDates.length > 0 ? `${weekDates[0].getMonth() + 1}月` : ''}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {renderCalendarPopup()}
            </div>
            
            {/* 中央：ナビゲーションボタン */}
            <div className="flex items-center justify-center w-1/3">
              <div className="flex items-center space-x-1 sm:space-x-3">
                <button onClick={previousWeek} className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg rounded-full">&lt;</button>
                <button onClick={goToToday} className="px-3 py-1 text-gray-600 text-sm font-bold rounded-full whitespace-nowrap min-w-[60px]">今日</button>
                <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg rounded-full">&gt;</button>
              </div>
            </div>
            
            {/* 右端：設定アイコン */}
            <div className="flex items-center w-1/3 justify-end">
              {isAuthenticated && (
                <button
                  onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                  className="settings-button ml-2 p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* 設定ポップアップ */}
            {renderSettingsPopup()}
          </div>
          
          {/* ③カレンダーの日付と曜日のヘッダー：高さ固定 */}
          <div className="calendar-header flex-shrink-0" style={{ height: 'auto', minHeight: '50px' }}>
            <table className="w-full border-collapse table-fixed" style={{ margin: '2px 0' }}>
              <thead>
                <tr className="border-b-[2px] border-white">
                  <th className="w-[40px] sm:w-[50px] p-0"></th>
                  {weekdays.map((weekday, index) => {
                    const date = weekDates[index];
                    const isToday = date && 
                      date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear();
                    
                    return (
                      <th key={index} className="p-0 text-center border-l-[2px] border-r-[2px] border-white">
                        <div className="text-[10px] sm:text-xs text-gray-500">{weekday}</div>
                        <div style={{ marginTop: '1px' }} className="flex justify-center">
                          <div className={`text-sm sm:text-base font-bold ${isToday ? 'bg-red-400 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto' : ''}`}>
                            {date ? date.getDate() : ''}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
            </table>
          </div>
          
          {/* ④カレンダーグリッド（内部スクロール、8:00-17:00までを表示し、それ以降はスクロールで見れる） */}
          <div className="calendar-grid overflow-auto" style={{ 
            height: 'var(--grid-container-height, 340px)',
            maxHeight: 'var(--grid-container-height, 340px)',
            position: 'relative'
          }}>
            <div className="relative">
              {/* Current time indicator */}
              {currentTimePosition >= 0 && (
                <>
                  <div 
                    className="absolute z-10 pointer-events-none" 
                    style={{ 
                      top: `${currentTimePosition}px`, 
                      left: 0, 
                      right: 0, 
                      height: '1px', 
                      backgroundColor: '#E11D48' 
                    }}
                  />
                  <div 
                    className="absolute z-10 pointer-events-none"
                    style={{ 
                      top: `${currentTimePosition - 5}px`, 
                      left: '32px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#E11D48' 
                    }}
                  />
                </>
              )}

              <table className="w-full border-collapse table-fixed">
                <tbody>
                  {timeSlots.map((time, timeIndex) => (
                    <tr key={timeIndex}>
                      <td className="p-1 text-xs sm:text-sm text-gray-500 text-right w-[40px] sm:w-[50px]">
                        {time}
                      </td>
                      {weekdays.map((_, dayIndex) => {
                        const date = weekDates[dayIndex];
                        const event = date && getEventForTimeSlot(date, timeIndex + 8);
                        const isOccupied = !!event;
                        const isSelected = getSelectedSlots()[dayIndex][timeIndex];
                        
                        return (
                          <td 
                            key={dayIndex} 
                            className="relative p-0 border-white select-none cursor-pointer"
                            style={{ 
                              height: 'var(--cell-height, 24px)',
                              width: 'var(--cell-width, 24px)',
                              padding: '3px',
                              minWidth: 'var(--cell-width, 24px)',
                              maxWidth: 'var(--cell-width, 24px)'
                            }}
                            onClick={(e) => {
                              // クリックのみの場合の処理（ドラッグ終了時のクリックは無視）
                              if (!isDragging) {
                                handleCellClick(dayIndex, timeIndex);
                              }
                            }}
                            onMouseDown={(e) => handleCellMouseDown(dayIndex, timeIndex, e)}
                            onMouseEnter={() => handleCellMouseEnter(dayIndex, timeIndex)}
                            onTouchStart={(e) => handleCellTouchStart(dayIndex, timeIndex, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                            data-day-index={dayIndex}
                            data-time-index={timeIndex}
                          >
                            <div className="flex justify-center items-center h-full w-full">
                              {renderEventCell(event, isOccupied, isSelected)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* ⑤テキスト反映エリア（内部スクロール） */}
          <div className="text-area flex-shrink-0 bg-white border-t border-gray-200 overflow-auto" style={{ height: '110px' }}>
            <div className="bg-white h-full overflow-auto">
              <div
                className="w-full p-2 sm:p-3 text-gray-700 rounded-md min-h-[90px]"
                ref={textAreaRef}
                contentEditable={typeof window !== 'undefined' && !isMobileDevice()}
                onFocus={() => setIsTextAreaFocused(true)}
                onBlur={() => setIsTextAreaFocused(false)}
                onInput={handleTextAreaChange}
                onClick={typeof window !== 'undefined' && isMobileDevice() ? (() => {
                  // スマホで空の状態でタップした場合は、何もしない
                  if (!generatedText) return;
                  
                  if (typeof window !== 'undefined') {
                    setTimeout(() => {
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                      });
                    }, 100);
                  }
                }) : undefined}
                style={{ 
                  fontSize: '14px',
                  backgroundColor: isTextAreaFocused ? '#f8f8f8' : 'white',
                  userSelect: typeof window !== 'undefined' && isMobileDevice() ? 'none' : 'text',
                  WebkitUserSelect: typeof window !== 'undefined' && isMobileDevice() ? 'none' : 'text',
                  MozUserSelect: typeof window !== 'undefined' && isMobileDevice() ? 'none' : 'text',
                  msUserSelect: typeof window !== 'undefined' && isMobileDevice() ? 'none' : 'text',
                  cursor: typeof window !== 'undefined' && isMobileDevice() ? 'default' : 'text'
                }}
              >
                {generatedText ? (
                  generatedText.split('\n').map((line, index) => (
                    <div key={index} className="text-sm sm:text-base">{line}</div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm sm:text-base">
                    カレンダーで選択した日時が、自動で入力されます。
                    {typeof window !== 'undefined' && isMobileDevice() && <div className="mt-1 text-xs">※モバイル版では編集できません</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* ⑥CTAボタン：高さ固定 */}
          <div className="button-area flex-shrink-0 flex justify-center py-2 sm:py-3 bg-white" style={{ height: '60px' }}>
            <div className="flex space-x-4 sm:space-x-6">
              <button 
                onClick={resetSelection}
                className="px-4 sm:px-8 py-1 sm:py-2 bg-gray-300 text-gray-700 rounded-full text-xs sm:text-sm font-bold"
              >
                リセット
              </button>
              
              <button 
                onClick={copyToClipboard}
                className="px-4 sm:px-8 py-1 sm:py-2 bg-red-400 text-white rounded-full text-xs sm:text-sm font-bold"
                disabled={!generatedText}
              >
                文字をコピー
              </button>
            </div>
          </div>
          
          {/* ⑦下部スペース */}
          <div className="footer-space flex-shrink-0 h-[20px]"></div>
        </div>
      </div>
      
      {/* デスクトップ表示（750px以上） */}
      <div className="hidden md:block">
        {renderDesktopLayout()}
      </div>
      
      {/* フッター */}
      <div className="footer-area w-full bg-gray-100 border-t border-gray-200 py-3 mt-auto">
        <div className="max-w-[1500px] mx-auto px-4 flex flex-row justify-between items-center">
          <div className="text-xs text-gray-500">
            © 2024 メイクミー日程調整 All Rights Reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-xs text-gray-500">利用規約</a>
            <a href="#" className="text-xs text-gray-500">プライバシーポリシー</a>
            <a href="#" className="text-xs text-gray-500">お問い合わせ</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarTextGenerator; 