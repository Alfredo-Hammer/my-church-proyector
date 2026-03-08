import React, {useState, useEffect} from "react";
import {FaClock, FaMapMarkerAlt, FaChurch} from "react-icons/fa";

const Inicio = () => {
  const [mensaje, setMensaje] = useState("");
  const [fechaHora, setFechaHora] = useState("");

  // ✨ ESTADOS PARA CONFIGURACIÓN
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "",
    eslogan: "",
    direccion: "",
    logoUrl: "/images/icon-256.png",
  });
  const [configuracionCargada, setConfiguracionCargada] = useState(false);

  // ✨ ESTADOS PARA FONDOS DINÁMICOS
  const [fondosDisponibles, setFondosDisponibles] = useState([]);
  const [fondoActivo, setFondoActivo] = useState(null); // null inicialmente hasta cargar fondos

  // ✨ FUNCIÓN PARA CARGAR FONDOS DE LA BASE DE DATOS
  const cargarFondosDisponibles = async () => {
    try {
      console.log("🖼️ [Inicio] Cargando fondos desde DB...");

      if (window.electron?.obtenerFondos) {
        const fondos = await window.electron.obtenerFondos();
        console.log("🖼️ [Inicio] Fondos obtenidos:", fondos);

        if (fondos && fondos.length > 0) {
          // Mapear los fondos al formato correcto (sin duplicar rutas)
          const fondosMapeados = fondos.map((fondo) => {
            // Las rutas ya vienen completas desde la DB, no necesitamos convertirlas
            console.log(
              `🔗 [Inicio] Procesando fondo: ${fondo.nombre} - ${fondo.url}`,
            );

            return {
              ruta: fondo.url, // Usar la ruta tal cual viene de la DB
              tipo: fondo.tipo || "imagen",
              nombre: fondo.nombre || "Fondo",
            };
          });

          console.log("📋 [Inicio] Fondos mapeados:", fondosMapeados);
          setFondosDisponibles(fondosMapeados);

          // Establecer el primer fondo como activo
          const primerFondo = fondosMapeados[0];
          console.log("🎯 [Inicio] Estableciendo primer fondo:", {
            nombre: primerFondo.nombre,
            ruta: primerFondo.ruta,
            tipo: primerFondo.tipo,
          });
          setFondoActivo(primerFondo);
          console.log("✅ [Inicio] Fondos cargados:", fondosMapeados.length);
        } else {
          console.log(
            "⚠️ [Inicio] No hay fondos en la DB, usando fondo por defecto",
          );
        }
      }
    } catch (error) {
      console.error("❌ [Inicio] Error cargando fondos:", error);
    }
  };

  // ✨ FUNCIÓN PARA CAMBIAR FONDO ALEATORIAMENTE
  const cambiarFondoAleatorio = () => {
    if (fondosDisponibles.length > 1) {
      let indiceAleatorio;
      let nuevoFondo;

      // Asegurarse de que el nuevo fondo sea diferente al actual
      do {
        indiceAleatorio = Math.floor(Math.random() * fondosDisponibles.length);
        nuevoFondo = fondosDisponibles[indiceAleatorio];
      } while (nuevoFondo.ruta === fondoActivo.ruta);

      setFondoActivo(nuevoFondo);
      console.log("🔄 [Inicio] Fondo cambiado a:", nuevoFondo.nombre);
    } else if (fondosDisponibles.length === 1) {
      // Si solo hay un fondo, usarlo
      setFondoActivo(fondosDisponibles[0]);
      console.log("ℹ️ [Inicio] Solo hay un fondo disponible");
    }
  };

  // ✨ CARGAR FONDOS AL INICIAR
  useEffect(() => {
    cargarFondosDisponibles();
  }, []);

  // ✨ CAMBIAR FONDO CADA 30 MINUTOS
  useEffect(() => {
    if (fondosDisponibles.length > 1) {
      console.log(
        "⏰ [Inicio] Iniciando intervalo de cambio de fondos (30 min). Total fondos:",
        fondosDisponibles.length,
      );

      const intervalo = setInterval(() => {
        console.log("🔄 [Inicio] Ejecutando cambio de fondo programado...");
        cambiarFondoAleatorio();
      }, 1800000); // 30 minutos = 1,800,000 ms

      return () => {
        console.log("🛑 [Inicio] Limpiando intervalo de fondos");
        clearInterval(intervalo);
      };
    } else if (fondosDisponibles.length === 1) {
      console.log(
        "ℹ️ [Inicio] Solo hay 1 fondo, no se cambiará automáticamente",
      );
    } else {
      console.log("⚠️ [Inicio] No hay fondos disponibles para cambiar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondosDisponibles]);

  // ✨ FUNCIÓN PARA CARGAR CONFIGURACIÓN
  const cargarConfiguracion = async () => {
    try {
      console.log("🔄 [Inicio] Cargando configuración...");

      if (window.electron?.obtenerConfiguracion) {
        const config = await window.electron.obtenerConfiguracion();
        console.log("📋 [Inicio] Configuración obtenida:", config);

        if (config) {
          setConfiguracion((prevConfig) => ({
            ...prevConfig,
            ...config,
            // Asegurar que logoUrl siempre tenga un valor válido
            logoUrl:
              config.logoUrl || prevConfig.logoUrl || "/images/icon-256.png",
          }));

          console.log("✅ [Inicio] Configuración aplicada");
        }
      }
    } catch (error) {
      console.error("❌ [Inicio] Error cargando configuración:", error);
    } finally {
      setConfiguracionCargada(true);
    }
  };

  // ✨ CARGAR CONFIGURACIÓN AL INICIAR
  useEffect(() => {
    cargarConfiguracion();

    // ✨ LISTENER PARA ACTUALIZACIONES EN TIEMPO REAL
    if (window.electron?.on) {
      window.electron.on("configuracion-actualizada", (event, nuevaConfig) => {
        console.log("🔄 [Inicio] Configuración actualizada:", nuevaConfig);
        setConfiguracion((prevConfig) => ({
          ...prevConfig,
          ...nuevaConfig,
        }));
      });
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners("configuracion-actualizada");
      }
    };
  }, []);

  // Actualizar el mensaje de bienvenida según la hora
  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) {
      setMensaje("Buenos días");
    } else if (hora >= 12 && hora < 18) {
      setMensaje("Buenas tardes");
    } else {
      setMensaje("Buenas noches");
    }
  }, []);

  // Actualizar la fecha y hora cada segundo
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date();
      const opcionesFecha = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const fecha = ahora.toLocaleDateString("es-ES", opcionesFecha);
      const hora = ahora.toLocaleTimeString("es-ES");
      setFechaHora(`${fecha} - ${hora}`);
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // ✨ LISTENER PARA CAMBIOS DE FONDO
  useEffect(() => {
    if (window.electron?.on) {
      window.electron.on("fondo-actualizado", (event, nuevoFondo) => {
        console.log("🔄 [Inicio] Fondo actualizado:", nuevoFondo);
        setFondoActivo({
          ruta: nuevoFondo.ruta,
          tipo: nuevoFondo.tipo,
        });
      });
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners("fondo-actualizado");
      }
    };
  }, []);

  // ✨ LOADER MODERNO
  if (!configuracionCargada) {
    return (
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Loader elegante */}
        <div className="relative z-10 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-emerald-400 border-r-emerald-400 mb-4 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-emerald-400/20"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Cargando</h3>
            <p className="text-white/60 animate-pulse text-sm">
              Preparando la experiencia...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Fondo dinámico con transición suave */}
      {fondoActivo?.ruta && (
        <>
          {console.log(
            "🎨 [Inicio] Renderizando fondo:",
            fondoActivo.nombre,
            "Tipo:",
            fondoActivo.tipo,
            "Ruta:",
            fondoActivo.ruta,
          )}

          {fondoActivo.tipo === "video" ? (
            <video
              key={fondoActivo.ruta}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              src={fondoActivo.ruta}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={(e) => {
                console.log(
                  "✅ [Inicio] Video cargado exitosamente:",
                  fondoActivo.ruta,
                );
                e.target.style.opacity = "1";
              }}
              onError={(e) => {
                console.error(
                  "❌ [Inicio] Error cargando video:",
                  fondoActivo.ruta,
                  "Event:",
                  e.target.error,
                );
                // Intentar con el siguiente fondo disponible
                if (fondosDisponibles.length > 1) {
                  cambiarFondoAleatorio();
                }
              }}
            />
          ) : (
            <img
              key={fondoActivo.ruta}
              src={fondoActivo.ruta}
              alt={fondoActivo.nombre}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              onLoad={() => {
                console.log(
                  "✅ [Inicio] Imagen cargada exitosamente:",
                  fondoActivo.ruta,
                );
              }}
              onError={(e) => {
                console.error(
                  "❌ [Inicio] Error cargando imagen:",
                  fondoActivo.ruta,
                  "Error:",
                  e.target.error,
                );
              }}
            />
          )}
        </>
      )}

      {/* Overlay con gradiente suave para mejor visibilidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/35 to-slate-950/55" />

      {/* Contenido principal */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header superior con reloj */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
            <div className="flex items-center space-x-2">
              <FaClock className="text-emerald-300 text-sm" />
              <p className="text-xs md:text-sm font-mono font-medium text-white/90">
                {fechaHora}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido central - mejor centrado */}
        <div className="flex-1 flex flex-col items-center justify-center text-white px-4 py-8">
          {/* Logo de la iglesia con efectos modernos */}
          <div className="relative mb-6">
            <div className="relative">
              <img
                src={
                  configuracion.logoUrl && configuracion.logoUrl !== "undefined"
                    ? configuracion.logoUrl
                    : "/images/icon-256.png"
                }
                alt={`Logo ${configuracion.nombreIglesia || "Iglesia"}`}
                className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full border-2 border-white/20 object-cover"
                onError={(e) => {
                  console.log(
                    "⚠️ [Inicio] Error cargando logo, usando fallback",
                  );
                  e.target.src = "/images/icon-256.png";
                }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>

          {/* Mensaje de bienvenida - solo si hay configuración */}
          {configuracion.nombreIglesia && (
            <div className="text-center mb-4 max-w-4xl w-full">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">
                {mensaje}
              </h1>

              {/* Nombre de la iglesia - responsivo */}
              <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 mb-4">
                <h2 className="text-base md:text-lg lg:text-xl font-bold text-white flex items-center justify-center space-x-2 flex-wrap">
                  <FaChurch className="text-emerald-300 text-lg" />
                  <span className="text-center">
                    Bienvenido a {configuracion.nombreIglesia}
                  </span>
                </h2>

                {/* Eslogan - responsivo */}
                {configuracion.eslogan && (
                  <h3 className="text-sm md:text-base text-white/60 italic font-light mt-2">
                    {configuracion.eslogan}
                  </h3>
                )}
              </div>

              {/* Ubicación - responsiva */}
              {configuracion.direccion && (
                <div className="flex items-center justify-center space-x-2 text-white/60">
                  <FaMapMarkerAlt className="text-emerald-300 text-sm" />
                  <span className="text-sm font-medium">
                    {configuracion.direccion}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Efectos de partículas flotantes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Inicio;
