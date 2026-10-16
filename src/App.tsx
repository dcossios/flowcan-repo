import React, { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { VehiculoCobroPage } from './pages/VehiculoCobroPage';
import { ActivarPasePage } from './pages/ActivarPasePage';
import { PaseListoPage } from './pages/PaseListoPage';
import { ReciboPage } from './pages/ReciboPage';
import { ConductorPage } from './pages/ConductorPage';
import { FlotaPage } from './pages/FlotaPage';
import { leerUltimoVehiculo } from './lib/ultimoVehiculo';
import { formatCOP } from './lib/format';

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
          <h1 className="text-[32px] font-light text-white leading-tight">
            Escanee el QR del bus para pagar.
          </h1>
          <div className="subase-sand-rule mt-2.5" />
          <p className="text-[15px] font-normal text-[#C3C5C6] mt-4 leading-relaxed">
            Abra la cámara de su celular, apunte al código del vehículo y confirme el pasaje.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell vehiculoIdActual={ultimo.id}>
      <div className="flex-1 flex flex-col">
        <h1 className="text-[32px] font-light text-white leading-tight">Pagar otra vez</h1>
        <div className="subase-sand-rule mt-2.5" />

        <p className="text-[15px] font-normal text-[#C3C5C6] mt-4">{ultimo.nombre}</p>
        <p className="text-[18px] font-normal text-white mt-1 leading-snug">{ultimo.ruta}</p>

        <hr className="subase-filete my-6" />

        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-normal text-[#C3C5C6]">Pasaje</span>
          <span className="text-[48px] font-light text-white leading-none tracking-tight">
            {formatCOP(ultimo.tarifa)}
          </span>
        </div>

        <div className="mt-8">
          <Link to={`/v/${encodeURIComponent(ultimo.id)}`} className="subase-btn-primary">
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
