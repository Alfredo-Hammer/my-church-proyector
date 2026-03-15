import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  FaMusic,
  FaBook,
  FaHeart,
  FaFilm,
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaVideo,
  FaYoutube,
  FaBookOpen,
  FaBible,
  FaArrowRight,
  FaStar,
} from "react-icons/fa";
import {motion} from "framer-motion";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";
import himnosData from "../data/himnos.json";
import vidacristianaData from "../data/vidacristiana.json";

// Barras animadas de reproducción
const AnimatedSoundBars = () => (
  <div className="flex items-end gap-0.5 h-3.5">
    {[0, 100, 200, 300].map((delay) => (
      <div
        key={delay}
        className="w-0.5 bg-green-400 rounded-full"
        style={{
          animation: `soundBar ${260 + delay}ms ease-in-out infinite alternate`,
          animationDelay: `${delay}ms`,
        }}
      />
    ))}
    <style>{`@keyframes soundBar { 0%{height:.2rem} 100%{height:.875rem} }`}</style>
  </div>
);

const CITAS_BIBLICAS = [
  {texto: "Confía en el Señor de todo corazón y no dependas de tu propia inteligencia.", referencia: "Proverbios 3:5"},
  {texto: "Porque Dios no nos ha dado espíritu de cobardía, sino de poder, de amor y de dominio propio.", referencia: "2 Timoteo 1:7"},
  {texto: "He aquí, yo estoy con vosotros todos los días, hasta el fin del mundo.", referencia: "Mateo 28:20"},
  {texto: "Venid a mí, todos los que estáis trabajados y cargados, y yo os haré descansar.", referencia: "Mateo 11:28"},
  {texto: "Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.", referencia: "Efesios 2:8"},
  {texto: "El Señor es mi luz y mi salvación; ¿de quién temeré?", referencia: "Salmos 27:1"},
  {texto: "Deléitarte en el Señor, y he te concederá los deseos de tu corazón.", referencia: "Salmos 37:4"},
  {texto: "Dios es amor; y el que permanece en amor, permanece en Dios, y Dios en él.", referencia: "1 Juan 4:16"},
  {texto: "Todo lo puedo en Cristo que me fortalece.", referencia: "Filipenses 4:13"},
  {texto: "La paz os dejo, mi paz os doy; no os la doy como el mundo la da.", referencia: "Juan 14:27"},
  {texto: "Porque sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.", referencia: "Romanos 8:28"},
  {texto: "Bienaventurados los que creen sin haber visto.", referencia: "Juan 20:29"},
  {texto: "Llamaré a ti en los tiempos de angustia; te libraré, y tú me honrarás.", referencia: "Salmos 50:15"},
  {texto: "Guarda tu corazón más que todas las cosas, porque de él mana la vida.", referencia: "Proverbios 4:23"},
  {texto: "Y conoceréis la verdad, y la verdad os hará libres.", referencia: "Juan 8:32"},
  {texto: "Pero los que esperan en el Señor tendrán nuevas fuerzas.", referencia: "Isaías 40:31"},
  {texto: "La alegría del Señor es vuestra fortaleza.", referencia: "Nehemías 8:10"},
];

