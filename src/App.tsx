import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { VehiculoCobroPage } from './pages/VehiculoCobroPage';
import { ActivarPasePage } from './pages/ActivarPasePage';
import { PaseListoPage } from './pages/PaseListoPage';
import { ReciboPage } from './pages/ReciboPage';
import { ConductorPage } from './pages/ConductorPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/v/bus-101" replace />} />
        <Route path="/v/:vehiculoId" element={<VehiculoCobroPage />} />
        <Route path="/pase/activar" element={<ActivarPasePage />} />
        <Route path="/pase/listo" element={<PaseListoPage />} />
        <Route path="/recibo/:viajeId" element={<ReciboPage />} />
        <Route path="/conductor/:vehiculoId" element={<ConductorPage />} />
        <Route path="*" element={<Navigate to="/v/bus-101" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
