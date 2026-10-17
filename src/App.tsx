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

// Un QR dibujado (tres esquinas y algunos módulos), no un ícono de librería
const IconoQr: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg width="34" height="34" viewBox="0 0 21 21" fill="#FFFFFF" aria-hidden="true" className={className}>
    <path
      fillRule="evenodd"
      d="M0 0h7v7H0zM1 1v5h5V1zM14 0h7v7h-7zM15 1v5h5V1zM0 14h7v7H0zM1 15v5h5v-5z"
    />
    <path d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 0h2v2H9zM9 4h3v2H9zM8 8h2v3H8zM12 9h3v2h-3zM17 9h2v2h-2zM0 9h2v2H0zM4 9h2v2H4zM9 13h2v3H9zM13 13h3v2h-3zM18 13h3v3h-3zM13 17h2v4h-2zM9 18h2v3H9zM16 18h2v3h-2z" />
  </svg>
);

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

        {/* La salida para quien hoy va en otro bus: no hay escáner en la app, se usa la cámara del celular */}
        <div className="mt-6 flex items-start gap-3.5">
          <IconoQr className="shrink-0 mt-0.5" />
          <p className="leading-snug">
            <span className="block text-[16px] font-medium text-white">¿Otro bus? Escanee su QR</span>
            <span className="block text-[14px] text-[#C3C5C6] mt-0.5">
              Con la cámara del celular, en el código pegado en el vehículo.
            </span>
          </p>
        </div>

        {getPaseToken() && (
          <Link
            to="/mi-pase"
            className="flex items-center min-h-11 mt-3 text-[15px] font-normal text-[#C3C5C6] underline-offset-2 hover:text-white hover:underline"
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
