import {useRef, useState} from "react";
import {
  IoArrowForward,
  IoArrowBack,
  IoCheckmarkCircle,
  IoCloudUploadOutline,
  IoClose,
  IoRefresh,
  IoAlertCircleOutline,
  IoSparkles,
} from "react-icons/io5";

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#fb923c", "#f59e0b", "#22c55e",
  "#14b8a6", "#3b82f6", "#ec4899", "#ef4444", "#ffffff",
];

const PASOS = ["bienvenida", "iglesia", "logo", "apariencia", "pantalla", "listo"];

const inputCls =
  "w-full px-3.5 py-2.5 bg-slate-800/60 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-colors";

export default function OnboardingWizard({onFinish}) {
  const [pasoIdx, setPasoIdx] = useState(0);
  const [nombreIglesia, setNombreIglesia] = useState("");
  const [pastor, setPastor] = useState("");
  const [eslogan, setEslogan] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#6366f1");
  const [logoPreview, setLogoPreview] = useState(null);
  const [dragLogo, setDragLogo] = useState(false);
  const [monitores, setMonitores] = useState(null);
  const [detectando, setDetectando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef(null);
  // Solo se lee dentro de finalizar() (un handler), nunca durante el render
  // — un ref evita un re-render de todo el wizard al elegir el archivo.
  const archivoLogoRef = useRef(null);

  const paso = PASOS[pasoIdx];

  const detectarMonitores = async () => {
    setDetectando(true);
    try {
      const info = await window.electron?.obtenerInfoMonitores?.();
      setMonitores(info?.total ? info : {total: 1});
    } catch {
      setMonitores({total: 1});
    } finally {
      setDetectando(false);
    }
  };

  const procesarLogo = (archivo) => {
    if (!archivo?.type?.startsWith("image/")) return;
    archivoLogoRef.current = archivo;
    const r = new FileReader();
    r.onload = (e) => setLogoPreview(e.target.result);
    r.readAsDataURL(archivo);
  };

  // Detectar monitores como reacción directa al clic que entra al paso
  // "pantalla" (no como un useEffect que reacciona al cambio de estado).
  const irAPaso = (i) => {
    const nuevoPaso = PASOS[Math.max(0, Math.min(i, PASOS.length - 1))];
    if (nuevoPaso === "pantalla" && !monitores && !detectando) detectarMonitores();
    setPasoIdx(Math.max(0, Math.min(i, PASOS.length - 1)));
  };
  const siguiente = () => irAPaso(pasoIdx + 1);
  const anterior = () => irAPaso(pasoIdx - 1);

  const finalizar = async (omitido = false) => {
    if (guardando) return;
    setGuardando(true);
    try {
      let logoUrl;
      if (!omitido && archivoLogoRef.current) {
        try {
          const buf = await archivoLogoRef.current.arrayBuffer();
          logoUrl = await window.electron?.guardarLogo?.(new Uint8Array(buf));
        } catch {
          /* si falla el logo, seguimos igual — no es bloqueante */
        }
      }

      const datos = {onboardingCompletado: "true"};
      if (!omitido) {
        if (nombreIglesia.trim()) datos.nombreIglesia = nombreIglesia.trim();
        if (pastor.trim()) datos.pastor = pastor.trim();
        if (eslogan.trim()) datos.eslogan = eslogan.trim();
        datos.colorPrimario = colorPrimario;
        if (logoUrl) datos.logoUrl = logoUrl;
      }

      await window.electron?.guardarConfiguracion?.(datos);
    } catch {
      /* si falla el guardado igual dejamos pasar al usuario a la app */
    } finally {
      setGuardando(false);
      onFinish?.();
    }
  };

  const puedeAvanzar = paso !== "iglesia" || nombreIglesia.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-[#05060a]">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 size-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Botón cerrar (omitir todo) */}
        {paso !== "listo" && (
          <button
            type="button"
            onClick={() => finalizar(true)}
            title="Omitir configuración inicial"
            aria-label="Omitir configuración inicial"
            className="absolute top-4 right-4 size-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors z-10"
          >
            <IoClose />
          </button>
        )}

        {/* Barra de progreso */}
        <div className="flex gap-1.5 px-7 pt-7">
          {PASOS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= pasoIdx ? "bg-indigo-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="p-7 sm:p-8 min-h-[360px] flex flex-col">
          {/* ── Bienvenida ── */}
          {paso === "bienvenida" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                <IoSparkles className="text-3xl text-amber-200" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Bienvenido a GloryView
                </h1>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Vamos a dejar todo listo para tu iglesia en un minuto: nombre,
                  logo, colores y la pantalla del proyector.
                </p>
              </div>
            </div>
          )}

          {/* ── Datos de la iglesia ── */}
          {paso === "iglesia" && (
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Tu iglesia</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esto aparece en la pantalla de bienvenida del proyector.
                </p>
              </div>
              <div>
                <label htmlFor="onb-nombre" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nombre de la iglesia
                </label>
                <input
                  id="onb-nombre"
                  type="text"
                  value={nombreIglesia}
                  onChange={(e) => setNombreIglesia(e.target.value)}
                  placeholder="Ej: Casa de Dios"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="onb-pastor" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Pastor <span className="text-slate-600">(opcional)</span>
                </label>
                <input
                  id="onb-pastor"
                  type="text"
                  value={pastor}
                  onChange={(e) => setPastor(e.target.value)}
                  placeholder="Nombre del pastor"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="onb-eslogan" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Eslogan <span className="text-slate-600">(opcional)</span>
                </label>
                <input
                  id="onb-eslogan"
                  type="text"
                  value={eslogan}
                  onChange={(e) => setEslogan(e.target.value)}
                  placeholder="Ej: Bienvenidos a la Casa de Dios"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* ── Logo ── */}
          {paso === "logo" && (
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Logo de la iglesia</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Opcional, podés agregarlo más tarde desde Configuración.
                </p>
              </div>
              <button
                type="button"
                onDragOver={(e) => { e.preventDefault(); setDragLogo(true); }}
                onDragLeave={() => setDragLogo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragLogo(false);
                  const f = e.dataTransfer.files[0];
                  if (f) procesarLogo(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[180px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  dragLogo
                    ? "border-indigo-400/70 bg-indigo-500/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="size-24 rounded-2xl object-contain"
                  />
                ) : (
                  <IoCloudUploadOutline className="text-3xl text-slate-600" />
                )}
                <p className="text-xs text-slate-500 text-center px-6">
                  {logoPreview
                    ? "Logo cargado, hacé clic para cambiarlo"
                    : "Arrastrá una imagen aquí o hacé clic para elegirla"}
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Subir logo de la iglesia"
                className="hidden"
                onChange={(e) => { if (e.target.files[0]) procesarLogo(e.target.files[0]); }}
              />
            </div>
          )}

          {/* ── Apariencia ── */}
          {paso === "apariencia" && (
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Color de tu iglesia</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se usa en el nombre de la pantalla de bienvenida del proyector.
                </p>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColorPrimario(c)}
                    title={c}
                    aria-label={`Elegir color ${c}`}
                    className={`size-9 rounded-xl border-2 transition-all hover:scale-110 ${
                      colorPrimario === c
                        ? "border-white/70 scale-110 shadow"
                        : "border-transparent hover:border-white/25"
                    }`}
                    style={{backgroundColor: c}}
                  />
                ))}
              </div>

              <div className="mt-2 rounded-2xl bg-slate-950 border border-white/[0.06] p-6 flex items-center justify-center">
                <p
                  className="font-black text-2xl text-center"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${colorPrimario}, #ffffff, ${colorPrimario})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {nombreIglesia.trim() || "Casa de Dios"}
                </p>
              </div>
            </div>
          )}

          {/* ── Pantalla del proyector ── */}
          {paso === "pantalla" && (
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Pantalla del proyector</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Así se va a mostrar lo que proyectás durante el culto.
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950 border border-white/[0.06] p-6">
                {detectando ? (
                  <div className="animate-spin rounded-full size-8 border-b-2 border-indigo-400" />
                ) : monitores?.total >= 2 ? (
                  <>
                    <IoCheckmarkCircle className="text-4xl text-emerald-400" />
                    <p className="text-sm text-slate-300 text-center max-w-xs">
                      Detectamos {monitores.total} pantallas: la proyección se
                      abrirá automáticamente a pantalla completa en la segunda.
                    </p>
                  </>
                ) : (
                  <>
                    <IoAlertCircleOutline className="text-4xl text-amber-400" />
                    <p className="text-sm text-slate-300 text-center max-w-xs">
                      Por ahora detectamos solo 1 pantalla. Podés seguir usando
                      GloryView así, el proyector se abre en una ventana que
                      podés mover a un segundo monitor o TV cuando lo conectes.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={detectarMonitores}
                  disabled={detectando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-50"
                >
                  <IoRefresh className={detectando ? "animate-spin" : ""} />
                  Detectar de nuevo
                </button>
              </div>
            </div>
          )}

          {/* ── Listo ── */}
          {paso === "listo" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <IoCheckmarkCircle className="text-3xl text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">¡Todo listo!</h1>
                <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Configuramos {nombreIglesia.trim() ? `"${nombreIglesia.trim()}"` : "tu iglesia"} en
                  GloryView. Podés cambiar cualquier cosa después desde Configuración.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <div className="flex items-center justify-between px-7 sm:px-8 pb-7 sm:pb-8">
          {pasoIdx > 0 && paso !== "listo" ? (
            <button
              type="button"
              onClick={anterior}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <IoArrowBack className="text-xs" /> Atrás
            </button>
          ) : (
            <span />
          )}

          {paso === "listo" ? (
            <button
              type="button"
              onClick={() => finalizar(false)}
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              {guardando ? "Guardando…" : "Empezar a usar GloryView"}
            </button>
          ) : (
            <button
              type="button"
              onClick={siguiente}
              disabled={!puedeAvanzar}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              {paso === "bienvenida" ? "Comenzar" : "Continuar"}
              <IoArrowForward className="text-xs" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
