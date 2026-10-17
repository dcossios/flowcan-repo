import React, { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PanelEscena } from './components/EscenaInicio';
import { ETIQUETA, IdentidadVehiculo, Pasaje, Ruta, Titulo } from './components/Sistema';
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
            <p className={`${ETIQUETA} text-[#3A3F4E]`}>Pague el bus con su celular</p>
            <Titulo className="mt-2.5">Escanee el QR del bus</Titulo>
            <p className="text-[16px] leading-normal text-[#3A3F4E] mt-2">Apunte la cámara al código pegado en el vehículo.</p>
          </PanelEscena>
        </div>
      </AppShell>
    );
  }


  return (
    <AppShell vehiculoIdActual={ultimo.id} barraFija>
      <div className="flex-1 flex flex-col">
        {/* La ruta también va en el letrero de la buseta de la escena */}
        <PanelEscena vehiculoId={ultimo.id} letrero={ultimo.ruta}>
          <IdentidadVehiculo vehiculoId={ultimo.id} nombre={ultimo.nombre} />
          <Titulo className="mt-4">Pagar otra vez</Titulo>
          <Ruta ruta={ultimo.ruta} className="mt-1.5" />
          <Pasaje monto={ultimo.tarifa} className="mt-4" />
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

      {/* Barra fija, como en la página de cobro: el botón no tapa la línea ni la buseta de la escena */}
      <div className="subase-fixed-bar">
        <div className="subase-fixed-bar-inner">
          <Link to={`/v/${encodeURIComponent(ultimo.id)}`} className="subase-btn-primary subase-btn-flecha">
            Ir a pagar
          </Link>
        </div>
      </div>
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
