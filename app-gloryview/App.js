import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import himnosData from './src/data/himnos.json';
import vidaCristianaData from './src/data/vidacristiana.json';
import librosBiblia from './src/data/librosBiblia';

const STORAGE_KEY_LAST_URL = 'gloryview:lastServerBaseUrl';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';

const formatTimeSec = (sec) => {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return '0:00';
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const normalizarBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const extraerUrlDeQr = (data) => {
  const raw = String(data || '').trim();
  if (!raw) return '';

  // Soportar un esquema futuro tipo: gloryview://connect?url=http://ip:3001
  if (raw.startsWith('gloryview://')) {
    try {
      const u = new URL(raw);
      const urlParam = u.searchParams.get('url');
      return urlParam && /^https?:\/\//i.test(urlParam) ? urlParam : '';
    } catch {
      return '';
    }
  }

  return /^https?:\/\//i.test(raw) ? raw : '';
};

const extraerYouTubeId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // 1) Parseo por URL (más confiable en Android/iOS)
  try {
    const u = new URL(raw);
    const host = String(u.hostname || '').toLowerCase();
    const path = String(u.pathname || '');

    if (host.endsWith('youtu.be')) {
      const candidate = path.replace(/^\//, '').split('/')[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) return candidate;
    }

    if (host.includes('youtube.com')) {
      if (path === '/watch') {
        const v = u.searchParams.get('v') || '';
        if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      }

      const parts = path.split('/').filter(Boolean);
      // /embed/<id> | /shorts/<id> | /live/<id>
      if (parts.length >= 2 && ['embed', 'shorts', 'live'].includes(parts[0])) {
        const candidate = parts[1];
        if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) return candidate;
      }
    }
  } catch {
    // Ignorar: puede no ser URL válida
  }

  // 2) Fallback por regex
  const match = raw.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : '';
};

const getYouTubeIdFromItem = (item) => {
  const id =
    extraerYouTubeId(item?.ruta_archivo) ||
    extraerYouTubeId(item?.url) ||
    extraerYouTubeId(item?.url_localhost);
  return id || '';
};

const getYouTubeThumbnailCandidates = (id) => {
  const safe = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(safe)) return [];
  return [
    `https://i.ytimg.com/vi/${safe}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${safe}/mqdefault.jpg`,
  ];
};

const normalizarTipoMultimedia = (item) => {
  const raw = String(item?.tipo || item?.type || '').trim().toLowerCase();
  if (!raw) return 'otros';
  if (raw === 'youtube' || raw.includes('youtube')) return 'video';
  if (raw === 'video' || raw.includes('video')) return 'video';
  if (raw === 'audio' || raw.includes('audio')) return 'audio';
  if (raw === 'imagen' || raw === 'image' || raw.includes('imagen') || raw.includes('image')) return 'imagen';
  return raw;
};

const getThumbCandidatesForItem = (item) => {
  const kind = normalizarTipoMultimedia(item);

  if (kind === 'imagen') {
    const uri = String(item?.url || item?.url_localhost || item?.ruta_archivo || '').trim();
    return uri ? [uri] : [];
  }

  if (kind === 'video') {
    const ytId = getYouTubeIdFromItem(item);
    const yt = getYouTubeThumbnailCandidates(ytId);
    if (yt.length) return yt;

    const miniatura = String(item?.miniatura || '').trim();
    if (miniatura) return [miniatura];
    return [];
  }

  if (kind === 'audio') {
    const miniatura = String(item?.miniatura || '').trim();
    return miniatura ? [miniatura] : [];
  }

  return [];
};