const Inicio = () => {
  const navigate = useNavigate();
  const mediaContext = useMediaPlayer();
  const [mensaje, setMensaje] = useState("");
  const [citaDelDia, setCitaDelDia] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    totalHimnos: 0,
    totalFavoritos: 0,
    totalVidaCristiana: 0,
  });
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "",
    eslogan: "",
    direccion: "",
    logoUrl: "/images/icon-256.png",
  });
  const [configuracionCargada, setConfiguracionCargada] = useState(false);

  const obtenerCitaDelDia = () => {
    const hoy = new Date();
    const diaDelAno = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 1)) / 86400000);
    return CITAS_BIBLICAS[diaDelAno % CITAS_BIBLICAS.length];
  };

  const cargarConfiguracion = async () => {
    try {
      if (window.electron?.obtenerConfiguracion) {
        const config = await window.electron.obtenerConfiguracion();
        if (config) {
          setConfiguracion((prev) => ({
            ...prev,
            ...config,
            logoUrl: config.logoUrl || prev.logoUrl || "/images/icon-256.png",
          }));
        }
      }
    } catch (e) {
      console.error("❌ [Inicio] Error cargando configuración:", e);
    } finally {
      setConfiguracionCargada(true);
    }
  };

  const cargarEstadisticas = () => {
    try {
      const parse = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
      const himnosFav        = parse("himnosFavoritos").length;
      const vcFav            = parse("himnosVidaCristianaFavoritos").length;
      const personalizados   = parse("favoritosPersonalizados").length;
      const biblia           = parse("favoritosBiblia").length;
      setEstadisticas({
        totalHimnos:      himnosFav,
        totalVidaCristiana: vcFav,
        totalFavoritos:   personalizados + biblia + himnosFav + vcFav,
      });
    } catch (e) {
      console.error("❌ [Inicio] Error cargando estadísticas:", e);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    cargarEstadisticas();
    if (window.electron?.on) {
      window.electron.on("configuracion-actualizada", (_, nuevaConfig) => {
        setConfiguracion((prev) => ({...prev, ...nuevaConfig}));
      });
    }
    return () => { window.electron?.removeAllListeners?.("configuracion-actualizada"); };
  }, []);

  useEffect(() => {
    const hora = new Date().getHours();
    setMensaje(hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches");
    setCitaDelDia(obtenerCitaDelDia());
  }, []);

  // ── Loader ──
  if (!configuracionCargada) {
    return (
      <div className="relative h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-emerald-400 border-r-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  // ── Helpers multimedia ──
  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };
  const getMediaIcon = () => {
    const tipo = mediaContext?.currentMedia?.tipo || mediaContext?.currentMedia?.type;
    if (tipo === "audio") return <FaMusic className="text-green-400" size={14} />;
    if (tipo === "youtube") return <FaYoutube className="text-red-400" size={14} />;
    if (tipo === "video") return <FaVideo className="text-purple-400" size={14} />;
    return <FaMusic className="text-gray-400" size={14} />;
  };
  const getMediaName = () => mediaContext?.currentMedia?.nombre || mediaContext?.currentMedia?.name || "Sin título";

  // ── Datos calculados ──
  const totalFavoritosDisplay = estadisticas.totalFavoritos;

  // ── Accesos rápidos ──
  const accesos = [
    {
      icon: FaMusic, label: "Himno Moravo",
      sub: `${himnosData.length} himnos`,
      path: "/himnos",
      from: "from-emerald-500/25", to: "to-emerald-600/10",
      border: "border-emerald-500/25 hover:border-emerald-400/50",
      iconBg: "bg-emerald-500/20", iconColor: "text-emerald-300",
      glow: "hover:shadow-emerald-900/40",
    },
    {
      icon: FaBookOpen, label: "Vida Cristiana",
      sub: `${vidacristianaData.length} himnos`,
      path: "/vida-cristiana",
      from: "from-amber-500/25", to: "to-amber-600/10",
      border: "border-amber-500/25 hover:border-amber-400/50",
      iconBg: "bg-amber-500/20", iconColor: "text-amber-300",
      glow: "hover:shadow-amber-900/40",
    },
    {
      icon: FaBible, label: "Biblia",
      sub: "66 libros · RVR60",
      path: "/biblia",
      from: "from-indigo-500/25", to: "to-indigo-600/10",
      border: "border-indigo-500/25 hover:border-indigo-400/50",
      iconBg: "bg-indigo-500/20", iconColor: "text-indigo-300",
      glow: "hover:shadow-indigo-900/40",
    },
    {
      icon: FaHeart, label: "Favoritos",
      sub: totalFavoritosDisplay > 0 ? `${totalFavoritosDisplay} guardados` : "Tus favoritos",
      path: "/favoritos",
      from: "from-rose-500/25", to: "to-rose-600/10",
      border: "border-rose-500/25 hover:border-rose-400/50",
      iconBg: "bg-rose-500/20", iconColor: "text-rose-300",
      glow: "hover:shadow-rose-900/40",
    },
    {
      icon: FaFilm, label: "Multimedia",
      sub: "Audio · Video · YouTube",
      path: "/multimedia",
      from: "from-violet-500/25", to: "to-violet-600/10",
      border: "border-violet-500/25 hover:border-violet-400/50",
      iconBg: "bg-violet-500/20", iconColor: "text-violet-300",
      glow: "hover:shadow-violet-900/40",
    },
  ];

  // ── Stats ──
  const stats = [
    {icon: FaMusic,    value: himnosData.length,          label: "Himnos Moravo",     color: "text-emerald-400", bg: "bg-emerald-500/8  border-emerald-500/20"},
    {icon: FaBookOpen, value: vidacristianaData.length,   label: "Vida Cristiana",    color: "text-amber-400",   bg: "bg-amber-500/8   border-amber-500/20"},
    {icon: FaBible,    value: 66,                         label: "Libros Bíblicos",   color: "text-indigo-400",  bg: "bg-indigo-500/8  border-indigo-500/20"},
    {icon: FaStar,     value: totalFavoritosDisplay,      label: "Tus Favoritos",     color: "text-rose-400",    bg: "bg-rose-500/8    border-rose-500/20"},
  ];

  const containerVariants = {hidden:{opacity:0}, visible:{opacity:1, transition:{staggerChildren:0.07, delayChildren:0.1}}};
  const itemVariants       = {hidden:{opacity:0, y:16}, visible:{opacity:1, y:0, transition:{duration:0.35}}};

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 border-l border-white/5 flex flex-col">

      {/* Fondo */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0" style={{backgroundImage:"url(/fondos/imagen4.png)"}} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80 z-10 pointer-events-none" />

      {/* ── HEADER (media player) ── */}
      <motion.header
        initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}}
        className="sticky top-0 z-50 backdrop-blur-md border-b border-emerald-500/20 shadow-lg overflow-hidden shrink-0"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
        {mediaContext?.isPlaying && (
          <>
            <div className="absolute inset-0 opacity-60" style={{background:"linear-gradient(45deg,rgba(239,68,68,.4),rgba(16,185,129,.4),rgba(59,130,246,.4),rgba(168,85,247,.4))",backgroundSize:"400% 400%",animation:"gradientShift 8s ease infinite"}} />
            <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
          </>
        )}

        <div className="relative z-10 grid grid-cols-3 items-center gap-2 xl:gap-4 px-3 xl:px-6 py-2 xl:py-3">
          <div />

          {/* Controles multimedia */}
          {mediaContext?.currentMedia ? (
            <div className="flex items-center gap-4 xl:gap-6 flex-1 min-w-0 justify-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-2 rounded-lg border border-red-500/40">
                  <div className="flex items-center gap-2">{getMediaIcon()}{mediaContext.isPlaying && <AnimatedSoundBars />}</div>
                  {mediaContext.isPlaying && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate text-xs">{getMediaName()}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-xs capitalize">{mediaContext.currentMedia?.tipo || mediaContext.currentMedia?.type}</p>
                    {mediaContext.isPlaying && <span className="flex items-center gap-1 text-green-400 text-xs"><span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />Reproduciendo</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={mediaContext.togglePlayPause} className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-lg transition-all hover:scale-105 shadow-md" title={mediaContext.isPlaying?"Pausar":"Reproducir"}>
                  {mediaContext.isPlaying ? <FaPause size={11}/> : <FaPlay size={11}/>}
                </button>
                <button onClick={mediaContext.stop} className="bg-gray-700/80 hover:bg-gray-600 text-white p-2 rounded-lg transition-all shadow-sm" title="Detener"><FaStop size={11}/></button>
              </div>

              {(mediaContext.currentMedia?.tipo==="audio"||mediaContext.currentMedia?.type==="audio") && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <span className="text-xs text-gray-400 font-mono">{formatTime(mediaContext.currentTime)}</span>
                  <input type="range" min="0" max={mediaContext.duration||0} value={mediaContext.currentTime} onChange={(e)=>mediaContext.seek(parseFloat(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-red-500"
                    style={{background:`linear-gradient(to right,#ef4444 0%,#ef4444 ${(mediaContext.currentTime/(mediaContext.duration||1))*100}%,#374151 ${(mediaContext.currentTime/(mediaContext.duration||1))*100}%,#374151 100%)`}}
                  />
                  <span className="text-xs text-gray-400 font-mono">{formatTime(mediaContext.duration)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-gray-700/30 rounded-lg px-3 py-1.5">
                <button onClick={()=>mediaContext.setVolume(mediaContext.volume===0?50:0)} className="text-gray-400 hover:text-white transition-colors">
                  {mediaContext.volume===0 ? <FaVolumeMute size={11}/> : <FaVolumeUp size={11}/>}
                </button>
                <input type="range" min="0" max="100" value={mediaContext.volume} onChange={(e)=>mediaContext.setVolume(parseInt(e.target.value))}
                  className="w-16 h-1 rounded-full appearance-none cursor-pointer accent-red-500"
                  style={{background:`linear-gradient(to right,#ef4444 0%,#ef4444 ${mediaContext.volume}%,#4b5563 ${mediaContext.volume}%,#4b5563 100%)`}}
                />
                <span className="text-xs text-gray-400 font-mono w-6 text-center">{mediaContext.volume}%</span>
              </div>

              <button onClick={mediaContext.stop} className="text-gray-400 hover:text-red-500 hover:bg-red-500/20 transition-all p-1.5 rounded-lg" title="Cerrar">
                <FaTimes size={13}/>
              </button>
            </div>
          ) : <div />}

          {/* Logo + saludo */}
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right hidden lg:block">
              <p className="text-xs xl:text-sm font-semibold text-emerald-400">{mensaje}</p>
              {configuracion.nombreIglesia && (
                <p className="text-[10px] xl:text-xs text-white/60 truncate max-w-[150px] xl:max-w-none">{configuracion.nombreIglesia}</p>
              )}
            </div>
            <div className="rounded-full p-0.5 bg-gradient-to-br from-emerald-500/25 to-amber-500/25 border border-emerald-500/30">
              <img
                src={configuracion.logoUrl&&configuracion.logoUrl!=="undefined"?configuracion.logoUrl:"/images/icon-256.png"}
                alt="Logo"
                className="w-9 h-9 xl:w-11 xl:h-11 rounded-full object-cover"
                onError={(e)=>{e.target.src="/images/icon-256.png";}}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="relative z-20 flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
        <motion.main
          className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 xl:px-8 py-5 xl:py-7 flex flex-col gap-5 xl:gap-7"
          variants={containerVariants} initial="hidden" animate="visible"
        >

          {/* ── Cita del día ── */}
          {citaDelDia && (
            <motion.section variants={itemVariants} className="text-center">
              <p className="text-base sm:text-lg xl:text-xl text-white/80 italic font-light leading-relaxed max-w-3xl mx-auto">
                "{citaDelDia.texto}"
              </p>
              <p className="text-xs text-white/40 mt-2 font-medium tracking-wide">{citaDelDia.referencia}</p>
            </motion.section>
          )}

          {/* ── Accesos rápidos ── */}
          <motion.section variants={itemVariants}>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 xl:gap-3">
              {accesos.map((item) => (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{scale: 1.03, y: -2}}
                  whileTap={{scale: 0.97}}
                  className={`group relative flex flex-col items-start gap-3 p-4 xl:p-5 rounded-2xl border bg-gradient-to-br ${item.from} ${item.to} ${item.border} backdrop-blur-sm transition-all duration-200 shadow-lg ${item.glow} hover:shadow-xl text-left overflow-hidden`}
                >
                  {/* Glow de fondo en hover */}
                  <div className={`absolute inset-0 ${item.from} opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl blur-sm`} />

                  <div className={`relative shrink-0 w-10 h-10 xl:w-11 xl:h-11 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                    <item.icon className={`${item.iconColor} text-lg xl:text-xl`} />
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <p className="text-sm xl:text-base font-semibold text-white leading-tight">{item.label}</p>
                    <p className="text-[10px] xl:text-xs text-white/45 mt-0.5 leading-tight">{item.sub}</p>
                  </div>

                  <FaArrowRight className={`relative self-end ${item.iconColor} text-[10px] opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200`} />
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* ── Estadísticas ── */}
          <motion.section variants={itemVariants}>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Catálogo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 xl:gap-3">
              {stats.map((s) => (
                <div key={s.label} className={`flex items-center gap-3 xl:gap-4 px-4 xl:px-5 py-3.5 xl:py-4 rounded-2xl border ${s.bg} backdrop-blur-sm`}>
                  <div className={`shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center`}>
                    <s.icon className={`${s.color} text-base`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl xl:text-2xl font-bold text-white leading-none">{s.value}</p>
                    <p className="text-[10px] xl:text-xs text-white/50 mt-0.5 leading-tight truncate">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── Footer ── */}
          <motion.footer variants={itemVariants} className="text-center pb-2">
            <p className="text-white/25 text-xs">
              Desarrollado con <span className="text-emerald-500/60">♥</span> por{" "}
              <span className="text-emerald-400/50 font-medium">Alfredo Hammer</span>
            </p>
          </motion.footer>

        </motion.main>
      </div>
    </div>
  );
};

export default Inicio;
