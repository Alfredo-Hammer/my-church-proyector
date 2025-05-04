import React from "react";

export default function Presentaciones() {
  const presentaciones = [
    {id: 1, titulo: "Servicio Dominical", fecha: "2025-05-03"},
    {id: 2, titulo: "Reunión de Jóvenes", fecha: "2025-05-10"},
    {id: 3, titulo: "Estudio Bíblico", fecha: "2025-05-17"},
  ];

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Presentaciones</h1>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition duration-300">
            + Nueva Presentación
          </button>
        </div>

        {/* Lista de presentaciones */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Lista de Presentaciones
          </h2>
          {presentaciones.length > 0 ? (
            <ul className="space-y-4">
              {presentaciones.map((presentacion) => (
                <li
                  key={presentacion.id}
                  className="flex justify-between items-center bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition duration-300"
                >
                  <div>
                    <h3 className="text-lg font-bold">{presentacion.titulo}</h3>
                    <p className="text-gray-400">Fecha: {presentacion.fecha}</p>
                  </div>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg shadow-lg transition duration-300">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No hay presentaciones disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}
