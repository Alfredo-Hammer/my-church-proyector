import {useState, useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import ModalConfirmacion from "../components/ModalConfirmacion";
import {
  IoImage,
  IoVideocam,
  IoFolder,
  IoTrash,
  IoCheckmark,
  IoAdd,
  IoCloudDownload,
  IoRefresh,
  IoSearch,
  IoArrowBack,
} from "react-icons/io5";

const GestionFondos = () => {
  // Función para obtener la URL base del servidor multimedia
  const getBaseURL = () => {
    return "http://localhost:3001";
  };

  const location = useLocation();
  const navigate = useNavigate();

  // Detectar si estamos en modo selección (para presentaciones)
  const modoSeleccion = location.state?.modoSeleccion || false;
  const volverA = location.state?.volverA || null;
  const preserveSlideIndex = location.state?.preserveSlideIndex; // ✨ Capturar el índice preservado
  const [fondos, setFondos] = useState([]);
  const [pixabayImages, setPixabayImages] = useState([]);
  const [pixabayVideos, setPixabayVideos] = useState([]);
  const [fondoActivo, setFondoActivo] = useState(null);
  const [tabActivo, setTabActivo] = useState("mis-imagenes"); // ✨ Cambiar default a "mis-imagenes"
  const [modalOpen, setModalOpen] = useState(false);
  const [fondoAEliminar, setFondoAEliminar] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // ✨ NUEVOS ESTADOS PARA BÚSQUEDA
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [ultimaBusqueda, setUltimaBusqueda] = useState("");

  // ✨ CARGAR DATOS AL INICIALIZAR
  useEffect(() => {
    console.log("🔄 [GestionFondos] Tab activo cambiado:", tabActivo);

    // Siempre cargar fondo activo
    cargarFondoActivo();

    // Cargar datos según el tab
    if (tabActivo === "mis-imagenes") {
      cargarFondos();
    } else if (tabActivo === "imagenes") {
      cargarPixabayImages(); // Usa término por defecto
    } else if (tabActivo === "videos") {
      cargarPixabayVideos(); // Usa término por defecto
    }
  }, [tabActivo]);

  // ✨ CARGAR AL MONTAR EL COMPONENTE
  useEffect(() => {
    console.log(
      "🚀 [GestionFondos] Componente montado, cargando datos iniciales...",
    );
    cargarFondoActivo();
    cargarFondos(); // Cargar fondos al inicio
  }, []);

  // ✨ ESCUCHAR CAMBIOS DE FONDO ACTIVO EN TIEMPO REAL
  useEffect(() => {
    const handleFondoActivo = (event, nuevoFondo) => {
      console.log("🖼️ [GestionFondos] Fondo activo cambiado:", nuevoFondo);
      setFondoActivo(nuevoFondo);
    };

    if (window.electron?.on) {
      window.electron.on("actualizar-fondo-activo", handleFondoActivo);
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners("actualizar-fondo-activo");
      }
    };
  }, []);

  // ✨ CARGAR FONDO ACTIVO DESDE LA BD
  const cargarFondoActivo = async () => {
    try {
      console.log("🖼️ [GestionFondos] Cargando fondo activo...");

      if (!window.electron?.obtenerFondoActivo) {
        console.warn(
          "⚠️ [GestionFondos] Función obtenerFondoActivo no disponible",
        );
        return;
      }

      const activo = await window.electron.obtenerFondoActivo();

      if (activo) {
        console.log("✅ [GestionFondos] Fondo activo cargado:", activo);
        setFondoActivo(activo);
      } else {
        console.log("📭 [GestionFondos] No hay fondo activo");
        setFondoActivo(null);
      }
    } catch (error) {
      console.error("❌ [GestionFondos] Error cargando fondo activo:", error);
    }
  };

  // ✨ CARGAR FONDOS GUARDADOS CORREGIDO
  const cargarFondos = async () => {
    try {
      setCargando(true);
      console.log("🔄 [GestionFondos] Cargando fondos guardados...");

      if (!window.electron?.obtenerFondos) {
        console.error(
          "⚠️ [GestionFondos] window.electron.obtenerFondos no está disponible",
        );
        console.log(
          "🔍 [GestionFondos] window.electron disponible:",
          !!window.electron,
        );
        console.log(
          "🔍 [GestionFondos] Métodos disponibles:",
          Object.keys(window.electron || {}),
        );
        setFondos([]);
        mostrarMensaje("Error: Función obtenerFondos no disponible", "error");
        return;
      }

      console.log(
        "📞 [GestionFondos] Llamando a window.electron.obtenerFondos()...",
      );
      const fondosGuardados = await window.electron.obtenerFondos();
      console.log(
        "📋 [GestionFondos] Respuesta de obtenerFondos:",
        fondosGuardados,
      );
      console.log(
        "📋 [GestionFondos] Tipo de respuesta:",
        typeof fondosGuardados,
      );
      console.log(
        "📋 [GestionFondos] Es array:",
        Array.isArray(fondosGuardados),
      );

      if (
        fondosGuardados &&
        Array.isArray(fondosGuardados) &&
        fondosGuardados.length > 0
      ) {
        const migracionesPendientes = [];

        // ✨ PROCESAR FONDOS CORRECTAMENTE
        let fondosProcesados = fondosGuardados.map((fondo) => {
          let urlFinal = fondo.url;

          console.log(`🔍 [DEBUG] Procesando fondo ${fondo.id}:`, fondo.url);

          // ✨ MIGRACIÓN: Corregir URLs antiguas que apuntan a /fondos/pixabay_
          if (
            fondo.url.includes("pixabay_") &&
            fondo.url.includes("/fondos/")
          ) {
            const filename = fondo.url.split("/").pop(); // Extraer solo el nombre del archivo
            // Guardar ruta CANÓNICA en BD (relativa). El frontend ya sabe prefijar con baseURL.
            urlFinal = `/images/pixabay/${filename}`;
            console.log(
              `🔄 [MIGRACIÓN] Corrigiendo URL antigua: ${fondo.url} -> ${urlFinal}`,
            );

            // ✅ Persistir migración en BD (si está disponible)
            if (window.electron?.actualizarFondo && fondo.id) {
              migracionesPendientes.push({id: fondo.id, url: urlFinal});
            }
          }

          // Si la URL no empieza con http (es archivo local), construir ruta completa
          if (!urlFinal.startsWith("http")) {
            // Para archivos locales, usar el servidor Express en puerto 3001
            urlFinal = `${getBaseURL()}${urlFinal}`;
          }

          console.log(
            `🔄 [GestionFondos] Procesando fondo ${fondo.id}: ${fondo.url} -> ${urlFinal}`,
          );

          return {
            ...fondo,
            url: urlFinal,
            nombre: fondo.nombre || `Fondo ${fondo.id}`,
            tipo: fondo.tipo || "imagen",
          };
        });

        if (migracionesPendientes.length > 0) {
          console.log(
            `🛠️ [GestionFondos] Persistiendo ${migracionesPendientes.length} migraciones de fondos en BD...`,
          );
          Promise.allSettled(
            migracionesPendientes.map((m) =>
              window.electron.actualizarFondo(m),
            ),
          ).then((results) => {
            const ok = results.filter(
              (r) => r.status === "fulfilled" && r.value,
            ).length;
            console.log(
              `✅ [GestionFondos] Migraciones persistidas: ${ok}/${migracionesPendientes.length}`,
            );
          });
        }

        // ✨ Filtrar videos en modo selección (presentaciones solo soportan imágenes)
        if (modoSeleccion) {
          fondosProcesados = fondosProcesados.filter(
            (fondo) => fondo.tipo === "imagen",
          );
          console.log(
            `🖼️ [GestionFondos] Modo selección: filtrando solo imágenes (${fondosProcesados.length} de ${fondosGuardados.length})`,
          );
        }

        setFondos(fondosProcesados);
        console.log(
          "✅ [GestionFondos] Fondos procesados:",
          fondosProcesados.length,
        );
        console.log("📋 [GestionFondos] Primer fondo:", fondosProcesados[0]);
        mostrarMensaje(
          `${fondosProcesados.length} fondos cargados correctamente`,
          "success",
        );
      } else {
        setFondos([]);
        console.log(
          "📭 [GestionFondos] No hay fondos guardados o respuesta inválida",
        );
        if (fondosGuardados === null || fondosGuardados === undefined) {
          mostrarMensaje(
            "Error al obtener fondos de la base de datos",
            "error",
          );
        } else {
          mostrarMensaje("No hay fondos guardados", "info");
        }
      }
    } catch (error) {
      console.error("❌ [GestionFondos] Error al cargar los fondos:", error);
      console.error("❌ [GestionFondos] Stack trace:", error.stack);
      mostrarMensaje(
        "Error al cargar los fondos guardados: " + error.message,
        "error",
      );
      setFondos([]);
    } finally {
      setCargando(false);
    }
  };

  const apiKey =
    process.env.REACT_APP_PIXABAY_API_KEY ||
    "29325243-29bd81b56bd1800c81b3482a7";

  const cargarPixabayImages = async (busqueda = "church,landscape,nature") => {
    setCargando(true);
    try {
      console.log(
        "🔄 [GestionFondos] Cargando imágenes de Pixabay con término:",
        busqueda,
      );
      const response = await fetch(
        `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
          busqueda,
        )}&image_type=photo&min_width=1920&per_page=20&safesearch=true`,
      );
      const data = await response.json();
      setPixabayImages(data.hits || []);
      setUltimaBusqueda(busqueda);
      console.log(
        "✅ [GestionFondos] Imágenes Pixabay cargadas:",
        data.hits?.length || 0,
      );
    } catch (error) {
      console.error("❌ Error al cargar imágenes de Pixabay:", error);
      mostrarMensaje("Error al cargar imágenes de Pixabay", "error");
    } finally {
      setCargando(false);
    }
  };

  const cargarPixabayVideos = async (busqueda = "church,nature,landscape") => {
    setCargando(true);
    try {
      console.log(
        "🔄 [GestionFondos] Cargando videos de Pixabay con término:",
        busqueda,
      );
      const response = await fetch(
        `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(
          busqueda,
        )}&per_page=12&safesearch=true`,
      );
      const data = await response.json();
      setPixabayVideos(data.hits || []);
      setUltimaBusqueda(busqueda);
      console.log(
        "✅ [GestionFondos] Videos Pixabay cargados:",
        data.hits?.length || 0,
      );
    } catch (error) {
      console.error("❌ Error al cargar videos de Pixabay:", error);
      mostrarMensaje("Error al cargar videos de Pixabay", "error");
    } finally {
      setCargando(false);
    }
  };

  // ✨ FUNCIÓN PARA MANEJAR BÚSQUEDA
  const manejarBusqueda = async () => {
    if (!terminoBusqueda.trim()) {
      mostrarMensaje("Por favor ingresa un término de búsqueda", "info");
      return;
    }

    console.log("🔍 [GestionFondos] Buscando:", terminoBusqueda);

    if (tabActivo === "imagenes") {
      await cargarPixabayImages(terminoBusqueda);
    } else if (tabActivo === "videos") {
      await cargarPixabayVideos(terminoBusqueda);
    }
  };

  // ✨ FUNCIÓN PARA MANEJAR ENTER EN EL BUSCADOR
  const manejarEnterBusqueda = (e) => {
    if (e.key === "Enter") {
      manejarBusqueda();
    }
  };

  // ✨ AGREGAR FONDO DESDE DISPOSITIVO CORREGIDO
  const agregarFondoDesdeDispositivo = async () => {
    try {
      setCargando(true);
      mostrarMensaje("Seleccionando archivo...", "info");
      console.log("📁 [GestionFondos] Iniciando selección de fondo...");

      // Verificar que las funciones estén disponibles
      if (!window.electron?.seleccionarFondo) {
        throw new Error("Función de selección de archivos no disponible");
      }

      const resultado = await window.electron.seleccionarFondo();
      console.log("📁 [GestionFondos] Resultado de selección:", resultado);

      if (!resultado || !resultado.filePath) {
        console.log("❌ No se seleccionó ningún archivo.");
        mostrarMensaje("No se seleccionó ningún archivo", "info");
        return;
      }

      mostrarMensaje("Copiando archivo...", "info");

      if (!window.electron?.copiarArchivoAFondos) {
        throw new Error("Función de copia de archivos no disponible");
      }

      const nuevaRuta = await window.electron.copiarArchivoAFondos(
        resultado.filePath,
      );
      console.log("📁 [GestionFondos] Nueva ruta del archivo:", nuevaRuta);

      if (!nuevaRuta) {
        throw new Error("Error al copiar el archivo a la carpeta de fondos");
      }

      mostrarMensaje("Guardando en base de datos...", "info");

      // ✨ DATOS CORREGIDOS PARA ENVIAR
      const fondoData = {
        url: nuevaRuta, // Esta ya es la ruta relativa (/fondos/archivo.jpg)
        tipo: resultado.tipo,
        nombre: resultado.nombre || `Fondo ${Date.now()}`,
        activo: false,
        origen: "dispositivo",
      };

      console.log("💾 [GestionFondos] Enviando datos a BD:", fondoData);

      if (!window.electron?.agregarFondo) {
        throw new Error("Función de agregar fondo no disponible");
      }

      const fondoGuardado = await window.electron.agregarFondo(fondoData);
      console.log("📋 [GestionFondos] Resultado de BD:", fondoGuardado);

      if (!fondoGuardado || fondoGuardado === false) {
        throw new Error("Error al guardar el fondo en la base de datos");
      }

      console.log("✅ [GestionFondos] Fondo guardado:", fondoGuardado);
      mostrarMensaje("Fondo agregado correctamente", "success");

      // Recargar fondos
      await cargarFondos();
    } catch (error) {
      console.error(
        "❌ [GestionFondos] Error al agregar fondo desde dispositivo:",
        error,
      );
      mostrarMensaje(`Error: ${error.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  // ✨ DESCARGAR Y GUARDAR FONDO DE PIXABAY CORREGIDO
  const descargarYGuardarFondo = async (fondoData, tipo = "imagen") => {
    try {
      setCargando(true);
      mostrarMensaje("Descargando y guardando fondo...", "info");

      let urlDescarga, nombre;

      if (tipo === "imagen") {
        urlDescarga = fondoData.largeImageURL || fondoData.webformatURL;
        nombre = `Pixabay ${fondoData.id} - ${fondoData.tags.split(",")[0]}`;
      } else {
        urlDescarga = fondoData.videos.medium.url;
        nombre = `Pixabay Video ${fondoData.id}`;
      }

      // ✨ Descargar la imagen/video localmente primero
      console.log("🌐 Descargando desde Pixabay:", urlDescarga);
      const response = await fetch(
        `${getBaseURL()}/api/download-pixabay-image`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            imageUrl: urlDescarga,
            imageId: fondoData.id,
            tags: fondoData.tags,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error en respuesta:", response.status, errorText);
        throw new Error(`Error al descargar imagen: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Archivo descargado:", data.localPath);

      // ✨ DATOS CORREGIDOS: usar ruta local en lugar de URL externa
      const fondoParaGuardar = {
        url: `/images/pixabay/${data.filename}`, // Ruta relativa para la BD
        tipo: tipo === "imagen" ? "imagen" : "video",
        nombre: nombre,
        activo: false,
        origen: "pixabay",
      };

      console.log(
        "💾 [GestionFondos] Guardando fondo descargado en BD:",
        fondoParaGuardar,
      );
      const resultado = await window.electron.agregarFondo(fondoParaGuardar);
      console.log("📋 [GestionFondos] Resultado de BD:", resultado);

      if (resultado && resultado !== false) {
        mostrarMensaje("Fondo descargado y guardado correctamente", "success");
        // Si estamos en la pestaña de fondos guardados, recargar
        if (tabActivo === "mis-imagenes") {
          await cargarFondos();
        }
      } else {
        throw new Error("Error al guardar el fondo en la base de datos");
      }
    } catch (error) {
      console.error("❌ [GestionFondos] Error descargando fondo:", error);
      mostrarMensaje(`Error: ${error.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  // ✨ SELECCIONAR FONDO COMO ACTIVO CORREGIDO
  const seleccionarComoActivo = async (fondoData, esLocal = false) => {
    try {
      setCargando(true);
      mostrarMensaje("Activando fondo...", "info");
      console.log("🖼️ [GestionFondos] Seleccionando fondo activo:", fondoData);

      let fondoParaActivar;

      if (esLocal) {
        // Fondo local ya guardado
        fondoParaActivar = fondoData;
      } else {
        // Fondo de Pixabay - guardarlo primero
        const tipo = fondoData.videos ? "video" : "imagen";
        await descargarYGuardarFondo(fondoData, tipo);

        // Obtener el fondo recién guardado
        const fondosActualizados = await window.electron.obtenerFondos();
        fondoParaActivar = fondosActualizados[fondosActualizados.length - 1]; // El último agregado
      }

      if (!fondoParaActivar || !fondoParaActivar.id) {
        throw new Error("No se pudo obtener el ID del fondo");
      }

      // Establecer como activo en la BD
      console.log(
        "🔄 [GestionFondos] Estableciendo fondo activo en BD:",
        fondoParaActivar.id,
      );
      const resultado = await window.electron.establecerFondoActivo(
        fondoParaActivar.id,
      );

      if (resultado) {
        setFondoActivo(fondoParaActivar);
        mostrarMensaje("Fondo activado correctamente", "success");
        console.log("✅ [GestionFondos] Fondo activado:", fondoParaActivar);

        // Recargar fondos para actualizar el indicador visual
        if (tabActivo === "mis-imagenes") {
          await cargarFondos();
        }
      } else {
        throw new Error("Error al activar el fondo en la base de datos");
      }
    } catch (error) {
      console.error(
        "❌ [GestionFondos] Error al seleccionar fondo activo:",
        error,
      );
      mostrarMensaje(`Error: ${error.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  // ✨ FUNCIÓN NUEVA: Seleccionar imagen para presentación
  const seleccionarImagenParaPresentacion = (imagenUrl) => {
    console.log("📷 [GestionFondos] ========================================");
    console.log(
      "📷 [GestionFondos] Imagen seleccionada para presentación:",
      imagenUrl,
    );
    console.log(
      "📷 [GestionFondos] Volver a:",
      volverA || "/presentacion-manager",
    );

    const timestamp = Date.now();
    const navigationState = {
      imagenSeleccionada: imagenUrl,
      timestamp: timestamp,
    };

    // ✨ Preservar el índice de diapositiva si está disponible
    if (preserveSlideIndex !== undefined) {
      navigationState.preserveSlideIndex = preserveSlideIndex;
      console.log(
        "🔄 [GestionFondos] Preservando índice de diapositiva:",
        preserveSlideIndex,
      );
    }

    console.log("📷 [GestionFondos] State de navegación:", navigationState);

    if (volverA) {
      // Navegar de vuelta pasando la imagen seleccionada
      console.log("🔄 [GestionFondos] Navegando a:", volverA);
      navigate(volverA, {state: navigationState});
    } else {
      // Fallback: volver a presentation-manager
      console.log("🔄 [GestionFondos] Navegando a: /presentacion-manager");
      navigate("/presentacion-manager", {state: navigationState});
    }
    console.log("📷 [GestionFondos] ========================================");
  };

  // ✨ MANEJAR CLIC EN IMAGEN (modo dual)
  const manejarClicEnImagen = (fondo) => {
    if (modoSeleccion) {
      // Modo selección: seleccionar imagen y volver
      seleccionarImagenParaPresentacion(fondo.url);
    } else {
      // Modo normal: establecer como fondo activo del proyector
      seleccionarComoActivo(fondo, true);
    }
  };

  // ✨ MANEJAR CLIC EN IMAGEN DE PIXABAY (modo dual)
  const manejarClicEnImagenPixabay = async (pixabayData, tipo = "imagen") => {
    if (modoSeleccion) {
      // Modo selección: descargar primero, guardar en BD y luego seleccionar
      try {
        setCargando(true);
        mostrarMensaje("Descargando imagen...", "info");

        let urlDescarga;
        if (tipo === "imagen") {
          urlDescarga = pixabayData.largeImageURL || pixabayData.webformatURL;
        } else {
          urlDescarga = pixabayData.videos.medium.url;
        }

        // Descargar la imagen localmente
        const response = await fetch(
          `${getBaseURL()}/api/download-pixabay-image`,
          {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              imageUrl: urlDescarga,
              imageId: pixabayData.id,
              tags: pixabayData.tags,
            }),
          },
        );

        if (!response.ok) throw new Error("Error al descargar imagen");

        const data = await response.json();
        console.log("✅ Imagen descargada:", data.localPath);

        // Guardar en la base de datos
        const fondoParaGuardar = {
          url: `/images/pixabay/${data.filename}`, // Ruta relativa para la BD
          tipo: "imagen",
          nombre: `Pixabay ${pixabayData.id} - ${
            pixabayData.tags.split(",")[0]
          }`,
          activo: false,
          origen: "pixabay",
        };

        console.log("💾 Guardando imagen descargada en BD:", fondoParaGuardar);
        await window.electron.agregarFondo(fondoParaGuardar);
        console.log("✅ Imagen guardada en BD");

        // Seleccionar la imagen descargada (usar URL completa para el frontend)
        seleccionarImagenParaPresentacion(data.localPath);
      } catch (error) {
        console.error("❌ Error descargando imagen de Pixabay:", error);
        mostrarMensaje("Error al descargar imagen", "error");
      } finally {
        setCargando(false);
      }
    } else {
      // Modo normal: usar como fondo activo
      seleccionarComoActivo(pixabayData, false);
    }
  };

  // ✨ ELIMINAR FONDO CON CONFIRMACIÓN
  const confirmarEliminarFondo = (fondo) => {
    setFondoAEliminar(fondo);
    setModalOpen(true);
  };

  const eliminarFondo = async () => {
    if (!fondoAEliminar) return;

    try {
      setCargando(true);
      mostrarMensaje("Eliminando fondo...", "info");
      console.log("🗑️ [GestionFondos] Eliminando fondo:", fondoAEliminar);

      const resultado = await window.electron.eliminarFondo(fondoAEliminar.id);

      if (resultado) {
        // Si era el fondo activo, limpiar
        if (fondoActivo && fondoActivo.id === fondoAEliminar.id) {
          setFondoActivo(null);
        }

        mostrarMensaje("Fondo eliminado correctamente", "success");
        await cargarFondos();
      } else {
        throw new Error("Error al eliminar el fondo");
      }
    } catch (error) {
      console.error("❌ [GestionFondos] Error eliminando fondo:", error);
      mostrarMensaje(`Error: ${error.message}`, "error");
    } finally {
      setCargando(false);
      setModalOpen(false);
      setFondoAEliminar(null);
    }
  };

  // ✨ FUNCIÓN PARA MOSTRAR MENSAJES
  const mostrarMensaje = (texto, tipo) => {
    setMensaje({texto, tipo});
    setTimeout(() => setMensaje(null), 4000);
  };

  // ✨ VERIFICAR SI UN FONDO ESTÁ ACTIVO
  const esFondoActivo = (fondo) => {
    if (!fondoActivo || !fondo) return false;
    return fondoActivo.id === fondo.id;
  };

  return (
    <div className="text-slate-100 h-full p-4 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      {/* Modal de confirmación */}
      <ModalConfirmacion
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={eliminarFondo}
        titulo="Confirmar eliminación"
        mensaje={`¿Estás seguro de que deseas eliminar el fondo "${
          fondoAEliminar?.nombre || "seleccionado"
        }"? Esta acción no se puede deshacer.`}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {modoSeleccion && (
            <button
              onClick={() => navigate(volverA || "/presentacion-manager")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors"
              title="Volver sin seleccionar"
            >
              <IoArrowBack /> Volver
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              {modoSeleccion ? "📸 Seleccionar Imagen" : "🖼️ Gestión de Fondos"}
            </h1>
            <p className="text-white/60 mt-1">
              {modoSeleccion
                ? "Selecciona una imagen para tu presentación"
                : "Gestiona fondos para el proyector"}
            </p>
          </div>
        </div>

        {/* Indicador de fondo activo */}
        <div className="flex items-center gap-4">
          {fondoActivo && (
            <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-200 px-4 py-2 rounded-xl flex items-center gap-2">
              <IoCheckmark />
              <span className="text-sm">
                Fondo activo: {fondoActivo.nombre || "Sin nombre"}
              </span>
            </div>
          )}

          {/* Botón refrescar */}
          <button
            onClick={() => {
              if (tabActivo === "mis-imagenes") {
                cargarFondos();
              } else {
                cargarFondoActivo();
              }
            }}
            className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors"
            disabled={cargando}
          >
            <IoRefresh className={cargando ? "animate-spin" : ""} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
            mensaje.tipo === "success"
              ? "bg-green-800 text-green-200"
              : mensaje.tipo === "error"
                ? "bg-red-800 text-red-200"
                : "bg-blue-800 text-blue-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTabActivo("mis-imagenes")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              tabActivo === "mis-imagenes"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <IoFolder />
            Mis Fondos ({fondos.length})
          </button>
          <button
            onClick={() => setTabActivo("imagenes")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              tabActivo === "imagenes"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <IoImage />
            Imágenes Online
          </button>
          {!modoSeleccion && (
            <button
              onClick={() => setTabActivo("videos")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                tabActivo === "videos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <IoVideocam />
              Videos Online
            </button>
          )}
        </div>
      </div>

      {/* ✨ BUSCADOR PARA IMÁGENES Y VIDEOS ONLINE */}
      {(tabActivo === "imagenes" || tabActivo === "videos") && (
        <div className="mb-6">
          <div className="flex gap-3 max-w-md mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                onKeyPress={manejarEnterBusqueda}
                placeholder={`Buscar ${
                  tabActivo === "imagenes" ? "imágenes" : "videos"
                }... (ej: naturaleza, montañas, cielo)`}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={cargando}
              />
              <IoSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={manejarBusqueda}
              disabled={cargando || !terminoBusqueda.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <IoSearch />
              Buscar
            </button>
            {/* Botón para limpiar búsqueda */}
            {terminoBusqueda && (
              <button
                onClick={() => {
                  setTerminoBusqueda("");
                  setUltimaBusqueda("");
                  if (tabActivo === "imagenes") {
                    cargarPixabayImages(); // Cargar con términos por defecto
                  } else if (tabActivo === "videos") {
                    cargarPixabayVideos(); // Cargar con términos por defecto
                  }
                }}
                disabled={cargando}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Búsquedas rápidas sugeridas */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {(tabActivo === "imagenes"
              ? [
                  "naturaleza",
                  "cielo",
                  "montañas",
                  "mar",
                  "cruz",
                  "atardecer",
                  "flores",
                  "paisaje",
                  "luz",
                  "esperanza",
                ]
              : [
                  "naturaleza",
                  "cielo",
                  "agua",
                  "fuego",
                  "nubes",
                  "montañas",
                  "mar",
                  "bosque",
                  "luz",
                  "amanecer",
                ]
            ).map((termino) => (
              <button
                key={termino}
                onClick={() => {
                  setTerminoBusqueda(termino);
                  setTimeout(() => {
                    if (tabActivo === "imagenes") {
                      cargarPixabayImages(termino);
                    } else if (tabActivo === "videos") {
                      cargarPixabayVideos(termino);
                    }
                  }, 100);
                }}
                disabled={cargando}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-full transition-colors"
              >
                {termino}
              </button>
            ))}
          </div>

          {/* Mostrar última búsqueda */}
          {ultimaBusqueda && !cargando && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Mostrando resultados para: "{ultimaBusqueda}"
            </p>
          )}
        </div>
      )}

      {/* Indicator de carga con skeletons */}
      {cargando && (
        <div>
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-lg">Cargando fondos...</span>
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-700 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="w-full h-40 bg-gray-600"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para agregar fondo local */}
      {tabActivo === "mis-imagenes" && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={agregarFondoDesdeDispositivo}
            disabled={cargando}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-6 py-3 rounded-lg flex items-center gap-2 text-lg"
          >
            <IoAdd />
            Agregar desde dispositivo
          </button>
        </div>
      )}

      {/* Grid de contenido */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Fondos guardados - CORREGIDO */}
        {tabActivo === "mis-imagenes" &&
          !cargando &&
          fondos.map((fondo) => (
            <div
              key={fondo.id}
              className={`relative group border-2 rounded-lg overflow-hidden transition-colors ${
                esFondoActivo(fondo)
                  ? "border-green-400 ring-2 ring-green-400"
                  : "border-gray-600 hover:border-blue-400"
              }`}
            >
              {/* ✨ RENDERIZADO MEJORADO DE MEDIA */}
              {fondo.tipo === "video" ? (
                <video
                  src={fondo.url}
                  className="w-full h-40 object-cover"
                  autoPlay
                  muted
                  loop
                  preload="metadata"
                  onError={(e) => {
                    console.error("❌ Error cargando video:", fondo.url);
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : (
                <img
                  src={fondo.url}
                  alt={fondo.nombre || `Fondo ${fondo.id}`}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    console.error("❌ Error cargando imagen:", fondo.url);
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              )}

              {/* Fallback para errores de carga */}
              <div
                className="w-full h-40 bg-gray-700 flex items-center justify-center text-gray-400"
                style={{display: "none"}}
              >
                <div className="text-center">
                  <IoImage className="mx-auto text-2xl mb-2" />
                  <p className="text-sm">Error al cargar</p>
                </div>
              </div>

              {/* Indicator de activo */}
              {!modoSeleccion && esFondoActivo(fondo) && (
                <div className="absolute top-2 left-2 bg-green-600 px-2 py-1 text-xs rounded flex items-center gap-1">
                  <IoCheckmark />
                  Activo
                </div>
              )}

              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {modoSeleccion ? (
                  <button
                    onClick={() => manejarClicEnImagen(fondo)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 text-sm rounded flex items-center gap-2 font-semibold"
                  >
                    <IoCheckmark />
                    Seleccionar
                  </button>
                ) : (
                  <>
                    {!esFondoActivo(fondo) && (
                      <button
                        onClick={() => manejarClicEnImagen(fondo)}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                        disabled={cargando}
                      >
                        <IoCheckmark />
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => confirmarEliminarFondo(fondo)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                      disabled={cargando}
                    >
                      <IoTrash />
                      Eliminar
                    </button>
                  </>
                )}
              </div>

              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 px-2 py-1 text-xs rounded max-w-[calc(100%-1rem)] truncate">
                {fondo.nombre || `Fondo ${fondo.id}`}
              </div>
            </div>
          ))}

        {/* Imágenes de Pixabay */}
        {tabActivo === "imagenes" &&
          !cargando &&
          pixabayImages.map((image) => (
            <div
              key={image.id}
              className="relative group border-2 border-gray-600 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
            >
              <img
                src={image.webformatURL}
                alt={image.tags}
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {(() => {
                  // Verificar si esta imagen ya está descargada en Mis Fondos
                  const yaDescargada = fondos.some(
                    (fondo) =>
                      fondo.url.includes(`pixabay_${image.id}`) ||
                      fondo.nombre.includes(`Pixabay ${image.id}`),
                  );

                  if (modoSeleccion) {
                    return (
                      <button
                        onClick={() =>
                          manejarClicEnImagenPixabay(image, "imagen")
                        }
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 text-sm rounded flex items-center gap-2 font-semibold"
                        disabled={cargando}
                      >
                        <IoCheckmark />
                        {yaDescargada
                          ? "✓ Seleccionar"
                          : "Descargar y Seleccionar"}
                      </button>
                    );
                  } else {
                    return (
                      <>
                        <button
                          onClick={() =>
                            manejarClicEnImagenPixabay(image, "imagen")
                          }
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                          disabled={cargando}
                        >
                          <IoCheckmark />
                          Usar
                        </button>
                        {!yaDescargada && (
                          <button
                            onClick={() =>
                              descargarYGuardarFondo(image, "imagen")
                            }
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                            disabled={cargando}
                          >
                            <IoCloudDownload />
                            Guardar
                          </button>
                        )}
                        {yaDescargada && (
                          <span className="bg-gray-600 px-3 py-1 text-sm rounded flex items-center gap-1">
                            <IoCheckmark />
                            Guardada
                          </span>
                        )}
                      </>
                    );
                  }
                })()}
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 px-2 py-1 text-xs rounded">
                {image.tags.split(",")[0]}
              </div>
            </div>
          ))}

        {/* Videos de Pixabay */}
        {tabActivo === "videos" &&
          !cargando &&
          pixabayVideos.map((video) => (
            <div
              key={video.id}
              className="relative group border-2 border-gray-600 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
            >
              <video
                src={video.videos.small.url}
                className="w-full h-40 object-cover"
                autoPlay
                muted
                loop
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {modoSeleccion ? (
                  <button
                    onClick={() => manejarClicEnImagenPixabay(video, "video")}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 text-sm rounded flex items-center gap-2 font-semibold"
                    disabled={cargando}
                  >
                    <IoCheckmark />
                    Seleccionar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => manejarClicEnImagenPixabay(video, "video")}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                      disabled={cargando}
                    >
                      <IoCheckmark />
                      Usar
                    </button>
                    <button
                      onClick={() => descargarYGuardarFondo(video, "video")}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 text-sm rounded flex items-center gap-1"
                      disabled={cargando}
                    >
                      <IoCloudDownload />
                      Guardar
                    </button>
                  </>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 px-2 py-1 text-xs rounded">
                {video.tags.split(",")[0]}
              </div>
            </div>
          ))}
      </div>

      {/* Estado vacío */}
      {!cargando && (
        <>
          {tabActivo === "mis-imagenes" && fondos.length === 0 && (
            <div className="text-center py-12">
              <IoFolder className="mx-auto text-6xl text-gray-600 mb-4" />
              <h3 className="text-xl text-gray-400 mb-2">
                No tienes fondos guardados
              </h3>
              <p className="text-gray-500 mb-4">
                Agrega fondos desde tu dispositivo o descarga de la galería
                online
              </p>
            </div>
          )}

          {tabActivo === "imagenes" && pixabayImages.length === 0 && (
            <div className="text-center py-12">
              <IoImage className="mx-auto text-6xl text-gray-600 mb-4" />
              <h3 className="text-xl text-gray-400 mb-2">
                {ultimaBusqueda
                  ? "No se encontraron imágenes"
                  : "No se pudieron cargar las imágenes"}
              </h3>
              <p className="text-gray-500">
                {ultimaBusqueda
                  ? `Intenta con otros términos de búsqueda`
                  : "Verifica tu conexión a internet o usa el buscador arriba"}
              </p>
            </div>
          )}

          {tabActivo === "videos" && pixabayVideos.length === 0 && (
            <div className="text-center py-12">
              <IoVideocam className="mx-auto text-6xl text-gray-600 mb-4" />
              <h3 className="text-xl text-gray-400 mb-2">
                {ultimaBusqueda
                  ? "No se encontraron videos"
                  : "No se pudieron cargar los videos"}
              </h3>
              <p className="text-gray-500">
                {ultimaBusqueda
                  ? `Intenta con otros términos de búsqueda`
                  : "Verifica tu conexión a internet o usa el buscador arriba"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GestionFondos;
