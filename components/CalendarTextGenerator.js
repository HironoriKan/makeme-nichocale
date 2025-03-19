'use client';

import React from 'react';
import CalendarTextGenerator from './calendar/CalendarTextGenerator';

// メインのカレンダーコンポーネントをエクスポート
// このファイルは後方互換性のためのラッパーとして機能する
export default function CalendarTextGeneratorWrapper(props) {
  return <CalendarTextGenerator {...props} />;
} 