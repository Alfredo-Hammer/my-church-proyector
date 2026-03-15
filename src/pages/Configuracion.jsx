import {useState, useEffect} from "react";
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
} from "react-icons/io5";
import {FaVideo, FaUpload, FaTimes, FaCog} from "react-icons/fa";

const getBaseURL = () => "http://localhost:3001";

const inputCls = "w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-indigo-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors";
const selectCls = "w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-indigo-500/70 rounded-lg text-sm text-white focus:outline-none transition-colors";
const labelCls = "block text-xs text-slate-400 mb-1";

const Configuracion = () => {
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "",
    eslogan: "",
    pastor: "",
    direccion: "",
    telefono: "",
    email: "",
    website: "",
    logo: "/images/icon-256.png",
    logoSize: "w-80 h-80",
    colorPrimario: "#ffffff",
    colorSecundario: "#d1d5db",
    fondoActivo: "",
    tipoFondo: "imagen",
    fontSize: {titulo: "text-5xl", parrafo: "text-6xl", eslogan: "text-2xl"},
    videosFondo: [],
    intervaloCambioVideo: 120,
    mostrarLogo: true,
    mostrarNombreIglesia: true,
    mostrarEslogan: true,
  });

  const [fondos, setFondos] = useState([]);
  const [, setFondoSeleccionado] = useState(null);
  const [mostrarSelectorFondo, setMostrarSelectorFondo] = useState(false);
  const [previsualizandoFondo, setPrevisualizandoFondo] = useState(null);
  const [mostrarModalRestaurar, setMostrarModalRestaurar] = useState(false);
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [, setLogoPreview] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const cargarFondos = async () => {
    try {
      const fondosData = await window.electron.obtenerFondos();
      setFondos(fondosData);
      const fondoActivo = fondosData.find((f) => f.activo);
      if (fondoActivo) setFondoSeleccionado(fondoActivo);
    } catch (error) {
      mostrarMensaje("Error al cargar los fondos", "error");
    }
  };

  const seleccionarFondo = async (fondo) => {
    try {
      await window.electron.establecerFondoActivo(fondo.id);
      setFondoSeleccionado(fondo);
      const nuevaConfig = {...configuracion, fondoActivo: fondo.ruta, tipoFondo: fondo.tipo};
      setConfiguracion(nuevaConfig);
      await guardarConfiguracionCompleta(nuevaConfig);
      mostrarMensaje(`Fondo "${fondo.nombre}" establecido`, "success");
      setMostrarSelectorFondo(false);
    } catch (error) {
      mostrarMensaje("Error al establecer el fondo", "error");
    }
  };

  const subirNuevoFondo = async () => {
    try {
      const resultado = await window.electron.subirFondo();
      if (resultado) { await cargarFondos(); mostrarMensaje("Fondo subido exitosamente", "success"); }
    } catch (error) {
      mostrarMensaje("Error al subir el fondo", "error");
    }
  };

  const eliminarFondo = async (fondoId) => {
    if (window.confirm("¿Eliminar este fondo?")) {
      try {
        await window.electron.eliminarFondo(fondoId);
        await cargarFondos();
        mostrarMensaje("Fondo eliminado", "success");
      } catch (error) {
        mostrarMensaje("Error al eliminar el fondo", "error");
      }
    }
  };

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      if (!window.electron?.obtenerConfiguracion) {
        mostrarMensaje("Funciones de configuración no disponibles", "error");
        return;
      }
      const config = await window.electron.obtenerConfiguracion();
      if (config && Object.keys(config).length > 0) {
        setConfiguracion((prev) => ({
          ...prev,
          ...config,
          nombreIglesia: config.nombreIglesia || "",
          eslogan: config.eslogan || "",
          website: config.sitioWeb || "",
          logo: config.logoUrl && config.logoUrl !== "/logo.jpg" && config.logoUrl !== ""
            ? config.logoUrl : "/images/icon-256.png",
        }));
      }
    } catch (error) {
      mostrarMensaje(`Error al cargar: ${error.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardarConfiguracionCompleta = async (configToSave = configuracion) => {
    if (!window.electron?.guardarConfiguracion) throw new Error("Funciones no disponibles");
    const configAplanada = {
      nombreIglesia: configToSave.nombreIglesia || "",
      eslogan: configToSave.eslogan || "",
      pastor: configToSave.pastor || "",
      direccion: configToSave.direccion || "",
      telefono: configToSave.telefono || "",
      email: configToSave.email || "",
      sitioWeb: configToSave.website || configToSave.sitioWeb || "",
      logoUrl: configToSave.logo || "",
      logoSize: configToSave.logoSize || "w-80 h-80",
      colorPrimario: configToSave.colorPrimario || "#ffffff",
      colorSecundario: configToSave.colorSecundario || "#d1d5db",
      fontSizeTitulo: configToSave.fontSize?.titulo || "text-5xl",
      fontSizeParrafo: configToSave.fontSize?.parrafo || "text-6xl",
      fontSizeEslogan: configToSave.fontSize?.eslogan || "text-2xl",
      mostrarLogo: (configToSave.mostrarLogo !== undefined ? configToSave.mostrarLogo : true).toString(),
      mostrarNombreIglesia: (configToSave.mostrarNombreIglesia !== undefined ? configToSave.mostrarNombreIglesia : true).toString(),
      mostrarEslogan: (configToSave.mostrarEslogan !== undefined ? configToSave.mostrarEslogan : true).toString(),
    };
    const resultado = await window.electron.guardarConfiguracion(configAplanada);
    if (!resultado) throw new Error("No se pudo guardar");
    return resultado;
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      let configParaGuardar = {...configuracion};
      if (archivoLogo) {
        try {
          const arrayBuffer = await archivoLogo.arrayBuffer();
          const logoPath = await window.electron.guardarLogo(new Uint8Array(arrayBuffer));
          if (logoPath) {
            configParaGuardar = {...configParaGuardar, logo: logoPath};
            setConfiguracion((prev) => ({...prev, logo: logoPath}));
          }
        } catch (logoError) {
          mostrarMensaje("Error al guardar el logo", "error");
        }
      }
      await guardarConfiguracionCompleta(configParaGuardar);
      mostrarMensaje("Configuración guardada", "success");
      setArchivoLogo(null);
      setLogoPreview(null);
    } catch (error) {
      mostrarMensaje(`Error al guardar: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const restaurarDefecto = async () => {
    try {
      setMostrarModalRestaurar(false);
      if (!window.electron?.restaurarConfiguracionDefecto) throw new Error("Funciones no disponibles");
      const resultado = await window.electron.restaurarConfiguracionDefecto();
      if (resultado) {
        setConfiguracion({
          nombreIglesia: "", eslogan: "", pastor: "", direccion: "", telefono: "",
          email: "", website: "", logo: "/images/icon-256.png", logoSize: "w-80 h-80",
          colorPrimario: "#ffffff", colorSecundario: "#d1d5db", fondoActivo: "",
          tipoFondo: "imagen", fontSize: {titulo: "text-5xl", parrafo: "text-6xl", eslogan: "text-2xl"},
          videosFondo: [], intervaloCambioVideo: 120,
          mostrarLogo: true, mostrarNombreIglesia: true, mostrarEslogan: true,
        });
        setFondos([]);
        setArchivoLogo(null);
        setFondoSeleccionado(null);
        setPrevisualizandoFondo(null);
        await cargarConfiguracion();
        await cargarFondos();
        mostrarMensaje("Configuración restaurada", "success");
      } else {
        throw new Error("No se pudo restaurar");
      }
    } catch (error) {
      mostrarMensaje(`Error al restaurar: ${error.message}`, "error");
    }
  };

  const manejarCambioLogo = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      if (archivo.type.startsWith("image/")) {
        setArchivoLogo(archivo);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(archivo);
      } else {
        mostrarMensaje("Selecciona un archivo de imagen válido", "error");
      }
    }
  };

  const actualizarCampo = (campo, valor) => setConfiguracion((prev) => ({...prev, [campo]: valor}));
  const actualizarFontSize = (tipo, valor) =>
    setConfiguracion((prev) => ({...prev, fontSize: {...prev.fontSize, [tipo]: valor}}));

  const mostrarMensaje = (texto, tipo) => {
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

  if (cargando) {
    return (
      <div className="bg-slate-950 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          <p className="text-slate-500 text-sm">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 h-full flex flex-col overflow-hidden text-slate-100">
      {/* Toolbar compacto */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <FaCog className="text-indigo-400 text-sm shrink-0" />
          <span className="text-sm font-semibold text-white">Configuración</span>

          {/* Mensaje inline */}
          {mensaje && (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
              mensaje.tipo === "success" ? "bg-green-500/10 border-green-500/30 text-green-300"
              : mensaje.tipo === "error" ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
            }`}>
              {mensaje.tipo === "success" && <IoCheckmark />}
              {mensaje.tipo === "error" && <IoWarning />}
              {mensaje.tipo === "info" && <IoInformationCircle />}
              {mensaje.texto}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMostrarModalRestaurar(true)}
              disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600/60 rounded-lg text-xs text-amber-300 transition-colors"
            >
              <IoRefresh className="text-xs" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-40 border border-indigo-500/30 rounded-lg text-xs text-white font-medium transition-colors"
            >
              <IoSave className="text-xs" />
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* COLUMNA 1 */}
          <div className="space-y-3">
            {/* Información General */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <IoInformationCircle className="text-indigo-400 text-sm" />
                <span className="text-xs font-semibold text-slate-300">Información General</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Nombre de la Iglesia / Organización</label>
                  <input type="text" value={configuracion.nombreIglesia}
                    onChange={(e) => actualizarCampo("nombreIglesia", e.target.value)}
                    className={inputCls} placeholder="Ej: GloryView | Tu Iglesia" />
                </div>
                <div>
                  <label className={labelCls}>Eslogan / Mensaje de Bienvenida</label>
                  <input type="text" value={configuracion.eslogan}
                    onChange={(e) => actualizarCampo("eslogan", e.target.value)}
                    className={inputCls} placeholder="Ej: Bienvenidos a GloryView" />
                </div>
                <div>
                  <label className={labelCls}>Pastor / Líder</label>
                  <input type="text" value={configuracion.pastor}
                    onChange={(e) => actualizarCampo("pastor", e.target.value)}
                    className={inputCls} placeholder="Ej: Pastor Juan Pérez" />
                </div>

                {/* Visibilidad en proyector */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mt-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <IoEye className="text-indigo-400 text-xs" />
                    <span className="text-xs font-medium text-indigo-300">Visibilidad en Proyector</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      {campo: "mostrarLogo", label: "Mostrar Logo"},
                      {campo: "mostrarNombreIglesia", label: "Mostrar Nombre"},
                      {campo: "mostrarEslogan", label: "Mostrar Eslogan"},
                    ].map(({campo, label}) => (
                      <label key={campo} className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs text-slate-400">{label}</span>
                        <div className="relative">
                          <input type="checkbox" checked={configuracion[campo]}
                            onChange={(e) => actualizarCampo(campo, e.target.checked)}
                            className="sr-only peer" />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <IoCheckmark className="text-purple-400 text-sm" />
                <span className="text-xs font-semibold text-slate-300">Información de Contacto</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Dirección</label>
                  <textarea value={configuracion.direccion}
                    onChange={(e) => actualizarCampo("direccion", e.target.value)}
                    className={`${inputCls} h-16 resize-none`}
                    placeholder="Ej: Calle Principal 123, Ciudad, País" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Teléfono</label>
                    <input type="tel" value={configuracion.telefono}
                      onChange={(e) => actualizarCampo("telefono", e.target.value)}
                      className={inputCls} placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={configuracion.email}
                      onChange={(e) => actualizarCampo("email", e.target.value)}
                      className={inputCls} placeholder="contacto@iglesia.com" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Sitio Web</label>
                  <input type="url" value={configuracion.website}
                    onChange={(e) => actualizarCampo("website", e.target.value)}
                    className={inputCls} placeholder="https://www.iglesia.com" />
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2 */}
          <div className="space-y-3">
            {/* Logo */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <IoImage className="text-orange-400 text-sm" />
                <span className="text-xs font-semibold text-slate-300">Logo</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                  <img
                    src={
                      configuracion.logo && !configuracion.logo.startsWith("data:") && configuracion.logo.startsWith("/uploads")
                        ? `${getBaseURL()}${configuracion.logo}`
                        : configuracion.logo || "/images/icon-256.png"
                    }
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "/images/icon-256.png"; }}
                  />
                </div>
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={manejarCambioLogo} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600/60 hover:border-slate-500 rounded-lg cursor-pointer text-xs text-slate-400 transition-colors">
                    <IoImage className="text-sm" />
                    {archivoLogo ? archivoLogo.name : "Seleccionar logo…"}
                  </label>
                  <p className="text-[10px] text-slate-600 mt-1.5">JPG, PNG. Recomendado: 500×500px</p>
                </div>
              </div>
            </div>

            {/* Colores */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-400" />
                <span className="text-xs font-semibold text-slate-300">Colores del Tema</span>
              </div>
              <div className="space-y-3">
                {[
                  {campo: "colorPrimario", label: "Primario (Títulos)"},
                  {campo: "colorSecundario", label: "Secundario (Texto)"},
                ].map(({campo, label}) => (
                  <div key={campo}>
                    <label className={labelCls}>{label}</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={configuracion[campo]}
                        onChange={(e) => actualizarCampo(campo, e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-600/60 cursor-pointer bg-transparent shrink-0" />
                      <input type="text" value={configuracion[campo]}
                        onChange={(e) => actualizarCampo(campo, e.target.value)}
                        className={inputCls} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fuentes y Logo Size */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <span className="text-cyan-400 text-sm font-bold">Aa</span>
                <span className="text-xs font-semibold text-slate-300">Tamaños</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {tipo: "titulo", label: "Título"},
                    {tipo: "parrafo", label: "Párrafo"},
                    {tipo: "eslogan", label: "Eslogan"},
                  ].map(({tipo, label}) => (
                    <div key={tipo}>
                      <label className={labelCls}>{label}</label>
                      <select value={configuracion.fontSize[tipo]}
                        onChange={(e) => actualizarFontSize(tipo, e.target.value)}
                        className={selectCls}>
                        {(tipo === "eslogan" ? opcionesFontSize.slice(0, 4) : opcionesFontSize).map((op) => (
                          <option key={op.valor} value={op.valor} className="bg-slate-800">{op.etiqueta}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div>
                  <label className={labelCls}>Tamaño del Logo en Proyector</label>
                  <select value={configuracion.logoSize || "w-80 h-80"}
                    onChange={(e) => actualizarCampo("logoSize", e.target.value)}
                    className={selectCls}>
                    <option value="w-56 h-56" className="bg-slate-800">Pequeño</option>
                    <option value="w-64 h-64" className="bg-slate-800">Mediano</option>
                    <option value="w-72 h-72" className="bg-slate-800">Grande</option>
                    <option value="w-80 h-80" className="bg-slate-800">Muy Grande (recomendado)</option>
                    <option value="w-96 h-96" className="bg-slate-800">Extra Grande</option>
                    <option value="w-[28rem] h-[28rem]" className="bg-slate-800">Gigante</option>
                    <option value="w-[32rem] h-[32rem]" className="bg-slate-800">Super Gigante</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa — ancho completo */}
        <div className="max-w-5xl mx-auto mt-3">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <IoEye className="text-indigo-400 text-sm" />
              <span className="text-xs font-semibold text-slate-300">Vista Previa del Proyector</span>
            </div>
            <div className="bg-slate-950 rounded-lg p-6 text-center min-h-[120px] flex flex-col justify-center border border-slate-800/60">
              {!configuracion.nombreIglesia && !configuracion.eslogan ? (
                <img src={configuracion.logo} alt="Logo" className="w-16 h-16 object-contain mx-auto"
                  onError={(e) => { e.target.src = "/images/icon-256.png"; }} />
              ) : (
                <>
                  {configuracion.nombreIglesia && (
                    <h1 className={`${configuracion.fontSize.titulo} font-bold mb-2`}
                      style={{color: configuracion.colorPrimario}}>
                      {configuracion.nombreIglesia}
                    </h1>
                  )}
                  {configuracion.eslogan && (
                    <p className={configuracion.fontSize.eslogan} style={{color: configuracion.colorSecundario}}>
                      {configuracion.eslogan}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal selector de fondos */}
      {mostrarSelectorFondo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2">
                <IoImage className="text-purple-400 text-sm" />
                <span className="text-sm font-semibold text-white">Selector de Fondos</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={subirNuevoFondo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg text-xs text-white transition-colors">
                  <FaUpload className="text-[10px]" /> Subir Fondo
                </button>
                <button onClick={() => setMostrarSelectorFondo(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                  <FaTimes className="text-xs" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              {fondos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <IoImage className="text-3xl text-slate-700 mb-3" />
                  <p className="text-slate-400 text-sm mb-4">No hay fondos disponibles</p>
                  <button onClick={subirNuevoFondo}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg text-sm text-white transition-colors">
                    <FaUpload className="text-xs" /> Subir Primer Fondo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {fondos.map((fondo) => (
                    <div key={fondo.id}
                      className={`relative group bg-slate-800/60 rounded-lg overflow-hidden border cursor-pointer transition-colors hover:bg-slate-800 ${
                        fondo.activo ? "border-emerald-400/40" : "border-slate-700/50 hover:border-slate-600"
                      }`}
                      onClick={() => seleccionarFondo(fondo)}>
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        {fondo.tipo === "video" ? (
                          <video src={fondo.ruta} className="w-full h-full object-cover" muted
                            onMouseEnter={(e) => e.target.play()} onMouseLeave={(e) => e.target.pause()}
                            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                        ) : (
                          <img src={fondo.ruta} alt={fondo.nombre} className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                        )}
                        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center" style={{display: "none"}}>
                          <IoWarning className="text-red-400 text-xl" />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5">
                          <div className="flex items-center gap-1">
                            {fondo.tipo === "video" ? <FaVideo className="text-red-400 text-xs" /> : <IoImage className="text-blue-400 text-xs" />}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setPrevisualizandoFondo(fondo); }}
                              className="p-1 bg-blue-500/80 hover:bg-blue-500 rounded text-white transition-colors">
                              <IoEye className="text-xs" />
                            </button>
                            {!fondo.activo && (
                              <button onClick={(e) => { e.stopPropagation(); eliminarFondo(fondo.id); }}
                                className="p-1 bg-red-500/80 hover:bg-red-500 rounded text-white transition-colors">
                                <IoTrash className="text-xs" />
                              </button>
                            )}
                          </div>
                        </div>
                        {fondo.activo && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Activo</div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-xs text-slate-300 truncate">{fondo.nombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal previsualización fondo */}
      {previsualizandoFondo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full">
            <button onClick={() => setPrevisualizandoFondo(null)}
              className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors">
              <FaTimes className="text-sm" />
            </button>
            <div className="bg-black rounded-xl overflow-hidden">
              {previsualizandoFondo.tipo === "video" ? (
                <video src={previsualizandoFondo.ruta} className="w-full max-h-[70vh] object-contain" controls autoPlay />
              ) : (
                <img src={previsualizandoFondo.ruta} alt={previsualizandoFondo.nombre} className="w-full max-h-[70vh] object-contain" />
              )}
              <div className="p-3 flex items-center justify-between">
                <p className="text-sm text-white font-medium">{previsualizandoFondo.nombre}</p>
                <button onClick={() => { seleccionarFondo(previsualizandoFondo); setPrevisualizandoFondo(null); }}
                  className="px-4 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/30 rounded-lg text-sm text-white transition-colors">
                  Usar este fondo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal restaurar */}
      {mostrarModalRestaurar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <IoWarning className="text-amber-400 text-sm" />
                <span className="text-sm font-semibold text-white">Restaurar configuración</span>
              </div>
              <button onClick={() => setMostrarModalRestaurar(false)} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                <IoClose className="text-sm" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-slate-400 text-sm mb-3">Se restaurarán los valores por defecto:</p>
              <ul className="space-y-1.5 text-xs text-slate-500 mb-4">
                <li className="flex items-center gap-1.5"><IoInformationCircle className="text-blue-400 shrink-0" /> Nombre e iglesia: se vaciará</li>
                <li className="flex items-center gap-1.5"><IoInformationCircle className="text-blue-400 shrink-0" /> Eslogan: se vaciará</li>
                <li className="flex items-center gap-1.5"><IoInformationCircle className="text-blue-400 shrink-0" /> Logo: icono de la aplicación</li>
                <li className="flex items-center gap-1.5"><IoInformationCircle className="text-blue-400 shrink-0" /> Otros datos: predeterminados</li>
              </ul>
              <div className="flex gap-2">
                <button onClick={() => setMostrarModalRestaurar(false)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <IoClose className="text-xs" /> Cancelar
                </button>
                <button onClick={restaurarDefecto}
                  className="flex-1 px-3 py-2 bg-amber-600/80 hover:bg-amber-600 border border-amber-500/30 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <IoRefresh className="text-xs" /> Restaurar
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
