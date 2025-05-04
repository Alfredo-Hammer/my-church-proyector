import React from "react";

const Contactos = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-800 via-gray-900 to-black flex items-center justify-center p-6">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg w-full max-w-4xl p-8">
        {/* Encabezado */}
        <div className="flex-grow flex items-center justify-center  p-4">
          <h1 className="text-4xl font-extrabold text-white tracking-wide">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
              Glory
            </span>
            <span className="ml-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
              View
            </span>
          </h1>
        </div>
        <p className="text-gray-300 text-center mb-8">
          ¿Tienes alguna pregunta o necesitas ayuda? ¡Estamos aquí para ti!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Información de contacto */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 3.5a4.5 4.5 0 00-9 0v1.25a4.5 4.5 0 00-3 4.25v5.5a4.5 4.5 0 004.5 4.5h6a4.5 4.5 0 004.5-4.5v-5.5a4.5 4.5 0 00-3-4.25V3.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Teléfono</h3>
                <p className="text-gray-300">+1 (941) 296 4916</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 text-white p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 3.5a4.5 4.5 0 00-9 0v1.25a4.5 4.5 0 00-3 4.25v5.5a4.5 4.5 0 004.5 4.5h6a4.5 4.5 0 004.5-4.5v-5.5a4.5 4.5 0 00-3-4.25V3.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Correo</h3>
                <p className="text-gray-300">coderhanner70@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 text-white p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 3.5a4.5 4.5 0 00-9 0v1.25a4.5 4.5 0 00-3 4.25v5.5a4.5 4.5 0 004.5 4.5h6a4.5 4.5 0 004.5-4.5v-5.5a4.5 4.5 0 00-3-4.25V3.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Dirección</h3>
                <p className="text-gray-300">
                  2402 Leon Ave, Sarasota, FL 34234
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de contacto */}
          <form className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="Nombre"
              className="border border-gray-600 bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              className="border border-gray-600 bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Mensaje"
              rows="5"
              className="border border-gray-600 bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
            <button
              type="submit"
              className="bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Enviar mensaje
            </button>
          </form>
        </div>
        <div className="flex justify-center items-center p-3">
          {/* Copyright */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Copyright © 2025 GloryView <br />
            Todos los derechos reservados. <br />
            <span className="text-red-300">Alfredo Hammer</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contactos;
