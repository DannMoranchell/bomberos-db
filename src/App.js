import React, { useState } from 'react';
import ExcelUploader from './components/ExcelUploader';
import EmergenciasList from './components/EmergenciasList';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('visor');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('visor');
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🚒 Sistema de Gestión de Emergencias</h1>
          <p>Estación de Bomberos</p>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'visor' ? 'active' : ''}`}
          onClick={() => setActiveTab('visor')}
        >
          📋 Visor de Emergencias
        </button>
        <button
          className={`tab ${activeTab === 'carga' ? 'active' : ''}`}
          onClick={() => setActiveTab('carga')}
        >
          📤 Cargar Datos
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'visor' ? (
          <EmergenciasList key={refreshKey} />
        ) : (
          <ExcelUploader onUploadComplete={handleUploadComplete} />
        )}
      </main>

      <footer className="app-footer">
        <p>Sistema de Gestión de Emergencias - Estación de Bomberos</p>
      </footer>
    </div>
  );
}

export default App;