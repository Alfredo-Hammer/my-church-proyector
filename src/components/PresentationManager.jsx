import React, {useState, useEffect, useCallback, useRef} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {
  FaFile,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaSave,
  FaTrash,
  FaCopy,
  FaDownload,
  FaUpload,
  FaEye,
  FaProjectDiagram,
  FaSpinner,
  FaHeart,
  FaRegHeart,
  FaPlay,
  FaStop,
  FaSearch,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import CreatePresentationModal from "./CreatePresentationModal";
import {
  processPowerPointFile,
  isValidPowerPointFile,
} from "../utils/powerPointProcessor";

// ✨ Función utilitaria para manejar URLs de imágenes (limpia URLs antiguas del proxy)
const convertPixabayUrlToProxy = (url) => {
  // Si la URL contiene el antiguo proxy de Pixabay, retornar null para que se oculte
  if (url && url.includes("pixabay-proxy")) {
    console.warn("⚠️ URL antigua de proxy detectada, será ignorada:", url);
    return null;
  }
  // Para todas las demás URLs (locales de Pixabay o fondos normales), retornar tal cual
  return url;
};

const PresentationManager = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const withTimeout = (promise, ms, message) => {
    const timeoutMs = Number.isFinite(ms) ? ms : 60000;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        const t = setTimeout(() => {
          clearTimeout(t);
          reject(new Error(message || `Timeout después de ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  };

  // Estados principales
  const [presentations, setPresentations] = useState([]);
  const [currentPresentation, setCurrentPresentation] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRenderedPptxSlide = (slide) =>
    slide?.renderMode === "pptx" || slide?.layout === "pptx-image";

  // ✨ Estados para funcionalidades mejoradas
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [dbAvailable, setDbAvailable] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isProjecting, setIsProjecting] = useState(false); // ✨ Estado de proyección

  // ✨ Helper: Current slide
  const currentSlide = currentPresentation?.slides?.[currentSlideIndex] || null;

  // ✨ Helper functions para localStorage
  const saveToLocalStorage = (presentation) => {
    try {
      const localData = JSON.parse(
        localStorage.getItem("presentations") || "[]",
      );
      const existingIndex = localData.findIndex(
        (p) => p.id === presentation.id,
      );

      if (existingIndex >= 0) {
        localData[existingIndex] = presentation;
      } else {
        localData.push(presentation);
      }

      localStorage.setItem("presentations", JSON.stringify(localData));
      return presentation;
    } catch (error) {
      console.error("❌ Error guardando en localStorage:", error);
      return null;
    }
  };

  const updateInLocalStorage = (presentation) => {
    try {
      const localData = JSON.parse(
        localStorage.getItem("presentations") || "[]",
      );
      const updatedData = localData.map((p) =>
        p.id === presentation.id ? presentation : p,
      );
      localStorage.setItem("presentations", JSON.stringify(updatedData));
    } catch (error) {
      console.error("❌ Error actualizando localStorage:", error);
    }
  };

  const deleteFromLocalStorage = (presentationId) => {
    try {
      const localData = JSON.parse(
        localStorage.getItem("presentations") || "[]",
      );
      const filteredData = localData.filter((p) => p.id !== presentationId);
      localStorage.setItem("presentations", JSON.stringify(filteredData));
    } catch (error) {
      console.error("❌ Error eliminando de localStorage:", error);
    }
  };

  // ✨ Notification functions
  const showNotification = (message, type = "info") => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications((prev) => [...prev, notification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  const showSuccess = (message) => showNotification(message, "success");
  const showError = (message) => showNotification(message, "error");
  const showInfo = (message) => showNotification(message, "info");

  // ✨ Auto-save with debounce
  const debouncedSave = useCallback(
    (presentation) => {
      if (!autoSaveEnabled || !presentation?.id || !dbAvailable) {
        return;
      }

      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const newTimeout = setTimeout(async () => {
        try {
          setIsSaving(true);
          // Se implementará updatePresentationInDB más adelante
          setLastSaved(new Date());
        } catch (error) {
          console.error("❌ Error en auto-guardado:", error);
        } finally {
          setIsSaving(false);
        }
      }, 2000);

      setSaveTimeout(newTimeout);
    },
    [saveTimeout, autoSaveEnabled, dbAvailable],
  );

  // ✨ Escuchar imagen seleccionada desde Gestor de Fondos
  const lastProcessedTimestamp = useRef(null);

  useEffect(() => {
    const timestamp = location.state?.timestamp;
    const imagenSeleccionada = location.state?.imagenSeleccionada;
    const preservedIndex = location.state?.preserveSlideIndex;

    // Evitar procesar el mismo timestamp múltiples veces
    if (
      !imagenSeleccionada ||
      !timestamp ||
      lastProcessedTimestamp.current === timestamp
    ) {
      return;
    }

    console.log("📷 ========================================");
    console.log(
      "📷 [PresentationManager] ✅ Imagen recibida del Gestor de Fondos:",
      imagenSeleccionada,
    );
    console.log("📋 isLoading:", isLoading);
    console.log("📋 presentations.length:", presentations.length);
    console.log("📋 currentPresentation?.name:", currentPresentation?.name);
    console.log(
      "📋 currentPresentation?.slides.length:",
      currentPresentation?.slides?.length,
    );
    console.log("📋 currentSlideIndex (estado):", currentSlideIndex);
    console.log("📋 preserveSlideIndex (de navegación):", preservedIndex);

    // ✨ VALIDACIÓN 1: Esperar a que termine la carga inicial
    if (isLoading) {
      console.log("⏳ Esperando a que termine la carga inicial...");
      return;
    }

    // ✨ VALIDACIÓN 2: Esperar a que haya presentaciones cargadas
    if (presentations.length === 0) {
      console.error("❌ No hay presentaciones disponibles");
      showError("❌ No hay presentaciones. Crea una presentación primero.");
      lastProcessedTimestamp.current = timestamp;
      return;
    }

    // ✨ VALIDACIÓN 3: Esperar a que haya una presentación seleccionada
    if (!currentPresentation) {
      console.error("❌ No hay presentación seleccionada");
      showError("❌ Debes seleccionar una presentación primero");
      lastProcessedTimestamp.current = timestamp;
      return;
    }

    // ✨ USAR EL ÍNDICE PRESERVADO si está disponible, sino usar el del estado
    const targetSlideIndex =
      preservedIndex !== undefined ? preservedIndex : currentSlideIndex;
    console.log("🎯 [ÍNDICE FINAL] Usando índice:", targetSlideIndex);

    // Obtener el slide usando el índice correcto
    const slideActual = currentPresentation?.slides?.[targetSlideIndex];

    console.log("🔍 [VALIDACIÓN] Verificando diapositiva...");
    console.log("🔍 targetSlideIndex:", targetSlideIndex);
    console.log("🔍 Total slides:", currentPresentation.slides.length);
    console.log("🔍 slideActual:", slideActual);
    console.log("🔍 slideActual.title:", slideActual?.title);

    if (!slideActual) {
      console.error("❌ No hay diapositiva seleccionada");
      console.error("❌ currentPresentation:", currentPresentation);
      console.error("❌ targetSlideIndex:", targetSlideIndex);
      console.error("❌ slideActual:", slideActual);
      console.error("❌ Todas las slides:", currentPresentation.slides);
      showError("❌ Debes seleccionar una diapositiva primero");
      lastProcessedTimestamp.current = timestamp;
      return;
    }

    // ✨ Restaurar el índice en el estado si es diferente
    if (targetSlideIndex !== currentSlideIndex) {
      console.log("🔄 [RESTAURACIÓN] Actualizando currentSlideIndex");
      console.log("🔄 De:", currentSlideIndex, "→ A:", targetSlideIndex);
      setCurrentSlideIndex(targetSlideIndex);
    }

    console.log("✅ [VALIDACIÓN] Diapositiva válida encontrada");
    console.log("📋 Agregando imagen a la diapositiva...");
    console.log("📋 Diapositiva actual:", slideActual);

    // Agregar imagen al slide actual
    const updatedSlide = {
      ...slideActual,
      slideImages: [...(slideActual.slideImages || []), imagenSeleccionada],
    };

    // Si no hay imagen de fondo, usar esta como fondo también
    if (!slideActual.backgroundImage) {
      console.log("🖼️ Estableciendo también como fondo de diapositiva");
      updatedSlide.backgroundImage = imagenSeleccionada;
    }

    console.log("✅ Imagen agregada, actualizando slide...");
    console.log("✅ slideImages actualizado:", updatedSlide.slideImages);

    // ✨ Actualizar el slide en la posición correcta
    const updatedSlides = [...currentPresentation.slides];
    updatedSlides[targetSlideIndex] = updatedSlide;

    const updatedPresentation = {
      ...currentPresentation,
      slides: updatedSlides,
      slideActual: targetSlideIndex, // ✨ Mantener el índice actual
    };

    setCurrentPresentation(updatedPresentation);

    // ✨ Guardar en BD de forma asíncrona
    if (dbAvailable && updatedPresentation.id) {
      console.log("💾 [GUARDADO] Guardando presentación en BD...");
      const presentationId = updatedPresentation.id;
      updatePresentationInDB(updatedPresentation)
        .then(() => {
          console.log("✅ [GUARDADO] Presentación guardada correctamente");
          // ✨ Recargar desde BD manteniendo el índice
          return loadPresentationsFromDB();
        })
        .then(() => {
          // Después de recargar, restaurar la presentación y el índice
          setPresentations((prevPresentations) => {
            const refreshedPresentation = prevPresentations.find(
              (p) => p.id === presentationId,
            );
            if (refreshedPresentation) {
              console.log(
                "🔄 [RECARGA] Actualizando presentación actual desde BD",
              );
              setCurrentPresentation(refreshedPresentation);
              setCurrentSlideIndex(targetSlideIndex);
              console.log("🔄 [RECARGA] Índice restaurado:", targetSlideIndex);
            }
            return prevPresentations;
          });
        })
        .catch((error) => {
          console.error("❌ [GUARDADO] Error guardando:", error);
        });
    }

    showSuccess("✨ Imagen agregada a la diapositiva");

    // Marcar como procesado
    lastProcessedTimestamp.current = timestamp;
  }, [
    location.state?.imagenSeleccionada,
    location.state?.timestamp,
    location.state?.preserveSlideIndex,
    currentPresentation,
    currentSlideIndex,
    isLoading,
    presentations.length,
  ]);

  // ✨ Initialize and load presentations
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);

        // Check DB availability
        if (window.electron?.obtenerPresentacionesSlides) {
          setDbAvailable(true);
          await loadPresentationsFromDB();
        } else {
          setDbAvailable(false);
          showInfo("⚠️ Trabajando en modo sin conexión a base de datos");
          loadFromLocalStorage();
        }

        // Si no hay presentaciones, crear una de ejemplo
        const currentPresentations = JSON.parse(
          localStorage.getItem("presentations") || "[]",
        );
        if (currentPresentations.length === 0) {
          await createDefaultPresentation();
        }
      } catch (error) {
        console.error("❌ Error inicializando:", error);
        setDbAvailable(false);
        loadFromLocalStorage();

        // Crear presentación por defecto si hay error
        await createDefaultPresentation();
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const localData = localStorage.getItem("presentations");
      if (localData) {
        const localPresentations = JSON.parse(localData);
        setPresentations(localPresentations);
        showInfo("📱 Cargadas presentaciones desde almacenamiento local");
      }
    } catch (error) {
      console.error("❌ Error cargando datos locales:", error);
    }
  };

  const loadPresentationsFromDB = async () => {
    try {
      console.log("🔄 Cargando presentaciones desde base de datos...");
      const dbPresentations =
        await window.electron.obtenerPresentacionesSlides();

      if (!Array.isArray(dbPresentations)) {
        throw new Error("Formato de respuesta inválido");
      }

      // ✨ Función para limpiar URLs antiguas del proxy
      const cleanOldProxyUrls = (slides) => {
        if (!Array.isArray(slides)) return slides;

        return slides.map((slide) => {
          const cleanedSlide = {...slide};

          // Limpiar backgroundImage si es un proxy antiguo
          if (
            cleanedSlide.backgroundImage &&
            cleanedSlide.backgroundImage.includes("pixabay-proxy")
          ) {
            console.warn(
              "🧹 Removiendo URL antigua de proxy en backgroundImage:",
              cleanedSlide.backgroundImage,
            );
            cleanedSlide.backgroundImage = null;
          }

          // Limpiar slideImages si contienen URLs de proxy antiguas
          if (
            Array.isArray(cleanedSlide.slideImages) &&
            cleanedSlide.slideImages.length > 0
          ) {
            const originalLength = cleanedSlide.slideImages.length;
            cleanedSlide.slideImages = cleanedSlide.slideImages.filter(
              (url) => {
                if (url && url.includes("pixabay-proxy")) {
                  console.warn(
                    "🧹 Removiendo URL antigua de proxy en slideImages:",
                    url,
                  );
                  return false;
                }
                return true;
              },
            );
            if (cleanedSlide.slideImages.length < originalLength) {
              console.log(
                `✂️ Limpiadas ${
                  originalLength - cleanedSlide.slideImages.length
                } URLs antiguas de slideImages`,
              );
            }
          }

          return cleanedSlide;
        });
      };

      const convertedPresentations = dbPresentations.map((dbPresentation) => ({
        id: dbPresentation.id,
        name: dbPresentation.nombre || "Sin nombre",
        slides: cleanOldProxyUrls(
          Array.isArray(dbPresentation.slides) ? dbPresentation.slides : [],
        ),
        createdAt: dbPresentation.created_at,
        lastModified: dbPresentation.updated_at,
        description: dbPresentation.descripcion || "",
        importedFrom: dbPresentation.importado_desde,
        fileType: dbPresentation.tipo_archivo || "custom",
        fileSize: dbPresentation.tamano_archivo || 0,
        favorito: Boolean(dbPresentation.favorito),
        tags: Array.isArray(dbPresentation.tags) ? dbPresentation.tags : [],
        totalSlides:
          dbPresentation.total_slides || dbPresentation.slides?.length || 0,
        slideActual: dbPresentation.slide_actual || 0,
        configuracion: dbPresentation.configuracion || {},
      }));

      setPresentations(convertedPresentations);
      console.log(
        `✅ ${convertedPresentations.length} presentaciones cargadas desde DB`,
      );

      // ✨ Auto-seleccionar primera presentación si no hay una seleccionada
      if (convertedPresentations.length > 0 && !currentPresentation) {
        const firstPresentation = convertedPresentations[0];
        setCurrentPresentation(firstPresentation);
        setCurrentSlideIndex(firstPresentation.slideActual || 0);
        console.log(`🎯 Auto-seleccionada: ${firstPresentation.name}`);
      }

      if (convertedPresentations.length > 0) {
        showSuccess(
          `📋 ${convertedPresentations.length} presentaciones cargadas`,
        );
      }
    } catch (error) {
      console.error("❌ Error cargando presentaciones:", error);
      showError("❌ Error cargando presentaciones. Trabajando en modo local.");
      loadFromLocalStorage();
    }
  };

  // ✨ Database operations
  const savePresentationToDB = async (presentation) => {
    try {
      console.log(
        "💾 [savePresentationToDB] Intentando guardar:",
        presentation.name,
      );
      console.log("🔌 [savePresentationToDB] DB disponible:", dbAvailable);

      if (!dbAvailable) {
        console.log(
          "⚠️ [savePresentationToDB] DB no disponible, usando localStorage",
        );
        return saveToLocalStorage(presentation);
      }

      const presentationData = {
        nombre: presentation.name.trim(),
        descripcion: presentation.description || "",
        slides: presentation.slides,
        importado_desde: presentation.importedFrom || null,
        tipo_archivo: presentation.fileType || "custom",
        tamano_archivo: presentation.fileSize || 0,
        tags: Array.isArray(presentation.tags) ? presentation.tags : [],
        favorito: Boolean(presentation.favorito),
        configuracion: presentation.configuracion || {},
      };

      console.log(
        "📤 [savePresentationToDB] Llamando agregarPresentacionSlides...",
      );
      const result =
        await window.electron.agregarPresentacionSlides(presentationData);

      console.log("📨 [savePresentationToDB] Resultado de BD:", result);

      if (result?.success && result?.id) {
        const savedPresentation = {...presentation, id: result.id};
        console.log(
          "✅ [savePresentationToDB] Guardado exitoso con ID:",
          result.id,
        );
        saveToLocalStorage(savedPresentation);
        return savedPresentation;
      } else {
        console.log(
          "⚠️ [savePresentationToDB] Sin ID en resultado, usando localStorage",
        );
        return saveToLocalStorage(presentation);
      }
    } catch (error) {
      console.error("❌ Error en savePresentationToDB:", error);
      return saveToLocalStorage(presentation);
    }
  };

  // Función para crear presentación desde el modal
  const handleCreateFromModal = async (presentationData) => {
    try {
      console.log(
        "📦 [PresentationManager] Creando presentación desde modal:",
        presentationData,
      );

      const newPresentation = {
        ...presentationData,
        id: null,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        slideActual: 0,
      };

      console.log("💾 [PresentationManager] Guardando en BD...");
      const savedPresentation = await savePresentationToDB(newPresentation);

      console.log(
        "✅ [PresentationManager] Presentación guardada:",
        savedPresentation,
      );
      console.log(
        "🔑 [PresentationManager] ID obtenido:",
        savedPresentation?.id,
      );

      if (savedPresentation) {
        setPresentations((prev) => [...prev, savedPresentation]);
        setCurrentPresentation(savedPresentation);
        setCurrentSlideIndex(0);
        setShowCreateModal(false);
        showSuccess(
          `✅ Presentación "${savedPresentation.name}" creada exitosamente`,
        );
      } else {
        console.error(
          "⚠️ [PresentationManager] savedPresentation es null/undefined",
        );
        showError("❌ Error al guardar la presentación en la base de datos");
      }
    } catch (error) {
      console.error(
        "❌ [PresentationManager] Error creando presentación:",
        error,
      );
      console.error("❌ Stack:", error.stack);
      showError(`❌ Error al crear la presentación: ${error.message}`);
    }
  };

  const updatePresentationInDB = async (presentation) => {
    try {
      if (!dbAvailable || !presentation.id) {
        updateInLocalStorage(presentation);
        return presentation;
      }

      const presentationData = {
        id: presentation.id,
        nombre: presentation.name.trim(),
        descripcion: presentation.description || "",
        slides: presentation.slides,
        importado_desde: presentation.importedFrom || null,
        tipo_archivo: presentation.fileType || "custom",
        tamano_archivo: presentation.fileSize || 0,
        tags: Array.isArray(presentation.tags) ? presentation.tags : [],
        favorito: Boolean(presentation.favorito),
        configuracion: presentation.configuracion || {},
        slide_actual: presentation.slideActual || 0,
      };

      const result =
        await window.electron.actualizarPresentacionSlides(presentationData);

      if (result?.success) {
        updateInLocalStorage(presentation);
        return presentation;
      } else {
        updateInLocalStorage(presentation);
        return presentation;
      }
    } catch (error) {
      console.error("❌ Error en updatePresentationInDB:", error);
      updateInLocalStorage(presentation);
      return presentation;
    }
  };

  const deletePresentationFromDB = async (presentationId) => {
    try {
      if (!dbAvailable) {
        deleteFromLocalStorage(presentationId);
        return true;
      }

      await window.electron.eliminarPresentacionSlides(presentationId);
      deleteFromLocalStorage(presentationId);
      return true;
    } catch (error) {
      console.error("❌ Error en deletePresentationFromDB:", error);
      deleteFromLocalStorage(presentationId);
      return true;
    }
  };

  // ✨ Presentation operations
  const createNewSlide = () => ({
    id: Date.now(),
    title: "Nueva diapositiva",
    content: "",
    backgroundColor: "#1e293b",
    textColor: "#ffffff",
    fontSize: "32px",
    titleFontSize: "48px",
    backgroundImage: null,
    layout: "title-content",
    textAlign: "center",
  });

  // ✨ Create default presentation when none exists
  const createDefaultPresentation = async () => {
    const defaultPresentation = {
      id: null,
      name: "Mi Primera Presentación",
      slides: [
        {
          id: Date.now(),
          title: "¡Bienvenidos!",
          content:
            "Esta es tu primera presentación.\nHaz clic en 'Editar' para personalizarla.",
          backgroundColor: "#1e293b",
          textColor: "#ffffff",
          fontSize: "32px",
          titleFontSize: "48px",
          backgroundImage: null,
          layout: "title-content",
          textAlign: "center",
        },
        {
          id: Date.now() + 1,
          title: "Cómo empezar",
          content:
            "• Crea nuevas diapositivas\n• Personaliza colores y fuentes\n• Agrega imágenes de fondo\n• Importa presentaciones PowerPoint",
          backgroundColor: "#1e40af",
          textColor: "#ffffff",
          fontSize: "28px",
          titleFontSize: "42px",
          backgroundImage: null,
          layout: "title-content",
          textAlign: "left",
        },
      ],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      description: "Presentación de ejemplo para empezar",
      fileType: "custom",
      fileSize: 0,
      favorito: false,
      tags: ["ejemplo", "tutorial"],
      configuracion: {},
      slideActual: 0,
    };

    const savedPresentation = await savePresentationToDB(defaultPresentation);
    if (savedPresentation) {
      setPresentations([savedPresentation]);
      setCurrentPresentation(savedPresentation);
      setCurrentSlideIndex(0);
    }
  };

  // ✨ Enhanced create presentation function
  const createPresentation = async (presentationData = null) => {
    if (presentationData) {
      // Crear desde modal con datos personalizados
      const savedPresentation = await savePresentationToDB(presentationData);
      if (savedPresentation) {
        setPresentations((prev) => [...prev, savedPresentation]);
        setCurrentPresentation(savedPresentation);
        setCurrentSlideIndex(0);
        setIsEditing(true);
        showSuccess("✅ Nueva presentación creada y guardada");
      } else {
        showError("❌ Error creando presentación");
      }
    } else {
      // Abrir modal para crear presentación personalizada
      setShowCreateModal(true);
    }
  };

  const duplicatePresentation = async (presentation) => {
    try {
      if (
        dbAvailable &&
        presentation.id &&
        window.electron?.duplicarPresentacionSlides
      ) {
        const result = await window.electron.duplicarPresentacionSlides(
          presentation.id,
        );

        if (result?.success) {
          await loadPresentacionesFromDB();
          showSuccess("📋 Presentación duplicada exitosamente");
          return;
        }
      }

      const duplicated = {
        ...presentation,
        id: null,
        name: `${presentation.name} (Copia)`,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        favorito: false,
      };

      const savedDuplicated = await savePresentationToDB(duplicated);

      if (savedDuplicated) {
        setPresentations((prev) => [...prev, savedDuplicated]);
        showSuccess("📋 Presentación duplicada");
      }
    } catch (error) {
      console.error("❌ Error duplicando presentación:", error);
      showError("❌ Error duplicando presentación");
    }
  };

  const deletePresentation = async (presentationId) => {
    if (!window.confirm("¿Estás seguro de eliminar esta presentación?")) {
      return;
    }

    await deletePresentationFromDB(presentationId);
    setPresentations((prev) => prev.filter((p) => p.id !== presentationId));

    if (currentPresentation?.id === presentationId) {
      setCurrentPresentation(null);
      setCurrentSlideIndex(0);
    }

    showSuccess("🗑️ Presentación eliminada");
  };

  const toggleFavorite = async (presentation) => {
    if (!presentation?.id) return;

    try {
      const newFavoriteStatus = !presentation.favorito;

      if (
        dbAvailable &&
        window.electron?.actualizarFavoritoPresentacionSlides
      ) {
        await window.electron.actualizarFavoritoPresentacionSlides(
          presentation.id,
          newFavoriteStatus,
        );
      }

      const updatedPresentation = {
        ...presentation,
        favorito: newFavoriteStatus,
      };

      setPresentations((prev) =>
        prev.map((p) => (p.id === presentation.id ? updatedPresentation : p)),
      );

      if (currentPresentation?.id === presentation.id) {
        setCurrentPresentation(updatedPresentation);
      }

      updateInLocalStorage(updatedPresentation);
      showSuccess(
        newFavoriteStatus
          ? "⭐ Agregado a favoritos"
          : "❌ Removido de favoritos",
      );
    } catch (error) {
      console.error("❌ Error actualizando favorito:", error);
      showError("❌ Error actualizando favorito");
    }
  };

  // ✨ Select presentation function
  const selectPresentation = (presentation) => {
    setCurrentPresentation(presentation);
    setCurrentSlideIndex(presentation.slideActual || 0);
    setIsEditing(false);
  };

  // ✨ Proyectar presentación
  const proyectarPresentacion = async (presentation) => {
    if (
      !presentation ||
      !presentation.slides ||
      presentation.slides.length === 0
    ) {
      showError("❌ No hay diapositivas para proyectar");
      return;
    }

    try {
      if (window.electron?.enviarPresentacionAlProyector) {
        const result = await window.electron.enviarPresentacionAlProyector({
          ...presentation,
          slideActual: currentSlideIndex,
        });

        if (result.success) {
          setIsProjecting(true); // ✨ Activar estado de proyección
          showSuccess(`🎯 Proyectando: ${presentation.name}`);
        } else {
          showError(`❌ Error proyectando: ${result.error}`);
        }
      } else {
        showError("❌ Proyector no disponible");
      }
    } catch (error) {
      console.error("Error proyectando presentación:", error);
      showError("❌ Error enviando al proyector");
    }
  };

  // ✨ Slide operations
  const goToSlide = async (index) => {
    if (!currentPresentation?.slides) return;

    const maxIndex = currentPresentation.slides.length - 1;
    const newIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentSlideIndex(newIndex);

    if (
      dbAvailable &&
      currentPresentation.id &&
      window.electron?.actualizarSlideActualPresentacion
    ) {
      try {
        await window.electron.actualizarSlideActualPresentacion(
          currentPresentation.id,
          newIndex,
        );
        const updatedPresentation = {
          ...currentPresentation,
          slideActual: newIndex,
        };
        setCurrentPresentation(updatedPresentation);
        updateInLocalStorage(updatedPresentation);
      } catch (error) {
        console.error("❌ Error actualizando slide actual:", error);
      }
    }
  };

  const nextSlide = () => goToSlide(currentSlideIndex + 1);
  const prevSlide = () => goToSlide(currentSlideIndex - 1);

  // ✨ Function to go to slide and project immediately - MÉTODO ROBUSTO
  const goToSlideAndProject = async (index) => {
    if (!currentPresentation?.slides?.[index]) return;

    // First navigate to the slide
    await goToSlide(index);

    // Then project it immediately using robust method
    setTimeout(async () => {
      const slideToProject = currentPresentation.slides[index];
      if (slideToProject) {
        try {
          const slideData = {
            tipo: "slide",
            slide: slideToProject,
            presentation: {
              name: currentPresentation.name,
              currentIndex: index,
              totalSlides: currentPresentation.slides.length,
            },
          };

          console.log(
            "📺 [PresentationManager] GoToSlideAndProject:",
            slideData,
          );

          let proyectionExitosa = false;
          let errorDetails = [];

          // Abrir proyector si no está abierto
          if (window.electron?.abrirProyector) {
            try {
              const result = await window.electron.abrirProyector();
              if (!result?.success) {
                console.warn(
                  "⚠️ No se pudo abrir el proyector:",
                  result?.error,
                );
              }
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
              console.warn("⚠️ Error abriendo proyector:", error);
            }
          }

          // Método 1: proyectarSlide
          if (window.electron?.proyectarSlide && !proyectionExitosa) {
            try {
              const resultado = await window.electron.proyectarSlide(slideData);
              if (resultado?.success) {
                proyectionExitosa = true;
                setIsProjecting(true);
                showSuccess(`🎯 Proyectando diapositiva ${index + 1}`);
              } else {
                errorDetails.push(`proyectarSlide: ${resultado?.error}`);
              }
            } catch (error) {
              errorDetails.push(`proyectarSlide: ${error.message}`);
            }
          }

          // Método 2: proyectarMultimedia
          if (window.electron?.proyectarMultimedia && !proyectionExitosa) {
            try {
              const resultado =
                await window.electron.proyectarMultimedia(slideData);
              if (resultado?.success) {
                proyectionExitosa = true;
                setIsProjecting(true);
                showSuccess(`🎯 Proyectando diapositiva ${index + 1}`);
              } else {
                errorDetails.push(`proyectarMultimedia: ${resultado?.error}`);
              }
            } catch (error) {
              errorDetails.push(`proyectarMultimedia: ${error.message}`);
            }
          }

          // Método 3: Fallback localStorage
          if (!proyectionExitosa) {
            try {
              // Usar localStorage como fallback
              localStorage.setItem(
                "proyector-slide-data",
                JSON.stringify(slideData),
              );

              // Intentar abrir proyector en nueva ventana si no existe
              if (!window.electron) {
                const projectionWindow = window.open(
                  "/proyector",
                  "proyector",
                  "fullscreen=yes",
                );
                if (projectionWindow) {
                  proyectionExitosa = true;
                  setIsProjecting(true);
                  showSuccess(
                    `🎯 Proyectando diapositiva ${index + 1} (modo web)`,
                  );
                }
              } else {
                // En Electron, forzar trigger del evento
                window.dispatchEvent(
                  new StorageEvent("storage", {
                    key: "proyector-slide-data",
                    newValue: JSON.stringify(slideData),
                  }),
                );
                proyectionExitosa = true;
                setIsProjecting(true);
                showSuccess(
                  `🎯 Proyectando diapositiva ${index + 1} (fallback)`,
                );
              }
            } catch (fallbackError) {
              errorDetails.push(`Fallback: ${fallbackError.message}`);
            }
          }

          // Si ningún método funcionó, mostrar errores
          if (!proyectionExitosa) {
            console.error(
              "❌ [PresentationManager] Todos los métodos de proyección fallaron:",
              errorDetails,
            );
            showError(
              `❌ Error proyectando diapositiva: ${errorDetails.join(", ")}`,
            );
          }
        } catch (error) {
          console.error("Error proyectando diapositiva:", error);
          showError(`❌ Error al proyectar diapositiva: ${error.message}`);
        }
      }
    }, 100);
  };

  const addSlide = () => {
    if (!currentPresentation) return;

    const newSlide = createNewSlide();
    const updatedPresentation = {
      ...currentPresentation,
      slides: [...currentPresentation.slides, newSlide],
      lastModified: new Date().toISOString(),
    };

    setCurrentPresentation(updatedPresentation);
    updatePresentationInList(updatedPresentation);
    setCurrentSlideIndex(updatedPresentation.slides.length - 1);
    showInfo("✨ Nueva diapositiva agregada");
  };

  const duplicateSlide = () => {
    if (!currentPresentation || !currentSlide) return;

    const duplicatedSlide = {
      ...currentSlide,
      id: Date.now(),
      title: `${currentSlide.title} (Copia)`,
    };

    const updatedSlides = [...currentPresentation.slides];
    updatedSlides.splice(currentSlideIndex + 1, 0, duplicatedSlide);

    const updatedPresentation = {
      ...currentPresentation,
      slides: updatedSlides,
      lastModified: new Date().toISOString(),
    };

    setCurrentPresentation(updatedPresentation);
    updatePresentationInList(updatedPresentation);
    setCurrentSlideIndex(currentSlideIndex + 1);
    showInfo("📄 Diapositiva duplicada");
  };

  const deleteSlide = () => {
    if (!currentPresentation || currentPresentation.slides.length <= 1) {
      showError("No se puede eliminar la única diapositiva");
      return;
    }

    if (window.confirm("¿Eliminar esta diapositiva?")) {
      const updatedSlides = currentPresentation.slides.filter(
        (_, index) => index !== currentSlideIndex,
      );
      const updatedPresentation = {
        ...currentPresentation,
        slides: updatedSlides,
        lastModified: new Date().toISOString(),
      };

      setCurrentPresentation(updatedPresentation);
      updatePresentationInList(updatedPresentation);

      if (currentSlideIndex >= updatedSlides.length) {
        setCurrentSlideIndex(updatedSlides.length - 1);
      }

      showSuccess("🗑️ Diapositiva eliminada");
    }
  };

  const updateCurrentSlide = (updates) => {
    console.log("🔄 [updateCurrentSlide] Iniciando actualización");
    console.log("🔄 updates recibidos:", updates);
    console.log("🔄 currentPresentation:", currentPresentation);
    console.log("🔄 currentSlideIndex:", currentSlideIndex);

    if (
      !currentPresentation ||
      !currentPresentation.slides[currentSlideIndex]
    ) {
      console.error(
        "❌ [updateCurrentSlide] No hay presentación o slide actual",
      );
      return;
    }

    const updatedSlides = [...currentPresentation.slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      ...updates,
    };

    console.log(
      "📋 [updateCurrentSlide] Slide actualizado:",
      updatedSlides[currentSlideIndex],
    );
    console.log(
      "📋 [updateCurrentSlide] slideImages del slide:",
      updatedSlides[currentSlideIndex].slideImages,
    );

    const updatedPresentation = {
      ...currentPresentation,
      slides: updatedSlides,
      lastModified: new Date().toISOString(),
    };

    console.log("✅ [updateCurrentSlide] Presentación actualizada");
    setCurrentPresentation(updatedPresentation);
    updatePresentationInList(updatedPresentation);

    if (autoSaveEnabled) {
      console.log("💾 [updateCurrentSlide] Auto-guardando...");
      debouncedSave(updatedPresentation);
    } else {
      console.log("⚠️ [updateCurrentSlide] Auto-guardado deshabilitado");
    }
  };

  // ✨ Filter and search
  const filteredPresentations = presentations.filter((presentation) => {
    const matchesSearch =
      presentation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      presentation.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      (filterType === "favorites" && presentation.favorito) ||
      (filterType === "powerpoint" && presentation.fileType === "powerpoint") ||
      (filterType === "custom" && presentation.fileType === "custom") ||
      (filterType === "imported" && presentation.fileType === "imported");

    return matchesSearch && matchesFilter;
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // ✨ Helper function to update presentation in list
  const updatePresentationInList = (updatedPresentation) => {
    setPresentations((prev) =>
      prev.map((p) =>
        p.id === updatedPresentation.id ? updatedPresentation : p,
      ),
    );

    // También actualizar en localStorage como backup
    updateInLocalStorage(updatedPresentation);

    // Auto-guardar si está habilitado
    if (autoSaveEnabled) {
      debouncedSave(updatedPresentation);
    }
  };

  // ✨ Helper function for loadPresentacionesFromDB (fix typo)
  const loadPresentacionesFromDB = loadPresentationsFromDB;

  // ✨ Force save function
  const forceSave = async () => {
    if (!currentPresentation?.id || isSaving) return;

    try {
      setIsSaving(true);
      const result = await updatePresentationInDB(currentPresentation);
      if (result) {
        setLastSaved(new Date());
        showSuccess("💾 Presentación guardada manualmente");
      } else {
        showError("❌ Error al guardar presentación");
      }
    } catch (error) {
      console.error("❌ Error en forceSave:", error);
      showError("❌ Error al guardar presentación");
    } finally {
      setIsSaving(false);
    }
  };

  // ✨ Export presentation function
  const exportPresentation = async (presentation) => {
    if (!presentation?.id) return;

    try {
      if (dbAvailable && window.electron?.exportarPresentacionSlides) {
        const result = await window.electron.exportarPresentacionSlides(
          presentation.id,
        );

        if (result?.success && result?.data) {
          // Crear y descargar archivo JSON
          const dataStr = JSON.stringify(result.data, null, 2);
          const dataBlob = new Blob([dataStr], {type: "application/json"});
          const url = URL.createObjectURL(dataBlob);

          const link = document.createElement("a");
          link.href = url;
          link.download = `${presentation.name}_presentacion.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          showSuccess("📥 Presentación exportada exitosamente");
        } else {
          showError("❌ Error exportando desde la base de datos");
        }
      } else {
        // Fallback: exportar desde datos locales
        const exportData = {
          version: "1.0",
          tipo: "presentacion-diapositivas",
          exportado_en: new Date().toISOString(),
          datos: {
            nombre: presentation.name,
            descripcion: presentation.description,
            slides: presentation.slides,
            total_slides: presentation.slides?.length || 0,
            configuracion: presentation.configuracion || {},
            tags: presentation.tags || [],
          },
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${presentation.name}_presentacion.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccess("📥 Presentación exportada (modo local)");
      }
    } catch (error) {
      console.error("❌ Error exportando presentación:", error);
      showError("❌ Error al exportar presentación");
    }
  };

  // ✨ Handle PowerPoint upload function
  const handlePowerPointUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      setIsProcessingFile(true);

      for (const file of files) {
        console.log("🔄 Procesando archivo:", file.name);

        // Procesar PowerPoint
        if (isValidPowerPointFile(file)) {
          try {
            showInfo(`🔄 Procesando PowerPoint: ${file.name}...`);

            // 1) Intentar conversión fiel a imágenes (preserva diseño)
            const filePath = file?.path;
            const PPTX_TIMEOUT_MS = 125000;
            if (window.electron?.convertirPptxAImagenes && filePath) {
              let result;
              let conversionErrorNotified = false;
              try {
                result = await withTimeout(
                  window.electron.convertirPptxAImagenes(filePath),
                  PPTX_TIMEOUT_MS,
                  "La conversión de PowerPoint tardó demasiado. Intentando modo compatibilidad…",
                );
              } catch (conversionError) {
                console.warn(
                  "⚠️ Conversión PPTX→PNG no respondió a tiempo:",
                  conversionError,
                );
                conversionErrorNotified = true;
                result = {
                  success: false,
                  error: conversionError?.message || String(conversionError),
                };
                showInfo(`⚠️ ${result.error} Intentando modo compatibilidad…`);
              }

              if (result?.success && Array.isArray(result.imageUrls)) {
                const slides = result.imageUrls.map((imageUrl, index) => ({
                  id: Date.now() + index + Math.random(),
                  title: "",
                  content: "",
                  backgroundColor: "#000000",
                  textColor: "#ffffff",
                  fontSize: "32px",
                  titleFontSize: "48px",
                  backgroundImage: imageUrl,
                  layout: "pptx-image",
                  textAlign: "center",
                  renderMode: "pptx",
                }));

                const newPresentation = {
                  id: null,
                  name: file.name.replace(/\.(ppt|pptx)$/i, ""),
                  slides,
                  createdAt: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                  description: `Presentación importada desde PowerPoint (diseño original): ${file.name}`,
                  importedFrom: file.name,
                  fileType: "powerpoint",
                  fileSize: file.size,
                  favorito: false,
                  tags: ["powerpoint", "importada"],
                  configuracion: {},
                  slideActual: 0,
                };

                const savedPresentation =
                  await savePresentationToDB(newPresentation);
                if (savedPresentation) {
                  setPresentations((prev) => [...prev, savedPresentation]);
                  setCurrentPresentation(savedPresentation);
                  setCurrentSlideIndex(0);
                  showSuccess(
                    `✅ PowerPoint importado (diseño original): ${slides.length} diapositivas`,
                  );
                }

                continue;
              }

              if (result?.success === false && result?.error) {
                console.warn(
                  "⚠️ Conversión PPTX→PNG falló, usando fallback:",
                  result.error,
                );
                if (!conversionErrorNotified) {
                  showInfo(
                    `⚠️ No se pudo conservar el diseño automáticamente: ${result.error}. Intentando modo compatibilidad…`,
                  );
                }
              }
            }

            // 1b) Si no hay ruta del archivo (file.path), convertir desde ArrayBuffer vía IPC
            // (también preserva el diseño original)
            if (window.electron?.convertirPptxBufferAImagenes && !filePath) {
              const arrayBuffer = await file.arrayBuffer();
              let result;
              let conversionErrorNotified = false;
              try {
                result = await withTimeout(
                  window.electron.convertirPptxBufferAImagenes(
                    file.name,
                    arrayBuffer,
                  ),
                  PPTX_TIMEOUT_MS,
                  "La conversión de PowerPoint tardó demasiado. Intentando modo compatibilidad…",
                );
              } catch (conversionError) {
                console.warn(
                  "⚠️ Conversión PPTX (buffer) no respondió a tiempo:",
                  conversionError,
                );
                conversionErrorNotified = true;
                result = {
                  success: false,
                  error: conversionError?.message || String(conversionError),
                };
                showInfo(`⚠️ ${result.error} Intentando modo compatibilidad…`);
              }

              if (result?.success && Array.isArray(result.imageUrls)) {
                const slides = result.imageUrls.map((imageUrl, index) => ({
                  id: Date.now() + index + Math.random(),
                  title: "",
                  content: "",
                  backgroundColor: "#000000",
                  textColor: "#ffffff",
                  fontSize: "32px",
                  titleFontSize: "48px",
                  backgroundImage: imageUrl,
                  layout: "pptx-image",
                  textAlign: "center",
                  renderMode: "pptx",
                }));

                const newPresentation = {
                  id: null,
                  name: file.name.replace(/\.(ppt|pptx)$/i, ""),
                  slides,
                  createdAt: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                  description: `Presentación importada desde PowerPoint (diseño original): ${file.name}`,
                  importedFrom: file.name,
                  fileType: "powerpoint",
                  fileSize: file.size,
                  favorito: false,
                  tags: ["powerpoint", "importada"],
                  configuracion: {},
                  slideActual: 0,
                };

                const savedPresentation =
                  await savePresentationToDB(newPresentation);
                if (savedPresentation) {
                  setPresentations((prev) => [...prev, savedPresentation]);
                  setCurrentPresentation(savedPresentation);
                  setCurrentSlideIndex(0);
                  showSuccess(
                    `✅ PowerPoint importado (diseño original): ${slides.length} diapositivas`,
                  );
                }

                continue;
              }

              if (result?.success === false && result?.error) {
                console.warn(
                  "⚠️ Conversión PPTX (buffer) falló, usando fallback:",
                  result.error,
                );
                if (!conversionErrorNotified) {
                  showInfo(
                    `⚠️ No se pudo conservar el diseño automáticamente: ${result.error}. Intentando modo compatibilidad…`,
                  );
                }
              }
            }

            // 2) Fallback: parser (puede perder fidelidad)
            const slides = await processPowerPointFile(file);

            if (slides && slides.length > 0) {
              const newPresentation = {
                id: null,
                name: file.name.replace(/\.(ppt|pptx)$/i, ""),
                slides: slides,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                description: `Presentación importada desde PowerPoint: ${file.name}`,
                importedFrom: file.name,
                fileType: "powerpoint",
                fileSize: file.size,
                favorito: false,
                tags: ["powerpoint", "importada"],
                configuracion: {},
                slideActual: 0,
              };

              const savedPresentation =
                await savePresentationToDB(newPresentation);
              if (savedPresentation) {
                setPresentations((prev) => [...prev, savedPresentation]);
                setCurrentPresentation(savedPresentation);
                setCurrentSlideIndex(0);
                showSuccess(
                  `✅ PowerPoint importado: ${slides.length} diapositivas`,
                );
              }
            } else {
              showError(
                `❌ No se pudieron extraer diapositivas de ${file.name}`,
              );
            }
          } catch (pptError) {
            console.error("❌ Error procesando PowerPoint:", pptError);
            showError(`❌ Error procesando PowerPoint: ${pptError.message}`);

            // Fallback: crear presentación con slide de error
            const fallbackSlide = {
              id: Date.now(),
              title: file.name.replace(/\.(ppt|pptx)$/i, ""),
              content:
                "PowerPoint importado - Contenido no disponible\\nArchivo procesado pero el contenido no pudo ser extraído completamente.",
              backgroundColor: "#dc2626",
              textColor: "#ffffff",
              fontSize: "24px",
              titleFontSize: "36px",
              backgroundImage: null,
              layout: "title-content",
              textAlign: "center",
            };

            const fallbackPresentation = {
              id: null,
              name: `${file.name} (Importación parcial)`,
              slides: [fallbackSlide],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              description: `PowerPoint con problemas de importación: ${file.name}`,
              importedFrom: file.name,
              fileType: "powerpoint",
              fileSize: file.size,
              favorito: false,
              tags: ["powerpoint", "importada", "error"],
              configuracion: {},
              slideActual: 0,
            };

            const savedFallback =
              await savePresentationToDB(fallbackPresentation);
            if (savedFallback) {
              setPresentations((prev) => [...prev, savedFallback]);
              showInfo(
                "⚠️ PowerPoint importado parcialmente - revisa el contenido",
              );
            }
          }
          continue;
        }

        // Procesar imágenes
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const imageDataUrl = e.target.result;

              const newSlide = {
                id: Date.now() + Math.random(),
                title: file.name.replace(/\.[^/.]+$/, ""),
                content: "",
                backgroundColor: "#1e293b",
                textColor: "#ffffff",
                fontSize: "32px",
                titleFontSize: "48px",
                backgroundImage: imageDataUrl,
                layout: "image-background",
                textAlign: "center",
              };

              const newPresentation = {
                id: null,
                name: `Presentación ${file.name}`,
                slides: [newSlide],
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                description: `Presentación creada desde imagen: ${file.name}`,
                importedFrom: file.name,
                fileType: "image",
                fileSize: file.size,
                favorito: false,
                tags: ["imagen", "importada"],
                configuracion: {},
                slideActual: 0,
              };

              const savedPresentation =
                await savePresentationToDB(newPresentation);
              if (savedPresentation) {
                setPresentations((prev) => [...prev, savedPresentation]);
                showSuccess(`✅ Imagen ${file.name} convertida a presentación`);
              }
            } catch (error) {
              console.error("❌ Error procesando imagen:", error);
              showError(`❌ Error procesando ${file.name}`);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    } catch (error) {
      console.error("❌ Error procesando archivos:", error);
      showError("❌ Error al procesar archivos");
    } finally {
      setIsProcessingFile(false);
      // Limpiar input
      event.target.value = "";
    }
  };

  // ✨ Project current slide function - USANDO MÉTODO ROBUSTO DE MULTIMEDIA
  const projectCurrentSlide = async () => {
    if (!currentSlide || !currentPresentation) {
      showError("❌ No hay diapositiva seleccionada para proyectar");
      return;
    }

    try {
      // Preparar datos de la diapositiva para proyección
      const slideData = {
        tipo: "slide",
        slide: currentSlide,
        presentation: {
          name: currentPresentation.name,
          currentIndex: currentSlideIndex,
          totalSlides: currentPresentation.slides.length,
        },
      };

      console.log(
        "📺 [PresentationManager] Proyectando diapositiva:",
        slideData,
      );

      let proyectionExitosa = false;
      let errorDetails = [];

      // Abrir proyector si no está abierto
      if (window.electron?.abrirProyector) {
        console.log("📺 [PresentationManager] Abriendo proyector...");
        await window.electron.abrirProyector();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Método 1: proyectarSlide (específico para diapositivas)
      if (window.electron?.proyectarSlide && !proyectionExitosa) {
        try {
          console.log("📺 [PresentationManager] Método 1: proyectarSlide");
          const resultado = await window.electron.proyectarSlide(slideData);

          if (resultado?.success) {
            proyectionExitosa = true;
            console.log("✅ [PresentationManager] proyectarSlide exitoso");
          } else {
            errorDetails.push(
              `proyectarSlide: ${resultado?.error || "Sin respuesta exitosa"}`,
            );
          }
        } catch (error) {
          console.error(
            "❌ [PresentationManager] Error en proyectarSlide:",
            error,
          );
          errorDetails.push(`proyectarSlide: ${error.message}`);
        }
      }

      // Método 2: proyectarMultimedia (compatibilidad)
      if (window.electron?.proyectarMultimedia && !proyectionExitosa) {
        try {
          console.log("📺 [PresentationManager] Método 2: proyectarMultimedia");
          const resultado =
            await window.electron.proyectarMultimedia(slideData);

          if (resultado?.success) {
            proyectionExitosa = true;
            console.log("✅ [PresentationManager] proyectarMultimedia exitoso");
          } else {
            errorDetails.push(
              `proyectarMultimedia: ${
                resultado?.error || "Sin respuesta exitosa"
              }`,
            );
          }
        } catch (error) {
          console.error(
            "❌ [PresentationManager] Error en proyectarMultimedia:",
            error,
          );
          errorDetails.push(`proyectarMultimedia: ${error.message}`);
        }
      }

      // Método 3: localStorage + ventana (fallback)
      if (!proyectionExitosa) {
        try {
          console.log(
            "📺 [PresentationManager] Método 3: localStorage fallback",
          );

          localStorage.setItem(
            "currentProjectionSlide",
            JSON.stringify(slideData),
          );

          const projectionWindow = window.open(
            "/proyector.html",
            "proyector",
            "fullscreen=yes,width=1920,height=1080,toolbar=no,menubar=no,location=no,status=no,resizable=yes",
          );

          if (projectionWindow) {
            proyectionExitosa = true;
            console.log(
              "✅ [PresentationManager] localStorage fallback exitoso",
            );
          } else {
            errorDetails.push(
              "localStorage: No se pudo abrir ventana de proyección",
            );
          }
        } catch (error) {
          console.error(
            "❌ [PresentationManager] Error en localStorage fallback:",
            error,
          );
          errorDetails.push(`localStorage: ${error.message}`);
        }
      }

      if (proyectionExitosa) {
        setIsProjecting(true);
        showSuccess(
          `🎥 Proyectando: ${
            currentSlide.title || `Diapositiva ${currentSlideIndex + 1}`
          }`,
        );
      } else {
        throw new Error(
          `Todos los métodos fallaron: ${errorDetails.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("❌ Error proyectando diapositiva:", error);
      showError(`❌ Error al iniciar proyección: ${error.message}`);
    }
  };

  // ✨ Función para detener proyección
  const stopProjection = () => {
    setIsProjecting(false);
    if (window.electron?.limpiarProyector) {
      window.electron.limpiarProyector();
    }
    showSuccess("🔄 Proyección detenida");
  };

  // ✨ Render component
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ✨ Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg text-white min-w-64 transform transition-all duration-300 ${
              notification.type === "success"
                ? "bg-green-500"
                : notification.type === "error"
                  ? "bg-red-500"
                  : "bg-blue-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" && <FaCheckCircle />}
              {notification.type === "error" && <FaSpinner />}
              {notification.type === "info" && <FaClock />}
              <span className="text-sm font-medium">
                {notification.message}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ✨ Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FaProjectDiagram className="text-2xl text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                Gestor de Presentaciones
              </h1>
              <p className="text-blue-200 text-sm">
                {presentations.length} presentaciones •{" "}
                {dbAvailable ? "🟢 Conectado" : "🔴 Modo local"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✨ Auto-save indicator */}
            {isSaving && (
              <div className="flex items-center gap-2 text-yellow-400">
                <FaSpinner className="animate-spin" />
                <span className="text-sm">Guardando...</span>
              </div>
            )}

            {lastSaved && (
              <div className="text-xs text-green-400">
                Guardado: {lastSaved.toLocaleTimeString()}
              </div>
            )}

            {/* ✨ Action buttons */}
            <button
              onClick={() => createPresentation()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaPlus /> Nueva
            </button>

            <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
              <FaUpload />
              {isProcessingFile ? (
                <FaSpinner className="animate-spin" />
              ) : (
                "Importar"
              )}
              <input
                type="file"
                multiple
                accept=".ppt,.pptx,.jpg,.jpeg,.png,.gif"
                onChange={handlePowerPointUpload}
                className="hidden"
                disabled={isProcessingFile}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ✨ Search and filters */}
      <div className="bg-white/5 border-b border-white/10 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar presentaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
          >
            <option value="all">Todas</option>
            <option value="favorites">Favoritas</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="custom">Personalizadas</option>
            <option value="imported">Importadas</option>
          </select>

          <div className="flex rounded-lg bg-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 ${
                viewMode === "grid" ? "bg-blue-600" : "hover:bg-white/10"
              }`}
            >
              <FaFile />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 ${
                viewMode === "list" ? "bg-blue-600" : "hover:bg-white/10"
              }`}
            >
              <FaProjectDiagram />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ✨ Presentations list */}
        <div className="w-80 bg-white/5 border-r border-white/10 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <FaSpinner className="animate-spin text-2xl text-blue-400" />
              <span className="ml-2 text-white">Cargando...</span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredPresentations.map((presentation) => {
                const firstSlide = presentation.slides?.[0];
                const thumbnailStyle = firstSlide
                  ? {
                      backgroundImage: firstSlide.backgroundImage
                        ? `url(${firstSlide.backgroundImage})`
                        : "none",
                      backgroundColor: firstSlide.backgroundColor || "#1e293b",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {backgroundColor: "#1e293b"};

                return (
                  <div
                    key={presentation.id}
                    className={`rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden ${
                      currentPresentation?.id === presentation.id
                        ? "bg-blue-600/30 border-blue-400"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                    onClick={() => {
                      setCurrentPresentation(presentation);
                      setCurrentSlideIndex(presentation.slideActual || 0);
                      setIsEditing(false);
                    }}
                  >
                    {/* Thumbnail del primer slide */}
                    <div
                      className="w-full h-24 relative"
                      style={thumbnailStyle}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                      {firstSlide?.title && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-medium truncate drop-shadow-lg">
                            {firstSlide.title}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white truncate">
                            {presentation.name}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {presentation.slides?.length || 0} diapositivas
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {presentation.favorito && (
                              <FaHeart className="text-red-400 text-xs" />
                            )}
                            {presentation.fileType === "powerpoint" && (
                              <FaFile className="text-orange-400 text-xs" />
                            )}
                            {presentation.fileType === "imported" && (
                              <FaDownload className="text-green-400 text-xs" />
                            )}
                          </div>
                        </div>

                        {/* Iconos de acción siempre visibles */}
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(presentation);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            title={
                              presentation.favorito
                                ? "Quitar de favoritos"
                                : "Agregar a favoritos"
                            }
                          >
                            {presentation.favorito ? (
                              <FaHeart className="text-red-400" />
                            ) : (
                              <FaRegHeart />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePresentation(presentation.id);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Eliminar presentación"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPresentations.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FaFile className="mx-auto text-4xl mb-4" />
                  <p className="mb-4">No hay presentaciones que coincidan</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <FaPlus /> Crear nueva presentación
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✨ Main content area */}
        <div className="flex-1 flex flex-col">
          {currentPresentation ? (
            <>
              {/* ✨ Presentation header */}
              <div className="bg-white/5 border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentPresentation.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        Diapositiva {currentSlideIndex + 1} de{" "}
                        {currentPresentation.slides?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isRenderedPptxSlide(currentSlide)) {
                          showInfo(
                            "ℹ️ Este PowerPoint se muestra como imagen para conservar el diseño (no editable).",
                          );
                          return;
                        }
                        setIsEditing(!isEditing);
                      }}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        isEditing
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      } text-white`}
                    >
                      {isEditing ? (
                        <>
                          <FaEye /> Ver
                        </>
                      ) : (
                        <>
                          <FaEdit /> Editar
                        </>
                      )}
                    </button>

                    <button
                      onClick={forceSave}
                      disabled={isSaving || !currentPresentation.id}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {isSaving ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaSave />
                      )}
                      Guardar
                    </button>

                    <button
                      onClick={() => {
                        console.log(
                          "🔵 [NAVEGACIÓN] Navegando a GestionFondos",
                        );
                        console.log(
                          "🔵 currentSlideIndex antes de navegar:",
                          currentSlideIndex,
                        );
                        navigate("/gestion-fondos", {
                          state: {
                            modoSeleccion: true,
                            volverA: "/presentacion-manager",
                            preserveSlideIndex: currentSlideIndex, // ✨ Guardar índice para recuperarlo al regresar
                          },
                        });
                      }}
                      disabled={!currentSlide}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      title="Buscar y agregar imágenes desde el Gestor de Fondos"
                    >
                      <FaSearch /> Buscar Fondos
                    </button>

                    <button
                      onClick={projectCurrentSlide}
                      disabled={isProjecting}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FaPlay /> {isProjecting ? "Proyectando..." : "Proyectar"}
                    </button>

                    {/* ✨ Botón para detener proyección */}
                    {isProjecting && (
                      <button
                        onClick={stopProjection}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <FaStop /> Detener
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex">
                {/* ✨ Slide preview */}
                <div className="flex-1 p-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg h-full flex items-center justify-center">
                    {currentSlide ? (
                      <div
                        className="w-full max-w-4xl aspect-video rounded-lg shadow-2xl flex flex-col justify-center items-center p-8 relative overflow-hidden"
                        style={{
                          backgroundColor: currentSlide.backgroundColor,
                          backgroundImage: (() => {
                            const bgUrl = convertPixabayUrlToProxy(
                              currentSlide.backgroundImage,
                            );
                            return bgUrl ? `url(${bgUrl})` : "none";
                          })(),
                          backgroundSize: isRenderedPptxSlide(currentSlide)
                            ? "contain"
                            : "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          textAlign: currentSlide.textAlign,
                        }}
                      >
                        {!isRenderedPptxSlide(currentSlide) &&
                          currentSlide.backgroundImage &&
                          convertPixabayUrlToProxy(
                            currentSlide.backgroundImage,
                          ) && (
                            <div className="absolute inset-0 bg-black/30"></div>
                          )}

                        <div className="relative z-10 w-full h-full flex flex-col justify-center">
                          {isRenderedPptxSlide(
                            currentSlide,
                          ) ? null : isEditing ? (
                            <div className="space-y-4">
                              <input
                                type="text"
                                value={currentSlide.title}
                                onChange={(e) =>
                                  updateCurrentSlide({title: e.target.value})
                                }
                                className="w-full bg-transparent border-2 border-dashed border-white/50 rounded p-2 text-center outline-none"
                                style={{
                                  fontSize: currentSlide.titleFontSize,
                                  color: currentSlide.textColor,
                                  fontWeight: "bold",
                                }}
                                placeholder="Título de la diapositiva"
                              />
                              <textarea
                                value={currentSlide.content}
                                onChange={(e) =>
                                  updateCurrentSlide({content: e.target.value})
                                }
                                className="w-full h-32 bg-transparent border-2 border-dashed border-white/50 rounded p-2 outline-none resize-none"
                                style={{
                                  fontSize: currentSlide.fontSize,
                                  color: currentSlide.textColor,
                                }}
                                placeholder="Contenido de la diapositiva"
                              />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <h1
                                className="font-bold leading-tight"
                                style={{
                                  fontSize: currentSlide.titleFontSize,
                                  color: currentSlide.textColor,
                                }}
                              >
                                {currentSlide.title}
                              </h1>
                              {currentSlide.content && (
                                <div
                                  className="leading-relaxed whitespace-pre-wrap"
                                  style={{
                                    fontSize: currentSlide.fontSize,
                                    color: currentSlide.textColor,
                                  }}
                                >
                                  {currentSlide.content}
                                </div>
                              )}

                              {/* ✨ Mostrar imágenes de PowerPoint si existen */}
                              {currentSlide.slideImages &&
                                currentSlide.slideImages.length > 0 && (
                                  <div
                                    className="mt-4 grid gap-2"
                                    style={{
                                      gridTemplateColumns:
                                        currentSlide.slideImages.length === 1
                                          ? "1fr"
                                          : currentSlide.slideImages.length ===
                                              2
                                            ? "1fr 1fr"
                                            : "repeat(auto-fit, minmax(150px, 1fr))",
                                    }}
                                  >
                                    {currentSlide.slideImages.map(
                                      (imageUrl, index) => {
                                        const processedUrl =
                                          convertPixabayUrlToProxy(imageUrl);
                                        // Si la URL es null (proxy antiguo), no renderizar nada
                                        if (!processedUrl) return null;

                                        return (
                                          <div
                                            key={index}
                                            className="relative overflow-hidden rounded-lg"
                                          >
                                            <img
                                              src={processedUrl}
                                              alt={`Imagen ${
                                                index + 1
                                              } de la diapositiva`}
                                              className="w-full h-auto max-h-48 object-contain rounded-lg shadow-lg"
                                              style={{
                                                backgroundColor:
                                                  "rgba(255,255,255,0.1)",
                                              }}
                                              onError={(e) => {
                                                console.warn(
                                                  "Error cargando imagen de PowerPoint:",
                                                  imageUrl,
                                                );
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <FaFile className="mx-auto text-6xl mb-4" />
                        <p>No hay diapositiva seleccionada</p>
                      </div>
                    )}
                  </div>

                  {/* ✨ Slide navigation */}
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      onClick={prevSlide}
                      disabled={currentSlideIndex === 0}
                      className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
                    >
                      <FaChevronLeft />
                    </button>

                    <span className="text-white font-medium">
                      {currentSlideIndex + 1} /{" "}
                      {currentPresentation.slides?.length || 0}
                    </span>

                    <button
                      onClick={nextSlide}
                      disabled={
                        currentSlideIndex >=
                        (currentPresentation.slides?.length || 1) - 1
                      }
                      className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>

                {/* ✨ Slide editor panel */}
                {isEditing && (
                  <div className="w-80 bg-white/5 border-l border-white/10 p-4 overflow-y-auto">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Editor de Diapositiva
                    </h3>

                    <div className="space-y-4">
                      {/* ✨ Slide actions */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                          Acciones
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={addSlide}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center gap-2 justify-center"
                          >
                            <FaPlus /> Agregar
                          </button>
                          <button
                            onClick={duplicateSlide}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center gap-2 justify-center"
                          >
                            <FaCopy /> Duplicar
                          </button>
                        </div>
                        <button
                          onClick={deleteSlide}
                          disabled={currentPresentation.slides?.length <= 1}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2 justify-center"
                        >
                          <FaTrash /> Eliminar
                        </button>
                      </div>

                      {/* ✨ Styling options */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                          Estilo
                        </h4>

                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Color de fondo
                          </label>
                          <input
                            type="color"
                            value={currentSlide?.backgroundColor || "#1e293b"}
                            onChange={(e) =>
                              updateCurrentSlide({
                                backgroundColor: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded border border-white/20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Color de texto
                          </label>
                          <input
                            type="color"
                            value={currentSlide?.textColor || "#ffffff"}
                            onChange={(e) =>
                              updateCurrentSlide({textColor: e.target.value})
                            }
                            className="w-full h-10 rounded border border-white/20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Tamaño título
                          </label>
                          <select
                            value={currentSlide?.titleFontSize || "48px"}
                            onChange={(e) =>
                              updateCurrentSlide({
                                titleFontSize: e.target.value,
                              })
                            }
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                          >
                            <option value="24px">24px</option>
                            <option value="32px">32px</option>
                            <option value="48px">48px</option>
                            <option value="64px">64px</option>
                            <option value="72px">72px</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Tamaño contenido
                          </label>
                          <select
                            value={currentSlide?.fontSize || "32px"}
                            onChange={(e) =>
                              updateCurrentSlide({fontSize: e.target.value})
                            }
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                          >
                            <option value="16px">16px</option>
                            <option value="20px">20px</option>
                            <option value="24px">24px</option>
                            <option value="32px">32px</option>
                            <option value="40px">40px</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Alineación
                          </label>
                          <select
                            value={currentSlide?.textAlign || "center"}
                            onChange={(e) =>
                              updateCurrentSlide({textAlign: e.target.value})
                            }
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                          >
                            <option value="left">Izquierda</option>
                            <option value="center">Centro</option>
                            <option value="right">Derecha</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Imagen de fondo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  updateCurrentSlide({
                                    backgroundImage: event.target.result,
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                          />
                          {currentSlide?.backgroundImage && (
                            <button
                              onClick={() =>
                                updateCurrentSlide({backgroundImage: null})
                              }
                              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Quitar imagen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <FaProjectDiagram className="mx-auto text-6xl mb-4" />
                <h3 className="text-2xl font-bold mb-2">
                  Selecciona una presentación
                </h3>
                <p className="mb-6">
                  Elige una presentación de la lista o crea una nueva
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FaPlus /> Nueva Presentación
                  </button>
                  <button
                    onClick={() => createPresentation()}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FaFile /> Presentación Simple
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✨ Panel Derecho - Miniaturas de la Presentación Actual */}
        <div className="w-64 bg-white/5 border-l border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium mb-2">� Miniaturas</h3>
            <p className="text-xs text-gray-400">
              {currentPresentation
                ? `${currentPresentation.name} (${
                    currentPresentation.slides?.length || 0
                  } diapositivas)`
                : "Selecciona una presentación"}
            </p>
            {currentPresentation && (
              <p className="text-xs text-blue-400 mt-1">
                {isProjecting
                  ? "Click: proyectar • Doble-click: proyectar"
                  : "Click: navegar • Doble-click: proyectar"}
              </p>
            )}
          </div>

          {/* ✨ Lista vertical de miniaturas de la presentación actual */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentPresentation?.slides ? (
              <div className="space-y-3">
                {currentPresentation.slides.map((slide, index) => (
                  <div
                    key={slide.id || index}
                    onClick={() => {
                      setCurrentSlideIndex(index);
                      // ✨ Si ya se está proyectando, proyectar inmediatamente al hacer click
                      if (isProjecting) {
                        goToSlideAndProject(index);
                      }
                    }}
                    onDoubleClick={() => goToSlideAndProject(index)}
                    className={`group cursor-pointer p-3 rounded-lg border transition-all duration-200 relative ${
                      currentSlideIndex === index
                        ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-300"
                    }`}
                  >
                    {/* Miniatura de la diapositiva */}
                    <div className="relative">
                      <div
                        className="w-full h-20 rounded border border-white/20 mb-3 flex items-center justify-center text-xs overflow-hidden"
                        style={{
                          backgroundColor: slide.backgroundColor || "#1e293b",
                          backgroundImage: (() => {
                            const bgUrl = convertPixabayUrlToProxy(
                              slide.backgroundImage,
                            );
                            return bgUrl ? `url(${bgUrl})` : "none";
                          })(),
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        {convertPixabayUrlToProxy(slide.backgroundImage) ||
                        (slide.slideImages && slide.slideImages.length > 0) ? (
                          <div className="w-full h-full bg-black/20 flex items-center justify-center relative">
                            {/* Mostrar imagen principal o primera imagen de slideImages */}
                            {slide.slideImages &&
                              slide.slideImages.length > 0 &&
                              !convertPixabayUrlToProxy(
                                slide.backgroundImage,
                              ) &&
                              (() => {
                                const slideImgUrl = convertPixabayUrlToProxy(
                                  slide.slideImages[0],
                                );
                                return slideImgUrl ? (
                                  <img
                                    src={slideImgUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover rounded"
                                    style={{opacity: 0.8}}
                                  />
                                ) : null;
                              })()}
                            <span className="absolute text-white text-xs font-medium bg-black/70 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            {/* Indicador de múltiples imágenes */}
                            {slide.slideImages &&
                              slide.slideImages.length > 1 && (
                                <span className="absolute bottom-1 right-1 text-white text-xs bg-purple-600/80 px-1 py-0.5 rounded">
                                  +{slide.slideImages.length - 1}
                                </span>
                              )}
                          </div>
                        ) : (
                          <div className="text-center p-2">
                            <div className="text-white text-xs font-medium mb-1 truncate">
                              {slide.title || `Diapositiva ${index + 1}`}
                            </div>
                            <div className="text-gray-300 text-xs leading-tight truncate">
                              {slide.content?.substring(0, 25)}
                              {slide.content?.length > 25 && "..."}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Número de diapositiva con indicador de actual */}
                      <div
                        className={`absolute top-1 left-1 text-white text-xs px-2 py-1 rounded ${
                          currentSlideIndex === index
                            ? "bg-blue-600"
                            : "bg-black/60"
                        }`}
                      >
                        {index + 1}
                      </div>

                      {/* Icono de proyección al hacer hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M8 5v10l7-5z" />
                          </svg>
                          <span>Proyectar</span>
                        </div>
                      </div>
                    </div>

                    {/* Información de la diapositiva */}
                    <div className="space-y-1">
                      <div className="text-white text-xs font-medium truncate">
                        {slide.title || `Diapositiva ${index + 1}`}
                      </div>
                      <div className="text-gray-400 text-xs leading-tight">
                        {slide.content ? (
                          <>
                            {slide.content.substring(0, 40)}
                            {slide.content.length > 40 && "..."}
                          </>
                        ) : (
                          "Sin contenido"
                        )}
                      </div>
                    </div>

                    {/* Indicador de diapositiva actual */}
                    {currentSlideIndex === index && (
                      <div className="absolute right-2 top-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FaFile className="mx-auto text-2xl mb-2" />
                <p className="text-xs">
                  Selecciona una presentación para ver sus miniaturas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✨ Modal de creación mejorada */}
      {showCreateModal && (
        <CreatePresentationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateFromModal}
        />
      )}
    </div>
  );
};

export default PresentationManager;
