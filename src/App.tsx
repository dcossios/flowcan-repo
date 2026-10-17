import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PanelEscena, RayaRuta } from './components/EscenaInicio';
import { VehiculoCobroPage } from './pages/VehiculoCobroPage';
import { ActivarPasePage } from './pages/ActivarPasePage';
import { PaseListoPage } from './pages/PaseListoPage';
import { ReciboPage } from './pages/ReciboPage';
import { ConductorPage } from './pages/ConductorPage';
import { FlotaPage } from './pages/FlotaPage';
import { MiPasePage } from './pages/MiPasePage';
import { QrVehiculoPage } from './pages/QrVehiculoPage';
import { leerUltimoVehiculo } from './lib/ultimoVehiculo';
import { formatCOP } from './lib/format';
import { getPaseToken } from './lib/api';

const ScrollToTop: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
};

const InicioPage: React.FC = () => {
  const ultimo = leerUltimoVehiculo();

  if (!ultimo) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col">
          {/* Texto compacto: la escena se encuadra justo debajo y deja a la vista el cruce de las líneas */}
          <PanelEscena letrero="Súbase">
            <h1 className="text-[28px] min-[360px]:text-[32px] font-light leading-tight">Escanee el QR del bus para pagar.</h1>
            <RayaRuta />
            <p className="text-[15px] font-normal text-[#4A4F5C] mt-3 leading-snug">
              Apunte la cámara de su celular al código del vehículo.
            </p>
          </PanelEscena>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell vehiculoIdActual={ultimo.id} barraFija>
      <div className="flex-1 flex flex-col">
        {/* Texto compacto: la escena se encuadra justo debajo; la ruta también va en el letrero de la buseta */}
        <PanelEscena vehiculoId={ultimo.id} letrero={ultimo.ruta}>
          <h1 className="text-[28px] min-[360px]:text-[32px] font-light leading-tight">Pagar otra vez</h1>
          <RayaRuta vehiculoId={ultimo.id} />
          <p className="text-[15px] font-normal text-[#4A4F5C] mt-3 tabular-nums">
            {ultimo.nombre} · {formatCOP(ultimo.tarifa)}
          </p>
          <p className="text-[18px] font-normal mt-0.5 leading-snug">{ultimo.ruta}</p>
        </PanelEscena>

        {getPaseToken() && (
          <Link
            to="/mi-pase"
            className="flex items-center justify-center min-h-11 mt-4 text-[15px] font-normal text-[#C3C5C6] hover:text-white"
          >
            Ver mi pase y mis viajes
          </Link>
        )}
      </div>

      {/* Barra fija, como en la página de cobro: el botón no tapa la línea ni la buseta de la escena.
          Va en un portal porque <main> y el pie comparten z-10 y el pie se pintaría encima de la barra. */}
      {createPortal(
        <div className="subase-fixed-bar">
          <div className="subase-fixed-bar-inner">
            <Link to={`/v/${encodeURIComponent(ultimo.id)}`} className="subase-btn-primary">
              Ir a pagar
            </Link>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/v/:vehiculoId" element={<VehiculoCobroPage />} />
        <Route path="/pase/activar" element={<ActivarPasePage />} />
        <Route path="/pase/listo" element={<PaseListoPage />} />
        <Route path="/recibo/:viajeId" element={<ReciboPage />} />
        <Route path="/conductor/:vehiculoId" element={<ConductorPage />} />
        <Route path="/flota" element={<FlotaPage />} />
        <Route path="/mi-pase" element={<MiPasePage />} />
        <Route path="/qr/:vehiculoId" element={<QrVehiculoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
