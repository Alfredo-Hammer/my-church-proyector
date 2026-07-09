import {useState, useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import ModalConfirmacion from "../components/ModalConfirmacion";
import {componenteFondoAnimado} from "../components/fondosAnimados";
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
  IoWifi,
  IoAlertCircle,
  IoSparkles,
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
  const [estaOnline, setEstaOnline] = useState(navigator.onLine);

  // ✨ NUEVOS ESTADOS PARA BÚSQUEDA
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [ultimaBusqueda, setUltimaBusqueda] = useState("");

  // Páginas de paginación: inician en valor aleatorio para variedad en carga inicial
  const [paginaImagenes, setPaginaImagenes] = useState(() => Math.ceil(Math.random() * 8));
  const [paginaVideos, setPaginaVideos] = useState(() => Math.ceil(Math.random() * 8));

  // ✨ CARGAR DATOS AL INICIALIZAR
  useEffect(() => {
    console.log("🔄 [GestionFondos] Tab activo cambiado:", tabActivo);

    // Siempre cargar fondo activo
    cargarFondoActivo();

    // Cargar datos según el tab
    if (tabActivo === "mis-imagenes") {
      cargarFondos();
    } else if (tabActivo === "imagenes") {
      cargarPixabayImages(undefined, paginaImagenes);
    } else if (tabActivo === "videos") {
      cargarPixabayVideos(undefined, paginaVideos);
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
      if (window.electron?.removeListener) {
        window.electron.removeListener("actualizar-fondo-activo", handleFondoActivo);
      }
    };
  }, []);

  // Detectar cambios de conexión a internet
  useEffect(() => {
    const handleOnline = () => {
      setEstaOnline(true);
      mostrarMensaje("Conexión restaurada", "success");
    };
    const handleOffline = () => {
      setEstaOnline(false);
      mostrarMensaje("Sin conexión a internet", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-recargar la pestaña online activa cuando regresa la conexión
  useEffect(() => {
    if (estaOnline) {
      if (tabActivo === "imagenes" && pixabayImages.length === 0) {
        cargarPixabayImages(undefined, paginaImagenes);
      } else if (tabActivo === "videos" && pixabayVideos.length === 0) {
        cargarPixabayVideos(undefined, paginaVideos);
      }
    }
  }, [estaOnline]);

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

  const cargarPixabayImages = async (busqueda = "church,landscape,nature", pagina = paginaImagenes) => {
    if (!navigator.onLine) {
      setEstaOnline(false);
      mostrarMensaje("Sin conexión a internet. Conéctate para ver imágenes online.", "error");
      return;
    }
    setCargando(true);
    try {
      console.log(`🔄 [GestionFondos] Cargando imágenes Pixabay — término: "${busqueda}", página: ${pagina}`);
      const response = await fetch(
        `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(busqueda)}&image_type=photo&min_width=1920&per_page=20&safesearch=true&page=${pagina}`,
      );
      const data = await response.json();
      setPixabayImages(data.hits || []);
      setUltimaBusqueda(busqueda);
      console.log(`✅ [GestionFondos] Imágenes cargadas: ${data.hits?.length || 0} (página ${pagina}/${Math.ceil((data.totalHits || 0) / 20)})`);
    } catch (error) {
      console.error("❌ Error al cargar imágenes de Pixabay:", error);
      mostrarMensaje("Error al cargar imágenes de Pixabay", "error");
    } finally {
      setCargando(false);
    }
  };

  const cargarPixabayVideos = async (busqueda = "church,nature,landscape", pagina = paginaVideos) => {
    if (!navigator.onLine) {
      setEstaOnline(false);
      mostrarMensaje("Sin conexión a internet. Conéctate para ver videos online.", "error");
      return;
    }
    setCargando(true);
    try {
      console.log(`🔄 [GestionFondos] Cargando videos Pixabay — término: "${busqueda}", página: ${pagina}`);
      const response = await fetch(
        `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(busqueda)}&per_page=12&safesearch=true&page=${pagina}`,
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
      setPaginaImagenes(1);
      await cargarPixabayImages(terminoBusqueda, 1);
    } else if (tabActivo === "videos") {
      setPaginaVideos(1);
      await cargarPixabayVideos(terminoBusqueda, 1);
    }
  };

  // ✨ FUNCIÓN PARA MANEJAR ENTER EN EL BUSCADOR
  const manejarEnterBusqueda = (e) => {
    if (e.key === "Enter") {
      manejarBusqueda();
    }
  };

  const irPaginaSiguiente = () => {
    const termino = ultimaBusqueda || undefined;
    if (tabActivo === "imagenes") {
      const nueva = paginaImagenes + 1;
      setPaginaImagenes(nueva);
      cargarPixabayImages(termino, nueva);
    } else if (tabActivo === "videos") {
      const nueva = paginaVideos + 1;
      setPaginaVideos(nueva);
      cargarPixabayVideos(termino, nueva);
    }
  };

  const irPaginaAnterior = () => {
    const termino = ultimaBusqueda || undefined;
    if (tabActivo === "imagenes" && paginaImagenes > 1) {
      const nueva = paginaImagenes - 1;
      setPaginaImagenes(nueva);
      cargarPixabayImages(termino, nueva);
    } else if (tabActivo === "videos" && paginaVideos > 1) {
      const nueva = paginaVideos - 1;
      setPaginaVideos(nueva);
      cargarPixabayVideos(termino, nueva);
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
    console.log("📷 [GestionFondos] Volver a:", volverA || "/");

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
      // Fallback: volver a inicio
      console.log("🔄 [GestionFondos] Navegando a: /");
      navigate("/", {state: navigationState});
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
    if (esFondoActivo(fondo)) {
      mostrarMensaje(
        "Este fondo está activo. Quítalo de activo antes de poder eliminarlo.",
        "error"
      );
      return;
    }
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
    <div className="text-slate-100 min-h-screen bg-[#080c14] p-4 sm:p-6 overflow-y-auto">
      <ModalConfirmacion
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={eliminarFondo}
        titulo="Confirmar eliminación"
        mensaje={`¿Estás seguro de que deseas eliminar "${fondoAEliminar?.nombre || "este fondo"}"? Esta acción no se puede deshacer.`}
      />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {modoSeleccion && (
            <button
              type="button"
              onClick={() => navigate(volverA || "/")}
              className="size-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
              title="Volver sin seleccionar"
            >
              <IoArrowBack />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {modoSeleccion ? "Seleccionar Imagen" : "Gestión de Fondos"}
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              {modoSeleccion
                ? "Elige una imagen para tu presentación"
                : "Administra los fondos del proyector"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {fondoActivo && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium max-w-[150px] truncate">
                {fondoActivo.nombre || "Fondo activo"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (tabActivo === "mis-imagenes") cargarFondos();
              else cargarFondoActivo();
            }}
            disabled={cargando}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors disabled:opacity-50"
          >
            <IoRefresh className={cargando ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {/* ── MENSAJES ───────────────────────────────────────────────── */}
      {mensaje && (
        <div
          className={`px-4 py-3 rounded-xl mb-4 flex items-center gap-3 text-sm font-medium ${
            mensaje.tipo === "success"
              ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-300"
              : mensaje.tipo === "error"
                ? "bg-red-500/15 border border-red-500/25 text-red-300"
                : "bg-blue-500/15 border border-blue-500/25 text-blue-300"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {!estaOnline && (
        <div className="bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl mb-5 flex items-start sm:items-center gap-3">
          <IoAlertCircle className="text-amber-400 text-xl flex-shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Sin conexión a internet</p>
            <p className="text-xs text-amber-200/60 mt-0.5">
              Las imágenes y videos online no están disponibles. Tus fondos guardados siguen funcionando.
            </p>
          </div>
        </div>
      )}

      {/* ── TABS + ACCIÓN ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex gap-1 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setTabActivo("mis-imagenes")}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActivo === "mis-imagenes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <IoFolder className="flex-shrink-0" />
            Mis Fondos
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tabActivo === "mis-imagenes" ? "bg-white/20" : "bg-white/10"
            }`}>
              {fondos.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTabActivo("imagenes")}
            title={!estaOnline ? "Requiere conexión a internet" : ""}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActivo === "imagenes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <IoImage className="flex-shrink-0" />
            <span className="hidden sm:inline">Imágenes Online</span>
            <span className="sm:hidden">Imágenes</span>
            {!estaOnline && <IoWifi className="text-amber-400/80 text-xs" />}
          </button>
          {!modoSeleccion && (
            <button
              type="button"
              onClick={() => setTabActivo("videos")}
              title={!estaOnline ? "Requiere conexión a internet" : ""}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                tabActivo === "videos"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <IoVideocam className="flex-shrink-0" />
              <span className="hidden sm:inline">Videos Online</span>
              <span className="sm:hidden">Videos</span>
              {!estaOnline && <IoWifi className="text-amber-400/80 text-xs" />}
            </button>
          )}
        </div>

        {tabActivo === "mis-imagenes" && (
          <button
            type="button"
            onClick={agregarFondoDesdeDispositivo}
            disabled={cargando}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors shadow-lg shadow-blue-600/20 flex-shrink-0"
          >
            <IoAdd />
            Agregar fondo
          </button>
        )}
      </div>

      {/* ── BUSCADOR (tabs online) ─────────────────────────────────── */}
      {(tabActivo === "imagenes" || tabActivo === "videos") && (
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                onKeyPress={manejarEnterBusqueda}
                placeholder={`Buscar ${tabActivo === "imagenes" ? "imágenes" : "videos"}... (ej: naturaleza, cielo, montañas)`}
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                disabled={cargando || !estaOnline}
              />
              {terminoBusqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setTerminoBusqueda("");
                    setUltimaBusqueda("");
                    const paginaAleatoria = Math.ceil(Math.random() * 8);
                    if (tabActivo === "imagenes") {
                      setPaginaImagenes(paginaAleatoria);
                      cargarPixabayImages(undefined, paginaAleatoria);
                    } else {
                      setPaginaVideos(paginaAleatoria);
                      cargarPixabayVideos(undefined, paginaAleatoria);
                    }
                  }}
                  disabled={cargando}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-sm"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={manejarBusqueda}
              disabled={cargando || !terminoBusqueda.trim() || !estaOnline}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0"
            >
              <IoSearch />
              Buscar
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(tabActivo === "imagenes"
              ? ["naturaleza", "cielo", "montañas", "mar", "cruz", "atardecer", "flores", "paisaje", "luz", "esperanza"]
              : ["naturaleza", "cielo", "agua", "fuego", "nubes", "montañas", "mar", "bosque", "luz", "amanecer"]
            ).map((termino) => (
              <button
                type="button"
                key={termino}
                onClick={() => {
                  setTerminoBusqueda(termino);
                  if (tabActivo === "imagenes") {
                    setPaginaImagenes(1);
                    setTimeout(() => cargarPixabayImages(termino, 1), 100);
                  } else {
                    setPaginaVideos(1);
                    setTimeout(() => cargarPixabayVideos(termino, 1), 100);
                  }
                }}
                disabled={cargando || !estaOnline}
                className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-white/60 hover:text-white rounded-full transition-all"
              >
                {termino}
              </button>
            ))}
          </div>

          {ultimaBusqueda && !cargando && (
            <p className="text-xs text-white/30 text-center">
              Resultados para: <span className="text-white/50">"{ultimaBusqueda}"</span>
            </p>
          )}
        </div>
      )}

      {/* ── SKELETONS DE CARGA ─────────────────────────────────────── */}
      {cargando && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={`skeleton-${i}`} className="rounded-2xl overflow-hidden border border-white/5 bg-white/3 animate-pulse">
              <div className="h-44 bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded-full w-3/4" />
                <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GRID DE CONTENIDO ─────────────────────────────────────── */}
      {!cargando && (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">

          {/* MIS FONDOS */}
          {tabActivo === "mis-imagenes" && fondos.map((fondo) => (
            <div
              key={fondo.id}
              className={`relative group rounded-2xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${
                esFondoActivo(fondo)
                  ? "border-emerald-400/50 ring-2 ring-emerald-400/25 shadow-lg shadow-emerald-500/15"
                  : "border-white/10 hover:border-white/20 hover:shadow-black/40"
              }`}
            >
              {fondo.tipo === "animado" ? (
                (() => {
                  const FondoAnimado = componenteFondoAnimado(fondo.url);
                  return FondoAnimado ? (
                    <div className="relative w-full h-44 overflow-hidden">
                      <FondoAnimado />
                    </div>
                  ) : (
                    <div className="w-full h-44 bg-white/5 flex flex-col items-center justify-center text-white/30 text-center p-4">
                      <IoSparkles className="text-3xl mb-1.5" />
                      <p className="text-xs">Animación no encontrada</p>
                    </div>
                  );
                })()
              ) : fondo.tipo === "video" ? (
                <video
                  src={fondo.url}
                  className="w-full h-44 object-cover"
                  autoPlay muted loop preload="metadata"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : (
                <img
                  src={fondo.url}
                  alt={fondo.nombre || `Fondo ${fondo.id}`}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              )}

              <div
                className="w-full h-44 bg-white/5 flex-col items-center justify-center text-white/30 text-center p-4"
                style={{display: "none"}}
              >
                <IoImage className="text-3xl mb-1.5" />
                <p className="text-xs">No se pudo cargar</p>
              </div>

              {!modoSeleccion && esFondoActivo(fondo) && (
                <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  Activo
                </div>
              )}

              {fondo.tipo === "video" && !fondo.es_defecto && (
                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                  <IoVideocam className="text-xs" /> Video
                </div>
              )}

              {fondo.tipo === "animado" && (
                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                  <IoSparkles className="text-xs" /> Animado
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                  <p className="text-xs text-white/70 truncate mb-2">{fondo.nombre || `Fondo ${fondo.id}`}</p>
                  <div className="flex gap-1.5">
                    {modoSeleccion ? (
                      <button
                        type="button"
                        onClick={() => manejarClicEnImagen(fondo)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <IoCheckmark /> Seleccionar
                      </button>
                    ) : (
                      <>
                        {!esFondoActivo(fondo) && (
                          <button
                            type="button"
                            onClick={() => manejarClicEnImagen(fondo)}
                            disabled={cargando}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <IoCheckmark /> Activar
                          </button>
                        )}
                        {!fondo.es_defecto && (
                          <button
                            type="button"
                            onClick={() => confirmarEliminarFondo(fondo)}
                            disabled={cargando}
                            className="bg-red-500/80 hover:bg-red-500 px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-center transition-colors"
                          >
                            <IoTrash />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ESTADO VACÍO — MIS FONDOS */}
          {tabActivo === "mis-imagenes" && fondos.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <IoFolder className="text-4xl text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/60 mb-1.5">Sin fondos guardados</h3>
              <p className="text-white/30 text-sm mb-6">Agrega imágenes o videos desde tu dispositivo</p>
              <button
                type="button"
                onClick={agregarFondoDesdeDispositivo}
                disabled={cargando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
              >
                <IoAdd /> Agregar fondo
              </button>
            </div>
          )}

          {/* OFFLINE — IMÁGENES */}
          {tabActivo === "imagenes" && !estaOnline && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                <IoWifi className="text-4xl text-amber-400/60" />
              </div>
              <h3 className="text-lg font-semibold text-amber-300/80 mb-1.5">Sin conexión a internet</h3>
              <p className="text-white/30 text-sm mb-6">Conéctate para explorar imágenes de Pixabay</p>
              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) { setEstaOnline(true); cargarPixabayImages(); }
                  else mostrarMensaje("Aún no hay conexión a internet", "error");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-medium transition-colors"
              >
                <IoRefresh /> Reintentar
              </button>
            </div>
          )}

          {/* IMÁGENES PIXABAY */}
          {tabActivo === "imagenes" && estaOnline && pixabayImages.map((image) => {
            const yaDescargada = fondos.some(
              (f) => f.url.includes(`pixabay_${image.id}`) || f.nombre.includes(`Pixabay ${image.id}`)
            );
            return (
              <div
                key={image.id}
                className="relative group rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40 cursor-pointer"
              >
                <img
                  src={image.webformatURL}
                  alt={image.tags}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                    <p className="text-xs text-white/60 truncate mb-2">{image.tags.split(",")[0]}</p>
                    <div className="flex gap-1.5">
                      {modoSeleccion ? (
                        <button
                          type="button"
                          onClick={() => manejarClicEnImagenPixabay(image, "imagen")}
                          disabled={cargando}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <IoCheckmark />
                          {yaDescargada ? "Seleccionar" : "Descargar y usar"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => manejarClicEnImagenPixabay(image, "imagen")}
                            disabled={cargando}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <IoCheckmark /> Usar
                          </button>
                          {!yaDescargada ? (
                            <button
                              type="button"
                              onClick={() => descargarYGuardarFondo(image, "imagen")}
                              disabled={cargando}
                              className="bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-center transition-colors"
                            >
                              <IoCloudDownload />
                            </button>
                          ) : (
                            <div className="bg-white/10 px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-center text-white/50">
                              <IoCheckmark />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ESTADO VACÍO — IMÁGENES */}
          {tabActivo === "imagenes" && estaOnline && pixabayImages.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <IoImage className="text-4xl text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/60 mb-1.5">
                {ultimaBusqueda ? "Sin resultados" : "Busca imágenes"}
              </h3>
              <p className="text-white/30 text-sm">
                {ultimaBusqueda ? `No se encontraron imágenes para "${ultimaBusqueda}"` : "Usa el buscador o elige una búsqueda rápida"}
              </p>
            </div>
          )}

          {/* OFFLINE — VIDEOS */}
          {tabActivo === "videos" && !estaOnline && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                <IoWifi className="text-4xl text-amber-400/60" />
              </div>
              <h3 className="text-lg font-semibold text-amber-300/80 mb-1.5">Sin conexión a internet</h3>
              <p className="text-white/30 text-sm mb-6">Conéctate para explorar videos de Pixabay</p>
              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) { setEstaOnline(true); cargarPixabayVideos(); }
                  else mostrarMensaje("Aún no hay conexión a internet", "error");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-medium transition-colors"
              >
                <IoRefresh /> Reintentar
              </button>
            </div>
          )}

          {/* VIDEOS PIXABAY */}
          {tabActivo === "videos" && estaOnline && pixabayVideos.map((video) => (
            <div
              key={video.id}
              className="relative group rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40 cursor-pointer"
            >
              <video
                src={video.videos.small.url}
                className="w-full h-44 object-cover"
                autoPlay muted loop
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                  <p className="text-xs text-white/60 truncate mb-2">{video.tags.split(",")[0]}</p>
                  <div className="flex gap-1.5">
                    {modoSeleccion ? (
                      <button
                        type="button"
                        onClick={() => manejarClicEnImagenPixabay(video, "video")}
                        disabled={cargando}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <IoCheckmark /> Seleccionar
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => manejarClicEnImagenPixabay(video, "video")}
                          disabled={cargando}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <IoCheckmark /> Usar
                        </button>
                        <button
                          type="button"
                          onClick={() => descargarYGuardarFondo(video, "video")}
                          disabled={cargando}
                          className="bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-center transition-colors"
                        >
                          <IoCloudDownload />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ESTADO VACÍO — VIDEOS */}
          {tabActivo === "videos" && estaOnline && pixabayVideos.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="size-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <IoVideocam className="text-4xl text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/60 mb-1.5">
                {ultimaBusqueda ? "Sin resultados" : "Busca videos"}
              </h3>
              <p className="text-white/30 text-sm">
                {ultimaBusqueda ? `No se encontraron videos para "${ultimaBusqueda}"` : "Usa el buscador o elige una búsqueda rápida"}
              </p>
            </div>
          )}

        </div>

        {/* ── PAGINACIÓN ─────────────────────────────────────────── */}
        {(tabActivo === "imagenes" || tabActivo === "videos") && estaOnline && (
          <div className="flex items-center justify-center gap-3 mt-8 pb-4">
            <button
              type="button"
              onClick={irPaginaAnterior}
              disabled={(tabActivo === "imagenes" ? paginaImagenes : paginaVideos) <= 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <span className="text-xs text-white/40">Página</span>
              <span className="text-sm font-semibold text-white">
                {tabActivo === "imagenes" ? paginaImagenes : paginaVideos}
              </span>
            </div>

            <button
              type="button"
              onClick={irPaginaSiguiente}
              disabled={
                (tabActivo === "imagenes" ? pixabayImages.length : pixabayVideos.length) <
                (tabActivo === "imagenes" ? 20 : 12)
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Siguiente →
            </button>
          </div>
        )}

        </>
      )}
    </div>
  );
};

export default GestionFondos;
