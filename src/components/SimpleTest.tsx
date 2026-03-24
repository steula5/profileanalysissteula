import React from 'react';

export const SimpleTest = () => {
  React.useEffect(() => {
    console.log('SimpleTest component mounted!');
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>✅ React is working!</h1>
      <p>Se você vê esta mensagem, React está carregando corretamente.</p>
      <p>Se não vê nada, há um problema de renderização.</p>
    </div>
  );
};
