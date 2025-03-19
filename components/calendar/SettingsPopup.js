import React from 'react';

const SettingsPopup = ({
  showSettingsPopup,
  setShowSettingsPopup,
  calendarSettings,
  updateCalendarSettings,
  calendars,
  toggleCalendarSelection,
  settingsPopupRef
}) => {
  if (!showSettingsPopup) return null;

  const handleAllowAllDayEventsChange = () => {
    updateCalendarSettings({
      ...calendarSettings,
      allowAllDayEvents: !calendarSettings.allowAllDayEvents
    });
  };

  const handleAllowTentativeEventsChange = () => {
    updateCalendarSettings({
      ...calendarSettings,
      allowTentativeEvents: !calendarSettings.allowTentativeEvents
    });
  };

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
      onClick={() => setShowSettingsPopup(false)}
    >
      <div
        ref={settingsPopupRef}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          minWidth: '300px',
          maxWidth: '90%',
          maxHeight: '80%',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 15px', fontSize: '18px' }}>設定</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>表示設定</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              id="allowAllDayEvents"
              checked={calendarSettings.allowAllDayEvents}
              onChange={handleAllowAllDayEventsChange}
              style={{ marginRight: '10px' }}
            />
            <label htmlFor="allowAllDayEvents">終日予定がある日を表示しない</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="allowTentativeEvents"
              checked={calendarSettings.allowTentativeEvents}
              onChange={handleAllowTentativeEventsChange}
              style={{ marginRight: '10px' }}
            />
            <label htmlFor="allowTentativeEvents">未回答/未定の予定がある時間を表示しない</label>
          </div>
        </div>
        
        {calendars && calendars.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>カレンダー選択</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '5px',
                    backgroundColor: calendar.selected ? '#f0f7ff' : 'transparent',
                    borderRadius: '4px'
                  }}
                >
                  <input
                    type="checkbox"
                    id={`calendar-${calendar.id}`}
                    checked={calendar.selected}
                    onChange={() => toggleCalendarSelection(calendar.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: calendar.backgroundColor || '#4285f4',
                      marginRight: '10px'
                    }}
                  />
                  <label htmlFor={`calendar-${calendar.id}`}>{calendar.summary}</label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={() => setShowSettingsPopup(false)}
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

export default SettingsPopup; 