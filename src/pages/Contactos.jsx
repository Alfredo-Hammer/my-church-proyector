import React, {useState} from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaUser,
  FaComment,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaHeart,
  FaCode,
  FaRocket,
  FaStar,
  FaCheck,
} from "react-icons/fa";

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    // Simular envío
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
      setFormData({nombre: "", email: "", mensaje: ""});

      // Resetear mensaje después de 3 segundos
      setTimeout(() => setEnviado(false), 3000);
    }, 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen overflow-y-auto">
      {/* Header con glassmorphism */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <FaEnvelope className="text-2xl" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-semibold text-white">
                  Glory View
                </h1>
                <p className="text-white/60 mt-2">
                  Conecta con nosotros y haz realidad tu visión
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <FaRocket className="text-4xl text-emerald-300" />
              <h2 className="text-3xl sm:text-4xl font-semibold text-white">
                ¡Hablemos!
              </h2>
            </div>
            <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              ¿Tienes una idea revolucionaria? ¿Necesitas soporte técnico?
              ¿Quieres colaborar en algo increíble?
              <span className="text-emerald-300 font-semibold">
                {" "}
                Estoy aquí para ayudarte a hacer realidad tus proyectos
              </span>
              .
            </p>
            <div className="flex items-center justify-center gap-2 mt-6">
              <FaStar className="text-yellow-400" />
              <FaStar className="text-yellow-400" />
              <FaStar className="text-yellow-400" />
              <FaStar className="text-yellow-400" />
              <FaStar className="text-yellow-400" />
              <span className="text-white/50 ml-2">
                Desarrollador apasionado por la innovación
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Información de contacto */}
          <div className="xl:col-span-1 space-y-6">
            {/* Métodos de contacto */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaPhone className="text-emerald-300" />
                Información de Contacto
              </h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="bg-emerald-500/15 border border-emerald-500/20 p-3 rounded-full">
                    <FaPhone className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Teléfono</h4>
                    <p className="text-white/80">+1 (941) 296 4916</p>
                    <p className="text-xs text-white/50">
                      Disponible de 9 AM - 8 PM EST
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-full">
                    <FaEnvelope className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Email</h4>
                    <p className="text-white/80">coderhammer70@gmail.com</p>
                    <p className="text-xs text-white/50">
                      Respuesta en 24 horas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-full">
                    <FaMapMarkerAlt className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Ubicación</h4>
                    <p className="text-white/80">Sarasota, FL 34234</p>
                    <p className="text-xs text-white/50">Estados Unidos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Redes sociales */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaCode className="text-emerald-300" />
                Sígueme en redes
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <FaGithub className="text-2xl text-gray-300" />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <FaLinkedin className="text-2xl text-blue-400" />
                  <span className="text-sm">LinkedIn</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <FaTwitter className="text-2xl text-blue-400" />
                  <span className="text-sm">Twitter</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <FaInstagram className="text-2xl text-pink-400" />
                  <span className="text-sm">Instagram</span>
                </a>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-emerald-500/5 backdrop-blur-sm rounded-2xl p-8 border border-emerald-500/15">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaHeart className="text-red-400" />
                Testimonios
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                  <p className="text-gray-300 italic">
                    "Trabajar con GloryView fue una experiencia increíble.
                    Transformaron mi visión en realidad."
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    - Cliente Satisfecho
                  </p>
                </div>

                <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                  <p className="text-gray-300 italic">
                    "El equipo de GloryView es altamente profesional y
                    comprometido. ¡Altamente recomendados!"
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    - Otro Cliente Satisfecho
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de contacto */}
          <div className="xl:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaPaperPlane className="text-emerald-300" />
                Envíanos un mensaje
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Nombre"
                      className="w-full border border-white/10 bg-black/20 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Correo electrónico"
                      className="w-full border border-white/10 bg-black/20 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      required
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    name="mensaje"
                    value={formData.mensaje}
                    onChange={handleInputChange}
                    placeholder="Mensaje"
                    rows="4"
                    className="w-full border border-white/10 bg-black/20 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                  ></textarea>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600/90 hover:bg-emerald-600 text-white py-3 rounded-xl border border-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="animate-spin h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.354V2m0 20v-2.354M4.354 12H2m20 0h-2.354M7.05 7.05l-1.414-1.414M17.364 17.364l1.414 1.414M7.05 17.364l-1.414 1.414M17.364 7.05l1.414-1.414"
                          />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane />
                        Enviar mensaje
                      </>
                    )}
                  </button>
                </div>
                {enviado && (
                  <div className="mt-4 p-3 bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 rounded-xl">
                    <FaCheck className="inline mr-2" />
                    Mensaje enviado con éxito. Nos pondremos en contacto contigo
                    pronto.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center p-3">
          {/* Copyright */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Copyright © 2025 GloryView <br />
            Todos los derechos reservados. <br />
            <span className="text-emerald-300">
              Desarrollado por Alfredo Hammer
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contactos;
