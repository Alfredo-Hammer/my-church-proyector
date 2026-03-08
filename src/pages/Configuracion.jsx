import {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  IoSave,
  IoRefresh,
  IoImage,
  IoClose,
  IoCheckmark,
  IoWarning,
  IoInformationCircle,
  IoEye,
  IoTrash,
  IoAdd,
} from "react-icons/io5";
import {FaVideo, FaUpload, FaTimes} from "react-icons/fa";

// Función para obtener la URL base del servidor multimedia
const getBaseURL = () => {
  return "http://localhost:3001";
};

const Configuracion = () => {
  const navigate = useNavigate();

  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "", // ✨ Vacío hasta que el usuario agregue su iglesia
    eslogan: "", // ✨ Vacío hasta que el usuario agregue su eslogan
    pastor: "",
    direccion: "",
    telefono: "",
    email: "",
    website: "",
    logo: "/images/icon-256.png", // ✨ Logo por defecto de la app
    logoSize: "w-80 h-80", // ✨ Tamaño del logo por defecto
    colorPrimario: "#fb923c", // orange-400
    colorSecundario: "#ffffff",
    fondoActivo: "", // ✨ Sin fondo activo por defecto
    tipoFondo: "imagen",
    fontSize: {
      titulo: "text-5xl",
      parrafo: "text-6xl",
      eslogan: "text-2xl",
    },
    videosFondo: [], // ✨ Array vacío de videos
    intervaloCambioVideo: 120, // minutos
    // ✨ NUEVAS OPCIONES DE VISIBILIDAD
    mostrarLogo: true,
    mostrarNombreIglesia: true,
    mostrarEslogan: true,
  });

  // Estados para fondos
  const [fondos, setFondos] = useState([]);
  const [fondoSeleccionado, setFondoSeleccionado] = useState(null);
  const [mostrarSelectorFondo, setMostrarSelectorFondo] = useState(false);
  const [previsualizandoFondo, setPrevisualizandoFondo] = useState(null);

  // Estado para modal de confirmación de restaurar
  const [mostrarModalRestaurar, setMostrarModalRestaurar] = useState(false);

  // Estados generales
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null); // Preview temporal del logo
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);

  // ✨ FUNCIÓN PARA CARGAR FONDOS
  const cargarFondos = async () => {
    try {
      const fondosData = await window.electron.obtenerFondos();
      setFondos(fondosData);

      // Encontrar el fondo actualmente seleccionado
      const fondoActivo = fondosData.find((f) => f.activo);
      if (fondoActivo) {
        setFondoSeleccionado(fondoActivo);
      }
    } catch (error) {
      console.error("Error cargando fondos:", error);
      mostrarMensaje("Error al cargar los fondos", "error");
    }
  };

  // ✨ FUNCIÓN PARA SELECCIONAR FONDO
  const seleccionarFondo = async (fondo) => {
    try {
      await window.electron.establecerFondoActivo(fondo.id);
      setFondoSeleccionado(fondo);

      // Actualizar configuración
      const nuevaConfig = {
        ...configuracion,
        fondoActivo: fondo.ruta,
        tipoFondo: fondo.tipo,
      };

      setConfiguracion(nuevaConfig);
      await guardarConfiguracionCompleta(nuevaConfig);

      mostrarMensaje(
        `Fondo "${fondo.nombre}" establecido como activo`,
        "success",
      );
      setMostrarSelectorFondo(false);
    } catch (error) {
      console.error("Error estableciendo fondo:", error);
      mostrarMensaje("Error al establecer el fondo", "error");
    }
  };

  // ✨ FUNCIÓN PARA SUBIR NUEVO FONDO
  const subirNuevoFondo = async () => {
    try {
      const resultado = await window.electron.subirFondo();
      if (resultado) {
        await cargarFondos();
        mostrarMensaje("Fondo subido exitosamente", "success");
      }
    } catch (error) {
      console.error("Error subiendo fondo:", error);
      mostrarMensaje("Error al subir el fondo", "error");
    }
  };

  // ✨ FUNCIÓN PARA ELIMINAR FONDO
  const eliminarFondo = async (fondoId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este fondo?")) {
      try {
        await window.electron.eliminarFondo(fondoId);
        await cargarFondos();
        mostrarMensaje("Fondo eliminado exitosamente", "success");
      } catch (error) {
        console.error("Error eliminando fondo:", error);
        mostrarMensaje("Error al eliminar el fondo", "error");
      }
    }
  };

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      console.log("🔄 Cargando configuración...");

      if (!window.electron?.obtenerConfiguracion) {
        console.error("❌ Funciones de configuración no disponibles");
        mostrarMensaje(
          "Error: Funciones de configuración no disponibles",
          "error",
        );
        return;
      }

      const config = await window.electron.obtenerConfiguracion();
      console.log("📋 Configuración obtenida:", config);

      if (config && Object.keys(config).length > 0) {
        // ✨ Mapear configuración desde la base de datos
        const configFiltrada = {
          ...config,
          // 🔄 Mantener nombreIglesia tal cual viene de la BD
          nombreIglesia: config.nombreIglesia || "",
          // 🔄 Mantener eslogan tal cual viene de la BD
          eslogan: config.eslogan || "",
          // 🔄 Mapear sitioWeb (BD) -> website (UI)
          website: config.sitioWeb || "",
          // ✨ Solo usar icono de app si no hay logo válido
          logo:
            config.logoUrl &&
            config.logoUrl !== "/logo.jpg" &&
            config.logoUrl !== ""
              ? config.logoUrl
              : "/images/icon-256.png",
        };

        setConfiguracion((prevConfig) => ({
          ...prevConfig,
          ...configFiltrada,
        }));

        console.log("✅ Configuración cargada correctamente");
      } else {
        console.log(
          "ℹ️ No hay configuración guardada, usando valores por defecto",
        );
      }
    } catch (error) {
      console.error("❌ Error cargando configuración:", error);
      mostrarMensaje(
        `Error al cargar la configuración: ${error.message}`,
        "error",
      );
    } finally {
      setCargando(false);
    }
  };

  // ✨ Cargar configuración al iniciar el componente
  useEffect(() => {
    cargarConfiguracion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardarConfiguracionCompleta = async (configToSave = configuracion) => {
    try {
      if (!window.electron?.guardarConfiguracion) {
        throw new Error("Funciones de configuración no disponibles");
      }

      // ✨ Aplanar el objeto de configuración para que db-new.js pueda guardarlo
      const configAplanada = {
        nombreIglesia: configToSave.nombreIglesia || "",
        eslogan: configToSave.eslogan || "",
        pastor: configToSave.pastor || "",
        direccion: configToSave.direccion || "",
        telefono: configToSave.telefono || "",
        email: configToSave.email || "",
        sitioWeb: configToSave.website || configToSave.sitioWeb || "",
        logoUrl: configToSave.logo || "",
        logoSize: configToSave.logoSize || "w-80 h-80", // ✨ Nuevo campo para tamaño del logo
        colorPrimario: configToSave.colorPrimario || "#fb923c",
        colorSecundario: configToSave.colorSecundario || "#ffffff",
        // ✨ Aplanar fontSize
        fontSizeTitulo: configToSave.fontSize?.titulo || "text-5xl",
        fontSizeParrafo: configToSave.fontSize?.parrafo || "text-6xl",
        fontSizeEslogan: configToSave.fontSize?.eslogan || "text-2xl",
        // ✨ Nuevas opciones de visibilidad (convertir a string para BD)
        mostrarLogo:
          configToSave.mostrarLogo !== undefined
            ? configToSave.mostrarLogo.toString()
            : "true",
        mostrarNombreIglesia:
          configToSave.mostrarNombreIglesia !== undefined
            ? configToSave.mostrarNombreIglesia.toString()
            : "true",
        mostrarEslogan:
          configToSave.mostrarEslogan !== undefined
            ? configToSave.mostrarEslogan.toString()
            : "true",
      };

      console.log("📝 Configuración aplanada a guardar:", configAplanada);

      const resultado =
        await window.electron.guardarConfiguracion(configAplanada);
      console.log("📝 Resultado del guardado:", resultado);

      if (!resultado) {
        throw new Error("No se pudo guardar la configuración");
      }

      return resultado;
    } catch (error) {
      console.error("❌ Error guardando configuración:", error);
      throw error;
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      console.log("💾 Guardando configuración...", configuracion);

      let configParaGuardar = {...configuracion};

      // Si hay un nuevo logo, guardarlo primero
      if (archivoLogo) {
        console.log("🖼️ Guardando logo...");

        try {
          const arrayBuffer = await archivoLogo.arrayBuffer();
          const logoPath = await window.electron.guardarLogo(
            new Uint8Array(arrayBuffer),
          );

          if (logoPath) {
            console.log("✅ Logo guardado en:", logoPath);
            // Actualizar solo la ruta corta, no el data URL
            configParaGuardar = {...configParaGuardar, logo: logoPath};
            setConfiguracion((prev) => ({...prev, logo: logoPath}));
          } else {
            console.warn("⚠️ No se pudo guardar el logo");
          }
        } catch (logoError) {
          console.error("❌ Error guardando logo:", logoError);
          mostrarMensaje("Error al guardar el logo", "error");
        }
      }

      // Guardar configuración con la ruta corta del logo
      await guardarConfiguracionCompleta(configParaGuardar);
      mostrarMensaje("Configuración guardada correctamente", "success");
      setArchivoLogo(null);
      setLogoPreview(null); // Limpiar preview temporal
      setLogoPreview(null); // Limpiar preview temporal
    } catch (error) {
      mostrarMensaje(`Error al guardar: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const restaurarDefecto = async () => {
    try {
      console.log("🔄 Restaurando configuración por defecto...");
      setMostrarModalRestaurar(false); // Cerrar modal

      if (!window.electron?.restaurarConfiguracionDefecto) {
        throw new Error("Funciones de configuración no disponibles");
      }

      const resultado = await window.electron.restaurarConfiguracionDefecto();
      console.log("📋 Resultado restauración:", resultado);

      if (resultado) {
        // ✨ Establecer configuración por defecto (campos vacíos para personalización)
        const configuracionDefecto = {
          nombreIglesia: "",
          eslogan: "",
          pastor: "",
          direccion: "",
          telefono: "",
          email: "",
          website: "",
          logo: "/images/icon-256.png", // Solo el icono de la app
          colorPrimario: "#fb923c",
          colorSecundario: "#ffffff",
          fondoActivo: "",
          tipoFondo: "imagen",
          fontSize: {
            titulo: "text-5xl",
            parrafo: "text-6xl",
            eslogan: "text-2xl",
          },
          videosFondo: [],
          intervaloCambioVideo: 120,
          mostrarLogo: true,
          mostrarNombreIglesia: true,
          mostrarEslogan: true,
        };

        // ✨ Actualizar estado local inmediatamente
        setConfiguracion(configuracionDefecto);
        setFondos([]); // Limpiar fondos
        setArchivoLogo(null);
        setFondoSeleccionado(null);
        setPrevisualizandoFondo(null);

        // ✨ Cargar configuración desde el backend (debería estar limpia también)
        await cargarConfiguracion();
        await cargarFondos();

        mostrarMensaje(
          "Configuración restaurada a valores por defecto",
          "success",
        );
      } else {
        throw new Error("No se pudo restaurar la configuración");
      }
    } catch (error) {
      console.error("❌ Error restaurando configuración:", error);
      mostrarMensaje(`Error al restaurar: ${error.message}`, "error");
    }
  };

  const manejarCambioLogo = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      if (archivo.type.startsWith("image/")) {
        console.log("🖼️ Archivo de logo seleccionado:", archivo.name);
        setArchivoLogo(archivo);

        // Crear preview temporal (data URL) sin modificar la configuración
        const reader = new FileReader();
        reader.onload = (e) => {
          setLogoPreview(e.target.result); // Solo preview, no guardar en config
        };
        reader.readAsDataURL(archivo);
      } else {
        mostrarMensaje(
          "Por favor selecciona un archivo de imagen válido",
          "error",
        );
      }
    }
  };

  const actualizarCampo = (campo, valor) => {
    console.log(`📝 Actualizando ${campo}:`, valor);
    setConfiguracion((prev) => ({...prev, [campo]: valor}));
  };

  const actualizarFontSize = (tipo, valor) => {
    console.log(`🔤 Actualizando fontSize.${tipo}:`, valor);
    setConfiguracion((prev) => ({
      ...prev,
      fontSize: {...prev.fontSize, [tipo]: valor},
    }));
  };

  const mostrarMensaje = (texto, tipo) => {
    console.log(`💬 Mensaje [${tipo}]:`, texto);
    setMensaje({texto, tipo});
    setTimeout(() => setMensaje(null), 4000);
  };

  const opcionesFontSize = [
    {valor: "text-3xl", etiqueta: "Pequeño"},
    {valor: "text-4xl", etiqueta: "Mediano"},
    {valor: "text-5xl", etiqueta: "Grande"},
    {valor: "text-6xl", etiqueta: "Extra Grande"},
    {valor: "text-7xl", etiqueta: "Muy Grande"},
    {valor: "text-8xl", etiqueta: "Gigante"},
  ];

  // Mostrar pantalla de carga
  if (cargando) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-emerald-400 border-r-emerald-400 mb-6 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border-2 border-emerald-400/30"></div>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Cargando configuración...
          </h2>
          <p className="text-white/60">Preparando el panel de configuración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen p-6 overflow-y-auto">
      {/* Header moderno */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <IoSave className="text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-white">
                Configuración
              </h1>
              <p className="text-white/60 mt-1">
                Personaliza la información de tu iglesia u organización
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMostrarModalRestaurar(true)}
              disabled={guardando || cargando}
              className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/20 disabled:bg-white/5 disabled:text-white/40 text-amber-200 border border-amber-500/20 rounded-xl transition-colors flex items-center gap-2"
            >
              <IoRefresh />
              Restaurar
            </button>

            <button
              onClick={guardarConfiguracion}
              disabled={guardando || cargando}
              className="px-6 py-2 bg-emerald-600/90 hover:bg-emerald-600 disabled:bg-white/5 disabled:text-white/40 text-white border border-emerald-500/20 rounded-xl transition-colors flex items-center gap-2"
            >
              <IoSave />
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center gap-3 border-l-4 backdrop-blur-sm ${
            mensaje.tipo === "success"
              ? "bg-green-500/10 border-green-400 text-green-300"
              : mensaje.tipo === "error"
                ? "bg-red-500/10 border-red-400 text-red-300"
                : "bg-blue-500/10 border-blue-400 text-blue-300"
          }`}
        >
          {mensaje.tipo === "success" && <IoCheckmark className="text-xl" />}
          {mensaje.tipo === "error" && <IoWarning className="text-xl" />}
          {mensaje.tipo === "info" && (
            <IoInformationCircle className="text-xl" />
          )}
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMNA 1: Información General */}
        <div className="space-y-6">
          {/* Información Básica */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-green-500/20 p-3 rounded-full">
                <IoInformationCircle className="text-green-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Información General
                </h2>
                <p className="text-gray-400 text-sm">
                  Datos básicos de la organización
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la Iglesia/Organización
                </label>
                <input
                  type="text"
                  value={configuracion.nombreIglesia}
                  onChange={(e) =>
                    actualizarCampo("nombreIglesia", e.target.value)
                  }
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  placeholder="Ej: GloryView | Tu Iglesia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Eslogan/Mensaje de Bienvenida
                </label>
                <input
                  type="text"
                  value={configuracion.eslogan}
                  onChange={(e) => actualizarCampo("eslogan", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  placeholder="Ej: Bienvenidos a GloryView"
                />
              </div>

              {/* ✨ OPCIONES DE VISIBILIDAD EN EL PROYECTOR */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mt-6">
                <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center space-x-2">
                  <IoEye className="text-lg" />
                  <span>Visibilidad en Proyector</span>
                </h3>
                <div className="space-y-3">
                  {/* Switch para Logo */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Mostrar Logo
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={configuracion.mostrarLogo}
                        onChange={(e) =>
                          actualizarCampo("mostrarLogo", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                  </label>

                  {/* Switch para Nombre */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Mostrar Nombre de Iglesia
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={configuracion.mostrarNombreIglesia}
                        onChange={(e) =>
                          actualizarCampo(
                            "mostrarNombreIglesia",
                            e.target.checked,
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                  </label>

                  {/* Switch para Eslogan */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Mostrar Eslogan
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={configuracion.mostrarEslogan}
                        onChange={(e) =>
                          actualizarCampo("mostrarEslogan", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pastor/Líder
                </label>
                <input
                  type="text"
                  value={configuracion.pastor}
                  onChange={(e) => actualizarCampo("pastor", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  placeholder="Ej: Pastor Juan Pérez"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-purple-500/20 p-3 rounded-full">
                <IoCheckmark className="text-purple-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Información de Contacto
                </h2>
                <p className="text-gray-400 text-sm">
                  Datos de contacto y ubicación
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dirección
                </label>
                <textarea
                  value={configuracion.direccion}
                  onChange={(e) => actualizarCampo("direccion", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 h-20 resize-none"
                  placeholder="Ej: Calle Principal 123, Ciudad, País"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={configuracion.telefono}
                    onChange={(e) =>
                      actualizarCampo("telefono", e.target.value)
                    }
                    className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                    placeholder="Ej: +1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={configuracion.email}
                    onChange={(e) => actualizarCampo("email", e.target.value)}
                    className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                    placeholder="Ej: contacto@iglesia.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sitio Web
                </label>
                <input
                  type="url"
                  value={configuracion.website}
                  onChange={(e) => actualizarCampo("website", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  placeholder="Ej: https://www.iglesia.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Apariencia Visual */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-orange-500/20 p-3 rounded-full">
                <IoImage className="text-orange-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Logo de la Organización
                </h2>
                <p className="text-gray-400 text-sm">Imagen representativa</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Preview del logo */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-gray-600/50 overflow-hidden bg-gray-700/50 backdrop-blur-sm">
                  <img
                    src={
                      configuracion.logo &&
                      !configuracion.logo.startsWith("data:") &&
                      configuracion.logo.startsWith("/uploads")
                        ? `${getBaseURL()}${configuracion.logo}`
                        : configuracion.logo || "/images/icon-256.png"
                    }
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(
                        "❌ Error cargando logo:",
                        configuracion.logo,
                      );
                      e.target.src = "/images/icon-256.png";
                    }}
                  />
                </div>
              </div>

              {/* Selector de archivo */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={manejarCambioLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="w-full p-4 bg-white/10 border-2 border-dashed border-gray-500 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <IoImage className="text-xl" />
                  {archivoLogo ? archivoLogo.name : "Seleccionar nuevo logo"}
                </label>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Formatos soportados: JPG, PNG, GIF. Tamaño recomendado:
                500x500px
              </p>
            </div>
          </div>

          {/* Colores */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-pink-500/20 p-3 rounded-full">
                <IoRefresh className="text-pink-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Colores del Tema
                </h2>
                <p className="text-gray-400 text-sm">
                  Personaliza la paleta de colores
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color Primario (Títulos)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={configuracion.colorPrimario}
                    onChange={(e) =>
                      actualizarCampo("colorPrimario", e.target.value)
                    }
                    className="w-12 h-12 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={configuracion.colorPrimario}
                    onChange={(e) =>
                      actualizarCampo("colorPrimario", e.target.value)
                    }
                    className="flex-1 p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color Secundario (Texto)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={configuracion.colorSecundario}
                    onChange={(e) =>
                      actualizarCampo("colorSecundario", e.target.value)
                    }
                    className="w-12 h-12 rounded-lg border-2 border-gray-600 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={configuracion.colorSecundario}
                    onChange={(e) =>
                      actualizarCampo("colorSecundario", e.target.value)
                    }
                    className="flex-1 p-3 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tamaños de Fuente */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-cyan-500/20 p-3 rounded-full">
                <IoWarning className="text-cyan-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Tamaños de Fuente
                </h2>
                <p className="text-gray-400 text-sm">
                  Ajusta el tamaño del texto
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tamaño del Título
                </label>
                <select
                  value={configuracion.fontSize.titulo}
                  onChange={(e) => actualizarFontSize("titulo", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                >
                  {opcionesFontSize.map((opcion) => (
                    <option
                      key={opcion.valor}
                      value={opcion.valor}
                      className="bg-gray-800"
                    >
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tamaño del Párrafo/Versículo
                </label>
                <select
                  value={configuracion.fontSize.parrafo}
                  onChange={(e) =>
                    actualizarFontSize("parrafo", e.target.value)
                  }
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                >
                  {opcionesFontSize.map((opcion) => (
                    <option
                      key={opcion.valor}
                      value={opcion.valor}
                      className="bg-gray-800"
                    >
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tamaño del Eslogan
                </label>
                <select
                  value={configuracion.fontSize.eslogan}
                  onChange={(e) =>
                    actualizarFontSize("eslogan", e.target.value)
                  }
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                >
                  {opcionesFontSize.slice(0, 4).map((opcion) => (
                    <option
                      key={opcion.valor}
                      value={opcion.valor}
                      className="bg-gray-800"
                    >
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tamaño del Logo */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-yellow-500/20 p-3 rounded-full">
                <IoImage className="text-yellow-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Tamaño del Logo en Proyector
                </h2>
                <p className="text-gray-400 text-sm">
                  Ajusta el tamaño del logo para el proyector
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tamaño del Logo
                </label>
                <select
                  value={configuracion.logoSize || "w-80 h-80"}
                  onChange={(e) => actualizarCampo("logoSize", e.target.value)}
                  className="w-full p-3 bg-white/10 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300"
                >
                  <option value="w-56 h-56" className="bg-gray-800">
                    Pequeño (w-56 h-56)
                  </option>
                  <option value="w-64 h-64" className="bg-gray-800">
                    Mediano (w-64 h-64)
                  </option>
                  <option value="w-72 h-72" className="bg-gray-800">
                    Grande (w-72 h-72)
                  </option>
                  <option value="w-80 h-80" className="bg-gray-800">
                    Muy Grande (w-80 h-80) - Recomendado
                  </option>
                  <option value="w-96 h-96" className="bg-gray-800">
                    Extra Grande (w-96 h-96)
                  </option>
                  <option value="w-[28rem] h-[28rem]" className="bg-gray-800">
                    Gigante (28rem)
                  </option>
                  <option value="w-[32rem] h-[32rem]" className="bg-gray-800">
                    Super Gigante (32rem)
                  </option>
                </select>
              </div>

              <p className="text-xs text-gray-400">
                💡 <strong>Tip:</strong> Selecciona un tamaño mayor si el logo
                se ve pequeño en el proyector de tu iglesia.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-500/20 p-3 rounded-full">
            <IoEye className="text-indigo-400 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Vista Previa</h2>
            <p className="text-gray-400 text-sm">
              Cómo se verá en la pantalla principal
            </p>
          </div>
        </div>

        <div className="bg-gray-900/50 p-8 rounded-xl text-center relative min-h-[200px] flex flex-col justify-center border border-gray-700/30">
          {/* ✨ Solo mostrar logo si no hay nombre ni eslogan */}
          {!configuracion.nombreIglesia && !configuracion.eslogan ? (
            <div className="flex justify-center">
              <img
                src={configuracion.logo}
                alt="Logo"
                className="w-24 h-24 object-contain"
                onError={(e) => {
                  e.target.src = "/images/icon-256.png";
                }}
              />
            </div>
          ) : (
            <>
              {configuracion.nombreIglesia && (
                <h1
                  className={`${configuracion.fontSize.titulo} font-bold mb-4`}
                  style={{color: configuracion.colorPrimario}}
                >
                  {configuracion.nombreIglesia}
                </h1>
              )}
              {configuracion.eslogan && (
                <p
                  className={`${configuracion.fontSize.eslogan}`}
                  style={{color: configuracion.colorSecundario}}
                >
                  {configuracion.eslogan}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ✨ Modal Selector de Fondos */}
      {mostrarSelectorFondo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-500/20 p-3 rounded-full">
                    <IoImage className="text-purple-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Selector de Fondos
                    </h2>
                    <p className="text-gray-400">
                      Elige un fondo para la página de inicio
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={subirNuevoFondo}
                    className="bg-emerald-600/90 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl border border-emerald-500/20 transition-colors flex items-center space-x-2"
                  >
                    <FaUpload />
                    <span>Subir Fondo</span>
                  </button>

                  <button
                    onClick={() => setMostrarSelectorFondo(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de fondos */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {fondos.length === 0 ? (
                <div className="text-center py-12">
                  <IoImage className="text-6xl text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No hay fondos disponibles
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Sube tu primer fondo para comenzar
                  </p>
                  <button
                    onClick={subirNuevoFondo}
                    className="bg-emerald-600/90 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl border border-emerald-500/20 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <FaUpload />
                    <span>Subir Primer Fondo</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fondos.map((fondo) => (
                    <div
                      key={fondo.id}
                      className={`relative group bg-white/5 rounded-xl overflow-hidden border transition-colors cursor-pointer hover:bg-white/10 ${
                        fondo.activo
                          ? "border-emerald-400/40"
                          : "border-white/10 hover:border-white/20"
                      }`}
                      onClick={() => seleccionarFondo(fondo)}
                    >
                      {/* Preview con manejo de errores */}
                      <div className="aspect-video bg-gray-800 relative overflow-hidden">
                        {fondo.tipo === "video" ? (
                          <video
                            src={fondo.ruta}
                            className="w-full h-full object-cover"
                            muted
                            onMouseEnter={(e) => e.target.play()}
                            onMouseLeave={(e) => e.target.pause()}
                            onError={(e) => {
                              console.error(
                                "Error cargando video:",
                                fondo.ruta,
                              );
                              e.target.style.display = "none";
                              // Mostrar placeholder de error
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : (
                          <img
                            src={fondo.ruta}
                            alt={fondo.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error(
                                "Error cargando imagen:",
                                fondo.ruta,
                              );
                              e.target.style.display = "none";
                              // Mostrar placeholder de error
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        )}

                        {/* Placeholder de error (inicialmente oculto) */}
                        <div
                          className="absolute inset-0 bg-gray-700 flex items-center justify-center"
                          style={{display: "none"}}
                        >
                          <div className="text-center">
                            <IoWarning className="text-red-400 text-3xl mx-auto mb-2" />
                            <p className="text-gray-300 text-sm">
                              Error al cargar
                            </p>
                            <p className="text-gray-500 text-xs">
                              {fondo.nombre}
                            </p>
                          </div>
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {fondo.tipo === "video" ? (
                                  <FaVideo className="text-red-400 text-sm" />
                                ) : (
                                  <IoImage className="text-blue-400 text-sm" />
                                )}
                                <span className="text-white text-xs font-medium">
                                  {fondo.tipo.toUpperCase()}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrevisualizandoFondo(fondo);
                                  }}
                                  className="bg-blue-500/80 hover:bg-blue-500 text-white p-1 rounded transition-colors"
                                >
                                  <IoEye className="text-xs" />
                                </button>

                                {!fondo.activo && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      eliminarFondo(fondo.id);
                                    }}
                                    className="bg-red-500/80 hover:bg-red-500 text-white p-1 rounded transition-colors"
                                  >
                                    <IoTrash className="text-xs" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Indicador activo */}
                        {fondo.activo && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Activo
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h4 className="font-semibold text-white text-sm truncate">
                          {fondo.nombre}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(fondo.fechaCreacion).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✨ Modal de Previsualización */}
      {previsualizandoFondo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPrevisualizandoFondo(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <FaTimes />
            </button>

            <div className="bg-black rounded-xl overflow-hidden">
              {previsualizandoFondo.tipo === "video" ? (
                <video
                  src={previsualizandoFondo.ruta}
                  className="w-full max-h-[80vh] object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={previsualizandoFondo.ruta}
                  alt={previsualizandoFondo.nombre}
                  className="w-full max-h-[80vh] object-contain"
                />
              )}

              <div className="p-4 text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  {previsualizandoFondo.nombre}
                </h3>
                <button
                  onClick={() => {
                    seleccionarFondo(previsualizandoFondo);
                    setPrevisualizandoFondo(null);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-2 rounded-lg transition-all duration-300"
                >
                  Usar este fondo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para restaurar configuración */}
      {mostrarModalRestaurar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
            <div className="p-6">
              {/* Icono de advertencia */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <IoWarning className="text-yellow-500 text-3xl" />
                </div>
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-white text-center mb-3">
                ¿Restaurar configuración?
              </h3>

              {/* Descripción */}
              <p className="text-slate-300 text-center mb-6">
                Se restaurarán los valores por defecto:
              </p>

              {/* Lista de cambios */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                <div className="flex items-start gap-2 text-slate-300">
                  <IoInformationCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Nombre de iglesia:</strong> Se vaciará
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <IoInformationCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Eslogan:</strong> Se vaciará
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <IoInformationCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Logo:</strong> Se usará el icono de la aplicación
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <IoInformationCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Otros datos:</strong> Se restablecerán a valores
                    predeterminados
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalRestaurar(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <IoClose />
                  Cancelar
                </button>
                <button
                  onClick={restaurarDefecto}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <IoRefresh />
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;
