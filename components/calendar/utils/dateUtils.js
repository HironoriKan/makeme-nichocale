// 現在の週の日付を計算
export const calculateWeekDates = (startDate) => {
  const dates = [];
  const date = new Date(startDate);
  date.setDate(date.getDate() - date.getDay() + 1); // 月曜日から開始
  
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  
  return dates;
};

// 日付と時間スロットからキーを生成
export const getDateTimeKey = (date, timeIndex) => {
  const d = new Date(date);
  d.setHours(timeIndex + 8, 0, 0, 0);
  return d.toISOString();
};

// 月の最初の日を取得
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1);
};

// 月の最後の日を取得
export const getLastDayOfMonth = (year, month) => {
  return new Date(year, month + 1, 0);
};

// 日付が同じかどうかをチェック
export const isSameDate = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 日付フォーマット
export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

// 時間フォーマット
export const formatTime = (hour) => {
  return `${hour}:00`;
}; 