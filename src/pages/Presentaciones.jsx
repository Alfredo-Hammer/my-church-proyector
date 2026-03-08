import React from "react";

export default function Presentaciones() {
  const presentaciones = [
    {id: 1, titulo: "Servicio Dominical", fecha: "2025-05-03"},
    {id: 2, titulo: "Reunión de Jóvenes", fecha: "2025-05-10"},
    {id: 3, titulo: "Estudio Bíblico", fecha: "2025-05-17"},
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Presentaciones</h1>
          <button className="px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/20 transition-colors">
            + Nueva Presentación
          </button>
        </div>

        {/* Lista de presentaciones */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">
            Lista de Presentaciones
          </h2>
          {presentaciones.length > 0 ? (
            <ul className="space-y-4">
              {presentaciones.map((presentacion) => (
                <li
                  key={presentacion.id}
                  className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div>
                    <h3 className="text-lg font-semibold">
                      {presentacion.titulo}
                    </h3>
                    <p className="text-white/60">Fecha: {presentacion.fecha}</p>
                  </div>
                  <button className="px-3 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-200 border border-red-500/20 transition-colors">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/60">No hay presentaciones disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}
