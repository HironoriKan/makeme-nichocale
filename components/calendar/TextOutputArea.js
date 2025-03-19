import React from 'react';

const TextOutputArea = ({
  generatedText,
  setGeneratedText,
  isTextAreaFocused,
  setIsTextAreaFocused,
  textAreaRef,
  resetSelection
}) => {
  const handleCopyText = () => {
    if (generatedText.trim() === '') return;
    
    // クリップボードにコピー
    navigator.clipboard.writeText(generatedText).then(() => {
      alert('テキストをクリップボードにコピーしました');
    }).catch(err => {
      console.error('クリップボードへのコピーに失敗しました:', err);
      
      // フォールバック: テキストエリアを選択してコピー
      if (textAreaRef.current) {
        textAreaRef.current.select();
        document.execCommand('copy');
        alert('テキストをクリップボードにコピーしました');
      }
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      backgroundColor: '#f9f9f9',
      borderTop: '1px solid #e0e0e0',
      height: '170px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px'
      }}>
        <div>選択された日時</div>
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={resetSelection}
            style={{
              padding: '3px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            リセット
          </button>
          <button
            onClick={handleCopyText}
            disabled={generatedText.trim() === ''}
            style={{
              padding: '3px 10px',
              backgroundColor: generatedText.trim() === '' ? '#cccccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: generatedText.trim() === '' ? 'default' : 'pointer',
              fontSize: '12px'
            }}
          >
            文字をコピー
          </button>
        </div>
      </div>
      <textarea
        ref={textAreaRef}
        value={generatedText}
        onChange={(e) => setGeneratedText(e.target.value)}
        onFocus={() => setIsTextAreaFocused(true)}
        onBlur={() => setIsTextAreaFocused(false)}
        style={{
          flex: 1,
          resize: 'none',
          padding: '5px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: '14px'
        }}
        placeholder="日時を選択すると、ここにテキストが生成されます..."
      />
    </div>
  );
};

export default TextOutputArea; 