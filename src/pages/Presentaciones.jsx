import React, {useState, useEffect, useMemo, useCallback, useRef} from "react";
import himnosData from "../data/himnos.json";
import vidacristianaData from "../data/vidacristiana.json";
import librosDeLaBiblia from "../utils/libros";
import {cargarLibro} from "../utils/cargarLibro";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaArrowUp,
  FaArrowDown,
  FaMusic,
  FaBible,
  FaStickyNote,
  FaChevronLeft,
  FaChevronRight,
  FaBookOpen,
  FaBroadcastTower,
  FaCalendarAlt,
  FaList,
  FaRegStickyNote,
  FaPhotoVideo,
  FaImage,
  FaFilm,
  FaUpload,
} from "react-icons/fa";
import {IoClose, IoSearch} from "react-icons/io5";

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

// ── Persistencia con fallback localStorage ──────────────────────────────────
const LS_KEY = "gloryview_ordenes_v1";
const lsCargar = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};
const lsGuardar = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));
const ipcOk = () => Boolean(window.electron?.obtenerOrdenesServicio);

async function apiOrdenes(method, ...args) {
  if (!ipcOk()) return method === "list" ? null : null; // null = usar localStorage
  try {
    switch (method) {
      case "list":
        return await window.electron.obtenerOrdenesServicio();
      case "add":
        return await window.electron.agregarOrdenServicio(args[0]);
      case "update":
        return await window.electron.actualizarOrdenServicio(args[0]);
      case "delete":
        return await window.electron.eliminarOrdenServicio(args[0]);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

const todosLibros = [
  ...librosDeLaBiblia.antiguoTestamento,
  ...librosDeLaBiblia.nuevoTestamento,
];

const ItemIcon = ({item}) => {
  if (item.tipo === "himno") {
    if (item.tipoHimno === "vida") return <FaBookOpen className="text-amber-400 text-xs shrink-0" />;
    if (item.tipoHimno === "personalizado") return <FaMusic className="text-violet-400 text-xs shrink-0" />;
    return <FaMusic className="text-emerald-400 text-xs shrink-0" />;
  }
  if (item.tipo === "versiculo")
    return <FaBible className="text-indigo-400 text-xs shrink-0" />;
  if (item.tipo === "multimedia")
    return item.tipoMedia === "video"
      ? <FaFilm className="text-pink-400 text-xs shrink-0" />
      : <FaImage className="text-sky-400 text-xs shrink-0" />;
  return <FaRegStickyNote className="text-yellow-400 text-xs shrink-0" />;
};

const itemLabel = (item) => {
  if (item.tipo === "himno") return `#${item.numeroHimno} ${item.tituloHimno}`;
  if (item.tipo === "versiculo")
    return `${item.libroNombre} ${item.capitulo}:${item.versiculo}`;
  if (item.tipo === "multimedia") return item.nombre || "Multimedia";
  return item.texto?.substring(0, 50) || "Nota";
};

const itemSub = (item) => {
  if (item.tipo === "himno") {
    if (item.tipoHimno === "vida") return "Vida Cristiana";
    if (item.tipoHimno === "personalizado") return "Himno Personalizado";
    return "Himno Moravo";
  }
  if (item.tipo === "versiculo")
    return (item.texto || "").substring(0, 70) + ((item.texto || "").length > 70 ? "…" : "");
  if (item.tipo === "multimedia")
    return item.tipoMedia === "video" ? "Video" : "Imagen";
  return "Nota / Separador";
};

export default function Presentaciones() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usandoLocal, setUsandoLocal] = useState(false);
  const [toast, setToast] = useState(null);
  const [ordenId, setOrdenId] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tituloEdit, setTituloEdit] = useState("");
  const [fechaEdit, setFechaEdit] = useState("");
  const [itemsEdit, setItemsEdit] = useState([]);
  const [itemActivo, setItemActivo] = useState(0);
  const [parrafoActivo, setParrafoActivo] = useState(0);
  const [proyectando, setProyectando] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  // Modals: null | "himno" | "versiculo" | "nota" | "multimedia"
  const [modal, setModal] = useState(null);

  // Controles de video del proyector
  const [videoPausado, setVideoPausado] = useState(false);
  const [videoVolumen, setVideoVolumen] = useState(1);

  // Modal multimedia
  const [fondosDisponibles, setFondosDisponibles] = useState([]);
  const [cargandoFondos, setCargandoFondos] = useState(false);
  const [filtroMedia, setFiltroMedia] = useState("todos"); // "todos" | "imagen" | "video"
  const [busquedaHimno, setBusquedaHimno] = useState("");
  const [tipoHimno, setTipoHimno] = useState("moravo");
  const [himnosPersonalizados, setHimnosPersonalizados] = useState([]);
  const [notaTexto, setNotaTexto] = useState("");

  // Versículo picker
  const [libroVer, setLibroVer] = useState(null);
  const [capsVer, setCapsVer] = useState([]);
  const [capVer, setCapVer] = useState(null);
  const [versVer, setVersVer] = useState([]);
  const [busquedaLibro, setBusquedaLibro] = useState("");

  const orden = ordenes.find((o) => o.id === ordenId) || null;

  const mostrarToast = (msg, tipo = "success") => {
    setToast({msg, tipo});
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar desde DB al montar, con fallback y migración de localStorage
  useEffect(() => {
    (async () => {
      let dbData = null;
      const disponible = ipcOk();
      console.log(
        "[Presentaciones] IPC disponible:",
        disponible,
        "| obtenerOrdenesServicio:",
        typeof window.electron?.obtenerOrdenesServicio,
      );

      if (disponible) {
        try {
          dbData = await window.electron.obtenerOrdenesServicio();
        } catch (e) {
          console.error("[Presentaciones] IPC error:", e);
        }
      }

      if (Array.isArray(dbData)) {
        // IPC funciona
        if (dbData.length === 0) {
          // DB vacía: migrar datos locales si existen
          const localData = lsCargar();
          if (localData.length > 0) {
            console.log(
              "[Presentaciones] Migrando",
              localData.length,
              "órdenes de localStorage → DB",
            );
            for (const o of localData) {
              try {
                await window.electron.agregarOrdenServicio({
                  titulo: o.titulo,
                  fecha: o.fecha || "",
                  items: o.items || [],
                });
              } catch (e) {
                console.error("[Presentaciones] Error migrando:", e);
              }
            }
            try {
              dbData = await window.electron.obtenerOrdenesServicio();
            } catch {}
            lsGuardar([]);
            mostrarToast(
              `${localData.length} orden(es) migrados a la base de datos`,
            );
          }
        }
        setOrdenes(Array.isArray(dbData) ? dbData : []);
        setUsandoLocal(false);
      } else {
        // IPC no disponible → usar localStorage
        const local = lsCargar();
        setOrdenes(local);
        setUsandoLocal(true);
        console.warn("[Presentaciones] Usando localStorage como fallback");
      }
      setCargando(false);
    })();
  }, []);

  // ── Cargar himnos personalizados al abrir el modal
  useEffect(() => {
    if (modal !== "himno" || tipoHimno !== "personalizado") return;
    if (himnosPersonalizados.length > 0) return;
    window.electron?.obtenerHimnos?.()
      .then((data) => setHimnosPersonalizados(Array.isArray(data) ? data : []))
      .catch(() => setHimnosPersonalizados([]));
  }, [modal, tipoHimno]);

  // ── Cargar capítulos al elegir libro
  useEffect(() => {
    if (!libroVer) return;
    cargarLibro(libroVer.id).then((data) => {
      setCapsVer(data);
      setCapVer(null);
      setVersVer([]);
    });
  }, [libroVer]);

  // ── Navegación con teclado
  useEffect(() => {
    if (!orden || modoEdicion || modal) return;
    const handler = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
      const items = orden.items;
      const item = items[itemActivo];
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (
          item?.tipo === "himno" &&
          parrafoActivo < (item.parrafos?.length || 1) - 1
        ) {
          const p = parrafoActivo + 1;
          setParrafoActivo(p);
          if (proyectando) enviarHimno(item, p);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (parrafoActivo > 0) {
          const p = parrafoActivo - 1;
          setParrafoActivo(p);
          if (proyectando) enviarHimno(item, p);
        } else if (itemActivo > 0) {
          const ni = itemActivo - 1;
          const nItem = items[ni];
          const lastP =
            nItem?.tipo === "himno" ? (nItem.parrafos?.length || 1) - 1 : 0;
          setItemActivo(ni);
          setParrafoActivo(lastP);
          if (proyectando) enviarItem(nItem, lastP);
        }
      } else if (e.key === "Escape") {
        limpiarProyeccion();
      } else if (e.key === " ") {
        e.preventDefault();
        if (item) {
          enviarItem(item, parrafoActivo);
          setProyectando(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [orden, modoEdicion, modal, itemActivo, parrafoActivo, proyectando]);

  // ── Proyección helpers
  const enviarHimno = (item, parIdx) => {
    window.electron?.enviarHimno({
      parrafo: item.parrafos?.[parIdx] || "",
      titulo: item.tituloHimno,
      numero: item.numeroHimno,
      origen: "himno",
    });
  };

  const enviarItem = (item, parIdx = 0) => {
    if (!item || !window.electron) return;
    window.electron.abrirProyector?.();
    if (item.tipo === "himno") {
      enviarHimno(item, parIdx);
    } else if (item.tipo === "versiculo") {
      window.electron.enviarVersiculo({
        parrafo: item.texto || "",
        titulo: item.libroNombre,
        numero: `${item.capitulo}:${item.versiculo}`,
        origen: "biblia",
      });
    } else if (item.tipo === "multimedia") {
      // Proyectar imagen o video a pantalla completa en el proyector
      window.electron.proyectarMultimedia?.({
        tipo: item.tipoMedia,
        url: item.url,
        nombre: item.nombre,
        id: item.fondoId,
      });
    } else {
      window.electron.enviarVersiculo({
        parrafo: item.texto || "",
        titulo: "",
        numero: "",
        origen: "himno",
      });
    }
  };

  const limpiarProyeccion = () => {
    window.electron?.enviarVersiculo?.({
      parrafo: "",
      titulo: "",
      numero: "",
      origen: "clear",
    });
    setProyectando(false);
  };

  const sendControlVideo = (action, extra = {}) => {
    window.electron?.send?.("proyector-control-multimedia", {action, ...extra});
  };

  const seleccionarYProyectar = (idx) => {
    const item = orden?.items?.[idx];
    if (!item) return;
    setItemActivo(idx);
    setParrafoActivo(0);
    enviarItem(item, 0);
    setProyectando(true);
    if (item.tipo === "multimedia" && item.tipoMedia === "video") {
      setVideoPausado(false);
      setVideoVolumen(1);
    }
  };

  // ── CRUD órdenes
  const crearOrden = () => {
    const hoy = new Date().toISOString().split("T")[0];
    setOrdenId(null);
    setTituloEdit("Nuevo Orden de Servicio");
    setFechaEdit(hoy);
    setItemsEdit([]);
    setModoEdicion(true);
  };

  const editarOrden = (o) => {
    setOrdenId(o.id);
    setTituloEdit(o.titulo);
    setFechaEdit(o.fecha || "");
    setItemsEdit([...o.items]);
    setModoEdicion(true);
  };

  const guardarOrden = async () => {
    if (!tituloEdit.trim()) return;
    const data = {titulo: tituloEdit, fecha: fechaEdit, items: itemsEdit};
    const esEdicion = ordenId && ordenes.find((o) => o.id === ordenId);

    if (esEdicion) {
      // ── Actualizar existente ──
      const res = await apiOrdenes("update", {...data, id: ordenId});
      const actualizado = {...ordenes.find((o) => o.id === ordenId), ...data};
      let nuevaLista;
      if (res?.success) {
        // DB actualizada, recargar
        const dbData = await apiOrdenes("list");
        nuevaLista = Array.isArray(dbData)
          ? dbData
          : ordenes.map((o) => (o.id === ordenId ? actualizado : o));
      } else {
        // Fallback local
        nuevaLista = ordenes.map((o) => (o.id === ordenId ? actualizado : o));
        setUsandoLocal(true);
      }
      setOrdenes(nuevaLista);
      lsGuardar(nuevaLista);
      mostrarToast("Orden actualizado");
    } else {
      // ── Crear nuevo ──
      const res = await apiOrdenes("add", data);
      let nuevo;
      if (res?.success && res.id) {
        nuevo = {
          id: res.id,
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        // Fallback: guardar en localStorage con id local
        nuevo = {
          id: genId(),
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUsandoLocal(true);
        mostrarToast("Guardado localmente", "warning");
      }
      const nuevaLista = [nuevo, ...ordenes];
      setOrdenes(nuevaLista);
      lsGuardar(nuevaLista);
      setOrdenId(nuevo.id);
      if (res?.success) mostrarToast("Orden de servicio guardado");
    }
    setModoEdicion(false);
    setItemActivo(0);
    setParrafoActivo(0);
  };

  const eliminarOrden = async (id) => {
    if (!window.confirm("¿Eliminar este orden de servicio?")) return;
    await apiOrdenes("delete", id);
    const nuevaLista = ordenes.filter((o) => o.id !== id);
    setOrdenes(nuevaLista);
    lsGuardar(nuevaLista);
    if (ordenId === id) {
      setOrdenId(null);
      setModoEdicion(false);
    }
    mostrarToast("Orden eliminado", "info");
  };

  // ── Items editing
  const moverItem = (idx, dir) => {
    const arr = [...itemsEdit];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setItemsEdit(arr);
  };

  // ── Agregar himno
  const himnosFiltrados = useMemo(() => {
    let data;
    if (tipoHimno === "personalizado") {
      data = himnosPersonalizados;
    } else {
      data = tipoHimno === "moravo" ? himnosData : vidacristianaData;
    }
    if (!busquedaHimno.trim()) return data.slice(0, 80);
    const b = busquedaHimno.toLowerCase();
    return data
      .filter(
        (h) =>
          h.titulo?.toLowerCase().includes(b) ||
          h.numero?.toString().includes(b),
      )
      .slice(0, 50);
  }, [busquedaHimno, tipoHimno, himnosPersonalizados]);

  const agregarHimno = (himno) => {
    // Los himnos personalizados usan `letra` (array de estrofas); los del himnario usan `parrafos`
    const parrafos = tipoHimno === "personalizado"
      ? (Array.isArray(himno.letra) ? himno.letra : [])
      : (Array.isArray(himno.parrafos) ? himno.parrafos : []);
    setItemsEdit((p) => [
      ...p,
      {
        id: genId(),
        tipo: "himno",
        tituloHimno: himno.titulo,
        numeroHimno: himno.numero,
        tipoHimno: tipoHimno,
        parrafos,
      },
    ]);
    setModal(null);
    setBusquedaHimno("");
  };

  // ── Agregar versículo (mantiene el modal abierto para selección múltiple)
  const agregarVersiculo = (verIdx) => {
    if (!libroVer || !capVer || !versVer[verIdx]) return;
    setItemsEdit((p) => [
      ...p,
      {
        id: genId(),
        tipo: "versiculo",
        libroId: libroVer.id,
        libroNombre: libroVer.nombre,
        capitulo: capVer,
        versiculo: verIdx + 1,
        texto: versVer[verIdx],
      },
    ]);
    mostrarToast(`${libroVer.nombre} ${capVer}:${verIdx + 1} agregado`);
  };

  // ── Agregar nota
  const agregarNota = () => {
    if (!notaTexto.trim()) return;
    setItemsEdit((p) => [...p, {id: genId(), tipo: "nota", texto: notaTexto}]);
    setNotaTexto("");
    setModal(null);
  };

  // ── Agregar multimedia
  const abrirModalMultimedia = async () => {
    setModal("multimedia");
    setFiltroMedia("todos");
    setCargandoFondos(true);
    try {
      const data = await window.electron?.obtenerFondos?.();
      setFondosDisponibles(data || []);
    } catch { setFondosDisponibles([]); }
    finally { setCargandoFondos(false); }
  };

  const agregarMultimedia = (fondo) => {
    setItemsEdit((p) => [
      ...p,
      {
        id: genId(),
        tipo: "multimedia",
        url: fondo.url,
        tipoMedia: fondo.tipo,   // "imagen" | "video"
        nombre: fondo.nombre,
        fondoId: fondo.id,
      },
    ]);
    mostrarToast(`"${fondo.nombre}" agregado`);
    setModal(null);
  };

  const subirYAgregarMultimedia = async () => {
    try {
      const res = await window.electron?.subirFondo?.();
      if (res) {
        // Recargar fondos para obtener el nuevo
        const data = await window.electron?.obtenerFondos?.();
        setFondosDisponibles(data || []);
        mostrarToast("Archivo subido. Selecciónalo para agregarlo.");
      }
    } catch { mostrarToast("Error al subir el archivo", "error"); }
  };

  // ── Libros filtrados para selector versículo
  const librosFiltrados = useMemo(() => {
    if (!busquedaLibro.trim()) return todosLibros;
    const b = busquedaLibro.toLowerCase();
    return todosLibros.filter((l) => l.nombre.toLowerCase().includes(b));
  }, [busquedaLibro]);

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border shadow-xl text-xs min-w-[200px] pointer-events-none ${
            toast.tipo === "success"
              ? "bg-slate-900/95 border-l-2 border-l-emerald-500 border-white/10 text-white/90"
              : toast.tipo === "warning"
                ? "bg-slate-900/95 border-l-2 border-l-amber-500 border-white/10 text-amber-300"
                : "bg-slate-900/95 border-l-2 border-l-blue-500 border-white/10 text-white/90"
          }`}
        >
          {toast.tipo === "warning" ? "⚠️" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── Aviso localStorage ── */}
      {usandoLocal && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <span className="text-amber-400 text-xs">⚠</span>
          <p className="text-xs text-amber-300">
            Guardando localmente — reinicia la app para sincronizar con la base
            de datos.
          </p>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Panel izquierdo: lista de órdenes ── */}
        <div
          className={`${panelAbierto ? "w-64 xl:w-72" : "w-0"} shrink-0 transition-all duration-300 overflow-hidden border-r border-slate-800 flex flex-col bg-slate-900/60`}
        >
          <div className="shrink-0 px-3 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FaList className="text-emerald-400 text-sm shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Órdenes de Servicio
              </span>
            </div>
            <button
              onClick={crearOrden}
              className="shrink-0 w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 flex items-center justify-center text-white transition-colors"
              title="Nuevo orden"
            >
              <FaPlus className="text-[10px]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-1">
            {ordenes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-2">
                <FaList className="text-3xl text-slate-700 mb-3" />
                <p className="text-slate-500 text-xs">
                  No hay órdenes de servicio.
                  <br />
                  Crea el primero.
                </p>
              </div>
            )}
            {ordenes.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setOrdenId(o.id);
                  setModoEdicion(false);
                  setItemActivo(0);
                  setParrafoActivo(0);
                  setProyectando(false);
                }}
                className={`group w-full text-left px-2.5 py-2 rounded-xl border transition-all ${
                  ordenId === o.id
                    ? "bg-emerald-500/12 border-emerald-500/35 text-white"
                    : "bg-white/3 border-white/6 hover:bg-white/6 hover:border-white/12 text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">
                      {o.titulo}
                    </p>
                    {o.fecha && (
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <FaCalendarAlt className="text-[8px]" />
                        {o.fecha}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {o.items?.length || 0} elemento
                      {(o.items?.length || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editarOrden(o);
                      }}
                      className="w-6 h-6 rounded-md bg-white/8 hover:bg-indigo-500/20 border border-white/8 flex items-center justify-center text-slate-400 hover:text-indigo-300 transition-colors"
                      title="Editar"
                    >
                      <FaEdit className="text-[9px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarOrden(o.id);
                      }}
                      className="w-6 h-6 rounded-md bg-white/8 hover:bg-red-500/20 border border-white/8 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <FaTrash className="text-[9px]" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Área principal ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-3 py-2.5 border-b border-slate-800 flex items-center gap-2 bg-slate-900/40">
            <button
              onClick={() => setPanelAbierto((p) => !p)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
              title={panelAbierto ? "Ocultar panel" : "Mostrar panel"}
            >
              <FaList className="text-xs" />
            </button>

            {modoEdicion ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  value={tituloEdit}
                  onChange={(e) => setTituloEdit(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-600/60 focus:border-emerald-500/70 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  placeholder="Título del orden de servicio"
                />
                <input
                  type="date"
                  value={fechaEdit}
                  onChange={(e) => setFechaEdit(e.target.value)}
                  className="bg-slate-800 border border-slate-600/60 focus:border-emerald-500/70 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none w-36 shrink-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {orden ? (
                  <>
                    <h2 className="text-sm font-semibold text-white truncate">
                      {orden.titulo}
                    </h2>
                    {orden.fecha && (
                      <span className="text-xs text-slate-500 shrink-0">
                        {orden.fecha}
                      </span>
                    )}
                    <span className="text-xs text-slate-600 shrink-0">
                      {orden.items?.length || 0} elem.
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">
                    Selecciona o crea un orden de servicio
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {modoEdicion ? (
                <>
                  <button
                    onClick={guardarOrden}
                    disabled={!tituloEdit.trim()}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 border border-emerald-500/30 text-white text-xs font-semibold transition-colors"
                  >
                    <FaSave className="text-[10px]" /> Guardar
                  </button>
                  <button
                    onClick={() => setModoEdicion(false)}
                    className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : orden ? (
                <>
                  {proyectando && (
                    <button
                      onClick={limpiarProyeccion}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors"
                    >
                      <FaStop className="text-[10px]" /> Limpiar
                    </button>
                  )}
                  <button
                    onClick={() => editarOrden(orden)}
                    className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1.5"
                  >
                    <FaEdit className="text-[10px]" /> Editar
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* ── Modo Edición ── */}
          {modoEdicion ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Lista de items editables */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {itemsEdit.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <FaList className="text-3xl mb-3 text-slate-700" />
                    <p className="text-sm mb-1">Orden vacío</p>
                    <p className="text-xs">
                      Agrega himnos, versículos o notas abajo
                    </p>
                  </div>
                )}
                {itemsEdit.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl group"
                  >
                    <ItemIcon item={item} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {itemLabel(item)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {itemSub(item)}
                      </p>
                    </div>
                    {/* Miniatura multimedia en modo edición */}
                    {item.tipo === "multimedia" && item.url && (
                      <div className="shrink-0 rounded-md overflow-hidden border border-white/10 bg-slate-950" style={{width:52,height:36}}>
                        {item.tipoMedia === "video"
                          ? <video src={item.url} className="w-full h-full object-cover" muted />
                          : <img src={item.url} alt={item.nombre} className="w-full h-full object-cover" />}
                      </div>
                    )}
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => moverItem(idx, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <FaArrowUp className="text-[9px]" />
                      </button>
                      <button
                        onClick={() => moverItem(idx, 1)}
                        disabled={idx === itemsEdit.length - 1}
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <FaArrowDown className="text-[9px]" />
                      </button>
                      <button
                        onClick={() =>
                          setItemsEdit((p) => p.filter((_, i) => i !== idx))
                        }
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 border border-white/8 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <FaTrash className="text-[9px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones agregar */}
              <div className="shrink-0 border-t border-slate-800 px-3 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0">
                  Agregar:
                </span>
                <button
                  onClick={() => {
                    setTipoHimno("moravo");
                    setBusquedaHimno("");
                    setModal("himno");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/25 text-emerald-300 text-xs font-medium transition-colors"
                >
                  <FaMusic className="text-[9px]" /> Himno Moravo
                </button>
                <button
                  onClick={() => {
                    setTipoHimno("vida");
                    setBusquedaHimno("");
                    setModal("himno");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/25 text-amber-300 text-xs font-medium transition-colors"
                >
                  <FaBookOpen className="text-[9px]" /> Vida Cristiana
                </button>
                <button
                  onClick={() => {
                    setTipoHimno("personalizado");
                    setBusquedaHimno("");
                    setHimnosPersonalizados([]);
                    setModal("himno");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/25 text-violet-300 text-xs font-medium transition-colors"
                >
                  <FaMusic className="text-[9px]" /> Personalizado
                </button>
                <button
                  onClick={() => {
                    setLibroVer(null);
                    setCapVer(null);
                    setVersVer([]);
                    setCapsVer([]);
                    setBusquedaLibro("");
                    setModal("versiculo");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/25 text-indigo-300 text-xs font-medium transition-colors"
                >
                  <FaBible className="text-[9px]" /> Versículo
                </button>
                <button
                  onClick={() => {
                    setNotaTexto("");
                    setModal("nota");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600/15 hover:bg-yellow-600/25 border border-yellow-500/20 text-yellow-300 text-xs font-medium transition-colors"
                >
                  <FaRegStickyNote className="text-[9px]" /> Nota
                </button>
                <button
                  onClick={abrirModalMultimedia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600/15 hover:bg-pink-600/25 border border-pink-500/20 text-pink-300 text-xs font-medium transition-colors"
                >
                  <FaPhotoVideo className="text-[9px]" /> Multimedia
                </button>
              </div>
            </div>
          ) : orden ? (
            /* ── Modo Vista / Proyección ── */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {orden.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <FaList className="text-3xl mb-3 text-slate-700" />
                    <p className="text-sm">Este orden está vacío</p>
                    <button
                      onClick={() => editarOrden(orden)}
                      className="mt-3 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Agregar elementos
                    </button>
                  </div>
                )}
                {orden.items.map((item, idx) => {
                  const isActive = idx === itemActivo;
                  const parrafosCount =
                    item.tipo === "himno" ? item.parrafos?.length || 0 : 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all ${isActive ? "border-emerald-500/40 bg-emerald-500/8 shadow-lg shadow-emerald-900/20" : "border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/70"}`}
                    >
                      {/* Fila principal */}
                      <button
                        onClick={() => seleccionarYProyectar(idx)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-white/6 border border-white/8">
                          <span className="text-[10px] font-bold text-white/50">
                            {idx + 1}
                          </span>
                        </div>
                        <ItemIcon item={item} />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-slate-300"}`}
                          >
                            {itemLabel(item)}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {itemSub(item)}
                          </p>
                        </div>
                        {/* Miniatura para todos los items multimedia */}
                        {item.tipo === "multimedia" && item.url && (
                          <div className="shrink-0 rounded-md overflow-hidden border border-white/10 bg-slate-950" style={{width:52,height:36}}>
                            {item.tipoMedia === "video"
                              ? <video src={item.url} className="w-full h-full object-cover" muted />
                              : <img src={item.url} alt={item.nombre} className="w-full h-full object-cover" />}
                          </div>
                        )}
                        {isActive && proyectando && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            EN VIVO
                          </span>
                        )}
                        {!isActive && (
                          <FaBroadcastTower className="text-[10px] text-slate-600 shrink-0" />
                        )}
                      </button>

                      {/* Thumbnail multimedia activo */}
                      {isActive && item.tipo === "multimedia" && item.url && (
                        <div className="px-3 pb-2.5 space-y-2">
                          <div className="relative rounded-lg overflow-hidden border border-white/8 bg-slate-950" style={{height:"80px"}}>
                            {item.tipoMedia === "video" ? (
                              <video src={item.url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={item.url} alt={item.nombre} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-3 gap-2">
                              {item.tipoMedia === "video"
                                ? <FaFilm className="text-pink-300 text-sm" />
                                : <FaImage className="text-sky-300 text-sm" />}
                              <span className="text-xs text-white/80 font-medium">{item.nombre}</span>
                            </div>
                          </div>

                          {/* Controles de video */}
                          {item.tipoMedia === "video" && proyectando && (
                            <div className="flex items-center gap-2 px-1">
                              {/* Play / Pause */}
                              <button
                                onClick={() => {
                                  if (videoPausado) {
                                    sendControlVideo("play");
                                    setVideoPausado(false);
                                  } else {
                                    sendControlVideo("pause");
                                    setVideoPausado(true);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 flex items-center justify-center text-pink-300 transition-colors"
                                title={videoPausado ? "Reproducir" : "Pausar"}
                              >
                                {videoPausado
                                  ? <FaPlay className="text-[10px]" />
                                  : <FaPause className="text-[10px]" />}
                              </button>

                              {/* Stop (volver al inicio) */}
                              <button
                                onClick={() => {
                                  sendControlVideo("seek", {time: 0});
                                  sendControlVideo("pause");
                                  setVideoPausado(true);
                                }}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                title="Reiniciar"
                              >
                                <FaStop className="text-[10px]" />
                              </button>

                              {/* Volumen */}
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <button
                                  onClick={() => {
                                    const muted = videoVolumen > 0;
                                    const newVol = muted ? 0 : 1;
                                    sendControlVideo("volume", {volume: newVol});
                                    setVideoVolumen(newVol);
                                  }}
                                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                                  title={videoVolumen === 0 ? "Activar sonido" : "Silenciar"}
                                >
                                  {videoVolumen === 0
                                    ? <FaVolumeMute className="text-xs" />
                                    : <FaVolumeUp className="text-xs" />}
                                </button>
                                <input
                                  type="range"
                                  min="0" max="1" step="0.05"
                                  value={videoVolumen}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setVideoVolumen(v);
                                    sendControlVideo("volume", {volume: v});
                                  }}
                                  className="flex-1 h-1 accent-pink-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-párrafos del himno activo */}
                      {isActive &&
                        item.tipo === "himno" &&
                        parrafosCount > 0 && (
                          <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                            {item.parrafos.map((parrafo, pi) => (
                              <button
                                key={pi}
                                onClick={() => {
                                  setParrafoActivo(pi);
                                  if (proyectando) enviarHimno(item, pi);
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                                  pi === parrafoActivo
                                    ? "bg-emerald-600 border-emerald-500/50 text-white"
                                    : "bg-white/5 border-white/8 text-slate-400 hover:text-white hover:bg-white/10"
                                }`}
                                title={parrafo?.substring(0, 60)}
                              >
                                <span className="font-bold">{pi + 1}</span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              {/* Barra de navegación */}
              {orden.items.length > 0 && (
                <div className="shrink-0 border-t border-slate-800 px-3 py-2.5 flex items-center gap-2 bg-slate-900/50">
                  <button
                    onClick={() => {
                      if (parrafoActivo > 0) {
                        const p = parrafoActivo - 1;
                        setParrafoActivo(p);
                        if (proyectando)
                          enviarHimno(orden.items[itemActivo], p);
                      } else if (itemActivo > 0) {
                        const ni = itemActivo - 1;
                        setItemActivo(ni);
                        setParrafoActivo(0);
                        if (proyectando) enviarItem(orden.items[ni], 0);
                      }
                    }}
                    disabled={itemActivo === 0 && parrafoActivo === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                  >
                    <FaChevronLeft className="text-[9px]" /> Anterior
                  </button>

                  <button
                    onClick={() => {
                      const item = orden.items[itemActivo];
                      enviarItem(item, parrafoActivo);
                      setProyectando(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white text-xs font-semibold transition-colors"
                  >
                    <FaBroadcastTower className="text-[10px]" />
                    {proyectando ? "Re-proyectar" : "Proyectar"}
                  </button>

                  <button
                    onClick={() => {
                      const item = orden.items[itemActivo];
                      const pars =
                        item?.tipo === "himno" ? item.parrafos?.length || 1 : 1;
                      if (parrafoActivo < pars - 1) {
                        const p = parrafoActivo + 1;
                        setParrafoActivo(p);
                        if (proyectando) enviarHimno(item, p);
                      }
                    }}
                    disabled={(() => {
                      const item = orden.items[itemActivo];
                      const pars =
                        item?.tipo === "himno" ? item.parrafos?.length || 1 : 1;
                      return parrafoActivo >= pars - 1;
                    })()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                  >
                    Siguiente <FaChevronRight className="text-[9px]" />
                  </button>

                  <div className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                    {itemActivo + 1} / {orden.items.length}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Estado vacío ── */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mb-5">
                <FaList className="text-2xl text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-2">
                Orden de Servicio
              </h3>
              <p className="text-slate-500 text-sm max-w-xs mb-5">
                Arma el programa del servicio con himnos, versículos bíblicos y
                notas. Proyéctalos en orden con las flechas del teclado.
              </p>
              <button
                onClick={crearOrden}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white font-semibold text-sm transition-colors"
              >
                <FaPlus className="text-xs" /> Crear Orden de Servicio
              </button>
            </div>
          )}
        </div>

        {/* ── Modal: Agregar Himno ── */}
        {modal === "himno" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => setTipoHimno("moravo")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${tipoHimno === "moravo" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Moravo
                    </button>
                    <button
                      onClick={() => setTipoHimno("vida")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${tipoHimno === "vida" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Vida Cristiana
                    </button>
                    <button
                      onClick={() => setTipoHimno("personalizado")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${tipoHimno === "personalizado" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Personalizados
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <IoClose />
                </button>
              </div>
              <div className="px-4 py-2.5 border-b border-slate-700/40 shrink-0">
                <div className="relative">
                  <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={busquedaHimno}
                    onChange={(e) => setBusquedaHimno(e.target.value)}
                    placeholder="Buscar por título o número..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-600/60 focus:border-emerald-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {himnosFiltrados.length === 0 && tipoHimno === "personalizado" && (
                  <p className="text-center text-slate-500 text-sm py-8">
                    No hay himnos personalizados.<br />
                    <span className="text-xs">Agrégalos desde "Agregar Himno".</span>
                  </p>
                )}
                {himnosFiltrados.map((h, i) => {
                  const accentColor = tipoHimno === "personalizado"
                    ? "text-violet-400/70"
                    : tipoHimno === "vida"
                      ? "text-amber-400/70"
                      : "text-emerald-400/70";
                  const hoverPlus = tipoHimno === "personalizado"
                    ? "group-hover:text-violet-400"
                    : tipoHimno === "vida"
                      ? "group-hover:text-amber-400"
                      : "group-hover:text-emerald-400";
                  return (
                    <button
                      key={tipoHimno === "personalizado" ? (h.id ?? i) : h.numero}
                      onClick={() => agregarHimno(h)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors group"
                    >
                      <span className={`shrink-0 w-8 text-right text-xs font-bold tabular-nums ${accentColor}`}>
                        {h.numero || "—"}
                      </span>
                      <span className="flex-1 text-sm text-slate-300 group-hover:text-white truncate">
                        {h.titulo}
                      </span>
                      <FaPlus className={`text-[10px] text-slate-600 ${hoverPlus} transition-colors shrink-0`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Agregar Versículo ── */}
        {modal === "versiculo" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {!libroVer
                      ? "Seleccionar Libro"
                      : !capVer
                        ? `${libroVer.nombre} — Capítulo`
                        : `${libroVer.nombre} ${capVer}`}
                  </h3>
                  {(() => {
                    const addedCount = capVer && libroVer
                      ? itemsEdit.filter(it => it.tipo === "versiculo" && it.libroId === libroVer.id && it.capitulo === capVer).length
                      : 0;
                    return addedCount > 0 ? (
                      <span className="shrink-0 text-[10px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 rounded-full px-2 py-0.5">
                        {addedCount} añadido{addedCount > 1 ? "s" : ""}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(libroVer || capVer) && (
                    <button
                      onClick={() => {
                        if (capVer) { setCapVer(null); setVersVer([]); }
                        else { setLibroVer(null); setCapsVer([]); }
                      }}
                      className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Atrás
                    </button>
                  )}
                  {capVer && (
                    <button
                      onClick={() => { setModal(null); setLibroVer(null); setCapVer(null); setVersVer([]); setCapsVer([]); }}
                      className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-xs font-semibold text-white transition-colors"
                    >
                      Listo
                    </button>
                  )}
                  <button
                    onClick={() => { setModal(null); setLibroVer(null); setCapVer(null); setVersVer([]); setCapsVer([]); }}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    <IoClose />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {/* Paso 1: Libros */}
                {!libroVer && (
                  <>
                    <div className="relative mb-2">
                      <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={busquedaLibro}
                        onChange={(e) => setBusquedaLibro(e.target.value)}
                        placeholder="Buscar libro..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-600/60 focus:border-indigo-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {librosFiltrados.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setLibroVer(l)}
                          className="text-left px-2.5 py-1.5 rounded-lg border border-slate-700/50 bg-white/3 hover:bg-white/8 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors"
                        >
                          {l.nombre}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {/* Paso 2: Capítulos */}
                {libroVer && !capVer && (
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(2.5rem, 1fr))",
                    }}
                  >
                    {capsVer.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCapVer(i + 1);
                          setVersVer(capsVer[i] || []);
                        }}
                        className="aspect-square rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-indigo-600 hover:border-indigo-500/60 text-sm font-bold text-slate-400 hover:text-white transition-all"
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                {/* Paso 3: Versículos */}
                {capVer && versVer.length > 0 && (
                  <div className="space-y-1">
                    {versVer.map((texto, i) => {
                      const yaAgregado = itemsEdit.some(
                        it => it.tipo === "versiculo" && it.libroId === libroVer?.id &&
                              it.capitulo === capVer && it.versiculo === i + 1
                      );
                      return (
                        <button
                          key={i}
                          onClick={() => agregarVersiculo(i)}
                          className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors group ${
                            yaAgregado
                              ? "border-indigo-500/40 bg-indigo-500/10"
                              : "border-slate-700/50 bg-white/3 hover:bg-indigo-500/10 hover:border-indigo-500/30"
                          }`}
                        >
                          <span className="shrink-0 text-[10px] font-bold text-indigo-400/60 w-5 tabular-nums mt-0.5">
                            {i + 1}
                          </span>
                          <span className={`flex-1 text-xs leading-relaxed ${yaAgregado ? "text-indigo-200" : "text-slate-300 group-hover:text-white"}`}>
                            {texto}
                          </span>
                          {yaAgregado
                            ? <span className="text-[10px] text-indigo-400 shrink-0 mt-0.5 font-bold">✓</span>
                            : <FaPlus className="text-[9px] text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5" />
                          }
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Agregar Multimedia ── */}
        {modal === "multimedia" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}>
            <div className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center">
                    <FaPhotoVideo className="text-pink-400 text-xs" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Agregar Multimedia</h3>
                    <p className="text-[10px] text-slate-500">Selecciona imagen o video del proyector</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Filtro tipo */}
                  <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5">
                    {[
                      {v:"todos",  l:"Todos"},
                      {v:"imagen", l:"Imágenes"},
                      {v:"video",  l:"Videos"},
                    ].map(({v, l}) => (
                      <button key={v} onClick={() => setFiltroMedia(v)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                          filtroMedia === v ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >{l}</button>
                    ))}
                  </div>
                  <button onClick={() => setModal(null)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <IoClose />
                  </button>
                </div>
              </div>

              {/* Grid de fondos */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                {cargandoFondos ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400" />
                    <p className="text-slate-500 text-sm">Cargando fondos…</p>
                  </div>
                ) : (() => {
                  const fondosFiltrados = fondosDisponibles.filter(f =>
                    filtroMedia === "todos" ? true : f.tipo === filtroMedia
                  );
                  return fondosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <FaPhotoVideo className="text-4xl text-slate-700" />
                      <p className="text-slate-400 text-sm font-medium">
                        {fondosDisponibles.length === 0 ? "No hay fondos disponibles" : "Sin resultados para este filtro"}
                      </p>
                      <p className="text-slate-600 text-xs max-w-xs">
                        {fondosDisponibles.length === 0
                          ? "Sube imágenes o videos desde Gestión de Fondos para usarlos aquí."
                          : "Cambia el filtro para ver otros archivos."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {fondosFiltrados.map(fondo => (
                        <button key={fondo.id} onClick={() => agregarMultimedia(fondo)}
                          className="group relative rounded-xl overflow-hidden border-2 border-white/8 hover:border-pink-400/60 transition-all hover:scale-[1.03] hover:shadow-lg"
                        >
                          <div className="aspect-video bg-slate-800 relative overflow-hidden">
                            {fondo.tipo === "video" ? (
                              <video src={fondo.url} className="w-full h-full object-cover" muted
                                onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} />
                            ) : (
                              <img src={fondo.url} alt={fondo.nombre} className="w-full h-full object-cover" />
                            )}
                            {/* Overlay hover */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <FaPlus className="text-white text-lg" />
                            </div>
                            {/* Badge tipo */}
                            <div className="absolute top-1.5 left-1.5">
                              {fondo.tipo === "video"
                                ? <FaFilm className="text-pink-300 text-[10px] drop-shadow" />
                                : <FaImage className="text-sky-300 text-[10px] drop-shadow" />}
                            </div>
                          </div>
                          <div className="px-2 py-1.5 bg-slate-800/80">
                            <p className="text-[10px] text-slate-300 truncate font-medium">{fondo.nombre}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-4 py-3 border-t border-slate-700/60 flex items-center justify-between gap-3">
                <button onClick={subirYAgregarMultimedia}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600/80 hover:bg-pink-600 border border-pink-500/30 text-white text-xs font-semibold transition-colors">
                  <FaUpload className="text-[10px]" /> Subir nuevo archivo
                </button>
                <p className="text-[10px] text-slate-600">
                  {fondosDisponibles.length > 0 && `${fondosDisponibles.length} fondo${fondosDisponibles.length !== 1 ? "s" : ""} disponible${fondosDisponibles.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Agregar Nota ── */}
        {modal === "nota" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Nota / Separador
                </h3>
                <button
                  onClick={() => setModal(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <IoClose />
                </button>
              </div>
              <div className="p-4">
                <textarea
                  autoFocus
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      agregarNota();
                  }}
                  placeholder="Ej: Ofrendas, Anuncios, Oración final..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600/60 focus:border-yellow-500/70 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Ctrl+Enter para guardar
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={agregarNota}
                    disabled={!notaTexto.trim()}
                    className="flex-1 py-2 rounded-lg bg-yellow-600/80 hover:bg-yellow-600 disabled:opacity-40 border border-yellow-500/30 text-white text-sm font-semibold transition-colors"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* cierre flex flex-1 */}
    </div>
  );
}
