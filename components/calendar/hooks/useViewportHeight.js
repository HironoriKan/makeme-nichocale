import { useState, useEffect } from 'react';

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

export default useViewportHeight; 