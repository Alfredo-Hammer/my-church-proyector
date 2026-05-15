import React, {useState} from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaHeart,
  FaCode,
  FaCheck,
} from "react-icons/fa";

const inputCls =
  "w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-emerald-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors";

const Contactos = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleInputChange = (e) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
      setFormData({nombre: "", email: "", mensaje: ""});
      setTimeout(() => setEnviado(false), 3000);
    }, 2000);
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
            {/* Columna izquierda: info + redes */}
            <div className="flex flex-col gap-3">
              {/* Info de contacto */}
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
                      label: "Teléfono",
                      value: "+1 (941) 296 4916",
                      sub: "9 AM – 8 PM EST",
                    },
                    {
                      icon: <FaEnvelope className="text-sky-400 text-xs" />,
                      label: "Email",
                      value: "coderhammer70@gmail.com",
                      sub: "Respuesta en 24 h",
                    },
                    {
                      icon: (
                        <FaMapMarkerAlt className="text-rose-400 text-xs" />
                      ),
                      label: "Ubicación",
                      value: "Sarasota, FL 34234",
                      sub: "Estados Unidos",
                    },
                  ].map(({icon, label, value, sub}) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg"
                    >
                      <div className="shrink-0 w-7 h-7 flex items-center justify-center bg-slate-700/60 rounded-md">
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

              {/* Redes sociales */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <FaCode className="text-emerald-400 text-xs" />
                  <span className="text-xs font-semibold text-slate-300">
                    Redes Sociales
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      icon: <FaLinkedin className="text-blue-400" />,
                      label: "LinkedIn",
                    },
                    {
                      icon: <FaTwitter className="text-sky-400" />,
                      label: "Twitter",
                    },
                    {
                      icon: <FaInstagram className="text-pink-400" />,
                      label: "Instagram",
                    },
                  ].map(({icon, label}) => (
                    <a
                      key={label}
                      href="#"
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-slate-600/60 rounded-lg transition-colors"
                    >
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs text-slate-400">{label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Testimonios */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <FaHeart className="text-rose-400 text-xs" />
                  <span className="text-xs font-semibold text-slate-300">
                    Testimonios
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      texto:
                        "Transformaron mi visión en realidad. Una experiencia increíble.",
                      autor: "Cliente Satisfecho",
                    },
                    {
                      texto:
                        "Altamente profesional y comprometido. ¡Muy recomendados!",
                      autor: "Otro Cliente",
                    },
                  ].map(({texto, autor}) => (
                    <div
                      key={autor}
                      className="px-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg"
                    >
                      <p className="text-xs text-slate-400 italic leading-relaxed">
                        "{texto}"
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        — {autor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: formulario */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 shrink-0">
                  <FaPaperPlane className="text-emerald-400 text-xs" />
                  <span className="text-xs font-semibold text-slate-300">
                    Envíanos un mensaje
                  </span>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 flex-1"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Nombre
                      </label>
                      <input
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
                      <label className="block text-xs text-slate-400 mb-1">
                        Correo electrónico
                      </label>
                      <input
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
                      Mensaje enviado. Nos pondremos en contacto pronto.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 border border-emerald-500/30 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    {enviando ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Enviando…
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="text-xs" /> Enviar mensaje
                      </>
                    )}
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
