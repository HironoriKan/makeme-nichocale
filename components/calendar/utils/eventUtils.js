// 終日予定かどうかを判定する
export const isAllDayEvent = (event) => {
  return event && event.start && event.start.date && !event.start.dateTime;
};

// 未回答/未定の予定かどうかを判定する
export const isTentativeEvent = (event, userInfo) => {
  return event && 
         (event.status === 'tentative' || 
          (event.attendees && event.attendees.some(attendee => 
            attendee.email === userInfo?.email && 
            (attendee.responseStatus === 'needsAction' || attendee.responseStatus === 'tentative')
          )));
};

// イベントがスロットで選択可能かどうかを判定
export const isEventSelectable = (event, calendarSettings) => {
  // 終日予定かつチェックがONの場合は選択不可（表示しない）
  if (isAllDayEvent(event) && calendarSettings.allowAllDayEvents) {
    return false;
  }
  
  // 未回答予定かつチェックがONの場合は選択不可（表示しない）
  if (isTentativeEvent(event) && calendarSettings.allowTentativeEvents) {
    return false;
  }
  
  return true;
};

// 特定の時間枠のイベントを取得
export const getEventForTimeSlot = (date, hour, events, calendarSettings, userInfo) => {
  if (!date || !events || !events.length) return null;

  const slotStart = new Date(date);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(hour + 1, 0, 0, 0);

  for (const event of events) {
    // 終日予定の場合
    if (isAllDayEvent(event)) {
      const eventDate = new Date(event.start.date);
      // 開始日の0時0分0秒に設定
      eventDate.setHours(0, 0, 0, 0);
      
      // 終日予定の場合は日付を正確に比較
      // dateも0時0分0秒に設定して比較
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      
      // 日付が完全に一致するか確認
      const isSameDay = dateStart.getTime() === eventDate.getTime();
      
      if (isSameDay) {
        // 終日予定がある日を表示しないがONの場合はスキップ
        if (calendarSettings.allowAllDayEvents) {
          continue;
        }
        
        // 設定がOFFの場合は表示
        event.isAllDay = true;
        event.isTentative = isTentativeEvent(event, userInfo);
        event.isSelectable = false;
        return event;
      }
    }

    // 未回答予定の場合
    if (isTentativeEvent(event, userInfo)) {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        // 未回答/未定の予定を表示しないがONの場合はスキップ
        if (calendarSettings.allowTentativeEvents) {
          continue;
        }
        
        // 設定がOFFの場合は表示
        event.isAllDay = isAllDayEvent(event);
        event.isTentative = true;
        event.isSelectable = false;
        return event;
      }
    }

    // 通常予定の場合
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    
    // イベントの時間範囲が現在のスロットと重なるかチェック
    if (slotStart < eventEnd && slotEnd > eventStart) {
      event.isAllDay = isAllDayEvent(event);
      event.isTentative = isTentativeEvent(event, userInfo);
      event.isSelectable = true;
      return event;
    }
  }
  
  return null;
};

// 特定の時間枠が予定で埋まっているかチェック
export const isTimeSlotOccupied = (date, hour, events, calendarSettings, userInfo) => {
  if (!date) return false;
  
  const slotStart = new Date(date);
  slotStart.setHours(hour, 0, 0, 0);
  
  const slotEnd = new Date(date);
  slotEnd.setHours(hour + 1, 0, 0, 0);
  
  // イベントが無い場合はfalseを返す
  if (!events || events.length === 0) return false;
  
  for (const event of events) {
    // 終日予定の場合
    if (isAllDayEvent(event)) {
      const eventDate = new Date(event.start.date);
      // 開始日の0時0分0秒に設定
      eventDate.setHours(0, 0, 0, 0);
      
      // 終日予定の場合は日付を正確に比較
      // dateも0時0分0秒に設定して比較
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      
      // 日付が完全に一致するか確認
      const isSameDay = dateStart.getTime() === eventDate.getTime();
      
      if (isSameDay) {
        // 終日予定がある日を表示しないがONの場合はスキップ
        if (calendarSettings.allowAllDayEvents) {
          continue; // このイベントは無視
        } else {
          return true; // このイベントを表示（選択不可）
        }
      }
    }

    // 未回答予定の場合
    if (isTentativeEvent(event, userInfo)) {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        // 未回答予定がある時間を表示しないがONの場合はスキップ
        if (calendarSettings.allowTentativeEvents) {
          continue; // このイベントは無視
        } else {
          return true; // このイベントを表示（選択不可）
        }
      }
    }
    
    // 通常予定の場合
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    
    if (slotStart < eventEnd && slotEnd > eventStart) {
      return true; // 通常予定は常に表示（選択不可）
    }
  }
  
  return false; // 予定なし
}; 