export default function App() {
  const [seccion, setSeccion] = useState('inicio'); // 'inicio' | 'conexion' | 'himnos' | 'biblia' | 'multimedia' | 'presentaciones' | 'fondos' | 'favoritos'
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [serverBaseUrl, setServerBaseUrl] = useState('');
  const [estado, setEstado] = useState({
    status: 'idle',
    message: 'Ingresa la IP del PC y prueba conexión.',
    payload: null,
  });

  const [tipo, setTipo] = useState('himnos'); // 'himnos' | 'vidaCristiana' | 'personal'
  const [busqueda, setBusqueda] = useState('');
  const [himnoSeleccionado, setHimnoSeleccionado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [parrafoProyectando, setParrafoProyectando] = useState(null);

  const [catalogoHimnos, setCatalogoHimnos] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);

  const [favoritosHimnos, setFavoritosHimnos] = useState([]);
  const [cargandoFavoritosHimnos, setCargandoFavoritosHimnos] = useState(false);

  const [favoritosBiblia, setFavoritosBiblia] = useState([]);
  const [cargandoFavoritosBiblia, setCargandoFavoritosBiblia] = useState(false);

  const [permisosCamara, pedirPermisosCamara] = useCameraPermissions();
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [qrBloqueado, setQrBloqueado] = useState(false);

  const [bibliaBusqueda, setBibliaBusqueda] = useState('');
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capitulo, setCapitulo] = useState('');
  const [versiculo, setVersiculo] = useState('');
  const [proyectandoBiblia, setProyectandoBiblia] = useState(false);
  const [bibliaPreview, setBibliaPreview] = useState(null);
  const [cargandoBibliaPreview, setCargandoBibliaPreview] = useState(false);

  const [multimediaFiles, setMultimediaFiles] = useState([]);
  const [cargandoMultimedia, setCargandoMultimedia] = useState(false);
  const [multimediaBusqueda, setMultimediaBusqueda] = useState('');
  const [multimediaFiltro, setMultimediaFiltro] = useState('all'); // all | video | audio | imagen
  const [proyectandoMultimediaId, setProyectandoMultimediaId] = useState(null);
  const [multimediaUltimaProyectada, setMultimediaUltimaProyectada] = useState(null); // { id, nombre, tipo }
  const [controlandoMultimedia, setControlandoMultimedia] = useState(false);
  const [controlandoSoloAudio, setControlandoSoloAudio] = useState(false);
  const [modalControlMultimediaVisible, setModalControlMultimediaVisible] = useState(false);
  const [multimediaSeleccionada, setMultimediaSeleccionada] = useState(null);
  const [destinoControlMultimedia, setDestinoControlMultimedia] = useState('proyector'); // 'proyector' | 'pc'
  const [estadoReproduccion, setEstadoReproduccion] = useState('stopped'); // 'playing' | 'paused' | 'stopped'
  const [ultimoComandoControl, setUltimoComandoControl] = useState(null); // 'play' | 'pause' | 'stop' | 'limpiar' | null
  const [multimediaSesion, setMultimediaSesion] = useState({ id: null, destino: null }); // { id, destino } (persistente)
  const [volumenNivel, setVolumenNivel] = useState(1); // 0..1
  const volumenPrevioRef = useRef(1);
  const multimediaControlInFlightRef = useRef(false);
  const soloAudioControlInFlightRef = useRef(false);
  const pendingMultimediaVolumeRef = useRef(null); // { volume }
  const pendingSoloAudioVolumeRef = useRef(null); // { volume }
  const [multimediaError, setMultimediaError] = useState('');
  const [thumbErrores, setThumbErrores] = useState({});
  const [thumbIntentos, setThumbIntentos] = useState({});

  // Barra progreso (modal reproductor)
  const [multimediaPlaybackStatus, setMultimediaPlaybackStatus] = useState({
    updatedAt: 0,
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: null,
    tipo: null,
  });
  const [seekBarWidth, setSeekBarWidth] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [scrubTime, setScrubTime] = useState(0);

  const [presentacionesSlides, setPresentacionesSlides] = useState([]);
  const [cargandoPresentaciones, setCargandoPresentaciones] = useState(false);
  const [presentacionSeleccionada, setPresentacionSeleccionada] = useState(null);
  const [controlandoPresentacion, setControlandoPresentacion] = useState(false);

  const [fondos, setFondos] = useState([]);
  const [cargandoFondos, setCargandoFondos] = useState(false);
  const [fondoActivoId, setFondoActivoId] = useState(null);
  const [estableciendoFondo, setEstableciendoFondo] = useState(false);

  const conectado = estado.status === 'success';

  const pingUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/ping`;
  }, [serverBaseUrl]);

  const proyectorHimnoUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/proyector/himno`;
  }, [serverBaseUrl]);

  const proyectorBibliaUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/biblia/proyectar`;
  }, [serverBaseUrl]);

  const previewBibliaUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/biblia/preview`;
  }, [serverBaseUrl]);

  const limpiarProyectorUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/proyector/limpiar`;
  }, [serverBaseUrl]);

  const himnosApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    const tipoApi = tipo === 'vidaCristiana' ? 'vida' : tipo === 'personal' ? 'personal' : 'moravo';
    return `${base}/api/himnos?tipo=${tipoApi}`;
  }, [serverBaseUrl, tipo]);

  const himnosFavoritosApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/himnos/favoritos?tipo=all`;
  }, [serverBaseUrl]);

  const bibliaFavoritosApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/biblia/favoritos`;
  }, [serverBaseUrl]);

  const multimediaApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/multimedia`;
  }, [serverBaseUrl]);

  const multimediaProyectarApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/multimedia/proyectar`;
  }, [serverBaseUrl]);

  const multimediaControlApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/multimedia/control`;
  }, [serverBaseUrl]);

  const multimediaStatusApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    const destino = destinoControlMultimedia === 'pc' ? 'pc' : 'proyector';
    return `${base}/api/control/multimedia/status?destino=${destino}`;
  }, [serverBaseUrl, destinoControlMultimedia]);

  const multimediaSoloAudioPlayApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/multimedia/solo-audio/play`;
  }, [serverBaseUrl]);

  const multimediaSoloAudioControlApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/multimedia/solo-audio/control`;
  }, [serverBaseUrl]);

  const presentacionesSlidesApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/presentaciones-slides`;
  }, [serverBaseUrl]);

  const presentacionesSlidesProyectarApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/presentaciones-slides/proyectar`;
  }, [serverBaseUrl]);

  const presentacionesSlidesSiguienteApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/presentaciones-slides/siguiente`;
  }, [serverBaseUrl]);

  const presentacionesSlidesAnteriorApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/presentaciones-slides/anterior`;
  }, [serverBaseUrl]);

  const fondosApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/fondos`;
  }, [serverBaseUrl]);

  const fondoActivoApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/fondos/activo`;
  }, [serverBaseUrl]);

  const resolverUrlMedia = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const base = normalizarBaseUrl(serverBaseUrl);
    if (base && /^https?:\/\/localhost:3001/i.test(raw)) {
      return raw.replace(/^https?:\/\/localhost:3001/i, base);
    }

    if (/^https?:\/\//i.test(raw)) return raw;
    if (!base) return raw;
    if (raw.startsWith('/')) return `${base}${raw}`;
    return `${base}/${raw.replace(/^\/+/, '')}`;
  };

  const ModalVideoPreview = ({ uri }) => {
    const [hasError, setHasError] = useState(false);
    const isHttp = /^http:\/\//i.test(String(uri || '').trim());
    const videoSource = uri && !(IS_EXPO_GO && isHttp) ? uri : null;
    const player = useVideoPlayer(videoSource, (p) => {
      p.loop = true;
      p.muted = true;
      try {
        p.play();
      } catch {
        // noop
      }
    });

    const { status, error } = useEvent(player, 'statusChange', { status: player?.status, error: null });
    const isLoading = status === 'loading' || status === 'idle' || !status;

    useEffect(() => {
      setHasError(false);
      if (!videoSource) return;

      const timeoutId = setTimeout(() => {
        // Si se queda cargando demasiado, caer a placeholder.
        setHasError(true);
      }, 7000);

      return () => clearTimeout(timeoutId);
    }, [videoSource]);

    useEffect(() => {
      if (status === 'error' || Boolean(error)) {
        setHasError(true);
      }
    }, [status, error]);

    if (!uri || !videoSource || hasError || status === 'error' || Boolean(error)) {
      return (
        <View style={styles.thumbFallback}>
          <Ionicons name="videocam" size={18} color="#e2e8f0" />
          <Text style={[styles.thumbFallbackText, { marginTop: 6 }]}>VIDEO</Text>
          {IS_EXPO_GO && isHttp && (
            <Text style={[styles.smallText, { marginTop: 8, textAlign: 'center', maxWidth: 260 }]}
            >
              Vista previa no disponible en Expo Go (HTTP).
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={{ width: '100%', height: '100%' }}>
        <VideoView
          key={uri}
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
        />
        {isLoading && (
          <View style={[styles.thumbFallback, { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
      </View>
    );
  };

  const VideoThumbPreview = ({ uri, label = 'VIDEO' }) => {
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);

    const finalUri = String(uri || '').trim();

    useEffect(() => {
      setHasError(false);
      setLoading(Boolean(finalUri));
      if (!finalUri) return;

      const timeoutId = setTimeout(() => {
        // Evitar loaders eternos en imágenes
        setHasError(true);
        setLoading(false);
      }, 9000);

      return () => clearTimeout(timeoutId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalUri]);

    if (!finalUri || hasError) {
      return (
        <View style={styles.thumbFallback}>
          <Ionicons name="videocam" size={18} color="#e2e8f0" />
          <Text style={[styles.thumbFallbackText, { marginTop: 6 }]}>{label}</Text>
        </View>
      );
    }

    return (
      <View style={{ width: '100%', height: '100%' }}>
        <Image
          source={{ uri: finalUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setHasError(true);
            setLoading(false);
          }}
        />
        {loading && (
          <View style={[styles.thumbFallback, { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)' }]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
      </View>
    );
  };

  const cargarMultimediaPlaybackStatus = async () => {
    if (!multimediaStatusApiUrl) return;
    if (!conectado) return;
    if (!modalControlMultimediaVisible) return;
    if (!multimediaSeleccionada) return;

    const kind = normalizarTipoMultimedia(multimediaSeleccionada);
    if (kind === 'imagen') return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(multimediaStatusApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.status) return;
      if (scrubbingRef.current) return;

      setMultimediaPlaybackStatus((prev) => ({
        ...prev,
        ...(json.status || {}),
      }));
    } catch {
      // Silencioso: no queremos desconectar por esto.
    } finally {
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    scrubbingRef.current = scrubbing;
  }, [scrubbing]);

  useEffect(() => {
    if (!modalControlMultimediaVisible) return;
    if (!conectado) return;
    if (!multimediaSeleccionada) return;
    if (!multimediaStatusApiUrl) return;

    const kind = normalizarTipoMultimedia(multimediaSeleccionada);
    if (kind === 'imagen') return;

    let cancelado = false;
    const tick = async () => {
      if (cancelado) return;
      await cargarMultimediaPlaybackStatus();
    };

    tick();
    const intervalId = setInterval(tick, 900);
    return () => {
      cancelado = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalControlMultimediaVisible, conectado, multimediaSeleccionada, multimediaStatusApiUrl]);

  const FondoThumb = ({ item }) => {
    const [hasError, setHasError] = useState(false);
    const [firstFrameRendered, setFirstFrameRendered] = useState(false);

    const tipo = String(item?.tipo || '').toLowerCase();
    const isVideo = tipo.includes('video');
    const uri = resolverUrlMedia(item?.url || item?.url_localhost);

    const videoSource = isVideo && uri ? uri : null;
    const player = useVideoPlayer(videoSource, (p) => {
      p.loop = false;
      p.muted = true;
      p.pause();
      p.currentTime = 0;
    });

    const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: null });
    const isLoading = isVideo && !firstFrameRendered && status === 'loading';
    const isPlayerError = isVideo && (status === 'error' || Boolean(error));

    if (isVideo) {
      return (
        <View style={styles.thumbWrap}>
          {!hasError && !isPlayerError && Boolean(uri) ? (
            <>
              <VideoView
                player={player}
                style={styles.thumbImage}
                contentFit="cover"
                nativeControls={false}
                onFirstFrameRender={() => setFirstFrameRendered(true)}
              />
              {isLoading && (
                <View style={styles.thumbFallback}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
            </>
          ) : (
            <View style={styles.thumbFallback}>
              <Ionicons name="videocam" size={18} color="#e2e8f0" />
              <Text style={[styles.thumbFallbackText, { marginTop: 2, fontSize: 12 }]}>VID</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.thumbWrap}>
        {!hasError && Boolean(uri) ? (
          <Image
            source={{ uri }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <View style={styles.thumbFallback}>
            <Ionicons name="image" size={18} color="#e2e8f0" />
            <Text style={[styles.thumbFallbackText, { marginTop: 2, fontSize: 12 }]}>IMG</Text>
          </View>
        )}
      </View>
    );
  };

  const dataFallback = useMemo(() => {
    if (tipo === 'personal') return [];
    const base = tipo === 'vidaCristiana' ? vidaCristianaData : himnosData;
    return Array.isArray(base) ? base : [];
  }, [tipo]);

  const dataActual = useMemo(() => {
    if (Array.isArray(catalogoHimnos) && catalogoHimnos.length > 0) {
      return catalogoHimnos;
    }
    return dataFallback;
  }, [catalogoHimnos, dataFallback]);

  const listaFiltrada = useMemo(() => {
    const term = (busqueda || '').trim().toLowerCase();
    const base = Array.isArray(dataActual) ? dataActual : [];

    if (!term) return base;

    return base.filter((h) => {
      const numero = String(h?.numero ?? '').toLowerCase();
      const titulo = String(h?.titulo ?? '').toLowerCase();
      return numero.includes(term) || titulo.includes(term);
    });
  }, [busqueda, dataActual]);

  const cargarCatalogoHimnos = async () => {
    if (!himnosApiUrl) return;
    if (cargandoCatalogo) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setCargandoCatalogo(true);

    try {
      const res = await fetch(himnosApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !Array.isArray(json?.himnos)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      // Normalizar a la forma esperada por la UI: {numero,titulo,parrafos}
      const normalizados = json.himnos
        .map((h) => ({
          numero: h?.numero ?? '',
          titulo: h?.titulo ?? '',
          parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
          fuente: h?.fuente,
          id: h?.id,
          favorito: Boolean(h?.favorito),
        }))
        .filter((h) => String(h.titulo || '').trim());

      setCatalogoHimnos(normalizados);
    } catch (err) {
      // Si falla, se usa fallback local sin romper la app.
      setCatalogoHimnos([]);
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout cargando himnos.'
          : err?.message || 'Error cargando himnos.';
      setEstado((prev) => ({
        ...prev,
        status: prev.status === 'success' ? 'success' : prev.status,
        message: prev.status === 'success' ? prev.message : msg,
      }));
    } finally {
      clearTimeout(timeout);
      setCargandoCatalogo(false);
    }
  };

  useEffect(() => {
    // Recargar catálogo cuando cambie el tipo y estemos en la sección Himnos.
    if (seccion === 'himnos' && !!himnosApiUrl) {
      cargarCatalogoHimnos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, tipo, conectado, himnosApiUrl]);

  // ✅ Auto-refresh: reflejar cambios del escritorio automáticamente
  useEffect(() => {
    if (seccion !== 'himnos') return;
    if (!conectado) return;
    if (!himnosApiUrl) return;

    const intervalId = setInterval(() => {
      cargarCatalogoHimnos();
    }, 15000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, conectado, himnosApiUrl]);

  // ✅ Auto-reconexión: recordar última URL válida
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_LAST_URL);
        if (cancelado) return;
        if (saved && String(saved).trim()) {
          setServerBaseUrl(String(saved));
          // Intentar conectar automáticamente
          setTimeout(() => {
            if (!cancelado) {
              probarConexion(String(saved));
            }
          }, 80);
        }
      } catch {
        // Ignorar errores de storage
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const librosFiltrados = useMemo(() => {
    const q = (bibliaBusqueda || '').trim().toLowerCase();
    if (!q) return librosBiblia;
    return librosBiblia.filter((l) => {
      const nombre = String(l?.nombre ?? '').toLowerCase();
      const id = String(l?.id ?? '').toLowerCase();
      return nombre.includes(q) || id.includes(q);
    });
  }, [bibliaBusqueda]);

  const probarConexion = async (baseOverride) => {
    const base = normalizarBaseUrl(baseOverride ?? serverBaseUrl);
    if (!base) {
      setEstado({
        status: 'error',
        message: 'Falta la URL. Ejemplo: http://192.168.1.10:3001',
        payload: null,
      });
      return;
    }

    const ping = `${base}/api/ping`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    setEstado({ status: 'loading', message: 'Conectando…', payload: null });

    try {
      const res = await fetch(ping, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }

      if (!res.ok || !json?.ok) {
        setEstado({
          status: 'error',
          message: `Respuesta no válida (${res.status}).`,
          payload: json,
        });
        return;
      }

      setEstado({
        status: 'success',
        message: `Conectado: ${json.app} v${json.version}`,
        payload: json,
      });

      // Guardar URL válida para reconexión automática
      try {
        await AsyncStorage.setItem(STORAGE_KEY_LAST_URL, base);
      } catch {
        // ignore
      }

      // Al conectar, refrescar catálogo de himnos.
      setTimeout(() => {
        cargarCatalogoHimnos();
      }, 50);
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout: no respondió en 6s.'
          : err?.message || 'Error de red.';
      setEstado({ status: 'error', message: msg, payload: null });
    } finally {
      clearTimeout(timeout);
    }
  };

  const abrirEscanerQr = async () => {
    setQrBloqueado(false);

    if (!permisosCamara?.granted) {
      const res = await pedirPermisosCamara();
      if (!res?.granted) {
        setEstado((prev) => ({
          ...prev,
          status: 'error',
          message: 'Permiso de cámara denegado.',
        }));
        return;
      }
    }

    setModalQrVisible(true);
  };

  const onQrScanned = async (result) => {
    if (qrBloqueado) return;
    setQrBloqueado(true);

    const url = extraerUrlDeQr(result?.data);
    if (!url) {
      setEstado((prev) => ({
        ...prev,
        status: 'error',
        message: 'QR inválido. Debe contener una URL http://...:3001',
      }));
      setTimeout(() => setQrBloqueado(false), 1000);
      return;
    }

    setModalQrVisible(false);
    setServerBaseUrl(url);
    setSeccion('conexion');

    setTimeout(() => {
      probarConexion(url);
    }, 80);
  };

  const enviarParrafo = async ({ parrafo, titulo, numero, origen }) => {
    if (!proyectorHimnoUrl) {
      setEstado({
        status: 'error',
        message: 'Falta URL del servidor. Vuelve a conectar.',
        payload: null,
      });
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setEnviando(true);

    try {
      const res = await fetch(proyectorHimnoUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parrafo, titulo, numero, origen }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: `Enviado: ${titulo}`,
      }));

      return true;
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout enviando al proyector.'
          : err?.message || 'Error de red.';
      setEstado((prev) => ({ ...prev, status: 'error', message: msg }));
      return false;
    } finally {
      clearTimeout(timeout);
      setEnviando(false);
    }
  };

  const limpiarProyector = async () => {
    if (!limpiarProyectorUrl) {
      setEstado({
        status: 'error',
        message: 'Falta URL del servidor. Vuelve a conectar.',
        payload: null,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(limpiarProyectorUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: 'Proyector limpiado.',
      }));
      setParrafoProyectando(null);
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout limpiando proyector.'
          : err?.message || 'Error de red.';
      setEstado((prev) => ({ ...prev, status: 'error', message: msg }));
    } finally {
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    let cancelado = false;

    if (seccion !== 'biblia') {
      setBibliaPreview(null);
      setCargandoBibliaPreview(false);
      return () => { };
    }

    if (!previewBibliaUrl || !libroSeleccionado?.id) {
      setBibliaPreview(null);
      setCargandoBibliaPreview(false);
      return () => { };
    }

    const cap = Number(capitulo);
    const ver = Number(versiculo);
    if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(ver) || ver <= 0) {
      setBibliaPreview(null);
      setCargandoBibliaPreview(false);
      return () => { };
    }

    const timer = setTimeout(async () => {
      setCargandoBibliaPreview(true);
      try {
        const res = await fetch(previewBibliaUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            libroId: libroSeleccionado.id,
            capitulo: cap,
            versiculo: ver,
          }),
        });

        const json = await res.json().catch(() => null);
        if (cancelado) return;
        if (!res.ok || !json?.ok) {
          setBibliaPreview(null);
          return;
        }

        setBibliaPreview(json.data || null);
      } catch {
        if (!cancelado) setBibliaPreview(null);
      } finally {
        if (!cancelado) setCargandoBibliaPreview(false);
      }
    }, 280);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [seccion, previewBibliaUrl, libroSeleccionado?.id, capitulo, versiculo]);

  const enviarVersiculo = async ({ cap, ver }) => {
    if (!proyectorBibliaUrl) {
      setEstado({
        status: 'error',
        message: 'Falta URL del servidor. Ve a Conexión.',
        payload: null,
      });
      return;
    }

    if (!libroSeleccionado?.id) {
      setEstado({ status: 'error', message: 'Selecciona un libro.', payload: null });
      return;
    }

    if (!Number.isFinite(cap) || cap <= 0) {
      setEstado({ status: 'error', message: 'Capítulo inválido.', payload: null });
      return;
    }
    if (!Number.isFinite(ver) || ver <= 0) {
      setEstado({ status: 'error', message: 'Versículo inválido.', payload: null });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setProyectandoBiblia(true);

    try {
      const res = await fetch(proyectorBibliaUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          libroId: libroSeleccionado.id,
          capitulo: cap,
          versiculo: ver,
        }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: `Enviado: ${libroSeleccionado.nombre} ${cap}:${ver}`,
      }));
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout enviando a Biblia.'
          : err?.message || 'Error de red.';
      setEstado((prev) => ({ ...prev, status: 'error', message: msg }));
    } finally {
      clearTimeout(timeout);
      setProyectandoBiblia(false);
    }
  };

  const proyectarVersiculo = async () => {
    Keyboard.dismiss();
    const cap = Number(capitulo);
    const ver = Number(versiculo);
    await enviarVersiculo({ cap, ver });
  };

  const proyectarVersiculoAnterior = async () => {
    Keyboard.dismiss();
    const cap = Number(capitulo);
    const ver = Number(versiculo);
    if (!Number.isFinite(ver) || ver <= 1) {
      setEstado({ status: 'error', message: 'No hay versículo anterior.', payload: null });
      return;
    }
    const nuevo = ver - 1;
    setVersiculo(String(nuevo));
    await enviarVersiculo({ cap, ver: nuevo });
  };

  const proyectarVersiculoSiguiente = async () => {
    Keyboard.dismiss();
    const cap = Number(capitulo);
    const ver = Number(versiculo);
    if (!Number.isFinite(ver) || ver <= 0) {
      setEstado({ status: 'error', message: 'Versículo inválido.', payload: null });
      return;
    }
    const nuevo = ver + 1;
    setVersiculo(String(nuevo));
    await enviarVersiculo({ cap, ver: nuevo });
  };

  const fetchJsonTimeout = async (url, options = {}) => {
    const timeoutMs = options.timeoutMs ?? 12000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      return { res, json };
    } finally {
      clearTimeout(timeout);
    }
  };

  const reportarErrorSinDesconectar = (msg) => {
    setEstado((prev) => ({
      ...prev,
      status: prev.status === 'success' ? 'success' : 'error',
      message: msg,
    }));
  };

  const cargarFavoritosHimnos = async () => {
    if (!himnosFavoritosApiUrl) return;
    if (cargandoFavoritosHimnos) return;

    setCargandoFavoritosHimnos(true);
    try {
      const { res, json } = await fetchJsonTimeout(himnosFavoritosApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });

      if (!res.ok || !json?.ok || !Array.isArray(json?.himnos)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      const normalizados = json.himnos
        .map((h) => ({
          numero: h?.numero ?? '',
          titulo: h?.titulo ?? '',
          parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
          fuente: h?.fuente,
          id: h?.id,
          favorito: Boolean(h?.favorito),
        }))
        .filter((h) => String(h.titulo || '').trim() && Boolean(h?.favorito));

      setFavoritosHimnos(normalizados);
    } catch (err) {
      setFavoritosHimnos([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando favoritos de himnos.' : err?.message || 'Error cargando favoritos de himnos.',
      );
    } finally {
      setCargandoFavoritosHimnos(false);
    }
  };

  const cargarFavoritosBiblia = async () => {
    if (!bibliaFavoritosApiUrl) return;
    if (cargandoFavoritosBiblia) return;

    setCargandoFavoritosBiblia(true);
    try {
      const { res, json } = await fetchJsonTimeout(bibliaFavoritosApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });

      if (!res.ok || !json?.ok || !Array.isArray(json?.favoritos)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      const normalizados = json.favoritos
        .map((f) => ({
          id: String(f?.id || '').trim(),
          libroId: String(f?.libroId || '').trim(),
          libroNombre: String(f?.libroNombre || '').trim(),
          capitulo: Number(f?.capitulo) || null,
          versiculo: Number(f?.versiculo) || null,
          texto: typeof f?.texto === 'string' ? f.texto : '',
        }))
        .filter((f) => Boolean(f.id));

      setFavoritosBiblia(normalizados);
    } catch (err) {
      setFavoritosBiblia([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando favoritos de Biblia.' : err?.message || 'Error cargando favoritos de Biblia.',
      );
    } finally {
      setCargandoFavoritosBiblia(false);
    }
  };

  const toggleFavoritoBiblia = async ({ id, libroId, libroNombre, cap, ver, texto }) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;

    const explicitId = String(id || '').trim();
    const lId = String(libroId || '').trim();
    const c = Number(cap);
    const v = Number(ver);

    const resolvedId = explicitId
      ? explicitId
      : lId && Number.isFinite(c) && c > 0 && Number.isFinite(v) && v > 0
        ? `rv60:${lId}:${c}:${v}`
        : '';

    if (!resolvedId) return;

    const url = `${base}/api/biblia/${encodeURIComponent(resolvedId)}/favorito`;
    const exists = (Array.isArray(favoritosBiblia) ? favoritosBiblia : []).some((f) => String(f?.id) === resolvedId);
    const nextFav = !exists;

    // Para agregar, sí o sí necesitamos datos de referencia
    if (nextFav) {
      if (!lId || !Number.isFinite(c) || c <= 0 || !Number.isFinite(v) || v <= 0) return;
    }

    // Optimista
    setFavoritosBiblia((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      if (nextFav) {
        const item = {
          id: resolvedId,
          libroId: lId,
          libroNombre: String(libroNombre || '').trim(),
          capitulo: c,
          versiculo: v,
          texto: typeof texto === 'string' ? texto : '',
        };
        return [item, ...arr.filter((f) => String(f?.id) !== resolvedId)];
      }
      return arr.filter((f) => String(f?.id) !== resolvedId);
    });

    try {
      const { res, json } = await fetchJsonTimeout(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          nextFav
            ? {
              favorito: true,
              libroId: lId,
              libroNombre: String(libroNombre || '').trim(),
              capitulo: c,
              versiculo: v,
              texto: typeof texto === 'string' ? texto : '',
            }
            : { favorito: false },
        ),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout actualizando favorito de Biblia.' : err?.message || 'Error actualizando favorito de Biblia.',
      );
      if (seccion === 'favoritos' || seccion === 'biblia') {
        cargarFavoritosBiblia();
      }
    }
  };

  const toggleFavoritoHimno = async (item) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    const id = String(item?.id || '').trim();
    if (!base || !id) return;

    const url = `${base}/api/himnos/${encodeURIComponent(id)}/favorito`;
    const nextFav = !Boolean(item?.favorito);

    // Optimista
    setCatalogoHimnos((prev) =>
      (Array.isArray(prev) ? prev : []).map((h) =>
        String(h?.id) === String(id) ? { ...h, favorito: nextFav } : h,
      ),
    );
    setHimnoSeleccionado((prev) =>
      prev && String(prev?.id) === String(id) ? { ...prev, favorito: nextFav } : prev,
    );
    setFavoritosHimnos((prev) => {
      const baseArr = Array.isArray(prev) ? prev : [];
      if (nextFav) {
        const exists = baseArr.some((h) => String(h?.id) === String(id));
        if (exists) return baseArr.map((h) => (String(h?.id) === String(id) ? { ...h, favorito: true } : h));
        return [{ ...item, id, favorito: true }, ...baseArr];
      }
      return baseArr.filter((h) => String(h?.id) !== String(id));
    });

    try {
      const { res, json } = await fetchJsonTimeout(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorito: nextFav }),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      // Nada extra: ya quedó optimista.
    } catch (err) {
      // Rollback simple: recargar catálogo si estamos conectados
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout actualizando favorito de himno.' : err?.message || 'Error actualizando favorito de himno.',
      );
      if (seccion === 'himnos') {
        cargarCatalogoHimnos();
      }
      if (seccion === 'favoritos') {
        cargarFavoritosHimnos();
      }
    }
  };

  const cargarMultimedia = async () => {
    if (!multimediaApiUrl) return;
    if (cargandoMultimedia) return;
    setCargandoMultimedia(true);
    setMultimediaError('');
    try {
      const { res, json } = await fetchJsonTimeout(multimediaApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 30000,
      });
      if (!res.ok || !json?.ok || !Array.isArray(json?.multimedia)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      setMultimediaFiles(json.multimedia);
    } catch (err) {
      setMultimediaFiles([]);
      const msg =
        err?.name === 'AbortError'
          ? 'Timeout cargando multimedia.'
          : err?.message || 'Error cargando multimedia.';
      setMultimediaError(msg);
      reportarErrorSinDesconectar(
        msg,
      );
    } finally {
      setCargandoMultimedia(false);
    }
  };

  const proyectarMultimedia = async (item) => {
    if (!multimediaProyectarApiUrl) return;
    if (!item?.id) return;

    setProyectandoMultimediaId(item.id);
    try {
      const { res, json } = await fetchJsonTimeout(multimediaProyectarApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: item.id }),
        timeoutMs: 15000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      // Guardar referencia para mostrar controles.
      setMultimediaUltimaProyectada({
        id: item.id,
        nombre: String(item?.nombre || 'Multimedia'),
        tipo: String(item?.tipo || ''),
        url: String(item?.url || ''),
        url_localhost: String(item?.url_localhost || ''),
      });

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: `Proyectando: ${String(item?.nombre || 'Multimedia')}`,
      }));

      return true;
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout proyectando multimedia.' : err?.message || 'Error proyectando multimedia.',
      );

      return false;
    } finally {
      setProyectandoMultimediaId(null);
    }
  };

  const controlarMultimedia = async (action, extraPayload = null) => {
    if (!multimediaControlApiUrl) return;
    if (!conectado) return;

    const prevEstadoReproduccion = estadoReproduccion;
    const prevMultimediaSesion = multimediaSesion;
    const prevUltimoComando = ultimoComandoControl;
    const prevVolumenNivel = volumenNivel;

    // Evitar que el volumen/mute se "pierda" si el usuario toca rápido tras Play/Pause.
    // Si hay un request en vuelo, encolamos el último volumen y lo enviamos al terminar.
    if (multimediaControlInFlightRef.current) {
      if (action === 'volume' && typeof extraPayload?.volume === 'number') {
        pendingMultimediaVolumeRef.current = { volume: Number(extraPayload.volume) };
      }
      return;
    }

    // Estado local optimista: actualizar UI sin esperar al roundtrip HTTP.
    if (action === 'play') setEstadoReproduccion('playing');
    if (action === 'pause') setEstadoReproduccion('paused');
    // En Proyector, "stop" se comporta como pausa (no reinicia al inicio).
    if (action === 'stop') setEstadoReproduccion('paused');
    if (action === 'limpiar') setEstadoReproduccion('stopped');
    if (action === 'play' || action === 'pause' || action === 'stop' || action === 'limpiar') {
      setUltimoComandoControl(action);
    }

    // Mantener sesión para que el usuario pueda volver a controlar luego.
    if (action === 'limpiar') {
      setMultimediaSesion({ id: null, destino: null });
    } else if (action === 'play' || action === 'pause' || action === 'stop') {
      const candidateId =
        (multimediaSesion?.destino === 'proyector' ? multimediaSesion?.id : null) ??
        multimediaSeleccionada?.id ??
        multimediaUltimaProyectada?.id ??
        multimediaSesion?.id ??
        null;
      setMultimediaSesion({ id: candidateId, destino: 'proyector' });
    }

    if (action === 'volume' && typeof extraPayload?.volume === 'number') {
      const v = Math.max(0, Math.min(1, Number(extraPayload.volume)));
      setVolumenNivel(v);
      if (v > 0) volumenPrevioRef.current = v;
    }

    multimediaControlInFlightRef.current = true;
    setControlandoMultimedia(true);
    try {
      const { res, json } = await fetchJsonTimeout(multimediaControlApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...(extraPayload || {}) }),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      // Estado local (optimista) para habilitar/deshabilitar botones.
      if (action === 'play') setEstadoReproduccion('playing');
      if (action === 'pause') setEstadoReproduccion('paused');
      // En Proyector, "stop" se comporta como pausa (no reinicia al inicio).
      if (action === 'stop') setEstadoReproduccion('paused');
      if (action === 'limpiar') setEstadoReproduccion('stopped');
      if (action === 'play' || action === 'pause' || action === 'stop' || action === 'limpiar') {
        setUltimoComandoControl(action);
      }

      // Mantener sesión para que el usuario pueda volver a controlar luego.
      if (action === 'limpiar') {
        setMultimediaSesion({ id: null, destino: null });
      } else if (action === 'play' || action === 'pause' || action === 'stop') {
        const candidateId =
          (multimediaSesion?.destino === 'proyector' ? multimediaSesion?.id : null) ??
          multimediaSeleccionada?.id ??
          multimediaUltimaProyectada?.id ??
          multimediaSesion?.id ??
          null;
        setMultimediaSesion({ id: candidateId, destino: 'proyector' });
      }
      if (action === 'volume' && typeof extraPayload?.volume === 'number') {
        const v = Math.max(0, Math.min(1, Number(extraPayload.volume)));
        setVolumenNivel(v);
        if (v > 0) volumenPrevioRef.current = v;
      }

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message:
          action === 'play'
            ? 'Reproduciendo…'
            : action === 'pause'
              ? 'Pausado.'
              : action === 'stop'
                ? 'Detenido.'
                : action === 'limpiar'
                  ? 'Limpio.'
                  : 'Comando enviado.',
      }));

      return true;
    } catch (err) {
      // Revertir UI optimista si falló.
      setEstadoReproduccion(prevEstadoReproduccion);
      setMultimediaSesion(prevMultimediaSesion);
      setUltimoComandoControl(prevUltimoComando);
      setVolumenNivel(prevVolumenNivel);

      reportarErrorSinDesconectar(
        err?.name === 'AbortError'
          ? 'Timeout controlando multimedia.'
          : err?.message || 'Error controlando multimedia.',
      );

      return false;
    } finally {
      multimediaControlInFlightRef.current = false;
      setControlandoMultimedia(false);

      const pending = pendingMultimediaVolumeRef.current;
      pendingMultimediaVolumeRef.current = null;
      if (pending && typeof pending.volume === 'number') {
        // Ejecutar en el próximo tick para evitar competir con el setState.
        setTimeout(() => {
          controlarMultimedia('volume', pending);
        }, 0);
      }
    }
  };

  const reproducirSoloAudioEnPC = async (item) => {
    if (!multimediaSoloAudioPlayApiUrl) return;
    if (!conectado) return;
    if (controlandoSoloAudio) return;

    const kind = item ? normalizarTipoMultimedia(item) : null;
    if (!item?.id || kind === 'imagen') return;

    setControlandoSoloAudio(true);
    try {
      const { res, json } = await fetchJsonTimeout(multimediaSoloAudioPlayApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: item.id }),
        timeoutMs: 15000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setDestinoControlMultimedia('pc');
      setEstadoReproduccion('playing');
      setUltimoComandoControl('play');
      setMultimediaSesion({ id: item.id, destino: 'pc' });
      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: 'Reproduciendo en PC (solo audio)…',
      }));
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError'
          ? 'Timeout reproduciendo solo audio (PC).'
          : err?.message || 'Error reproduciendo solo audio (PC).',
      );
    } finally {
      setControlandoSoloAudio(false);
    }
  };

  const controlarSoloAudioEnPC = async (action, extraPayload = null) => {
    if (!multimediaSoloAudioControlApiUrl) return;
    if (!conectado) return;

    if (soloAudioControlInFlightRef.current) {
      if (action === 'volume' && typeof extraPayload?.volume === 'number') {
        pendingSoloAudioVolumeRef.current = { volume: Number(extraPayload.volume) };
      }
      return;
    }

    soloAudioControlInFlightRef.current = true;
    setControlandoSoloAudio(true);
    try {
      const { res, json } = await fetchJsonTimeout(multimediaSoloAudioControlApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...(extraPayload || {}) }),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      if (action === 'play') setEstadoReproduccion('playing');
      if (action === 'pause') setEstadoReproduccion('paused');
      if (action === 'stop' || action === 'limpiar') setEstadoReproduccion('stopped');
      if (action === 'play' || action === 'pause' || action === 'stop' || action === 'limpiar') {
        setUltimoComandoControl(action);
      }

      if (action === 'stop' || action === 'limpiar') {
        setMultimediaSesion({ id: null, destino: null });
      } else if (action === 'play' || action === 'pause') {
        const candidateId =
          (multimediaSesion?.destino === 'pc' ? multimediaSesion?.id : null) ??
          multimediaSeleccionada?.id ??
          multimediaSesion?.id ??
          null;
        setMultimediaSesion({ id: candidateId, destino: 'pc' });
      }
      if (action === 'volume' && typeof extraPayload?.volume === 'number') {
        const v = Math.max(0, Math.min(1, Number(extraPayload.volume)));
        setVolumenNivel(v);
        if (v > 0) volumenPrevioRef.current = v;
      }

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message:
          action === 'play'
            ? 'Reproduciendo…'
            : action === 'pause'
              ? 'Pausado.'
              : action === 'stop'
                ? 'Detenido.'
                : action === 'limpiar'
                  ? 'Limpio.'
                  : 'Comando enviado.',
      }));
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError'
          ? 'Timeout controlando solo audio (PC).'
          : err?.message || 'Error controlando solo audio (PC).',
      );
    } finally {
      soloAudioControlInFlightRef.current = false;
      setControlandoSoloAudio(false);

      const pending = pendingSoloAudioVolumeRef.current;
      pendingSoloAudioVolumeRef.current = null;
      if (pending && typeof pending.volume === 'number') {
        setTimeout(() => {
          controlarSoloAudioEnPC('volume', pending);
        }, 0);
      }
    }
  };

  const controlarMultimediaEnDestino = async (action, extraPayload = null) => {
    if (destinoControlMultimedia === 'pc') {
      return controlarSoloAudioEnPC(action, extraPayload);
    }
    return controlarMultimedia(action, extraPayload);
  };

  const limpiarProyectorTotal = async () => {
    if (!limpiarProyectorUrl) return;
    if (!conectado) return;
    if (controlandoMultimedia) return;

    setControlandoMultimedia(true);
    try {
      const { res, json } = await fetchJsonTimeout(limpiarProyectorUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      // Reset local del control del Proyector.
      setEstadoReproduccion('stopped');
      setUltimoComandoControl('limpiar');
      setMultimediaSesion({ id: null, destino: null });

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: 'Proyector limpiado.',
      }));
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError'
          ? 'Timeout limpiando proyector.'
          : err?.message || 'Error limpiando proyector.',
      );
    } finally {
      setControlandoMultimedia(false);
    }
  };

  const abrirModalMultimedia = (item) => {
    Keyboard.dismiss();
    setMultimediaSeleccionada(item);

    setScrubbing(false);
    scrubbingRef.current = false;
    setScrubTime(0);

    // No resetear estado/destino: el usuario puede estar reproduciendo (PC o Proyector)
    // y debe poder volver y seguir controlando.
    if (multimediaSesion?.destino && multimediaSesion.destino !== destinoControlMultimedia) {
      setDestinoControlMultimedia(multimediaSesion.destino);
    }
    setModalControlMultimediaVisible(true);
  };

  const proyectarYReproducirMultimedia = async () => {
    const item = multimediaSeleccionada;
    if (!item?.id) return;

    setDestinoControlMultimedia('proyector');

    await proyectarMultimedia(item);

    const kind = normalizarTipoMultimedia(item);
    if (kind === 'audio' || kind === 'video') {
      await controlarMultimedia('play');
    }
  };

  const aplicarVolumen = async (nextVolume) => {
    const v = Math.max(0, Math.min(1, Number(nextVolume)));
    setVolumenNivel(v);
    if (v > 0) volumenPrevioRef.current = v;

    // Si hay una sesión activa, el volumen debe ir al destino real de esa sesión
    // aunque el usuario tenga seleccionado el otro tab.
    const destinoSesion = multimediaSesion?.destino;
    const destinoEfectivo =
      destinoSesion && estadoReproduccion !== 'stopped' ? destinoSesion : destinoControlMultimedia;
    if (destinoEfectivo !== destinoControlMultimedia) {
      setDestinoControlMultimedia(destinoEfectivo);
    }

    if (destinoEfectivo === 'pc') {
      await controlarSoloAudioEnPC('volume', { volume: v });
    } else {
      await controlarMultimedia('volume', { volume: v });
    }
  };

  const toggleMute = async () => {
    if (volumenNivel > 0) {
      volumenPrevioRef.current = volumenNivel;
      await aplicarVolumen(0);
    } else {
      const restore = typeof volumenPrevioRef.current === 'number' ? volumenPrevioRef.current : 1;
      await aplicarVolumen(restore > 0 ? restore : 1);
    }
  };

  const toggleFavoritoMultimedia = async (item) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base || !item?.id) return;

    const url = `${base}/api/multimedia/${item.id}/favorito`;
    const nextFav = !Boolean(item.favorito);

    try {
      const { res, json } = await fetchJsonTimeout(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorito: nextFav }),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setMultimediaFiles((prev) =>
        (Array.isArray(prev) ? prev : []).map((m) =>
          String(m?.id) === String(item.id) ? { ...m, favorito: nextFav } : m,
        ),
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout actualizando favorito.' : err?.message || 'Error actualizando favorito.',
      );
    }
  };

  const cargarPresentacionesSlides = async () => {
    if (!presentacionesSlidesApiUrl) return;
    if (cargandoPresentaciones) return;
    setCargandoPresentaciones(true);
    try {
      const { res, json } = await fetchJsonTimeout(presentacionesSlidesApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok || !Array.isArray(json?.presentaciones)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      setPresentacionesSlides(json.presentaciones);
    } catch (err) {
      setPresentacionesSlides([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando presentaciones.' : err?.message || 'Error cargando presentaciones.',
      );
    } finally {
      setCargandoPresentaciones(false);
    }
  };

  const proyectarPresentacion = async () => {
    if (!presentacionesSlidesProyectarApiUrl || !presentacionSeleccionada?.id) return;
    if (controlandoPresentacion) return;

    setControlandoPresentacion(true);
    try {
      const { res, json } = await fetchJsonTimeout(presentacionesSlidesProyectarApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: presentacionSeleccionada.id }),
        timeoutMs: 20000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setPresentacionSeleccionada((prev) =>
        prev ? { ...prev, slide_actual: json.slideIndex ?? prev.slide_actual } : prev,
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout proyectando presentación.' : err?.message || 'Error proyectando presentación.',
      );
    } finally {
      setControlandoPresentacion(false);
    }
  };

  const siguienteSlidePresentacion = async () => {
    if (!presentacionesSlidesSiguienteApiUrl || !presentacionSeleccionada?.id) return;
    if (controlandoPresentacion) return;

    setControlandoPresentacion(true);
    try {
      const { res, json } = await fetchJsonTimeout(presentacionesSlidesSiguienteApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: presentacionSeleccionada.id }),
        timeoutMs: 20000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setPresentacionSeleccionada((prev) =>
        prev ? { ...prev, slide_actual: json.slideIndex ?? prev.slide_actual } : prev,
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cambiando slide.' : err?.message || 'Error cambiando slide.',
      );
    } finally {
      setControlandoPresentacion(false);
    }
  };

  const anteriorSlidePresentacion = async () => {
    if (!presentacionesSlidesAnteriorApiUrl || !presentacionSeleccionada?.id) return;
    if (controlandoPresentacion) return;

    setControlandoPresentacion(true);
    try {
      const { res, json } = await fetchJsonTimeout(presentacionesSlidesAnteriorApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: presentacionSeleccionada.id }),
        timeoutMs: 20000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setPresentacionSeleccionada((prev) =>
        prev ? { ...prev, slide_actual: json.slideIndex ?? prev.slide_actual } : prev,
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cambiando slide.' : err?.message || 'Error cambiando slide.',
      );
    } finally {
      setControlandoPresentacion(false);
    }
  };

  const toggleFavoritoPresentacion = async (item) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base || !item?.id) return;

    const url = `${base}/api/presentaciones-slides/${item.id}/favorito`;
    const nextFav = !Boolean(item.favorito);

    try {
      const { res, json } = await fetchJsonTimeout(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorito: nextFav }),
        timeoutMs: 12000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setPresentacionesSlides((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          String(p?.id) === String(item.id) ? { ...p, favorito: nextFav } : p,
        ),
      );

      setPresentacionSeleccionada((prev) =>
        prev && String(prev?.id) === String(item.id) ? { ...prev, favorito: nextFav } : prev,
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout actualizando favorito.' : err?.message || 'Error actualizando favorito.',
      );
    }
  };

  const cargarFondos = async () => {
    if (!fondosApiUrl) return;
    if (cargandoFondos) return;
    setCargandoFondos(true);
    try {
      const { res, json } = await fetchJsonTimeout(fondosApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok || !Array.isArray(json?.fondos)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setFondos(json.fondos);
      const activo = json.fondos.find((f) => Boolean(f?.activo));
      setFondoActivoId(activo?.id ?? null);
    } catch (err) {
      setFondos([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando fondos.' : err?.message || 'Error cargando fondos.',
      );
    } finally {
      setCargandoFondos(false);
    }
  };

  const activarFondo = async (item) => {
    if (!fondoActivoApiUrl || !item?.id) return;
    if (estableciendoFondo) return;
    setEstableciendoFondo(true);
    try {
      const { res, json } = await fetchJsonTimeout(fondoActivoApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: item.id }),
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setFondoActivoId(item.id);
      setFondos((prev) =>
        (Array.isArray(prev) ? prev : []).map((f) => ({
          ...f,
          activo: String(f?.id) === String(item.id),
        })),
      );
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cambiando fondo.' : err?.message || 'Error cambiando fondo.',
      );
    } finally {
      setEstableciendoFondo(false);
    }
  };

  const multimediaFiltrada = useMemo(() => {
    const term = (multimediaBusqueda || '').trim().toLowerCase();
    const base = Array.isArray(multimediaFiles) ? multimediaFiles : [];
    return base.filter((m) => {
      if (multimediaFiltro !== 'all' && normalizarTipoMultimedia(m) !== multimediaFiltro) return false;
      if (!term) return true;
      const nombre = String(m?.nombre || '').toLowerCase();
      const tipo = String(m?.tipo || '').toLowerCase();
      const tipoNorm = normalizarTipoMultimedia(m);
      return nombre.includes(term) || tipo.includes(term) || String(tipoNorm).includes(term);
    });
  }, [multimediaBusqueda, multimediaFiles, multimediaFiltro]);

  const favoritosMultimedia = useMemo(
    () => (Array.isArray(multimediaFiles) ? multimediaFiles : []).filter((m) => Boolean(m?.favorito)),
    [multimediaFiles],
  );

  const favoritosPresentaciones = useMemo(
    () => (Array.isArray(presentacionesSlides) ? presentacionesSlides : []).filter((p) => Boolean(p?.favorito)),
    [presentacionesSlides],
  );

  const favoritosBibliaIds = useMemo(() => {
    const ids = new Set();
    (Array.isArray(favoritosBiblia) ? favoritosBiblia : []).forEach((f) => {
      const id = String(f?.id || '').trim();
      if (id) ids.add(id);
    });
    return ids;
  }, [favoritosBiblia]);

  useEffect(() => {
    if (!conectado) return;

    if (seccion === 'biblia') {
      cargarFavoritosBiblia();
    }
    if (seccion === 'multimedia') {
      cargarMultimedia();
    }
    if (seccion === 'presentaciones') {
      cargarPresentacionesSlides();
    }
    if (seccion === 'fondos') {
      cargarFondos();
    }
    if (seccion === 'favoritos') {
      if (!multimediaFiles.length) cargarMultimedia();
      if (!presentacionesSlides.length) cargarPresentacionesSlides();
      cargarFavoritosHimnos();
      cargarFavoritosBiblia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, conectado]);

  useEffect(() => {
    if (seccion !== 'multimedia') {
      setMultimediaError('');
    }
    if (!conectado) {
      setMultimediaError('');
    }
  }, [seccion, conectado]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => setMenuAbierto(true)}
              style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
              hitSlop={10}
            >
              <Text style={styles.menuButtonText}>≡</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>GloryView Remote</Text>
              <Text style={styles.subtitle}>
                {conectado ? 'Conectado al PC' : 'Sin conexión'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                conectado ? styles.badgeSuccess : styles.badgeMuted,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  conectado ? styles.badgeTextSuccess : styles.badgeTextMuted,
                ]}
              >
                {conectado ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>

            <Pressable
              onPress={limpiarProyector}
              disabled={!conectado}
              style={({ pressed }) => [
                styles.limpiarButton,
                !conectado && styles.buttonDisabled,
                pressed && conectado && styles.buttonPressed,
              ]}
              hitSlop={10}
            >
              <Text style={styles.limpiarButtonText}>Limpiar</Text>
            </Pressable>
          </View>

          {menuAbierto && (
            <View style={styles.drawerContainer}>
              <View style={styles.drawer}>
                <Text style={styles.drawerTitle}>Menú</Text>

                <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                  <Pressable
                    onPress={() => {
                      setSeccion('inicio');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'inicio' && styles.drawerItemActive,
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Text style={[styles.drawerItemText, seccion === 'inicio' && styles.drawerItemTextActive]}>
                      Inicio
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('conexion');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'conexion' && styles.drawerItemActive,
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Text style={[styles.drawerItemText, seccion === 'conexion' && styles.drawerItemTextActive]}>
                      Conexión
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('himnos');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'himnos' && styles.drawerItemActive,
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Text style={[styles.drawerItemText, seccion === 'himnos' && styles.drawerItemTextActive]}>
                      Himnos
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('biblia');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'biblia' && styles.drawerItemActive,
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Text style={[styles.drawerItemText, seccion === 'biblia' && styles.drawerItemTextActive]}>
                      Biblia
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>

              <Pressable
                style={styles.drawerBackdrop}
                onPress={() => setMenuAbierto(false)}
              />
            </View>
          )}

          <View style={styles.content}>
            {seccion === 'inicio' && (
              <ScrollView contentContainerStyle={{ paddingBottom: 14 }} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Inicio</Text>
                  <Text style={styles.smallText}>Accesos rápidos a las funciones principales.</Text>

                  <View style={styles.homeGrid}>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('conexion');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.08)', 'rgba(148,163,184,0.10)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Conexión</Text>
                        <Text style={styles.homeCardSubtitle}>Escanear QR, pegar IP y probar servidor.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('himnos');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(16,185,129,0.22)', 'rgba(16,185,129,0.12)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Himnos</Text>
                        <Text style={styles.homeCardSubtitle}>Buscar y proyectar párrafos rápidamente.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('biblia');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(59,130,246,0.22)', 'rgba(59,130,246,0.10)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Biblia</Text>
                        <Text style={styles.homeCardSubtitle}>Referencia + vista previa (anterior/actual/siguiente).</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('multimedia');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(16,185,129,0.18)', 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Multimedia</Text>
                        <Text style={styles.homeCardSubtitle}>Proyectar videos, audios e imágenes.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('presentaciones');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(59,130,246,0.18)', 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Presentaciones</Text>
                        <Text style={styles.homeCardSubtitle}>Proyectar y controlar slides.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('fondos');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.10)', 'rgba(148,163,184,0.10)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Fondos</Text>
                        <Text style={styles.homeCardSubtitle}>Cambiar el fondo del proyector.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('favoritos');
                      }}
                      style={({ pressed }) => [styles.homeCard, pressed && styles.homeCardPressed]}
                    >
                      <LinearGradient
                        colors={['rgba(16,185,129,0.16)', 'rgba(59,130,246,0.10)', 'rgba(0,0,0,0.18)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.homeCardGradient}
                      >
                        <Text style={styles.homeCardTitle}>Favoritos</Text>
                        <Text style={styles.homeCardSubtitle}>Accesos rápidos a tus elementos guardados.</Text>
                        <Text style={styles.homeCardCta}>Abrir</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}

            {seccion === 'conexion' && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Conexión</Text>
                <Text style={styles.smallText}>Escanea el QR o pega la URL.</Text>

                <Pressable
                  onPress={abrirEscanerQr}
                  style={({ pressed }) => [
                    styles.buttonSecondary,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonSecondaryText}>Escanear QR</Text>
                </Pressable>

                <TextInput
                  value={serverBaseUrl}
                  onChangeText={setServerBaseUrl}
                  placeholder="http://192.168.1.10:3001"
                  placeholderTextColor="#7c7c7c"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                />

                <Pressable
                  onPress={() => probarConexion()}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    estado.status === 'loading' && styles.buttonDisabled,
                  ]}
                  disabled={estado.status === 'loading'}
                >
                  {estado.status === 'loading' ? (
                    <View style={styles.row}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.buttonText}>Probando…</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Probar conexión</Text>
                  )}
                </Pressable>

                <View style={styles.statusBox}>
                  <Text
                    style={[
                      styles.statusText,
                      estado.status === 'success' && styles.statusSuccess,
                      estado.status === 'error' && styles.statusError,
                    ]}
                  >
                    {estado.message}
                  </Text>
                  {!!pingUrl && <Text style={styles.smallText}>Ping: {pingUrl}</Text>}
                </View>
              </View>
            )}

            {seccion === 'himnos' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                {himnoSeleccionado ? (
                  <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle} numberOfLines={1}>
                        {himnoSeleccionado.numero}. {himnoSeleccionado.titulo}
                      </Text>
                      <View style={styles.row}>
                        <Pressable
                          onPress={() => toggleFavoritoHimno(himnoSeleccionado)}
                          disabled={!conectado || !himnoSeleccionado?.id}
                          style={({ pressed }) => [
                            styles.iconButton,
                            (!conectado || !himnoSeleccionado?.id) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                          hitSlop={8}
                        >
                          <Text style={[styles.iconButtonText, himnoSeleccionado?.favorito && styles.iconButtonTextActive]}>
                            {himnoSeleccionado?.favorito ? '★' : '☆'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setHimnoSeleccionado(null);
                            setParrafoProyectando(null);
                          }}
                          style={({ pressed }) => [
                            styles.smallButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonText}>Volver</Text>
                        </Pressable>
                      </View>
                    </View>

                    <FlatList
                      data={himnoSeleccionado.parrafos || []}
                      keyExtractor={(item, index) => `${index}`}
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item, index }) => {
                        const isProyectando =
                          parrafoProyectando?.titulo === String(himnoSeleccionado.titulo || '') &&
                          String(parrafoProyectando?.numero ?? '') === String(himnoSeleccionado.numero ?? '') &&
                          Number(parrafoProyectando?.index) === Number(index);

                        return (
                          <Pressable
                            onPress={async () => {
                              const ok = await enviarParrafo({
                                parrafo: String(item || ''),
                                titulo: String(himnoSeleccionado.titulo || ''),
                                numero: himnoSeleccionado.numero,
                                origen: tipo,
                              });

                              if (ok) {
                                setParrafoProyectando({
                                  titulo: String(himnoSeleccionado.titulo || ''),
                                  numero: himnoSeleccionado.numero,
                                  index,
                                });
                              }
                            }}
                            disabled={enviando}
                            style={({ pressed }) => [
                              styles.parrafoCard,
                              isProyectando && styles.parrafoCardProyectando,
                              pressed && styles.parrafoPressed,
                              enviando && styles.buttonDisabled,
                            ]}
                          >
                            <Text style={styles.parrafoText}>{String(item || '')}</Text>
                            <Text style={styles.parrafoHint}>
                              {enviando ? 'Enviando…' : 'Toca para proyectar'}
                            </Text>
                          </Pressable>
                        );
                      }}
                    />
                  </View>
                ) : (
                  <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                    <Text style={styles.sectionTitle}>Himnos</Text>

                    {cargandoCatalogo && (
                      <View style={[styles.row, { marginTop: 10, marginBottom: 2 }]}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={styles.smallText}>Actualizando desde el PC…</Text>
                      </View>
                    )}

                    <View style={styles.tabRow}>
                      <Pressable
                        onPress={() => setTipo('himnos')}
                        style={({ pressed }) => [
                          styles.tabPill,
                          tipo === 'himnos' && styles.tabPillActive,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            tipo === 'himnos' && styles.tabTextActive,
                          ]}
                        >
                          Moravo
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTipo('vidaCristiana')}
                        style={({ pressed }) => [
                          styles.tabPill,
                          tipo === 'vidaCristiana' && styles.tabPillActive,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            tipo === 'vidaCristiana' && styles.tabTextActive,
                          ]}
                        >
                          Vida Cristiana
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTipo('personal')}
                        style={({ pressed }) => [
                          styles.tabPill,
                          tipo === 'personal' && styles.tabPillActive,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            tipo === 'personal' && styles.tabTextActive,
                          ]}
                        >
                          Personalizados
                        </Text>
                      </Pressable>
                    </View>

                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder="Buscar por número o título"
                      placeholderTextColor="#7c7c7c"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />

                    <FlatList
                      data={listaFiltrada}
                      keyExtractor={(item) =>
                        String(
                          item?.id ||
                          `${tipo}:${String(item?.numero ?? '')}:${String(item?.titulo ?? '')}`,
                        )
                      }
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item }) => (
                        <View style={styles.itemRow}>
                          <Pressable
                            onPress={() => {
                              setHimnoSeleccionado(item);
                              setParrafoProyectando(null);
                            }}
                            style={({ pressed }) => [
                              { flex: 1, minWidth: 0 },
                              pressed && styles.parrafoPressed,
                            ]}
                          >
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {item.numero}. {item.titulo}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {Array.isArray(item.parrafos)
                                ? `${item.parrafos.length} párrafos`
                                : '—'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => toggleFavoritoHimno(item)}
                            disabled={!conectado || !item?.id}
                            style={({ pressed }) => [
                              styles.iconButton,
                              (!conectado || !item?.id) && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                            hitSlop={8}
                          >
                            <Text style={[styles.iconButtonText, item?.favorito && styles.iconButtonTextActive]}>
                              {item?.favorito ? '★' : '☆'}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    />
                  </View>
                )}
              </View>
            )}

            {seccion === 'biblia' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <Text style={styles.sectionTitle}>Biblia</Text>
                  <Text style={styles.smallText}>
                    Selecciona referencia y envía al proyector.
                  </Text>

                  {!libroSeleccionado ? (
                    <>
                      <TextInput
                        value={bibliaBusqueda}
                        onChangeText={setBibliaBusqueda}
                        placeholder="Buscar libro (ej: Juan)"
                        placeholderTextColor="#7c7c7c"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                      />

                      <FlatList
                        data={librosFiltrados}
                        keyExtractor={(item) => item.id}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                          <Pressable
                            onPress={() => {
                              Keyboard.dismiss();
                              setLibroSeleccionado(item);
                              setCapitulo('');
                              setVersiculo('');
                            }}
                            style={({ pressed }) => [
                              styles.himnoRow,
                              pressed && styles.parrafoPressed,
                            ]}
                          >
                            <Text style={styles.himnoTitle}>{item.nombre}</Text>
                            <Text style={styles.himnoSub}>{item.id}</Text>
                          </Pressable>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle} numberOfLines={1}>
                          {libroSeleccionado.nombre}
                        </Text>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setLibroSeleccionado(null);
                          }}
                          style={({ pressed }) => [
                            styles.smallButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonText}>Cambiar</Text>
                        </Pressable>
                      </View>

                      <View style={styles.formRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Capítulo</Text>
                          <TextInput
                            value={capitulo}
                            onChangeText={setCapitulo}
                            placeholder="1"
                            placeholderTextColor="#7c7c7c"
                            keyboardType="number-pad"
                            returnKeyType="done"
                            blurOnSubmit
                            onSubmitEditing={() => Keyboard.dismiss()}
                            style={styles.input}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Versículo</Text>
                          <TextInput
                            value={versiculo}
                            onChangeText={setVersiculo}
                            placeholder="1"
                            placeholderTextColor="#7c7c7c"
                            keyboardType="number-pad"
                            returnKeyType="done"
                            blurOnSubmit
                            onSubmitEditing={() => Keyboard.dismiss()}
                            style={styles.input}
                          />
                        </View>
                      </View>

                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.smallText}>
                          Vista previa (anterior / actual / siguiente)
                        </Text>

                        {cargandoBibliaPreview && (
                          <View style={[styles.row, { marginTop: 8 }]}
                          >
                            <ActivityIndicator color="#ffffff" />
                            <Text style={styles.smallText}>Cargando…</Text>
                          </View>
                        )}

                        {!!bibliaPreview && (
                          <View style={{ marginTop: 8 }}>
                            <View style={styles.bibliaPreviewCard}>
                              <Text style={styles.bibliaPreviewLabel}>Anterior</Text>
                              <Text style={styles.bibliaPreviewText}>
                                {bibliaPreview?.prev?.texto
                                  ? `${bibliaPreview.prev.numero}. ${bibliaPreview.prev.texto}`
                                  : '—'}
                              </Text>
                            </View>

                            <View style={[styles.bibliaPreviewCard, styles.bibliaPreviewCardCurrent]}>
                              <Text style={styles.bibliaPreviewLabel}>Actual</Text>
                              <Text style={styles.bibliaPreviewText}>
                                {bibliaPreview?.current?.texto
                                  ? `${bibliaPreview.current.numero}. ${bibliaPreview.current.texto}`
                                  : `${Number(versiculo) || ''}. No disponible`}
                              </Text>
                            </View>

                            <View style={styles.bibliaPreviewCard}>
                              <Text style={styles.bibliaPreviewLabel}>Siguiente</Text>
                              <Text style={styles.bibliaPreviewText}>
                                {bibliaPreview?.next?.texto
                                  ? `${bibliaPreview.next.numero}. ${bibliaPreview.next.texto}`
                                  : '—'}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.formRow}>
                        <Pressable
                          onPress={proyectarVersiculoAnterior}
                          style={({ pressed }) => [
                            styles.buttonSecondaryCompact,
                            { flex: 1 },
                            pressed && styles.buttonPressed,
                            proyectandoBiblia && styles.buttonDisabled,
                          ]}
                          disabled={proyectandoBiblia}
                        >
                          <Text style={styles.buttonSecondaryText}>Anterior</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            const capNum = Number(capitulo);
                            const verNum = Number(versiculo);
                            toggleFavoritoBiblia({
                              libroId: libroSeleccionado?.id,
                              libroNombre: libroSeleccionado?.nombre,
                              cap: capNum,
                              ver: verNum,
                              texto: bibliaPreview?.current?.texto || '',
                            });
                          }}
                          disabled={!conectado || proyectandoBiblia}
                          style={({ pressed }) => [
                            styles.iconButton,
                            (!conectado || proyectandoBiblia) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                          hitSlop={8}
                        >
                          {(() => {
                            const capNum = Number(capitulo);
                            const verNum = Number(versiculo);
                            const id =
                              libroSeleccionado?.id && Number.isFinite(capNum) && capNum > 0 && Number.isFinite(verNum) && verNum > 0
                                ? `rv60:${libroSeleccionado.id}:${capNum}:${verNum}`
                                : '';
                            const fav = id ? favoritosBibliaIds.has(id) : false;
                            return (
                              <Text style={[styles.iconButtonText, fav && styles.iconButtonTextActive]}>
                                {fav ? '★' : '☆'}
                              </Text>
                            );
                          })()}
                        </Pressable>

                        <Pressable
                          onPress={proyectarVersiculo}
                          style={({ pressed }) => [
                            styles.button,
                            { flex: 1 },
                            pressed && styles.buttonPressed,
                            proyectandoBiblia && styles.buttonDisabled,
                          ]}
                          disabled={proyectandoBiblia}
                        >
                          {proyectandoBiblia ? (
                            <View style={styles.row}>
                              <ActivityIndicator color="#ffffff" />
                              <Text style={styles.buttonText}>Enviando…</Text>
                            </View>
                          ) : (
                            <Text style={styles.buttonText}>Proyectar</Text>
                          )}
                        </Pressable>

                        <Pressable
                          onPress={proyectarVersiculoSiguiente}
                          style={({ pressed }) => [
                            styles.buttonSecondaryCompact,
                            { flex: 1 },
                            pressed && styles.buttonPressed,
                            proyectandoBiblia && styles.buttonDisabled,
                          ]}
                          disabled={proyectandoBiblia}
                        >
                          <Text style={styles.buttonSecondaryText}>Siguiente</Text>
                        </Pressable>
                      </View>

                      {!conectado && (
                        <Text style={styles.smallText}>
                          Tip: ve a Conexión para confirmar el servidor.
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            {seccion === 'multimedia' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Multimedia</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={cargarMultimedia}
                        disabled={!conectado || cargandoMultimedia}
                        style={({ pressed }) => [
                          styles.smallButton,
                          (!conectado || cargandoMultimedia) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Keyboard.dismiss();
                          setSeccion('inicio');
                        }}
                        style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Inicio</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.smallText}>Proyecta archivos cargados en el PC.</Text>
                  {!conectado && (
                    <Text style={styles.smallText}>Tip: ve a Conexión para confirmar el servidor.</Text>
                  )}

                  {!!multimediaError && (
                    <View style={styles.statusBox}>
                      <Text style={[styles.statusText, styles.statusError]}>{multimediaError}</Text>
                      {!!multimediaApiUrl && <Text style={styles.smallText}>Endpoint: {multimediaApiUrl}</Text>}
                    </View>
                  )}

                  <TextInput
                    value={multimediaBusqueda}
                    onChangeText={setMultimediaBusqueda}
                    placeholder="Buscar multimedia"
                    placeholderTextColor="#7c7c7c"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />

                  <View style={styles.filterRow}>
                    {[
                      { key: 'all', label: 'Todo' },
                      { key: 'video', label: 'Video' },
                      { key: 'audio', label: 'Audio' },
                      { key: 'imagen', label: 'Imagen' },
                    ].map((f) => {
                      const active = multimediaFiltro === f.key;
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => setMultimediaFiltro(f.key)}
                          style={({ pressed }) => [
                            styles.filterPill,
                            active && styles.filterPillActive,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {cargandoMultimedia && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}

                  <FlatList
                    data={multimediaFiltrada}
                    keyExtractor={(item, index) => String(item?.id ?? item?.url ?? index)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                      const thumbKey = String(item?.id ?? item?.url ?? item?.ruta_archivo ?? '');
                      const thumbFallo = Boolean(thumbKey && thumbErrores?.[thumbKey]);

                      const kind = normalizarTipoMultimedia(item);
                      const thumbCandidates = (() => {
                        const base = normalizarBaseUrl(serverBaseUrl);
                        const candidates = [...(getThumbCandidatesForItem(item) || [])];
                        const ytId = getYouTubeIdFromItem(item);
                        const isYoutube = Boolean(ytId);
                        if (kind === 'video' && !isYoutube && base && item?.id != null) {
                          candidates.push(`${base}/api/multimedia/${item.id}/thumbnail`);
                        }
                        return candidates;
                      })();
                      const intento = Number(thumbIntentos?.[thumbKey] ?? 0);
                      const thumb = thumbCandidates[intento] || '';

                      const fallbackLabel =
                        kind === 'audio' ? '♪' : kind === 'imagen' ? 'IMG' : '▶';
                      return (
                        <View style={styles.itemRow}>
                          <Pressable
                            onPress={() => abrirModalMultimedia(item)}
                            disabled={!conectado}
                            style={({ pressed }) => [
                              { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
                              pressed && conectado && styles.buttonPressed,
                              !conectado && styles.buttonDisabled,
                            ]}
                          >
                            <View style={styles.thumbWrap}>
                              {thumb && !thumbFallo ? (
                                <Image
                                  source={{ uri: thumb }}
                                  style={styles.thumbImage}
                                  resizeMode="cover"
                                  onError={() => {
                                    const nextAttempt = intento + 1;
                                    if (nextAttempt < thumbCandidates.length) {
                                      setThumbIntentos((prev) => ({
                                        ...(prev || {}),
                                        [thumbKey]: nextAttempt,
                                      }));
                                      return;
                                    }

                                    setThumbErrores((prev) => ({
                                      ...(prev || {}),
                                      [thumbKey]: true,
                                    }));
                                  }}
                                />
                              ) : (
                                <View style={styles.thumbFallback}>
                                  <Text style={styles.thumbFallbackText}>{fallbackLabel}</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {String(item?.nombre || 'Sin nombre')}
                              </Text>
                              <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
                                <Text style={styles.itemMeta} numberOfLines={1}>
                                  {String(item?.tipo || '—')}
                                </Text>

                                {String(multimediaSesion?.id || '') === String(item?.id || '') && (
                                  <View
                                    style={[
                                      styles.badge,
                                      estadoReproduccion === 'playing'
                                        ? styles.badgeSuccess
                                        : styles.badgeMuted,
                                    ]}
                                  >
                                    <View style={[styles.row, { gap: 6 }]}>
                                      <Ionicons
                                        name={estadoReproduccion === 'playing' ? 'play' : 'pause'}
                                        size={12}
                                        color={estadoReproduccion === 'playing' ? '#34d399' : '#94a3b8'}
                                      />
                                      <Text
                                        style={[
                                          styles.badgeText,
                                          estadoReproduccion === 'playing'
                                            ? styles.badgeTextSuccess
                                            : styles.badgeTextMuted,
                                        ]}
                                      >
                                        {estadoReproduccion === 'playing' ? 'REPRODUCIENDO' : 'PAUSADO'}
                                        {multimediaSesion?.destino === 'pc' ? ' · PC' : ' · TV'}
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() => toggleFavoritoMultimedia(item)}
                            disabled={!conectado}
                            style={({ pressed }) => [
                              styles.iconButton,
                              !conectado && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                          >
                            <Text style={[styles.iconButtonText, item?.favorito && styles.iconButtonTextActive]}>
                              {item?.favorito ? '★' : '☆'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    }}
                    ListEmptyComponent={
                      !cargandoMultimedia ? (
                        <Text style={styles.smallText}>No hay elementos para mostrar.</Text>
                      ) : null
                    }
                  />
                </View>
              </View>
            )}

            {seccion === 'presentaciones' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Presentaciones</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={cargarPresentacionesSlides}
                        disabled={!conectado || cargandoPresentaciones}
                        style={({ pressed }) => [
                          styles.smallButton,
                          (!conectado || cargandoPresentaciones) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Keyboard.dismiss();
                          setPresentacionSeleccionada(null);
                          setSeccion('inicio');
                        }}
                        style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Inicio</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.smallText}>Proyecta y controla la presentación (anterior/siguiente).</Text>
                  {!conectado && (
                    <Text style={styles.smallText}>Tip: ve a Conexión para confirmar el servidor.</Text>
                  )}

                  {cargandoPresentaciones && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}

                  {!presentacionSeleccionada ? (
                    <FlatList
                      data={presentacionesSlides}
                      keyExtractor={(item, index) => String(item?.id ?? index)}
                      keyboardDismissMode="on-drag"
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setPresentacionSeleccionada(item);
                          }}
                          style={({ pressed }) => [styles.himnoRow, pressed && styles.parrafoPressed]}
                        >
                          <View style={styles.rowBetween}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.himnoTitle} numberOfLines={1}>
                                {String(item?.nombre || 'Presentación')}
                              </Text>
                              <Text style={styles.himnoSub} numberOfLines={1}>
                                {typeof item?.slide_actual === 'number'
                                  ? `Slide actual: ${Number(item.slide_actual) + 1}`
                                  : 'Toca para abrir'}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => toggleFavoritoPresentacion(item)}
                              style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
                            >
                              <Text style={[styles.iconButtonText, item?.favorito && styles.iconButtonTextActive]}>
                                {item?.favorito ? '★' : '☆'}
                              </Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      )}
                      ListEmptyComponent={
                        !cargandoPresentaciones ? (
                          <Text style={styles.smallText}>No hay presentaciones para mostrar.</Text>
                        ) : null
                      }
                    />
                  ) : (
                    <View style={{ flex: 1, minHeight: 0 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle} numberOfLines={1}>
                          {String(presentacionSeleccionada?.nombre || 'Presentación')}
                        </Text>
                        <View style={styles.row}>
                          <Pressable
                            onPress={() => toggleFavoritoPresentacion(presentacionSeleccionada)}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
                          >
                            <Text style={[styles.iconButtonText, presentacionSeleccionada?.favorito && styles.iconButtonTextActive]}>
                              {presentacionSeleccionada?.favorito ? '★' : '☆'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setPresentacionSeleccionada(null)}
                            style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                          >
                            <Text style={styles.smallButtonText}>Volver</Text>
                          </Pressable>
                        </View>
                      </View>

                      <Text style={styles.smallText}>
                        {typeof presentacionSeleccionada?.slide_actual === 'number'
                          ? `Slide actual: ${Number(presentacionSeleccionada.slide_actual) + 1}`
                          : 'Slide actual: —'}
                      </Text>

                      <View style={[styles.formRow, { marginTop: 12 }]}>
                        <Pressable
                          onPress={anteriorSlidePresentacion}
                          disabled={!conectado || controlandoPresentacion}
                          style={({ pressed }) => [
                            styles.buttonSecondaryCompact,
                            { flex: 1 },
                            (!conectado || controlandoPresentacion) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.buttonSecondaryText}>Anterior</Text>
                        </Pressable>

                        <Pressable
                          onPress={proyectarPresentacion}
                          disabled={!conectado || controlandoPresentacion}
                          style={({ pressed }) => [
                            styles.button,
                            { flex: 1 },
                            (!conectado || controlandoPresentacion) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          {controlandoPresentacion ? (
                            <View style={styles.row}>
                              <ActivityIndicator color="#ffffff" />
                              <Text style={styles.buttonText}>…</Text>
                            </View>
                          ) : (
                            <Text style={styles.buttonText}>Proyectar</Text>
                          )}
                        </Pressable>

                        <Pressable
                          onPress={siguienteSlidePresentacion}
                          disabled={!conectado || controlandoPresentacion}
                          style={({ pressed }) => [
                            styles.buttonSecondaryCompact,
                            { flex: 1 },
                            (!conectado || controlandoPresentacion) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.buttonSecondaryText}>Siguiente</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {seccion === 'fondos' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Fondos</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={cargarFondos}
                        disabled={!conectado || cargandoFondos}
                        style={({ pressed }) => [
                          styles.smallButton,
                          (!conectado || cargandoFondos) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Keyboard.dismiss();
                          setSeccion('inicio');
                        }}
                        style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Inicio</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.smallText}>Activa un fondo para el proyector.</Text>
                  {!conectado && (
                    <Text style={styles.smallText}>Tip: ve a Conexión para confirmar el servidor.</Text>
                  )}

                  {cargandoFondos && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}

                  <FlatList
                    data={fondos}
                    keyExtractor={(item, index) => String(item?.id ?? item?.url ?? index)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                      const isActive = String(fondoActivoId || '') === String(item?.id || '');
                      return (
                        <View style={[styles.itemRow, isActive && styles.itemRowActive]}>
                          <FondoThumb item={item} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {String(item?.nombre || 'Fondo')}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {isActive ? 'Activo' : '—'}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => activarFondo(item)}
                            disabled={!conectado || estableciendoFondo || isActive}
                            style={({ pressed }) => [
                              styles.smallButtonPrimary,
                              (!conectado || estableciendoFondo || isActive) && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                          >
                            <Text style={styles.smallButtonPrimaryText}>{isActive ? 'Activo' : 'Activar'}</Text>
                          </Pressable>
                        </View>
                      );
                    }}
                    ListEmptyComponent={
                      !cargandoFondos ? (
                        <Text style={styles.smallText}>No hay fondos para mostrar.</Text>
                      ) : null
                    }
                  />
                </View>
              </View>
            )}

            {seccion === 'favoritos' && (
              <ScrollView contentContainerStyle={{ paddingBottom: 14 }} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Favoritos</Text>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSeccion('inicio');
                      }}
                      style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                    >
                      <Text style={styles.smallButtonText}>Inicio</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.smallText}>Acceso rápido a himnos, multimedia y presentaciones guardadas.</Text>
                  <Text style={styles.smallText}>Incluye favoritos de Biblia.</Text>
                  {!conectado && (
                    <Text style={styles.smallText}>Tip: ve a Conexión para confirmar el servidor.</Text>
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Himnos</Text>
                  {cargandoFavoritosHimnos && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  {!cargandoFavoritosHimnos && favoritosHimnos.length === 0 ? (
                    <Text style={styles.smallText}>Sin favoritos de himnos.</Text>
                  ) : (
                    favoritosHimnos.map((h) => {
                      const fuente = String(h?.fuente || '').toLowerCase();
                      const etiquetaFuente =
                        fuente === 'vida'
                          ? 'Vida Cristiana'
                          : fuente === 'moravo'
                            ? 'Moravo'
                            : fuente === 'personal'
                              ? 'Personalizados'
                              : fuente
                                ? fuente
                                : '—';

                      return (
                        <View key={`hf-${h.id}`} style={styles.itemRow}>
                          <Pressable
                            onPress={() => {
                              const nextTipo = fuente === 'vida' ? 'vidaCristiana' : fuente === 'personal' ? 'personal' : 'himnos';
                              setTipo(nextTipo);
                              setHimnoSeleccionado(h);
                              setParrafoProyectando(null);
                              setSeccion('himnos');
                            }}
                            disabled={!conectado}
                            style={({ pressed }) => [
                              { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
                              pressed && conectado && styles.buttonPressed,
                              !conectado && styles.buttonDisabled,
                            ]}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {String(h?.numero ?? '')}. {String(h?.titulo || 'Himno')}
                              </Text>
                              <Text style={styles.itemMeta} numberOfLines={1}>
                                {etiquetaFuente}
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() => toggleFavoritoHimno(h)}
                            disabled={!conectado || !h?.id}
                            style={({ pressed }) => [
                              styles.iconButton,
                              (!conectado || !h?.id) && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                          >
                            <Text style={[styles.iconButtonText, styles.iconButtonTextActive]}>★</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Biblia</Text>
                  {cargandoFavoritosBiblia && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  {!cargandoFavoritosBiblia && favoritosBiblia.length === 0 ? (
                    <Text style={styles.smallText}>Sin favoritos de Biblia.</Text>
                  ) : (
                    (Array.isArray(favoritosBiblia) ? favoritosBiblia : []).map((f) => {
                      const cap = Number(f?.capitulo);
                      const ver = Number(f?.versiculo);
                      const libroId = String(f?.libroId || '').trim();
                      const libroNombre = String(f?.libroNombre || '').trim();

                      return (
                        <View key={`bf-${f.id}`} style={styles.itemRow}>
                          <Pressable
                            onPress={() => {
                              Keyboard.dismiss();
                              const libro =
                                librosBiblia.find((l) => String(l?.id) === libroId) ||
                                (libroId ? { id: libroId, nombre: libroNombre || libroId } : null);

                              if (libro) {
                                setLibroSeleccionado(libro);
                                setBibliaBusqueda('');
                                setCapitulo(Number.isFinite(cap) && cap > 0 ? String(cap) : '');
                                setVersiculo(Number.isFinite(ver) && ver > 0 ? String(ver) : '');
                                setSeccion('biblia');
                              }
                            }}
                            disabled={!conectado}
                            style={({ pressed }) => [
                              { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
                              pressed && conectado && styles.buttonPressed,
                              !conectado && styles.buttonDisabled,
                            ]}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {libroNombre || 'Biblia'} {Number.isFinite(cap) ? cap : ''}:{Number.isFinite(ver) ? ver : ''}
                              </Text>
                              <Text style={styles.itemMeta} numberOfLines={1}>
                                {String(f?.texto || '').trim() ? String(f.texto) : '—'}
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              toggleFavoritoBiblia({
                                id: f?.id,
                              })
                            }
                            disabled={!conectado || !f?.id}
                            style={({ pressed }) => [
                              styles.iconButton,
                              (!conectado || !f?.id) && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                          >
                            <Text style={[styles.iconButtonText, styles.iconButtonTextActive]}>★</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Multimedia</Text>
                  {favoritosMultimedia.length === 0 ? (
                    <Text style={styles.smallText}>Sin favoritos de multimedia.</Text>
                  ) : (
                    favoritosMultimedia.map((m) => (
                      <View key={`mf-${m.id}`} style={styles.itemRow}>
                        <Pressable
                          onPress={() => abrirModalMultimedia(m)}
                          disabled={!conectado}
                          style={({ pressed }) => [
                            { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
                            pressed && conectado && styles.buttonPressed,
                            !conectado && styles.buttonDisabled,
                          ]}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {String(m?.nombre || 'Multimedia')}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {String(m?.tipo || '—')}
                            </Text>
                          </View>
                        </Pressable>

                        <Pressable
                          onPress={() => toggleFavoritoMultimedia(m)}
                          style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
                        >
                          <Text style={[styles.iconButtonText, styles.iconButtonTextActive]}>★</Text>
                        </Pressable>
                      </View>
                    ))
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Presentaciones</Text>
                  {favoritosPresentaciones.length === 0 ? (
                    <Text style={styles.smallText}>Sin favoritos de presentaciones.</Text>
                  ) : (
                    favoritosPresentaciones.map((p) => (
                      <View key={`pf-${p.id}`} style={styles.itemRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {String(p?.nombre || 'Presentación')}
                          </Text>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {typeof p?.slide_actual === 'number'
                              ? `Slide actual: ${Number(p.slide_actual) + 1}`
                              : '—'}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => toggleFavoritoPresentacion(p)}
                          style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
                        >
                          <Text style={[styles.iconButtonText, styles.iconButtonTextActive]}>★</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setPresentacionSeleccionada(p);
                            setSeccion('presentaciones');
                          }}
                          style={({ pressed }) => [styles.smallButtonPrimary, pressed && styles.buttonPressed]}
                        >
                          <Text style={styles.smallButtonPrimaryText}>Abrir</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}
          </View>

          <StatusBar style="light" />

          <Modal
            visible={modalControlMultimediaVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalControlMultimediaVisible(false)}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <Pressable
                onPress={() => setModalControlMultimediaVisible(false)}
                style={[styles.drawerBackdrop, { justifyContent: 'center', padding: 16 }]}
              >
                <Pressable
                  onPress={() => { }}
                  style={[
                    styles.card,
                    {
                      width: '100%',
                      maxWidth: 520,
                      alignSelf: 'center',
                      backgroundColor: '#0b1220',
                    },
                  ]}
                >
                  {(() => {
                    const item = multimediaSeleccionada;
                    const kind = item ? normalizarTipoMultimedia(item) : null;
                    const isImagen = kind === 'imagen';
                    const isProyectada =
                      item?.id &&
                      String(multimediaUltimaProyectada?.id || '') === String(item.id);

                    const tituloItem = String(item?.nombre || 'Multimedia');
                    const tipoItem = String(item?.tipo || '—');

                    const candidates = item ? getThumbCandidatesForItem(item) : [];
                    const base = normalizarBaseUrl(serverBaseUrl);
                    const ytId = item ? getYouTubeIdFromItem(item) : '';
                    const isYouTubeVideo = Boolean(ytId);
                    const localVideoThumb =
                      kind === 'video' && !isYouTubeVideo && base && item?.id != null
                        ? `${base}/api/multimedia/${item.id}/thumbnail`
                        : '';

                    const thumb = String((candidates?.[0] || localVideoThumb) || '').trim();
                    const fallbackLabel =
                      kind === 'audio' ? '♪' : kind === 'imagen' ? 'IMG' : '▶';

                    const previewUri =
                      kind === 'video'
                        ? resolverUrlMedia(item?.url || item?.url_localhost || item?.ruta_archivo)
                        : '';

                    const previewPath = String(previewUri || '').split('?')[0];
                    // Algunos archivos se guardaron sin punto de extensión (ej: ...video4mp4).
                    // Intentamos preview si parece mp4/webm o si es un video local con URL válida.
                    const previewExtOk = /(?:\.|)(mp4|m4v|webm)$/i.test(previewPath);
                    const canShowVideoPreview = kind === 'video' && !isYouTubeVideo && Boolean(previewUri) && (previewExtOk || previewPath.includes('/multimedia/'));

                    const destino = destinoControlMultimedia;
                    const esPC = destino === 'pc';
                    const ocupado = esPC ? controlandoSoloAudio : controlandoMultimedia;

                    // Estado por destino: si hay sesión activa pero el usuario cambia el destino,
                    // evitamos mostrar "pause" en el destino equivocado.
                    const estadoDestino =
                      multimediaSesion?.destino === destinoControlMultimedia ? estadoReproduccion : 'stopped';

                    const puedeAbrirAcciones = conectado && !ocupado;
                    const puedeForzarProyectar = conectado && !controlandoMultimedia;
                    const puedeControlarDestino = conectado && !ocupado;

                    const puedeControlarPlaybackAuto = conectado && !ocupado && !isImagen;
                    const puedeStop = puedeControlarPlaybackAuto && estadoDestino !== 'stopped';
                    const puedeLimpiar = puedeAbrirAcciones;
                    const puedeVolumen = puedeControlarPlaybackAuto && !isImagen;

                    const estadoLabel =
                      estadoDestino === 'playing'
                        ? 'Reproduciendo'
                        : estadoDestino === 'paused'
                          ? 'Pausado'
                          : 'Detenido';

                    const onPressPrimary = async () => {
                      if (!item) return;
                      if (!conectado) return;
                      if (ocupado) return;

                      const prevEstadoReproduccion = estadoReproduccion;
                      const prevMultimediaSesion = multimediaSesion;
                      const prevUltimoComando = ultimoComandoControl;

                      // Imagen: solo proyectar.
                      if (isImagen) {
                        setDestinoControlMultimedia('proyector');
                        await proyectarMultimedia(item);
                        return;
                      }

                      // PC (solo audio): si está stopped, arrancar con el item.
                      if (destinoControlMultimedia === 'pc') {
                        if (estadoDestino === 'stopped') {
                          await reproducirSoloAudioEnPC(item);
                          return;
                        }
                        await controlarSoloAudioEnPC(
                          estadoDestino === 'playing' ? 'pause' : 'play',
                        );
                        return;
                      }

                      // Proyector: si no está proyectada, proyectar primero y luego reproducir.
                      setDestinoControlMultimedia('proyector');
                      if (multimediaSesion?.destino === 'proyector' && estadoReproduccion !== 'stopped') {
                        await controlarMultimedia(
                          estadoReproduccion === 'playing' ? 'pause' : 'play',
                        );
                        return;
                      }

                      if (!isProyectada) {
                        // UI inmediata: el usuario pidió proyectar + reproducir.
                        setMultimediaSesion({ id: item.id, destino: 'proyector' });
                        setEstadoReproduccion('playing');
                        setUltimoComandoControl('play');

                        const okProyectar = await proyectarMultimedia(item);
                        if (!okProyectar) {
                          setEstadoReproduccion(prevEstadoReproduccion);
                          setMultimediaSesion(prevMultimediaSesion);
                          setUltimoComandoControl(prevUltimoComando);
                          return;
                        }
                      }

                      const okPlay = await controlarMultimedia('play');
                      if (!okPlay) {
                        setEstadoReproduccion(prevEstadoReproduccion);
                        setMultimediaSesion(prevMultimediaSesion);
                        setUltimoComandoControl(prevUltimoComando);
                      }
                    };

                    const onPressStop = async () => {
                      if (!conectado) return;
                      if (!puedeStop) return;
                      await controlarMultimediaEnDestino('stop');
                    };

                    const onPressLimpiar = async () => {
                      if (!conectado) return;
                      if (!puedeLimpiar) return;

                      // Limpiar debe limpiar TODO el proyector cuando el destino es Proyector.
                      if (destinoControlMultimedia === 'proyector') {
                        await limpiarProyectorTotal();
                        return;
                      }

                      await controlarSoloAudioEnPC('limpiar');
                    };

                    const onPressProyectar = async () => {
                      if (!item) return;
                      if (!puedeForzarProyectar) return;
                      setDestinoControlMultimedia('proyector');
                      await proyectarMultimedia(item);
                    };

                    const onPressToggleMute = async () => {
                      if (!puedeVolumen) return;
                      await toggleMute();
                    };

                    const onPressVolDown = async () => {
                      if (!puedeVolumen) return;
                      await aplicarVolumen(Math.max(0, Number(volumenNivel) - 0.1));
                    };

                    const onPressVolUp = async () => {
                      if (!puedeVolumen) return;
                      await aplicarVolumen(Math.min(1, Number(volumenNivel) + 0.1));
                    };

                    const primaryIcon = isImagen
                      ? 'send'
                      : estadoDestino === 'playing'
                        ? 'pause'
                        : 'play';

                    const primaryEnabled = isImagen
                      ? conectado && !controlandoMultimedia
                      : puedeControlarPlaybackAuto;

                    const durationSec = Math.max(0, Number(multimediaPlaybackStatus?.duration || 0));
                    const currentSecRaw = Number(multimediaPlaybackStatus?.currentTime || 0);
                    const currentSec = Math.max(0, scrubbing ? Number(scrubTime || 0) : currentSecRaw);
                    const canSeek = puedeControlarPlaybackAuto && durationSec > 0;

                    const percent = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
                    const trackW = Math.max(1, Number(seekBarWidth || 1));
                    const knobLeft = Math.min(trackW - 6, Math.max(-6, percent * trackW - 6));

                    const seekFromEvent = (evt) => {
                      const x = Number(evt?.nativeEvent?.locationX);
                      const ratio = Number.isFinite(x) ? Math.min(1, Math.max(0, x / trackW)) : 0;
                      return ratio * durationSec;
                    };

                    const commitSeek = async (t) => {
                      const time = Math.max(0, Math.min(durationSec || 0, Number(t || 0)));
                      if (!Number.isFinite(time)) return;
                      if (!canSeek) return;

                      setMultimediaPlaybackStatus((prev) => ({
                        ...prev,
                        currentTime: time,
                        paused: prev?.paused,
                      }));

                      await controlarMultimediaEnDestino('seek', { time });
                    };

                    return (
                      <>
                        <View style={styles.playerHeader}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.sectionTitle} numberOfLines={1}>
                              {tituloItem}
                            </Text>
                            <Text style={styles.playerSubtitle} numberOfLines={1}>
                              {tipoItem} · {isImagen ? 'Proyector' : esPC ? 'PC (audio)' : 'Proyector'} · {estadoLabel}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityLabel="Cerrar"
                            onPress={() => setModalControlMultimediaVisible(false)}
                            style={({ pressed }) => [styles.playerIconButton, pressed && styles.buttonPressed]}
                          >
                            <Ionicons name="close" size={20} color="#e2e8f0" />
                          </Pressable>
                        </View>

                        <View
                          style={{
                            width: '100%',
                            height: 170,
                            borderRadius: 14,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.10)',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            marginBottom: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {kind === 'video' && !isYouTubeVideo ? (
                            <VideoThumbPreview uri={localVideoThumb || thumb || ''} />
                          ) : canShowVideoPreview ? (
                            <ModalVideoPreview uri={previewUri} />
                          ) : thumb ? (
                            <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <Text style={styles.thumbFallbackText}>{fallbackLabel}</Text>
                          )}
                        </View>

                        {!isImagen && (
                          <View style={{ marginBottom: 10 }}>
                            <View style={styles.seekTimeRow}>
                              <Text style={styles.seekTimeText}>{formatTimeSec(currentSec)}</Text>
                              <Text style={styles.seekTimeText}>
                                {durationSec > 0 ? formatTimeSec(durationSec) : '--:--'}
                              </Text>
                            </View>

                            <View
                              style={[styles.seekBarTrack, !canSeek && styles.seekBarTrackDisabled]}
                              onLayout={(e) => setSeekBarWidth(e?.nativeEvent?.layout?.width || 1)}
                              onStartShouldSetResponder={() => Boolean(canSeek)}
                              onMoveShouldSetResponder={() => Boolean(canSeek)}
                              onResponderGrant={(evt) => {
                                if (!canSeek) return;
                                setScrubbing(true);
                                scrubbingRef.current = true;
                                const t = seekFromEvent(evt);
                                setScrubTime(t);
                              }}
                              onResponderMove={(evt) => {
                                if (!canSeek) return;
                                const t = seekFromEvent(evt);
                                setScrubTime(t);
                              }}
                              onResponderRelease={async (evt) => {
                                if (!canSeek) return;
                                const t = seekFromEvent(evt);
                                setScrubbing(false);
                                scrubbingRef.current = false;
                                setScrubTime(0);
                                await commitSeek(t);
                              }}
                              onResponderTerminate={async (evt) => {
                                if (!canSeek) return;
                                const t = seekFromEvent(evt);
                                setScrubbing(false);
                                scrubbingRef.current = false;
                                setScrubTime(0);
                                await commitSeek(t);
                              }}
                            >
                              <View style={[styles.seekBarFill, { width: `${percent * 100}%` }]} />
                              <View style={[styles.seekBarKnob, { left: knobLeft }]} />
                            </View>

                            {!canSeek && (
                              <Text style={[styles.smallText, { marginTop: 6 }]}>
                                Tip: inicia la reproducción para activar la barra.
                              </Text>
                            )}
                          </View>
                        )}

                        {!isImagen && (
                          <View style={styles.playerSegmentRow}>
                            <Pressable
                              accessibilityLabel="Destino: Proyector"
                              onPress={() => puedeControlarDestino && setDestinoControlMultimedia('proyector')}
                              style={({ pressed }) => [
                                styles.playerSegment,
                                destinoControlMultimedia === 'proyector' && styles.playerSegmentActive,
                                pressed && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons
                                name="tv-outline"
                                size={18}
                                color={destinoControlMultimedia === 'proyector' ? '#34d399' : '#e2e8f0'}
                              />
                            </Pressable>

                            <Pressable
                              accessibilityLabel="Destino: PC (solo audio)"
                              onPress={() => puedeControlarDestino && setDestinoControlMultimedia('pc')}
                              style={({ pressed }) => [
                                styles.playerSegment,
                                destinoControlMultimedia === 'pc' && styles.playerSegmentActive,
                                pressed && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons
                                name="laptop-outline"
                                size={18}
                                color={destinoControlMultimedia === 'pc' ? '#34d399' : '#e2e8f0'}
                              />
                            </Pressable>
                          </View>
                        )}

                        <View style={styles.playerControlsRow}>
                          <Pressable
                            accessibilityLabel={isImagen ? 'Proyectar' : 'Reproducir / Pausar'}
                            onPress={onPressPrimary}
                            disabled={!primaryEnabled}
                            style={({ pressed }) => [
                              styles.playerPrimaryButton,
                              !primaryEnabled && styles.playerPrimaryButtonDisabled,
                              pressed && primaryEnabled && styles.buttonPressed,
                            ]}
                          >
                            <Ionicons
                              name={primaryIcon}
                              size={36}
                              color={primaryEnabled ? '#0b1220' : '#94a3b8'}
                            />
                          </Pressable>

                          <View style={styles.playerActionsRow}>
                            {!isImagen && (
                              <Pressable
                                accessibilityLabel="Detener"
                                onPress={onPressStop}
                                disabled={!puedeStop}
                                style={({ pressed }) => [
                                  styles.playerIconButton,
                                  !puedeStop && styles.playerIconButtonDisabled,
                                  pressed && puedeStop && styles.buttonPressed,
                                ]}
                              >
                                <Ionicons name="stop" size={20} color={puedeStop ? '#e2e8f0' : '#64748b'} />
                              </Pressable>
                            )}

                            <Pressable
                              accessibilityLabel="Limpiar"
                              onPress={onPressLimpiar}
                              disabled={!puedeLimpiar}
                              style={({ pressed }) => [
                                styles.playerIconButton,
                                !puedeLimpiar && styles.playerIconButtonDisabled,
                                pressed && puedeLimpiar && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={20}
                                color={puedeLimpiar ? '#e2e8f0' : '#64748b'}
                              />
                            </Pressable>

                            {(!isImagen && destinoControlMultimedia === 'proyector') && (
                              <Pressable
                                accessibilityLabel="Proyectar"
                                onPress={onPressProyectar}
                                disabled={!puedeForzarProyectar}
                                style={({ pressed }) => [
                                  styles.playerIconButton,
                                  !puedeForzarProyectar && styles.playerIconButtonDisabled,
                                  pressed && puedeForzarProyectar && styles.buttonPressed,
                                ]}
                              >
                                <Ionicons
                                  name="tv-outline"
                                  size={20}
                                  color={puedeForzarProyectar ? '#e2e8f0' : '#64748b'}
                                />
                              </Pressable>
                            )}
                          </View>
                        </View>

                        {!isImagen && (
                          <View style={styles.playerVolumeRow}>
                            <Pressable
                              accessibilityLabel={volumenNivel > 0 ? 'Mute' : 'Unmute'}
                              onPress={onPressToggleMute}
                              disabled={!puedeVolumen}
                              style={({ pressed }) => [
                                styles.playerIconButton,
                                !puedeVolumen && styles.playerIconButtonDisabled,
                                pressed && puedeVolumen && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons
                                name={volumenNivel > 0 ? 'volume-high' : 'volume-mute'}
                                size={20}
                                color={puedeVolumen ? '#e2e8f0' : '#64748b'}
                              />
                            </Pressable>

                            <Pressable
                              accessibilityLabel="Bajar volumen"
                              onPress={onPressVolDown}
                              disabled={!puedeVolumen}
                              style={({ pressed }) => [
                                styles.playerIconButton,
                                !puedeVolumen && styles.playerIconButtonDisabled,
                                pressed && puedeVolumen && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons name="remove" size={20} color={puedeVolumen ? '#e2e8f0' : '#64748b'} />
                            </Pressable>

                            <Text style={styles.playerVolumeText}>
                              {Math.round(Number(volumenNivel) * 100)}%
                            </Text>

                            <Pressable
                              accessibilityLabel="Subir volumen"
                              onPress={onPressVolUp}
                              disabled={!puedeVolumen}
                              style={({ pressed }) => [
                                styles.playerIconButton,
                                !puedeVolumen && styles.playerIconButtonDisabled,
                                pressed && puedeVolumen && styles.buttonPressed,
                              ]}
                            >
                              <Ionicons name="add" size={20} color={puedeVolumen ? '#e2e8f0' : '#64748b'} />
                            </Pressable>
                          </View>
                        )}

                        {!conectado && (
                          <Text style={[styles.smallText, { marginTop: 10 }]}>
                            Conéctate primero para proyectar y controlar.
                          </Text>
                        )}
                        {conectado && destinoControlMultimedia === 'proyector' && item?.id && !isImagen && !isProyectada && (
                          <Text style={[styles.smallText, { marginTop: 10 }]}>
                            Tip: presiona Play y se proyecta automáticamente.
                          </Text>
                        )}
                        {conectado && destinoControlMultimedia === 'pc' && !isImagen && (
                          <Text style={[styles.smallText, { marginTop: 10 }]}>
                            En modo PC (solo audio) no afecta lo proyectado.
                          </Text>
                        )}
                      </>
                    );
                  })()}
                </Pressable>
              </Pressable>
            </SafeAreaView>
          </Modal>

          <Modal
            visible={modalQrVisible}
            animationType="slide"
            onRequestClose={() => setModalQrVisible(false)}
          >
            <SafeAreaView style={[styles.safe, { backgroundColor: '#0b1220' }]}>
              <View style={[styles.header, { paddingBottom: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Escanear QR</Text>
                  <Text style={styles.subtitle}>Apunta a la pantalla del PC</Text>
                </View>
                <Pressable
                  onPress={() => setModalQrVisible(false)}
                  style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.smallButtonText}>Cerrar</Text>
                </Pressable>
              </View>

              <View style={{ flex: 1, padding: 18 }}>
                {!permisosCamara?.granted ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Cámara</Text>
                    <Text style={styles.smallText}>
                      Necesitas permitir el acceso a la cámara para escanear.
                    </Text>
                    <Pressable
                      onPress={pedirPermisosCamara}
                      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                    >
                      <Text style={styles.buttonText}>Dar permiso</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                    <CameraView
                      style={{ flex: 1 }}
                      onBarcodeScanned={onQrScanned}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                  </View>
                )}
                <Text style={styles.smallText}>
                  Si no escanea, sube el brillo del PC.
                </Text>
              </View>
            </SafeAreaView>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 12 },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  menuButtonText: { color: '#e2e8f0', fontSize: 18, fontWeight: '900' },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: { color: '#94a3b8', marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  label: { color: '#e2e8f0', marginBottom: 8, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: 'rgba(16,185,129,0.85)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  buttonSecondaryCompact: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: '#e2e8f0', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  statusBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
  },
  statusText: { color: '#e2e8f0' },
  statusSuccess: { color: '#34d399' },
  statusError: { color: '#fb7185' },
  smallText: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  tabRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 12 },
  tabPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  tabPillActive: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: 'rgba(16,185,129,0.40)',
  },
  tabText: { color: '#e2e8f0', fontWeight: '700' },
  tabTextActive: { color: '#34d399' },

  homeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },

  homeCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  homeCardPressed: { opacity: 0.92 },
  homeCardGradient: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  homeCardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  homeCardSubtitle: { color: '#e2e8f0', marginTop: 6, lineHeight: 20 },
  homeCardCta: { color: '#94a3b8', marginTop: 10, fontWeight: '900', fontSize: 12 },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.40)',
  },
  filterText: { color: '#e2e8f0', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#34d399' },

  listContent: { paddingVertical: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginBottom: 10,
  },
  itemRowActive: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.32)',
  },
  itemTitle: { color: '#ffffff', fontWeight: '800' },
  itemMeta: { color: '#94a3b8', marginTop: 4, fontSize: 12 },

  thumbWrap: {
    width: 92,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: { color: '#e2e8f0', fontWeight: '900', fontSize: 18 },

  seekTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  seekTimeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  seekBarTrack: {
    width: '100%',
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  seekBarTrackDisabled: {
    opacity: 0.55,
  },
  seekBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.90)',
  },
  seekBarKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  iconButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  iconButtonText: { color: '#e2e8f0', fontWeight: '900', fontSize: 16 },
  iconButtonTextActive: { color: '#fbbf24' },

  smallButtonPrimary: {
    backgroundColor: 'rgba(16,185,129,0.85)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonPrimaryText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  himnoRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginBottom: 10,
  },
  himnoTitle: { color: '#ffffff', fontWeight: '700' },
  himnoSub: { color: '#94a3b8', marginTop: 4, fontSize: 12 },

  bibliaPreviewCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginBottom: 10,
  },
  bibliaPreviewCardCurrent: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.32)',
  },
  bibliaPreviewLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  bibliaPreviewText: { color: '#e2e8f0', lineHeight: 20 },

  parrafoCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginBottom: 10,
  },
  parrafoCardProyectando: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.40)',
  },
  parrafoPressed: { opacity: 0.9 },
  parrafoText: { color: '#e2e8f0', lineHeight: 20 },
  parrafoHint: { color: '#94a3b8', marginTop: 8, fontSize: 12 },

  smallButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  smallButtonText: { color: '#e2e8f0', fontWeight: '700', fontSize: 12 },

  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  playerSubtitle: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
  playerSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  playerSegment: {
    width: 56,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  playerSegmentActive: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  playerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  playerPrimaryButton: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,185,129,0.92)',
    borderColor: 'rgba(16,185,129,0.35)',
    borderWidth: 1,
  },
  playerPrimaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  playerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flex: 1,
  },
  playerIconButton: {
    width: 44,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  playerIconButtonDisabled: { opacity: 0.55 },
  playerVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  playerVolumeText: { color: '#94a3b8', fontSize: 12, fontWeight: '900', minWidth: 56, textAlign: 'center' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.35)' },
  badgeMuted: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  badgeText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
  badgeTextSuccess: { color: '#34d399' },
  badgeTextMuted: { color: '#94a3b8' },

  limpiarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  limpiarButtonText: { color: '#e2e8f0', fontWeight: '900', fontSize: 12 },

  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  drawer: {
    width: 280,
    maxWidth: '80%',
    backgroundColor: '#0b1220',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingTop: 18,
  },
  drawerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  drawerItemText: { color: '#cbd5e1', fontWeight: '900' },
  drawerItemTextActive: { color: '#34d399' },
});
