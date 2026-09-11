import React, {useState} from "react";
import {
  FaPhone,
  FaEnvelope,
  FaCheck,
  FaWhatsapp,
} from "react-icons/fa";

const inputCls =
  "w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-emerald-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors";

// Número de WhatsApp del desarrollador (sin +, espacios ni paréntesis — formato wa.me)
const WHATSAPP_NUMERO = "19412964916";

const Contactos = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: "",
  });
  const [enviado, setEnviado] = useState(false);

  const handleInputChange = (e) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto =
      `Hola, soy ${formData.nombre} (${formData.email}).\n\n${formData.mensaje}`;
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;

    if (window.electron?.abrirEnlaceExterno) {
      window.electron.abrirEnlaceExterno(url);
    } else {
      window.open(url, "_blank");
    }

    setFormData({nombre: "", email: "", mensaje: ""});
    setEnviado(true);
    setTimeout(() => setEnviado(false), 4000);
  };

  return (
    <div className="bg-[#080c14] h-full flex flex-col overflow-hidden text-slate-100">
      {/* Toolbar compacto */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <FaEnvelope className="text-emerald-400 text-sm shrink-0" />
          <span className="text-sm font-semibold text-white">Contacto</span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            GloryView · Alfredo Hammer
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Columna izquierda: info de contacto */}
            <div className="flex flex-col gap-3">
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <FaPhone className="text-emerald-400 text-xs" />
                  <span className="text-xs font-semibold text-slate-300">
                    Información de Contacto
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      icon: <FaPhone className="text-emerald-400 text-xs" />,
                      label: "Teléfono / WhatsApp",
                      value: "+1 (941) 296 4916",
                      sub: "9 AM – 8 PM EST",
                    },
                    {
                      icon: <FaEnvelope className="text-sky-400 text-xs" />,
                      label: "Email",
                      value: "coderhammer70@gmail.com",
                      sub: "Respuesta en 24 h",
                    },
                  ].map(({icon, label, value, sub}) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg"
                    >
                      <div className="shrink-0 size-7 flex items-center justify-center bg-slate-700/60 rounded-md">
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">
                          {value}
                        </p>
                        <p className="text-[10px] text-slate-600">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: formulario */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 shrink-0">
                  <FaWhatsapp className="text-emerald-400 text-xs" />
                  <span className="text-xs font-semibold text-slate-300">
                    Envíanos un mensaje por WhatsApp
                  </span>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 flex-1"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="contact-nombre"
                        className="block text-xs text-slate-400 mb-1"
                      >
                        Nombre completo
                      </label>
                      <input
                        id="contact-nombre"
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Tu nombre"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs text-slate-400 mb-1"
                      >
                        Correo electrónico
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="tu@email.com"
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs text-slate-400 mb-1">
                      Mensaje
                    </label>
                    <textarea
                      name="mensaje"
                      value={formData.mensaje}
                      onChange={handleInputChange}
                      placeholder="Escribe tu mensaje aquí…"
                      className={`${inputCls} resize-none flex-1 min-h-[120px]`}
                      required
                    />
                  </div>

                  {enviado && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                      <FaCheck className="shrink-0" />
                      Se abrió WhatsApp con tu mensaje listo — solo falta que le des enviar ahí.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    <FaWhatsapp className="text-sm" /> Enviar por WhatsApp
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-600 text-xs py-2">
            Copyright © 2025 GloryView · Todos los derechos reservados ·{" "}
            <span className="text-emerald-500">
              Desarrollado por Alfredo Hammer
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contactos;
