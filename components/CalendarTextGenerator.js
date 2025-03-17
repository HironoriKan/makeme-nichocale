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
  const [selectedDates, setSelectedDates] = useState(new Map());
  const [generatedText, setGeneratedText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [todayIndex, setTodayIndex] = useState(-1);
  const today = new Date();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOperation, setDragOperation] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [popupMonth, setPopupMonth] = useState(new Date());
  const popupRef = useRef();
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const textAreaRef = useRef(null);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const settingsPopupRef = useRef();
  const [lastSelectedDay, setLastSelectedDay] = useState(-1);
  const [lastSelectedTime, setLastSelectedTime] = useState(-1);
  const [isDragToDeselect, setIsDragToDeselect] = useState(false);

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
    if (isLongPress) return;
    
    const date = weekDates[dayIndex];
    if (!date) return;

    // 予定の有無に関わらず選択可能にする (isTimeSlotOccupiedのチェックを削除)
    const key = getDateTimeKey(date, timeIndex);
    const newSelectedDates = new Map(selectedDates);
    
    if (selectedDates.has(key)) {
      newSelectedDates.delete(key);
    } else {
      newSelectedDates.set(key, true);
    }
    
    setSelectedDates(newSelectedDates);
  };

  const handleCellMouseDown = (dayIndex, timeIndex) => {
    const date = weekDates[dayIndex];
    if (!date) return;

    // 予定の有無に関わらず選択可能にする (isTimeSlotOccupiedのチェックを削除)
    const timer = setTimeout(() => {
      const key = getDateTimeKey(date, timeIndex);
      const newSelectedDates = new Map(selectedDates);
      const newValue = !selectedDates.has(key);
      
      if (newValue) {
        newSelectedDates.set(key, true);
      } else {
        newSelectedDates.delete(key);
      }
      
      setSelectedDates(newSelectedDates);
      setIsDragging(true);
      setDragOperation(newValue);
      setIsLongPress(true);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleCellMouseEnter = (dayIndex, timeIndex) => {
    if (!isDragging) return;
    
    // 前回の選択状態から変化があるときのみ更新
    if (lastSelectedDay !== dayIndex || lastSelectedTime !== timeIndex) {
      const newSelection = [...selectedDates];
      const dateTimeKey = getDateTimeKey(weekDates[dayIndex], timeIndex);
      
      // 選択解除モードなら削除、そうでなければ追加
      if (isDragToDeselect) {
        // 選択解除モードでは選択を解除
        const index = newSelection.findIndex(item => item === dateTimeKey);
        if (index !== -1) {
          newSelection.splice(index, 1);
        }
      } else {
        // 選択モードでは追加（重複チェック）
        if (!newSelection.includes(dateTimeKey)) {
          newSelection.push(dateTimeKey);
        }
      }
      
      setSelectedDates(newSelection);
      setLastSelectedDay(dayIndex);
      setLastSelectedTime(timeIndex);
      setGeneratedText(generateText(newSelection));
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isDragging) {
      setIsDragging(false);
      setDragOperation(null);
      
      setTimeout(() => {
        setIsLongPress(false);
      }, 50);
    }
  };

  // Touch event handlers
  const handleTouchMove = (e) => {
    if (!isLongPress) return;
    
    if (isDragging && typeof document !== 'undefined') {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element && element.dataset.dayIndex !== undefined && element.dataset.timeIndex !== undefined) {
        e.preventDefault();
        
        const dayIndex = parseInt(element.dataset.dayIndex);
        const timeIndex = parseInt(element.dataset.timeIndex);
        handleCellMouseEnter(dayIndex, timeIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Text generation
  const generateText = (dates = selectedDates) => {
    let text = '';
    const dateGroups = new Map();
    
    dates.forEach((_, key) => {
      const date = new Date(key);
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
  };

  // Effect for text generation
  useEffect(() => {
    generateText();
  }, [selectedDates, weekDates]);

  // Utility functions
  const resetSelection = () => {
    setSelectedDates(new Map());
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
        if (selectedDates.has(key)) {
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
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, longPressTimer]);

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
    
    const handleClickOutside = (event) => {
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
        setShowSettingsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsPopupRef]);

  // Settings popup rendering
  const renderSettingsPopup = () => {
    if (!showSettingsPopup || !isAuthenticated) return null;
    
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
      >
        <div className="font-bold mb-2 pb-2 border-b border-gray-200">カレンダー設定</div>
        
        <div className="text-sm text-gray-700 mb-2">表示するカレンダーを選択</div>
        
        {/* カレンダー選択の操作ボタン */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => {
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
                id={`calendar-${calendar.id}`}
                checked={calendar.selected}
                onChange={() => toggleCalendarSelection(calendar.id)}
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
          <div className="flex items-center my-3">
            <input
              type="checkbox"
              id="allow-all-day-events"
              checked={calendarSettings.allowAllDayEvents}
              onChange={(e) => updateCalendarSettings('allowAllDayEvents', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allow-all-day-events" className="text-sm text-gray-800">
              終日予定がある日を表示しない
            </label>
          </div>
          
          {/* 未回答予定の設定 */}
          <div className="flex items-center my-3">
            <input
              type="checkbox"
              id="allow-tentative-events"
              checked={calendarSettings.allowTentativeEvents}
              onChange={(e) => updateCalendarSettings('allowTentativeEvents', e.target.checked)}
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
    // イベントの種類に応じたスタイルを設定
    let opacity = 0.7;
    let textColor = 'text-white'; // 常に白色に固定
    let hintText = '';
    let showTitle = true;
    let showEvent = true;
    
    if (event) {
      // 終日予定
      if (event.isAllDay) {
        opacity = 0.6;
        hintText = '終日';
        
        // 終日予定で選択可能な場合は予定を完全に表示しない（空きスロットとして扱う）
        if (calendarSettings.allowAllDayEvents) {
          showEvent = false;
        }
      }
      
      // 未回答予定
      if (event.isTentative) {
        opacity = 0.5;
        hintText = '未定';
        
        // 未回答予定で選択可能な場合は予定を完全に表示しない（空きスロットとして扱う）
        if (calendarSettings.allowTentativeEvents) {
          showEvent = false;
        }
      }
    }
    
    // 予定を表示しない場合は、空きスロットと同じ表示にする
    if (!showEvent) {
      return (
        <div className={`w-9 h-9 sm:w-11 sm:h-11 aspect-square rounded-md flex items-center justify-center ${
          isSelected ? 'bg-red-300 ring-2 ring-red-500' : 'bg-red-100'
        }`}>
        </div>
      );
    }
    
    // 選択状態に応じたスタイルを適用
    const selectedStyle = isSelected 
      ? { 
          boxShadow: 'inset 0 0 0 2px rgba(244, 63, 94, 0.8)'
        } 
      : {};
    
    return (
      <div 
        className={`w-9 h-9 sm:w-11 sm:h-11 aspect-square rounded-md flex items-center justify-center ${
          isOccupied ? 'bg-gray-200' :
          isSelected ? 'bg-red-300' : 'bg-red-100'
        }`} 
        style={{ 
          backgroundColor: isOccupied ? getEventColor(event) : (isSelected ? '#FDA4AF' : '#FEE2E2'),
          opacity: isOccupied ? opacity : 1,
          position: 'relative',
          ...selectedStyle
        }}
      >
        {isOccupied && showTitle && (
          <div className={`text-[9px] sm:text-xs ${textColor} overflow-hidden text-center leading-none px-0.5 flex flex-col`} style={{ maxWidth: '100%', maxHeight: '100%' }}>
            {hintText && <span className="text-[6px] sm:text-[8px] opacity-80">{hintText}</span>}
            <span>{formatEventTitle(event)}</span>
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

  // ビューポートの高さを設定するスクリプトを追加
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // iPhoneの場合は安全マージンを追加
      if (typeof navigator !== 'undefined' && /iPhone/.test(navigator.userAgent)) {
        document.documentElement.style.setProperty('--safe-bottom', '20px');
      } else {
        document.documentElement.style.setProperty('--safe-bottom', '0px');
      }

      // 各セクションの高さを計算
      // 固定高さの要素を取得
      const headerHeight = document.querySelector('.app-header')?.offsetHeight || 48;
      const navHeight = document.querySelector('.nav-header')?.offsetHeight || 48;
      const calendarHeaderHeight = document.querySelector('.calendar-header')?.offsetHeight || 50;
      const textAreaHeight = document.querySelector('.text-area')?.offsetHeight || 70;
      const buttonAreaHeight = document.querySelector('.button-area')?.offsetHeight || 60;
      const footerHeight = document.querySelector('.footer-area')?.offsetHeight || 50;
      
      // 固定要素の合計高さ
      const fixedHeight = headerHeight + navHeight + calendarHeaderHeight + textAreaHeight + buttonAreaHeight + footerHeight;
      
      // 利用可能な高さから固定要素の高さを引いてグリッドの高さを計算
      const availableHeight = window.innerHeight - fixedHeight - (parseInt(document.documentElement.style.getPropertyValue('--safe-bottom') || '0', 10));
      
      // グリッドの高さを設定（全体の60%程度）
      const gridHeight = Math.max(200, availableHeight * 0.6); // 縦幅を2倍に変更（0.3→0.6）
      document.documentElement.style.setProperty('--grid-height', `${gridHeight}px`);
      
      // コンソールに高さ情報を出力（デバッグ用）
      console.log('Grid height calculation:', {
        windowHeight: window.innerHeight,
        fixedHeight,
        availableHeight,
        gridHeight
      });
    };

    // 初期設定
    setVH();

    // リサイズイベントでも更新
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100);
    });

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  // ミニカレンダーをレンダリング
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
                className="flex items-center justify-center rounded-full text-gray-600 w-10 h-10 focus:outline-none"
                title="カレンダー設定"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
        
        {/* ④カレンダーグリッド（内部スクロール）：端末によって高さ調整 */}
        <div className="calendar-grid flex-1 overflow-auto" style={{ 
          height: 'var(--grid-height, 300px)', // フォールバック値を300pxに設定
          maxHeight: '60vh' // 最大高さも制限
        }}>
          <div className="relative">
            {/* Current time indicator */}
            {currentTimePosition >= 0 && (
              <>
                <div 
                  className="absolute z-10 pointer-events-none" 
                  style={{ 
                    top: `${currentTimePosition - 5}px`, 
                    left: '42px',
                    width: '0',
                    height: '0',
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '8px solid rgba(255, 0, 0, 0.6)'
                  }}
                />
                <div 
                  className="absolute z-10 pointer-events-none" 
                  style={{ 
                    top: `${currentTimePosition}px`, 
                    height: '0.5px', 
                    backgroundColor: 'rgba(255, 0, 0, 0.6)',
                    left: '50px',
                    right: '0'
                  }}
                />
              </>
            )}
            
            {/* Time slots */}
            <table className="w-full border-collapse table-fixed">
              <tbody>
                {timeSlots.map((time, timeIndex) => (
                  <tr key={timeIndex} className="border-t-[2px] border-b-[2px] border-white">
                    <td className="w-[40px] sm:w-[50px] p-0 text-[10px] sm:text-xs text-gray-500 text-center align-middle">
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
                          className="relative p-0 border-l-[2px] border-r-[2px] border-white select-none cursor-pointer"
                          onClick={() => handleCellClick(dayIndex, timeIndex)}
                          onMouseDown={() => handleCellMouseDown(dayIndex, timeIndex)}
                          onMouseEnter={() => isDragging && handleCellMouseEnter(dayIndex, timeIndex)}
                          onTouchStart={() => handleCellMouseDown(dayIndex, timeIndex)}
                          data-day-index={dayIndex}
                          data-time-index={timeIndex}
                        >
                          <div className="flex justify-center py-0.5">
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
        
        {/* ⑤テキスト反映エリア（内部スクロール）：高さ固定 */}
        <div className="text-area flex-shrink-0 bg-white border-t border-gray-200" style={{ height: '70px' }}>
          <div className="bg-white h-full overflow-auto">
            <div
              className="w-full p-2 sm:p-3 text-gray-700 rounded-md min-h-[60px]"
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
        <div className="button-area flex-shrink-0 flex justify-center py-2 sm:py-3" style={{ height: '60px' }}>
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
            <h1 className="text-2xl font-bold">カレンダー日程調整</h1>
            
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
              {/* ナビゲーションと日付表示を中央に配置 */}
              <div className="flex flex-col items-center mb-4">
                <div className="text-xl font-bold mb-2">
                  {weekDates.length > 0 ? `${weekDates[0].getFullYear()}年 ${weekDates[0].getMonth() + 1}月` : ''}
                </div>
                
                <div className="flex items-center space-x-4">
                  <button onClick={previousWeek} className="text-gray-600 text-lg">&lt;</button>
                  <button onClick={goToToday} className="px-4 py-1 text-sm bg-gray-100 rounded">
                    &lt;今日&gt;
                  </button>
                  <button onClick={nextWeek} className="text-gray-600 text-lg">&gt;</button>
                  
                  {/* 設定アイコン */}
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                      className="flex items-center justify-center text-gray-600"
                      title="カレンダー設定"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                >
                  {/* 設定ポップアップの内容は既存のままで問題なし */}
                  <div className="font-bold mb-2 pb-2 border-b border-gray-200">カレンダー設定</div>
                  
                  <div className="text-sm text-gray-700 mb-2">表示するカレンダーを選択</div>
                  
                  {/* カレンダー選択の操作ボタン */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
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
                          onChange={() => toggleCalendarSelection(calendar.id)}
                          className="mr-2"
                        />
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: calendar.color }}
                        ></div>
                        <label 
                          htmlFor={`calendar-desktop-${calendar.id}`}
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
                    <div className="flex items-center my-3">
                      <input
                        type="checkbox"
                        id="allow-all-day-events-desktop"
                        checked={calendarSettings.allowAllDayEvents}
                        onChange={(e) => updateCalendarSettings('allowAllDayEvents', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="allow-all-day-events-desktop" className="text-sm text-gray-800">
                        終日予定がある日を表示しない
                      </label>
                    </div>
                    
                    {/* 未回答予定の設定 */}
                    <div className="flex items-center my-3">
                      <input
                        type="checkbox"
                        id="allow-tentative-events-desktop"
                        checked={calendarSettings.allowTentativeEvents}
                        onChange={(e) => updateCalendarSettings('allowTentativeEvents', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="allow-tentative-events-desktop" className="text-sm text-gray-800">
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
                <table className="w-full border-collapse table-fixed">
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
                          <th key={index} className="p-2 text-center border-b" style={{ width: `calc((100% - 60px) / 7)` }}>
                            <div className="text-sm text-gray-500">{weekday}</div>
                            <div className={`text-lg font-bold ${isToday ? 'bg-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
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
                        <td className="p-2 text-sm text-gray-500 text-right w-[60px]">
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
                              className="p-1 cursor-pointer"
                              onClick={() => handleCellClick(dayIndex, timeIndex)}
                              onMouseDown={() => handleCellMouseDown(dayIndex, timeIndex)}
                              onMouseEnter={() => handleCellMouseEnter(dayIndex, timeIndex)}
                              style={{ width: `calc((100% - 60px) / 7)` }}
                            >
                              <div 
                                className={`h-16 rounded flex items-center justify-center ${
                                  isOccupied ? 'bg-gray-200' :
                                  isSelected ? 'bg-red-300' : 'bg-red-50'
                                }`}
                                style={{ 
                                  backgroundColor: isOccupied ? getEventColor(event) : (isSelected ? '#FDA4AF' : '#FEE2E2'),
                                  opacity: isOccupied ? (event?.isAllDay ? 0.6 : event?.isTentative ? 0.5 : 0.7) : 1
                                }}
                              >
                                {isOccupied && (
                                  <div className="text-xs text-white p-1 overflow-hidden text-center leading-none">
                                    {event?.isAllDay && <span className="text-[8px] opacity-80">終日</span>}
                                    {event?.isTentative && <span className="text-[8px] opacity-80">未定</span>}
                                    <span>{formatEventTitle(event)}</span>
                                  </div>
                                )}
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
                <h2 className="text-lg font-bold mb-2">カレンダー</h2>
                <p className="text-sm text-gray-600 mb-2">選択した週間カレンダーを表示します。</p>
                
                <div className="flex justify-between items-center mb-4">
                  <button onClick={previousWeek} className="text-gray-600">&lt;</button>
                  <span className="font-bold">{`${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`}</span>
                  <button onClick={nextWeek} className="text-gray-600">&gt;</button>
                </div>
                
                <table className="w-full">
                  <thead>
                    <tr>
                      {weekdays.map(day => (
                        <th key={day} className="text-center py-2 text-xs">{day}</th>
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

    return Array.from({ length: weeks }).map((_, weekIndex) => (
      <tr key={weekIndex} className={weekIndex === selectedWeekIndex ? 'bg-red-100' : ''}>
        {Array.from({ length: 7 }).map((_, dayIndex) => {
          const day = days[weekIndex * 7 + dayIndex];
          return (
            <td 
              key={dayIndex}
              className="text-center py-2 text-xs cursor-pointer"
              onClick={() => day && setCurrentDate(day)}
            >
              {day?.getDate() || ''}
            </td>
          );
        })}
      </tr>
    ));
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
                  className="flex items-center justify-center rounded-full text-gray-600 w-10 h-10 focus:outline-none"
                  title="カレンダー設定"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          
          {/* ④カレンダーグリッド（内部スクロール）：端末によって高さ調整 */}
          <div className="calendar-grid flex-1 overflow-auto" style={{ 
            height: 'var(--grid-height, 300px)', // フォールバック値を300pxに設定
            maxHeight: '60vh' // 最大高さも制限
          }}>
            <div className="relative">
              {/* Current time indicator */}
              {currentTimePosition >= 0 && (
                <>
                  <div 
                    className="absolute z-10 pointer-events-none" 
                    style={{ 
                      top: `${currentTimePosition - 5}px`, 
                      left: '42px',
                      width: '0',
                      height: '0',
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: '8px solid rgba(255, 0, 0, 0.6)'
                    }}
                  />
                  <div 
                    className="absolute z-10 pointer-events-none" 
                    style={{ 
                      top: `${currentTimePosition}px`, 
                      height: '0.5px', 
                      backgroundColor: 'rgba(255, 0, 0, 0.6)',
                      left: '50px',
                      right: '0'
                    }}
                  />
                </>
              )}
              
              {/* Time slots */}
              <table className="w-full border-collapse table-fixed">
                <tbody>
                  {timeSlots.map((time, timeIndex) => (
                    <tr key={timeIndex} className="border-t-[2px] border-b-[2px] border-white">
                      <td className="w-[40px] sm:w-[50px] p-0 text-[10px] sm:text-xs text-gray-500 text-center align-middle">
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
                            className="relative p-0 border-l-[2px] border-r-[2px] border-white select-none cursor-pointer"
                            onClick={() => handleCellClick(dayIndex, timeIndex)}
                            onMouseDown={() => handleCellMouseDown(dayIndex, timeIndex)}
                            onMouseEnter={() => isDragging && handleCellMouseEnter(dayIndex, timeIndex)}
                            onTouchStart={() => handleCellMouseDown(dayIndex, timeIndex)}
                            data-day-index={dayIndex}
                            data-time-index={timeIndex}
                          >
                            <div className="flex justify-center py-0.5">
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
          
          {/* ⑤テキスト反映エリア（内部スクロール）：高さ固定 */}
          <div className="text-area flex-shrink-0 bg-white border-t border-gray-200" style={{ height: '70px' }}>
            <div className="bg-white h-full overflow-auto">
              <div
                className="w-full p-2 sm:p-3 text-gray-700 rounded-md min-h-[60px]"
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
          <div className="button-area flex-shrink-0 flex justify-center py-2 sm:py-3" style={{ height: '60px' }}>
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