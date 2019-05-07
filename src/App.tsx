import React from 'react';
import './App.css';
import Counter from './Counter';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <Counter></Counter>
      </header>
    </div>
  );
}

export default App;
