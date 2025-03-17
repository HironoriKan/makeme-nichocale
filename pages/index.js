'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import CalendarTextGenerator from '../components/CalendarTextGenerator';

// Googleカレンダー連携アプリ
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [isApiInitialized, setIsApiInitialized] = useState(false);
  const [calendars, setCalendars] = useState([
    { id: 'primary', name: 'マイカレンダー', color: '#DB4437', selected: true }
  ]);
  const [calendarSettings, setCalendarSettings] = useState({
    allowAllDayEvents: false,
    allowTentativeEvents: false
  });
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみレンダリングされるようにする
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadGoogleApi = async () => {
      try {
        // Google APIのスクリプトを動的に読み込む
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client', initializeGapi);
        };
        document.body.appendChild(script);

        // Google Identity Servicesのスクリプトを読み込む
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = initializeGis;
        document.body.appendChild(gisScript);
      } catch (error) {
        console.error('Google APIの読み込みに失敗しました:', error);
        setError('Google APIの読み込みに失敗しました。ページを更新してください。');
      }
    };

    loadGoogleApi();

    return () => {
      const script = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) document.body.removeChild(script);
      if (gisScript) document.body.removeChild(gisScript);
    };
  }, []);

  const initializeGapi = async () => {
    try {
      await window.gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/people/v1/rest'
        ]
      });
      setIsApiInitialized(true);
    } catch (error) {
      console.error('GAPIの初期化に失敗しました:', error);
      setError('GAPIの初期化に失敗しました。ページを更新してください。');
    }
  };

  const initializeGis = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile',
        callback: handleTokenResponse,
        error_callback: (err) => {
          console.error('トークンクライアントエラー:', err);
          setError('認証エラーが発生しました。もう一度お試しください。');
          setIsLoading(false);
        }
      });
      setTokenClient(client);
    } catch (error) {
      console.error('GISの初期化に失敗しました:', error);
      setError('認証の初期化に失敗しました。ページを更新してください。');
      setIsLoading(false);
    }
  };

  const handleTokenResponse = async (resp) => {
    if (resp.error !== undefined) {
      console.error('認証エラー:', resp);
      setError('認証エラーが発生しました。もう一度お試しください。');
      setIsLoading(false);
      return;
    }

    try {
      window.gapi.client.setToken(resp);
      setIsAuthenticated(true);
      await fetchUserInfo();
      await fetchCalendarList();
      await fetchEvents();
    } catch (error) {
      console.error('トークン処理中にエラーが発生しました:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!isApiInitialized || !tokenClient) {
        setError('認証クライアントが初期化されていません。しばらく待ってからやり直してください。');
        setIsLoading(false);
        return;
      }

      tokenClient.requestAccessToken({
        prompt: 'consent',
        ux_mode: 'popup'
      });
    } catch (error) {
      console.error('ログインに失敗しました:', error);
      setError('ログインに失敗しました。もう一度お試しください。');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = window.gapi.client.getToken();
      if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token);
        window.gapi.client.setToken('');
        setIsAuthenticated(false);
        setUserInfo(null);
        setEvents([]);
      }
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      setError('ログアウトに失敗しました。もう一度お試しください。');
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await window.gapi.client.people.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos'
      });
      setUserInfo(response.result);
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      setError('ユーザー情報の取得に失敗しました。');
    }
  };

  const fetchCalendarList = async () => {
    try {
      const response = await window.gapi.client.calendar.calendarList.list();
      const items = response.result.items || [];
      
      const newCalendars = [
        { id: 'primary', name: 'マイカレンダー', color: '#DB4437', selected: true }
      ];
      
      items.forEach(item => {
        if (item.id !== 'primary' && (item.accessRole === 'reader' || item.accessRole === 'owner' || item.accessRole === 'writer')) {
          newCalendars.push({
            id: item.id,
            name: item.summary || '名称なし',
            color: item.backgroundColor || '#4285F4',
            selected: false
          });
        }
      });
      
      setCalendars(newCalendars);
    } catch (error) {
      console.error('カレンダー一覧の取得に失敗しました:', error);
    }
  };

  const toggleCalendarSelection = (calendarId) => {
    setCalendars(prev => 
      prev.map(cal => 
        cal.id === calendarId 
          ? { ...cal, selected: !cal.selected } 
          : cal
      )
    );
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [calendars, isAuthenticated]);

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(new Date().setDate(now.getDate() + 30)).toISOString();
      
      const selectedCalendars = calendars.filter(cal => cal.selected);
      if (selectedCalendars.length === 0) {
        setEvents([]);
        return;
      }

      let allEvents = [];
      
      for (const calendar of selectedCalendars) {
        try {
          const response = await window.gapi.client.calendar.events.list({
            calendarId: calendar.id,
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: 'startTime'
          });
          
          const events = response.result.items || [];
          events.forEach(event => {
            event.calendarId = calendar.id;
            event.calendarName = calendar.name;
            event.calendarColor = calendar.color;
          });
          
          allEvents = [...allEvents, ...events];
        } catch (calError) {
          console.error(`${calendar.name}のイベント取得に失敗:`, calError);
        }
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error('カレンダーイベントの取得に失敗しました:', error);
      setError('カレンダーイベントの取得に失敗しました。');
    }
  };

  const handleDateSelect = (date) => {
    console.log('選択された日付:', date);
  };

  // カレンダー設定を更新する関数
  const updateCalendarSettings = (key, value) => {
    setCalendarSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <>
      <Head>
        <title>Googleカレンダー連携アプリ</title>
        <meta name="description" content="Googleカレンダーと連携した予定管理アプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col min-h-screen">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded">
            {error}
          </div>
        )}

        <main className="flex-1">
          {mounted ? (
            <CalendarTextGenerator 
              events={events} 
              onDateSelect={handleDateSelect}
              isAuthenticated={isAuthenticated}
              userInfo={userInfo}
              handleLogin={handleLogin}
              handleLogout={handleLogout}
              isLoading={isLoading}
              isApiInitialized={isApiInitialized}
              calendars={calendars}
              toggleCalendarSelection={toggleCalendarSelection}
              calendarSettings={calendarSettings}
              updateCalendarSettings={updateCalendarSettings}
            />
          ) : (
            <div className="flex justify-center items-center min-h-screen">
              <p>読み込み中...</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 