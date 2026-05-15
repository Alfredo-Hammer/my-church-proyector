import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  Alert,
  Animated,
  AppState,
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
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import himnosData from './src/data/himnos.json';
import vidaCristianaData from './src/data/vidacristiana.json';
import librosBiblia from './src/data/librosBiblia';

const STORAGE_KEY_LAST_URL = 'gloryview:lastServerBaseUrl';
const STORAGE_KEY_MULTIMEDIA_SESION = 'gloryview:multimediaSesion';
const STORAGE_KEY_ESTADO_REPRODUCCION = 'gloryview:estadoReproduccion';

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

const normalizarBaseUrl = (value) => {
  let raw = String(value || '').trim();
  if (!raw) return '';

  // Quitar espacios internos (copiar/pegar) y slashes finales
  raw = raw.replace(/\s+/g, '').replace(/\/+$/, '');

  // Corregir errores comunes: "http//" o "https//" (faltó ':')
  raw = raw.replace(/^(https?)\/\//i, '$1://');

  // Si no tiene esquema, asumir http
  if (!/^https?:\/\//i.test(raw)) {
    raw = `http://${raw}`;
  }

  // Si no trae puerto, asumir :3001 (solo para conexiones LAN del proyector)
  try {
    const u = new URL(raw);
    const hasPort = Boolean(String(u.port || '').trim());
    const isRoot = !u.pathname || u.pathname === '/' || u.pathname === '';
    if (!hasPort && isRoot) {
      return `${u.protocol}//${u.hostname}:3001`;
    }
  } catch {
    // Si no se puede parsear, devolver lo mejor que tengamos
  }

  return raw;
};

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

const AnimatedSoundBars = () => {
  const bars = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.8)).current,
    useRef(new Animated.Value(0.5)).current,
    useRef(new Animated.Value(1.0)).current,
  ];

  useEffect(() => {
    const durations = [320, 480, 260, 410];
    const animations = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1.0, duration: durations[i], useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.2, duration: durations[i], useNativeDriver: false }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 14, gap: 2 }}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: '#34d399',
            height: bar.interpolate({ inputRange: [0, 1], outputRange: [3, 14] }),
          }}
        />
      ))}
    </View>
  );
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [seccion, setSeccion] = useState('inicio'); // 'inicio' | 'conexion' | 'himnos' | 'biblia' | 'multimedia' | 'fondos' | 'favoritos' | 'anuncios' | 'temporizador' | 'plantillas' | 'presentaciones'
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

  // Formulario agregar/editar himno personalizado
  const [modalHimnoForm, setModalHimnoForm] = useState(false);
  const [himnoFormId, setHimnoFormId] = useState(null);
  const [himnoFormNumero, setHimnoFormNumero] = useState('');
  const [himnoFormTitulo, setHimnoFormTitulo] = useState('');
  const [himnoFormLetra, setHimnoFormLetra] = useState('');
  const [guardandoHimno, setGuardandoHimno] = useState(false);

  const [favoritosHimnos, setFavoritosHimnos] = useState([]);
  const [cargandoFavoritosHimnos, setCargandoFavoritosHimnos] = useState(false);

  const [favoritosBiblia, setFavoritosBiblia] = useState([]);
  const [cargandoFavoritosBiblia, setCargandoFavoritosBiblia] = useState(false);

  const [permisosCamara, pedirPermisosCamara] = useCameraPermissions();
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [qrBloqueado, setQrBloqueado] = useState(false);

  const [bibliaBusqueda, setBibliaBusqueda] = useState('');
  const [bibliaTabActivo, setBibliaTabActivo] = useState('antiguo'); // 'antiguo' | 'nuevo'
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capitulo, setCapitulo] = useState('');
  const [versiculo, setVersiculo] = useState('');
  const [proyectandoBiblia, setProyectandoBiblia] = useState(false);
  const [bibliaPreview, setBibliaPreview] = useState(null);
  const [cargandoBibliaPreview, setCargandoBibliaPreview] = useState(false);
  const [capitulosDisponibles, setCapitulosDisponibles] = useState([]);
  const [versiculosDisponibles, setVersiculosDisponibles] = useState([]);
  const [versiculosPorCapituloActual, setVersiculosPorCapituloActual] = useState([]);
  const [cargandoVersiculos, setCargandoVersiculos] = useState(false);

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
  const pendingMultimediaActionRef = useRef(null); // 'play' | 'pause' | 'stop'
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
  const [multimediaActiva, setMultimediaActiva] = useState(null); // { id, nombre, tipo, destino, isPlaying }
  const [seekBarWidth, setSeekBarWidth] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [scrubTime, setScrubTime] = useState(0);

  const [ordenes, setOrdenes] = useState([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [itemOrdActivo, setItemOrdActivo] = useState(0);
  const [parrafoOrdActivo, setParrafoOrdActivo] = useState(0);
  const [proyectandoOrden, setProyectandoOrden] = useState(false);

  // Editor orden
  const [modalOrdenEditor, setModalOrdenEditor] = useState(false);
  const [ordenEditId, setOrdenEditId] = useState(null);
  const [ordenEditTitulo, setOrdenEditTitulo] = useState('');
  const [ordenEditFecha, setOrdenEditFecha] = useState('');
  const [ordenEditItems, setOrdenEditItems] = useState([]);
  const [guardandoOrden, setGuardandoOrden] = useState(false);

  // Picker himnos (dentro del editor)
  const [modalPickerHimno, setModalPickerHimno] = useState(false);
  const [pickerHimnoTipo, setPickerHimnoTipo] = useState('moravo');
  const [pickerHimnoBusqueda, setPickerHimnoBusqueda] = useState('');
  const [pickerHimnoLista, setPickerHimnoLista] = useState([]);
  const [cargandoPickerHimno, setCargandoPickerHimno] = useState(false);

  // Picker versículo (dentro del editor)
  const [modalPickerVersi, setModalPickerVersi] = useState(false);
  const [pickerVersiLibro, setPickerVersiLibro] = useState(null);
  const [pickerVersiCap, setPickerVersiCap] = useState(null);
  const [pickerVersiVersos, setPickerVersiVersos] = useState([]);
  const [pickerVersiCantidadCaps, setPickerVersiCantidadCaps] = useState(0);
  const [cargandoPickerVersi, setCargandoPickerVersi] = useState(false);
  const [pickerVersiBusqueda, setPickerVersiBusqueda] = useState('');

  // Picker nota
  const [modalPickerNota, setModalPickerNota] = useState(false);
  const [pickerNotaTexto, setPickerNotaTexto] = useState('');

  const [fondos, setFondos] = useState([]);
  const [cargandoFondos, setCargandoFondos] = useState(false);
  const [fondoActivoId, setFondoActivoId] = useState(null);
  const [estableciendoFondo, setEstableciendoFondo] = useState(false);

  // Anuncios
  const [anuncios, setAnuncios] = useState([]);
  const [cargandoAnuncios, setCargandoAnuncios] = useState(false);
  const [proyectandoAnuncioId, setProyectandoAnuncioId] = useState(null);
  const [limpiandoAnuncio, setLimpiandoAnuncio] = useState(false);

  // Temporizador
  const [timerEstado, setTimerEstado] = useState({
    corriendo: false, segundosRestantes: 600, total: 600,
    mensaje: 'El culto comienza en', proyectando: false, terminado: false,
  });
  const [timerMinutos, setTimerMinutos] = useState(10);
  const [timerMensajeInput, setTimerMensajeInput] = useState('El culto comienza en');
  const [controlandoTimer, setControlandoTimer] = useState(false);

  // Plantillas
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaActivaId, setPlantillaActivaId] = useState(null);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [activandoPlantillaId, setActivandoPlantillaId] = useState(null);

  // Estado de conectividad a internet
  const [hayInternet, setHayInternet] = useState(true);
  const [tipoConexion, setTipoConexion] = useState(null); // 'wifi' | 'cellular' | 'none' | null

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

  const himnosPersonalCrudUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/himnos/personal`;
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

  const ordenesApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/ordenes-servicio`;
  }, [serverBaseUrl]);

  const bibliaCapituloUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/biblia/capitulo`;
  }, [serverBaseUrl]);

  const ordenesProyectarItemUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/control/ordenes-servicio/proyectar-item`;
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

  const anunciosApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/anuncios`;
  }, [serverBaseUrl]);

  const timerApiBase = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api`;
  }, [serverBaseUrl]);

  const plantillasApiUrl = useMemo(() => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return '';
    return `${base}/api/plantillas`;
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
          <View style={[styles.thumbFallback, { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.06)' }]}>
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
          <View style={[styles.thumbFallback, { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.06)' }]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
      </View>
    );
  };

  const cargarMultimediaPlaybackStatus = async ({ ignoreModalCheck = false } = {}) => {
    if (!multimediaStatusApiUrl) return;
    if (!conectado) return;
    if (!ignoreModalCheck && !modalControlMultimediaVisible) return;
    if (!multimediaSeleccionada && !ignoreModalCheck) return;

    const kind = multimediaSeleccionada ? normalizarTipoMultimedia(multimediaSeleccionada) : null;
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

      // Sincronizar estado de reproducción desde el servidor
      const st = json.status;
      if (st?.state === 'playing') setEstadoReproduccion('playing');
      else if (st?.state === 'paused') setEstadoReproduccion('paused');
      else if (st?.state === 'stopped') setEstadoReproduccion('stopped');
      else if (st?.paused === true) setEstadoReproduccion('paused');
      else if (st?.paused === false && st?.currentTime != null) setEstadoReproduccion('playing');
    } catch {
      // Silencioso
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
          setTimeout(() => {
            if (!cancelado) probarConexion(String(saved));
          }, 80);
        }

        const savedSesion = await AsyncStorage.getItem(STORAGE_KEY_MULTIMEDIA_SESION);
        if (!cancelado && savedSesion) {
          try { setMultimediaSesion(JSON.parse(savedSesion)); } catch { /* ignorar */ }
        }

        const savedEstado = await AsyncStorage.getItem(STORAGE_KEY_ESTADO_REPRODUCCION);
        if (!cancelado && savedEstado) {
          const s = String(savedEstado);
          if (s === 'playing' || s === 'paused' || s === 'stopped') {
            setEstadoReproduccion(s);
          }
        }
      } catch {
        // Ignorar errores de storage
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir sesión multimedia en cada cambio
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_MULTIMEDIA_SESION, JSON.stringify(multimediaSesion)).catch(() => { });
  }, [multimediaSesion]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_ESTADO_REPRODUCCION, estadoReproduccion).catch(() => { });
  }, [estadoReproduccion]);

  // Monitorear conectividad a internet
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state?.isConnected && state?.isInternetReachable !== false);
      setHayInternet(isConnected);

      const connectionType = state?.type || null;
      setTipoConexion(connectionType);
    });

    // Verificar estado inicial
    NetInfo.fetch().then((state) => {
      const isConnected = Boolean(state?.isConnected && state?.isInternetReachable !== false);
      setHayInternet(isConnected);
      setTipoConexion(state?.type || null);
    });

    return () => unsubscribe();
  }, []);

  // Re-sincronizar estado desde el servidor cuando la app vuelve a primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && conectado) {
        cargarMultimediaPlaybackStatus({ ignoreModalCheck: true });
        cargarEstadoMultimediaInicial();
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado]);

  // ✅ Cargar estado inicial de multimedia al conectarse
  const cargarEstadoMultimediaInicial = async () => {
    if (!conectado) return;
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;

    try {
      const [resP, resPC] = await Promise.all([
        fetch(`${base}/api/control/multimedia/status?destino=proyector`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
        }).then((r) => r.json()).catch(() => null),
        fetch(`${base}/api/control/multimedia/status?destino=pc`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
        }).then((r) => r.json()).catch(() => null),
      ]);

      const stP = resP?.ok ? resP.status : null;
      const stPC = resPC?.ok ? resPC.status : null;

      // Preferir el que está reproduciendo activamente
      const activo = (!stP?.paused && stP?.id != null)
        ? { st: stP, destino: 'proyector' }
        : (!stPC?.paused && stPC?.id != null)
          ? { st: stPC, destino: 'pc' }
          : (stP?.id != null)
            ? { st: stP, destino: 'proyector' }
            : (stPC?.id != null)
              ? { st: stPC, destino: 'pc' }
              : null;

      if (activo) {
        const { st, destino } = activo;
        setMultimediaActiva({
          id: st.id,
          nombre: st.nombre || 'Sin nombre',
          tipo: st.tipo || 'desconocido',
          destino,
          isPlaying: !st.paused,
        });

        setMultimediaSesion({ id: st.id, destino });
        setDestinoControlMultimedia(destino);

        if (!st.paused) {
          setEstadoReproduccion('playing');
        } else {
          setEstadoReproduccion('paused');
        }
      } else {
        setMultimediaActiva(null);
        setMultimediaSesion(null);
        setEstadoReproduccion('stopped');
      }
    } catch {
      // silencioso
    }
  };

  // Cargar estado inicial al conectarse exitosamente
  useEffect(() => {
    if (conectado) {
      cargarEstadoMultimediaInicial();
    } else {
      setMultimediaActiva(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado]);

  // Polling global: sincroniza el estado de reproducción de ambos destinos
  // cada 3 segundos para reflejar lo que ocurra en el PC o en otro celular.
  useEffect(() => {
    if (!conectado) return;
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;

    let cancelado = false;

    const poll = async () => {
      if (cancelado) return;
      try {
        const [resP, resPC] = await Promise.all([
          fetch(`${base}/api/control/multimedia/status?destino=proyector`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
          }).then((r) => r.json()).catch(() => null),
          fetch(`${base}/api/control/multimedia/status?destino=pc`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
          }).then((r) => r.json()).catch(() => null),
        ]);

        if (cancelado) return;

        // Escoger el destino activo: preferir el que está reproduciendo
        const stP = resP?.ok ? resP.status : null;
        const stPC = resPC?.ok ? resPC.status : null;

        // Verificar si el video llegó al final por posición (no depende de relojes)
        const videoTerminado = (st) => {
          if (!st) return false;
          const dur = Number(st.duration);
          const cur = Number(st.currentTime);
          return dur > 1 && cur > 0 && cur >= dur - 0.5;
        };

        const activoP  = stP  && stP.id  != null && !videoTerminado(stP);
        const activoPC = stPC && stPC.id != null && !videoTerminado(stPC);

        const activo = (activoP && !stP?.paused)
          ? { st: stP,  destino: 'proyector' }
          : (activoPC && !stPC?.paused)
            ? { st: stPC, destino: 'pc' }
            : activoP
              ? { st: stP,  destino: 'proyector' }
              : activoPC
                ? { st: stPC, destino: 'pc' }
                : null;

        if (!activo) {
          // El servidor respondió y no hay nada activo → limpiar indicador
          const serverResponded = resP?.ok || resPC?.ok;
          if (serverResponded) {
            setMultimediaSesion((prev) => prev?.id != null ? null : prev);
            setEstadoReproduccion('stopped');
            setMultimediaActiva(null);
          }
          return;
        }

        const { st, destino } = activo;
        setMultimediaSesion((prev) => {
          if (String(prev?.id) === String(st.id) && prev?.destino === destino) return prev;
          return { id: st.id, destino };
        });

        if (!st.paused && st.currentTime != null) {
          setEstadoReproduccion('playing');
        } else if (st.paused) {
          setEstadoReproduccion('paused');
        }

        if (!scrubbingRef.current) {
          setMultimediaPlaybackStatus((prev) => ({ ...prev, ...(st || {}) }));
        }

        // Actualizar estado de multimedia activa
        setMultimediaActiva({
          id: st.id,
          nombre: st.nombre || 'Sin nombre',
          tipo: st.tipo || 'desconocido',
          destino,
          isPlaying: !st.paused,
        });
      } catch {
        // silencioso
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelado = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado, serverBaseUrl]);

  // Separar libros por testamento
  const librosAntiguoTestamento = useMemo(() => librosBiblia.slice(0, 39), []);
  const librosNuevoTestamento = useMemo(() => librosBiblia.slice(39), []);

  const librosFiltrados = useMemo(() => {
    // Seleccionar libros según el tab activo
    const librosBase = bibliaTabActivo === 'antiguo' ? librosAntiguoTestamento : librosNuevoTestamento;

    const q = (bibliaBusqueda || '').trim().toLowerCase();
    if (!q) return librosBase;

    return librosBase.filter((l) => {
      const nombre = String(l?.nombre ?? '').toLowerCase();
      const id = String(l?.id ?? '').toLowerCase();
      return nombre.includes(q) || id.includes(q);
    });
  }, [bibliaBusqueda, bibliaTabActivo, librosAntiguoTestamento, librosNuevoTestamento]);

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
      let msg;
      if (err?.name === 'AbortError') {
        msg = 'Timeout: el servidor no respondió en 6s. Verifica que el PC esté encendido, GloryView abierto y en la misma red Wi-Fi.';
      } else if (err?.message?.includes('Network request failed') || err?.message?.includes('fetch')) {
        msg = 'No se pudo alcanzar el servidor. Asegúrate de estar conectado a Wi-Fi (no datos móviles) en la misma red que el PC.';
      } else {
        msg = err?.message || 'Error de red desconocido.';
      }
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
    console.log('QR escaneado:', result);
    console.log('QR data:', result?.data);
    console.log('QR bloqueado?:', qrBloqueado);

    if (qrBloqueado) {
      console.log('QR bloqueado, ignorando');
      return;
    }
    setQrBloqueado(true);

    const url = extraerUrlDeQr(result?.data);
    console.log('URL extraída:', url);

    if (!url) {
      console.log('URL inválida');
      setEstado((prev) => ({
        ...prev,
        status: 'error',
        message: 'QR inválido. Debe contener una URL http://...:3001',
      }));
      setTimeout(() => setQrBloqueado(false), 1000);
      return;
    }

    console.log('Cerrando modal y conectando...');
    setModalQrVisible(false);
    setServerBaseUrl(url);
    setSeccion('conexion');

    setTimeout(() => {
      setQrBloqueado(false);
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

  // Cargar estructura real del libro (capítulos + versículos por capítulo) desde el servidor
  useEffect(() => {
    if (!libroSeleccionado?.id) {
      setCapitulosDisponibles([]);
      setVersiculosDisponibles([]);
      setVersiculosPorCapituloActual([]);
      setCapitulo('');
      setVersiculo('');
      return;
    }

    setCapitulo('');
    setVersiculo('');
    setVersiculosDisponibles([]);
    setVersiculosPorCapituloActual([]);

    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;

    fetch(`${base}/api/biblia/estructura/${encodeURIComponent(libroSeleccionado.id)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && json.capitulos > 0) {
          setCapitulosDisponibles(Array.from({ length: json.capitulos }, (_, i) => i + 1));
          setVersiculosPorCapituloActual(json.versiculosPorCapitulo || []);
        }
      })
      .catch(() => { /* error de red: dejar arrays vacíos */ });
  }, [libroSeleccionado?.id, serverBaseUrl]);

  // Actualizar versículos disponibles cuando cambia el capítulo
  useEffect(() => {
    if (!libroSeleccionado?.id || !capitulo) {
      setVersiculosDisponibles([]);
      setVersiculo('');
      return;
    }

    const capIdx = Number(capitulo) - 1;
    const numVersiculos = versiculosPorCapituloActual[capIdx];
    if (numVersiculos > 0) {
      setVersiculosDisponibles(Array.from({ length: numVersiculos }, (_, i) => i + 1));
    } else {
      setVersiculosDisponibles([]);
    }
    setVersiculo('');
  }, [libroSeleccionado?.id, capitulo, versiculosPorCapituloActual]);

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

  const abrirFormHimno = (himno = null) => {
    if (himno) {
      const rawId = String(himno.id || '').replace('db:', '');
      setHimnoFormId(rawId);
      setHimnoFormNumero(String(himno.numero || ''));
      setHimnoFormTitulo(String(himno.titulo || ''));
      setHimnoFormLetra(Array.isArray(himno.parrafos) ? himno.parrafos.join('\n\n') : '');
    } else {
      setHimnoFormId(null);
      setHimnoFormNumero('');
      setHimnoFormTitulo('');
      setHimnoFormLetra('');
    }
    setModalHimnoForm(true);
  };

  const guardarHimnoPersonal = async () => {
    if (!himnoFormTitulo.trim()) {
      Alert.alert('Campo requerido', 'El título es obligatorio.');
      return;
    }
    if (!himnoFormLetra.trim()) {
      Alert.alert('Campo requerido', 'La letra es obligatoria.');
      return;
    }
    if (!himnosPersonalCrudUrl) {
      Alert.alert('Sin conexión', 'Conéctate al servidor antes de guardar.');
      return;
    }
    Keyboard.dismiss();
    setGuardandoHimno(true);
    try {
      const body = {
        numero: himnoFormNumero.trim(),
        titulo: himnoFormTitulo.trim(),
        letra: himnoFormLetra,
      };
      const url = himnoFormId
        ? `${himnosPersonalCrudUrl}/${himnoFormId}`
        : himnosPersonalCrudUrl;
      const method = himnoFormId ? 'PUT' : 'POST';

      const { res, json } = await fetchJsonTimeout(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 15000,
      });

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setModalHimnoForm(false);
      await cargarCatalogoHimnos();
    } catch (err) {
      Alert.alert('Error al guardar', err?.message || 'No se pudo guardar el himno.');
    } finally {
      setGuardandoHimno(false);
    }
  };

  const eliminarHimnoPersonal = async (himno) => {
    const rawId = String(himno?.id || '').replace('db:', '');
    if (!rawId) { Alert.alert('Error', 'ID de himno inválido.'); return; }
    if (!himnosPersonalCrudUrl) { Alert.alert('Sin conexión', 'Conéctate al servidor antes de eliminar.'); return; }

    Alert.alert(
      'Eliminar himno',
      `¿Eliminar "${himno?.titulo || 'este himno'}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setGuardandoHimno(true);
            try {
              const { res, json } = await fetchJsonTimeout(`${himnosPersonalCrudUrl}/${rawId}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
                timeoutMs: 15000,
              });
              if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
              setModalHimnoForm(false);
              await cargarCatalogoHimnos();
            } catch (err) {
              Alert.alert('Error al eliminar', err?.message || 'No se pudo eliminar el himno.');
            } finally {
              setGuardandoHimno(false);
            }
          },
        },
      ]
    );
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

      // Cargar estado de reproducción actual al actualizar la lista
      cargarEstadoMultimediaInicial();
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
      } else if (action === 'play' || action === 'pause' || action === 'stop') {
        pendingMultimediaActionRef.current = action;
      }
      return;
    }

    // Estado local optimista: actualizar UI sin esperar al roundtrip HTTP.
    if (action === 'play') setEstadoReproduccion('playing');
    if (action === 'pause') setEstadoReproduccion('paused');
    if (action === 'stop') setEstadoReproduccion('stopped');
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
      if (action === 'stop') setEstadoReproduccion('stopped');
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

      const pendingAction = pendingMultimediaActionRef.current;
      pendingMultimediaActionRef.current = null;
      if (pendingAction) {
        setTimeout(() => { controlarMultimedia(pendingAction); }, 0);
      } else {
        const pending = pendingMultimediaVolumeRef.current;
        pendingMultimediaVolumeRef.current = null;
        if (pending && typeof pending.volume === 'number') {
          // Ejecutar en el próximo tick para evitar competir con el setState.
          setTimeout(() => {
            controlarMultimedia('volume', pending);
          }, 0);
        }
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

    const prevEstadoReproduccion = estadoReproduccion;
    const prevMultimediaSesion = multimediaSesion;
    const prevUltimoComando = ultimoComandoControl;
    const prevVolumenNivel = volumenNivel;

    // Actualizar UI inmediatamente sin esperar respuesta del servidor.
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
      // Revertir estado optimista si falló.
      setEstadoReproduccion(prevEstadoReproduccion);
      setMultimediaSesion(prevMultimediaSesion);
      setUltimoComandoControl(prevUltimoComando);
      setVolumenNivel(prevVolumenNivel);
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

  const cargarOrdenes = async () => {
    if (!ordenesApiUrl) return;
    if (cargandoOrdenes) return;
    setCargandoOrdenes(true);
    try {
      const { res, json } = await fetchJsonTimeout(ordenesApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok || !Array.isArray(json?.ordenes)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      setOrdenes(json.ordenes);
    } catch (err) {
      setOrdenes([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando órdenes.' : err?.message || 'Error cargando órdenes.',
      );
    } finally {
      setCargandoOrdenes(false);
    }
  };

  const proyectarItemOrden = async (itemIdx, parrafoIdx = 0) => {
    if (!ordenesProyectarItemUrl || !ordenSeleccionada?.id) return;
    if (proyectandoOrden) return;
    // Actualizar posición inmediatamente para que Anterior/Siguiente respondan al instante
    setItemOrdActivo(itemIdx);
    setParrafoOrdActivo(parrafoIdx);
    setProyectandoOrden(true);
    try {
      const { res, json } = await fetchJsonTimeout(ordenesProyectarItemUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenId: ordenSeleccionada.id, itemIdx, parrafoIdx }),
        timeoutMs: 20000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
    } catch (err) {
      reportarErrorSinDesconectar(err?.message || 'Error proyectando item.');
    } finally {
      setProyectandoOrden(false);
    }
  };

  const siguienteItemOrden = () => {
    if (!ordenSeleccionada) return;
    const items = Array.isArray(ordenSeleccionada.items) ? ordenSeleccionada.items : [];
    const item = items[itemOrdActivo];
    const parrafos = item?.tipo === 'himno' && Array.isArray(item.parrafos) ? item.parrafos : [];
    // Solo avanza dentro de las estrofas del himno actual — no salta al siguiente ítem
    if (parrafos.length > 0 && parrafoOrdActivo < parrafos.length - 1) {
      proyectarItemOrden(itemOrdActivo, parrafoOrdActivo + 1);
    }
  };

  const anteriorItemOrden = () => {
    if (!ordenSeleccionada) return;
    // Solo retrocede dentro de las estrofas del himno actual — no salta al ítem anterior
    if (parrafoOrdActivo > 0) {
      proyectarItemOrden(itemOrdActivo, parrafoOrdActivo - 1);
    }
  };

  const abrirEditorOrden = (orden = null) => {
    if (orden) {
      setOrdenEditId(orden.id);
      setOrdenEditTitulo(orden.titulo || '');
      setOrdenEditFecha(orden.fecha || '');
      setOrdenEditItems(Array.isArray(orden.items) ? orden.items.map((it) => ({ ...it })) : []);
    } else {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      setOrdenEditId(null);
      setOrdenEditTitulo('');
      setOrdenEditFecha(`${yyyy}-${mm}-${dd}`);
      setOrdenEditItems([]);
    }
    setModalOrdenEditor(true);
  };

  const guardarOrdenEdicion = async () => {
    if (!ordenesApiUrl) return;
    if (!ordenEditTitulo.trim()) {
      Alert.alert('Error', 'El título es requerido.');
      return;
    }
    setGuardandoOrden(true);
    try {
      const url = ordenEditId ? `${ordenesApiUrl}/${ordenEditId}` : ordenesApiUrl;
      const method = ordenEditId ? 'PUT' : 'POST';
      const { res, json } = await fetchJsonTimeout(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: ordenEditTitulo.trim(), fecha: ordenEditFecha.trim(), items: ordenEditItems }),
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setModalOrdenEditor(false);
      await cargarOrdenes();
    } catch (err) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la orden.');
    } finally {
      setGuardandoOrden(false);
    }
  };

  const eliminarOrdenEdicion = () => {
    if (!ordenesApiUrl || !ordenEditId) return;
    Alert.alert('Eliminar orden', '¿Seguro que deseas eliminar esta orden de servicio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            const { res, json } = await fetchJsonTimeout(`${ordenesApiUrl}/${ordenEditId}`, {
              method: 'DELETE',
              headers: { Accept: 'application/json' },
              timeoutMs: 10000,
            });
            if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
            setModalOrdenEditor(false);
            setOrdenSeleccionada(null);
            await cargarOrdenes();
          } catch (err) {
            Alert.alert('Error', err?.message || 'No se pudo eliminar la orden.');
          }
        },
      },
    ]);
  };

  const cargarHimnosParaPicker = async (tipo) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;
    const tipoApi = tipo === 'vidaCristiana' ? 'vida' : tipo === 'personal' ? 'personal' : 'moravo';
    setCargandoPickerHimno(true);
    setPickerHimnoLista([]);
    try {
      const { res, json } = await fetchJsonTimeout(`${base}/api/himnos?tipo=${tipoApi}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setPickerHimnoLista(Array.isArray(json?.himnos) ? json.himnos : []);
    } catch (err) {
      setPickerHimnoLista([]);
    } finally {
      setCargandoPickerHimno(false);
    }
  };

  const addItemHimno = (himno) => {
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      tipo: 'himno',
      tituloHimno: himno.titulo,
      numeroHimno: himno.numero,
      tipoHimno: pickerHimnoTipo,
      parrafos: Array.isArray(himno.parrafos) ? himno.parrafos : [],
    };
    setOrdenEditItems((prev) => [...prev, newItem]);
    setModalPickerHimno(false);
  };

  const addItemVersiculo = (libroId, libroNombre, cap, verIdx, texto) => {
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      tipo: 'versiculo',
      libroId,
      libroNombre,
      capitulo: cap,
      versiculo: verIdx + 1,
      texto,
    };
    // No cierra el modal — el usuario puede seguir agregando versículos del mismo capítulo
    setOrdenEditItems((prev) => [...prev, newItem]);
  };

  const addItemNota = () => {
    if (!pickerNotaTexto.trim()) return;
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      tipo: 'nota',
      texto: pickerNotaTexto.trim(),
    };
    setOrdenEditItems((prev) => [...prev, newItem]);
    setModalPickerNota(false);
    setPickerNotaTexto('');
  };

  const removeOrdenItem = (idx) => {
    setOrdenEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveOrdenItem = (idx, dir) => {
    setOrdenEditItems((prev) => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      const tmp = arr[idx];
      arr[idx] = arr[newIdx];
      arr[newIdx] = tmp;
      return arr;
    });
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

  // ── Anuncios ───────────────────────────────────────────────────────────────
  const cargarAnuncios = async () => {
    if (!anunciosApiUrl) return;
    if (cargandoAnuncios) return;
    setCargandoAnuncios(true);
    try {
      const { res, json } = await fetchJsonTimeout(anunciosApiUrl, {
        method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 12000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setAnuncios(Array.isArray(json.anuncios) ? json.anuncios : []);
    } catch (err) {
      setAnuncios([]);
      reportarErrorSinDesconectar(err?.name === 'AbortError' ? 'Timeout cargando anuncios.' : err?.message || 'Error cargando anuncios.');
    } finally {
      setCargandoAnuncios(false);
    }
  };

  const proyectarAnuncio = async (id) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base || !id) return;
    setProyectandoAnuncioId(id);
    try {
      const { res, json } = await fetchJsonTimeout(`${base}/api/control/anuncios/proyectar`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }), timeoutMs: 12000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
    } catch (err) {
      reportarErrorSinDesconectar(err?.name === 'AbortError' ? 'Timeout proyectando anuncio.' : err?.message || 'Error proyectando anuncio.');
    } finally {
      setProyectandoAnuncioId(null);
    }
  };

  const limpiarAnuncioProyector = async () => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;
    setLimpiandoAnuncio(true);
    try {
      await fetchJsonTimeout(`${base}/api/control/anuncios/limpiar`, {
        method: 'POST', headers: { Accept: 'application/json' }, timeoutMs: 8000,
      });
    } catch (err) {
      reportarErrorSinDesconectar(err?.message || 'Error limpiando pantalla.');
    } finally {
      setLimpiandoAnuncio(false);
    }
  };

  // ── Temporizador ───────────────────────────────────────────────────────────
  const cargarTimerEstado = async () => {
    if (!timerApiBase) return;
    try {
      const { res, json } = await fetchJsonTimeout(`${timerApiBase}/temporizador/estado`, {
        method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 5000,
      });
      if (res.ok && json?.ok && json?.estado) setTimerEstado(json.estado);
    } catch {}
  };

  const configurarTimer = async (min) => {
    setTimerMinutos(min);
    if (!timerApiBase || !conectado) return;
    try {
      const { res, json } = await fetchJsonTimeout(`${timerApiBase}/control/temporizador/configurar`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutos: min }), timeoutMs: 8000,
      });
      if (res.ok && json?.ok && json?.estado) setTimerEstado(json.estado);
    } catch {}
  };

  const controlarTimer = async (accion, params = {}) => {
    if (!timerApiBase || controlandoTimer) return;
    setControlandoTimer(true);
    try {
      const { res, json } = await fetchJsonTimeout(`${timerApiBase}/control/temporizador/${accion}`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(params), timeoutMs: 10000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      if (json?.estado) setTimerEstado(json.estado);
    } catch (err) {
      reportarErrorSinDesconectar(err?.name === 'AbortError' ? 'Timeout controlando temporizador.' : err?.message || 'Error controlando temporizador.');
    } finally {
      setControlandoTimer(false);
    }
  };

  // ── Plantillas ─────────────────────────────────────────────────────────────
  const cargarPlantillas = async () => {
    if (!plantillasApiUrl) return;
    if (cargandoPlantillas) return;
    setCargandoPlantillas(true);
    try {
      const { res, json } = await fetchJsonTimeout(plantillasApiUrl, {
        method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 12000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setPlantillas(Array.isArray(json.plantillas) ? json.plantillas : []);
      setPlantillaActivaId(json.activa || null);
    } catch (err) {
      setPlantillas([]);
      reportarErrorSinDesconectar(err?.name === 'AbortError' ? 'Timeout cargando plantillas.' : err?.message || 'Error cargando plantillas.');
    } finally {
      setCargandoPlantillas(false);
    }
  };

  const activarPlantilla = async (id) => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base || !id) return;
    setActivandoPlantillaId(id);
    try {
      const { res, json } = await fetchJsonTimeout(`${base}/api/control/plantillas/activar`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }), timeoutMs: 10000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setPlantillaActivaId(id);
      setPlantillas((prev) => prev.map((p) => ({ ...p, activa: p.id === id })));
    } catch (err) {
      reportarErrorSinDesconectar(err?.message || 'Error activando plantilla.');
    } finally {
      setActivandoPlantillaId(null);
    }
  };

  const desactivarPlantilla = async () => {
    const base = normalizarBaseUrl(serverBaseUrl);
    if (!base) return;
    setActivandoPlantillaId('desactivar');
    try {
      const { res, json } = await fetchJsonTimeout(`${base}/api/control/plantillas/desactivar`, {
        method: 'POST', headers: { Accept: 'application/json' }, timeoutMs: 10000,
      });
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setPlantillaActivaId(null);
      setPlantillas((prev) => prev.map((p) => ({ ...p, activa: false })));
    } catch (err) {
      reportarErrorSinDesconectar(err?.message || 'Error desactivando plantilla.');
    } finally {
      setActivandoPlantillaId(null);
    }
  };

  const multimediaFiltrada = useMemo(() => {
    const term = (multimediaBusqueda || '').trim().toLowerCase();
    const base = Array.isArray(multimediaFiles) ? multimediaFiles : [];
    return base
      .filter((m) => {
        if (multimediaFiltro !== 'all' && normalizarTipoMultimedia(m) !== multimediaFiltro) return false;
        if (!term) return true;
        const nombre = String(m?.nombre || '').toLowerCase();
        const tipo = String(m?.tipo || '').toLowerCase();
        const tipoNorm = normalizarTipoMultimedia(m);
        return nombre.includes(term) || tipo.includes(term) || String(tipoNorm).includes(term);
      })
      .sort((a, b) =>
        String(a?.nombre || '').toLowerCase().localeCompare(String(b?.nombre || '').toLowerCase())
      );
  }, [multimediaBusqueda, multimediaFiles, multimediaFiltro]);

  const favoritosMultimedia = useMemo(
    () => (Array.isArray(multimediaFiles) ? multimediaFiles : []).filter((m) => Boolean(m?.favorito)),
    [multimediaFiles],
  );

  const favoritosPresentaciones = [];

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
    if (seccion === 'fondos') {
      cargarFondos();
    }
    if (seccion === 'favoritos') {
      if (!multimediaFiles.length) cargarMultimedia();
      cargarFavoritosHimnos();
      cargarFavoritosBiblia();
    }
    if (seccion === 'anuncios') {
      cargarAnuncios();
    }
    if (seccion === 'temporizador') {
      // Al abrir la sección: carga estado y sincroniza preset con el total del servidor (una sola vez)
      (async () => {
        if (!timerApiBase) return;
        try {
          const { res, json } = await fetchJsonTimeout(`${timerApiBase}/temporizador/estado`, {
            method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 5000,
          });
          if (res?.ok && json?.ok && json?.estado) {
            setTimerEstado(json.estado);
            if (!json.estado.corriendo && !json.estado.terminado && json.estado.total) {
              const min = Math.round(json.estado.total / 60);
              if (min >= 1) setTimerMinutos(min);
            }
          }
        } catch {}
      })();
    }
    if (seccion === 'plantillas') {
      cargarPlantillas();
    }
    if (seccion === 'presentaciones') {
      cargarOrdenes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, conectado]);

  // Polling global del timer — cuando está corriendo, actualizar en cualquier sección (para el indicador del header)
  useEffect(() => {
    if (!conectado || !timerApiBase) return;
    const interval = setInterval(async () => {
      // Solo hacer fetch si el timer está activo O si estamos en la sección del timer
      const timerActivo = timerEstado?.corriendo && timerEstado?.proyectando && !timerEstado?.terminado;
      if (timerActivo || seccion === 'temporizador') {
        await cargarTimerEstado();
      }
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado, timerApiBase, timerEstado?.corriendo, timerEstado?.proyectando]);

  // Polling del temporizador cuando la sección está activa (redundante pero más frecuente en la vista)
  useEffect(() => {
    if (seccion !== 'temporizador' || !conectado) return;
    const interval = setInterval(cargarTimerEstado, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, conectado, timerApiBase]);

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
              <Text style={styles.title}>GloryView</Text>
              <Text style={styles.subtitle}>
                {conectado ? 'Conectado al PC' : 'Sin conexión'}
              </Text>
            </View>

            {/* Indicador de timer activo — visible en cualquier sección */}
            {timerEstado?.proyectando && timerEstado?.corriendo && !timerEstado?.terminado && (
              <Pressable
                onPress={() => setSeccion('temporizador')}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: 'rgba(99,102,241,0.18)',
                  borderColor: 'rgba(99,102,241,0.40)',
                  borderWidth: 1, borderRadius: 10,
                  paddingHorizontal: 8, paddingVertical: 4,
                  marginRight: 6,
                }, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="timer" size={13} color="#818cf8" />
                <Text style={{ color: '#a5b4fc', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {(() => {
                    const seg = Number(timerEstado?.segundosRestantes ?? 0);
                    const m = Math.floor(seg / 60);
                    const s = seg % 60;
                    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                  })()}
                </Text>
              </Pressable>
            )}

            <View
              style={[
                styles.badge,
                conectado ? styles.badgeSuccess : styles.badgeMuted,
              ]}
            >
              <Ionicons
                name={conectado ? 'wifi' : 'wifi-outline'}
                size={14}
                color={conectado ? '#10b981' : '#94a3b8'}
                style={{ marginRight: 4 }}
              />
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
              <Ionicons
                name="trash-outline"
                size={18}
                color={conectado ? '#f43f5e' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.limpiarButtonText, conectado && { color: '#f43f5e' }]}>Limpiar</Text>
            </Pressable>

            {seccion !== 'inicio' && (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setSeccion('inicio');
                }}
                style={({ pressed }) => [
                  styles.homeIconButton,
                  pressed && styles.buttonPressed,
                ]}
                hitSlop={10}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color="#10b981"
                />
              </Pressable>
            )}
          </View>

          {menuAbierto && (
            <View style={styles.drawerContainer}>
              <View style={styles.drawer}>
                <Text style={styles.drawerTitle}>Menú</Text>

                <ScrollView contentContainerStyle={{ paddingBottom: 12, flex: 1 }}>
                  <Pressable
                    onPress={() => {
                      setSeccion('inicio');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'inicio' && { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="home"
                      size={20}
                      color={seccion === 'inicio' ? '#10b981' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'inicio' && { color: '#10b981' }]}>
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
                      seccion === 'conexion' && { backgroundColor: 'rgba(59,130,246,0.16)', borderColor: 'rgba(59,130,246,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="wifi"
                      size={20}
                      color={seccion === 'conexion' ? '#60a5fa' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'conexion' && { color: '#60a5fa' }]}>
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
                      seccion === 'himnos' && { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="musical-notes"
                      size={20}
                      color={seccion === 'himnos' ? '#10b981' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'himnos' && { color: '#10b981' }]}>
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
                      seccion === 'biblia' && { backgroundColor: 'rgba(99,102,241,0.16)', borderColor: 'rgba(99,102,241,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="book"
                      size={20}
                      color={seccion === 'biblia' ? '#6366f1' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'biblia' && { color: '#6366f1' }]}>
                      Biblia
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('multimedia');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'multimedia' && { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="play-circle"
                      size={20}
                      color={seccion === 'multimedia' ? '#f59e0b' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'multimedia' && { color: '#f59e0b' }]}>
                      Multimedia
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('fondos');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'fondos' && { backgroundColor: 'rgba(168,85,247,0.16)', borderColor: 'rgba(168,85,247,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="image"
                      size={20}
                      color={seccion === 'fondos' ? '#a855f7' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'fondos' && { color: '#a855f7' }]}>
                      Fondos
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSeccion('favoritos');
                      setMenuAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'favoritos' && { backgroundColor: 'rgba(244,63,94,0.16)', borderColor: 'rgba(244,63,94,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons
                      name="heart"
                      size={20}
                      color={seccion === 'favoritos' ? '#f43f5e' : '#cbd5e1'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.drawerItemText, seccion === 'favoritos' && { color: '#f43f5e' }]}>
                      Favoritos
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSeccion('anuncios'); setMenuAbierto(false); }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'anuncios' && { backgroundColor: 'rgba(236,72,153,0.16)', borderColor: 'rgba(236,72,153,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons name="megaphone" size={20} color={seccion === 'anuncios' ? '#ec4899' : '#cbd5e1'} style={{ marginRight: 12 }} />
                    <Text style={[styles.drawerItemText, seccion === 'anuncios' && { color: '#ec4899' }]}>Anuncios</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSeccion('temporizador'); setMenuAbierto(false); }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'temporizador' && { backgroundColor: 'rgba(99,102,241,0.16)', borderColor: 'rgba(99,102,241,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons name="timer" size={20} color={seccion === 'temporizador' ? '#6366f1' : '#cbd5e1'} style={{ marginRight: 12 }} />
                    <Text style={[styles.drawerItemText, seccion === 'temporizador' && { color: '#6366f1' }]}>Temporizador</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSeccion('plantillas'); setMenuAbierto(false); }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'plantillas' && { backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons name="color-palette" size={20} color={seccion === 'plantillas' ? '#14b8a6' : '#cbd5e1'} style={{ marginRight: 12 }} />
                    <Text style={[styles.drawerItemText, seccion === 'plantillas' && { color: '#14b8a6' }]}>Plantillas</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSeccion('presentaciones'); setMenuAbierto(false); }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      seccion === 'presentaciones' && { backgroundColor: 'rgba(251,146,60,0.16)', borderColor: 'rgba(251,146,60,0.35)' },
                      pressed && styles.parrafoPressed,
                    ]}
                  >
                    <Ionicons name="list" size={20} color={seccion === 'presentaciones' ? '#fb923c' : '#cbd5e1'} style={{ marginRight: 12 }} />
                    <Text style={[styles.drawerItemText, seccion === 'presentaciones' && { color: '#fb923c' }]}>Orden de Servicio</Text>
                  </Pressable>

                  <View style={{ flex: 1 }} />

                  <View style={styles.drawerFooter}>
                    <View style={styles.drawerVersion}>
                      <Ionicons name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.drawerVersionText}>Versión 1.0.0</Text>
                    </View>
                    <View style={styles.drawerDeveloper}>
                      <Ionicons name="code-slash" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.drawerDeveloperText}>Desarrollado por</Text>
                    </View>
                    <Text style={styles.drawerDeveloperName}>Alfredo Hammer</Text>
                  </View>
                </ScrollView>
              </View>

              <Pressable
                style={styles.drawerBackdrop}
                onPress={() => setMenuAbierto(false)}
              />
            </View>
          )}

          <View style={styles.content}>
            {seccion === 'inicio' && (() => {
              const isTablet   = screenWidth >= 600;
              const cols       = screenWidth >= 900 ? 4 : 3;
              const padH       = isTablet ? 20 : 16;
              const gap        = isTablet ? 12 : 10;
              // Móvil: altura fija. Tablet: altura calculada para llenar pantalla
              const pillH      = 60; // barra de estado aprox
              const footerH    = 36;
              const vertPad    = 14 + 20; // paddingTop + paddingBottom
              const numRows    = Math.ceil(9 / cols);
              const tabletCardH = Math.min(
                130,
                Math.max(80, (screenHeight - pillH - footerH - vertPad - (numRows - 1) * gap) / numRows)
              );
              const cardH      = isTablet ? tabletCardH : 90;
              const iconBoxSz  = isTablet ? 50 : 42;
              const iconSz     = isTablet ? 24 : 20;
              const iconRadius = 13;
              const lblSz      = isTablet ? 13 : 11;

              const ITEMS = [
                { id: 'himnos',         label: 'Himnos',           icon: 'musical-notes',  color: '#10b981' },
                { id: 'biblia',         label: 'Biblia',           icon: 'book',           color: '#818cf8' },
                { id: 'presentaciones', label: 'Orden de Servicio',icon: 'list',           color: '#fb923c' },
                { id: 'multimedia',     label: 'Multimedia',       icon: 'play-circle',    color: '#f59e0b' },
                { id: 'fondos',         label: 'Fondos',           icon: 'image',          color: '#a855f7' },
                { id: 'favoritos',      label: 'Favoritos',        icon: 'heart',          color: '#f43f5e' },
                { id: 'anuncios',       label: 'Anuncios',         icon: 'megaphone',      color: '#ec4899' },
                { id: 'temporizador',   label: 'Temporizador',     icon: 'timer',          color: '#6366f1' },
                { id: 'plantillas',     label: 'Plantillas',       icon: 'color-palette',  color: '#14b8a6' },
              ];

              const toRows = (arr) => {
                const rows = [];
                for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
                return rows;
              };
              const rows = toRows(ITEMS);

              // fixedH: height fija (móvil). undefined: la fila padre define la altura (tablet)
              const Card = ({ item, isLast, fixedH }) => (
                <Pressable
                  onPress={() => { Keyboard.dismiss(); setSeccion(item.id); }}
                  style={({ pressed }) => [{
                    flex: 1,
                    ...(fixedH ? { height: fixedH } : {}),
                    marginRight: isLast ? 0 : gap,
                    borderRadius: 16,
                    backgroundColor: 'rgba(15,23,42,0.55)',
                    borderWidth: 1,
                    borderColor: item.color + '40',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                  },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <View style={{
                    width: iconBoxSz, height: iconBoxSz,
                    borderRadius: iconRadius,
                    backgroundColor: item.color + '22',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 8,
                  }}>
                    <Ionicons name={item.icon} size={iconSz} color={item.color} />
                  </View>
                  <Text style={{
                    color: '#cbd5e1', fontSize: lblSz, fontWeight: '600',
                    textAlign: 'center', letterSpacing: 0.1,
                  }} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              );

              const proyectando = estadoReproduccion === 'playing';
              const enPausa     = estadoReproduccion === 'paused';
              const hayMedia    = proyectando || enPausa;
              const nombreMedia = String(multimediaActiva?.nombre || multimediaUltimaProyectada?.nombre || '');

              // Barra de estado — igual para móvil y tablet
              const StatusPill = () => hayMedia && !!nombreMedia ? (
                <Pressable
                  onPress={() => { Keyboard.dismiss(); setSeccion('multimedia'); }}
                  style={({ pressed }) => [{
                    borderRadius: 14, marginBottom: 14,
                    borderWidth: 1, borderColor: proyectando ? 'rgba(245,158,11,0.30)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: proyectando ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
                  }, pressed && { opacity: 0.75 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: proyectando ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={proyectando ? 'volume-high' : 'pause'} size={17} color={proyectando ? '#f59e0b' : '#64748b'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: proyectando ? '#fbbf24' : '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 }}>
                        {proyectando ? 'Reproduciendo' : 'En pausa'}
                      </Text>
                      <Text style={{ color: '#f1f5f9', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{nombreMedia}</Text>
                    </View>
                    {proyectando && <AnimatedSoundBars />}
                    <Ionicons name="chevron-forward" size={14} color="#334155" />
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => { Keyboard.dismiss(); setSeccion('conexion'); }}
                  style={({ pressed }) => [{
                    borderRadius: 14, marginBottom: 14,
                    borderWidth: 1,
                    borderColor: conectado ? 'rgba(16,185,129,0.20)' : 'rgba(96,165,250,0.18)',
                    backgroundColor: conectado ? 'rgba(16,185,129,0.07)' : 'rgba(59,130,246,0.07)',
                  }, pressed && { opacity: 0.75 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: conectado ? 'rgba(16,185,129,0.12)' : 'rgba(96,165,250,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={conectado ? 'checkmark-circle' : 'wifi-outline'} size={16} color={conectado ? '#10b981' : '#60a5fa'} />
                    </View>
                    <Text style={{ flex: 1, color: conectado ? '#6ee7b7' : '#93c5fd', fontWeight: '600', fontSize: 12 }}>
                      {conectado ? '' : 'Sin conexión — toca para conectar'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#334155" />
                  </View>
                </Pressable>
              );

              // tablet=true → filas con flex:1 para llenar toda la altura disponible
              const Grid = ({ tablet = false }) => (
                <View style={tablet ? { flex: 1 } : { gap: gap }}>
                  {rows.map((row, ri) => (
                    <View
                      key={ri}
                      style={[
                        { flexDirection: 'row' },
                        tablet
                          ? { flex: 1, marginBottom: ri < rows.length - 1 ? gap : 0 }
                          : {},
                      ]}
                    >
                      {row.map((item, ci) => (
                        <Card
                          key={item.id}
                          item={item}
                          isLast={ci === row.length - 1}
                          fixedH={tablet ? undefined : cardH}
                        />
                      ))}
                      {Array(cols - row.length).fill(null).map((_, i) => (
                        <View key={`fill${i}`} style={{ flex: 1, marginRight: i < cols - row.length - 1 ? gap : 0 }} />
                      ))}
                    </View>
                  ))}
                </View>
              );

              const Footer = () => (
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                  <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }}>
                    GloryView · Alfredo Hammer
                  </Text>
                </View>
              );

              // Tablet: filas con flex:1 llenan toda la pantalla
              if (isTablet) {
                return (
                  <View style={{ flex: 1, paddingHorizontal: padH, paddingTop: 14, paddingBottom: 14 }}>
                    <StatusPill />
                    <Grid tablet />
                    <Footer />
                  </View>
                );
              }

              // Móvil: ScrollView con alturas fijas
              return (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: padH, paddingTop: 14, paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  <StatusPill />
                  <Grid />
                  <Footer />
                </ScrollView>
              );
            })()}

            {seccion === 'conexion' && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Conexión</Text>
                <Text style={styles.smallText}>Escanea el QR o pega la URL.</Text>

                {tipoConexion && tipoConexion !== 'wifi' && (
                  <View style={{ backgroundColor: 'rgba(234,179,8,0.12)', borderColor: 'rgba(234,179,8,0.35)', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4 }}>
                    <Text style={{ color: '#fbbf24', fontSize: 13 }}>
                      ⚠️ Estás en {tipoConexion === 'cellular' ? 'datos móviles' : tipoConexion}. Para conectar al proyector debes usar Wi-Fi en la misma red que el PC.
                    </Text>
                  </View>
                )}

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

                    {/* Barra búsqueda + botón agregar (solo en Personalizados) */}
                    <View style={styles.row}>
                      <TextInput
                        value={busqueda}
                        onChangeText={setBusqueda}
                        placeholder="Buscar por número o título"
                        placeholderTextColor="#7c7c7c"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      />
                      {tipo === 'personal' && (
                        <Pressable
                          onPress={() => conectado && abrirFormHimno()}
                          disabled={!conectado}
                          style={({ pressed }) => [
                            styles.smallButtonPrimary,
                            { marginLeft: 8, paddingHorizontal: 14 },
                            !conectado && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonPrimaryText}>＋</Text>
                        </Pressable>
                      )}
                    </View>

                    <FlatList
                      data={listaFiltrada}
                      keyExtractor={(item) =>
                        String(
                          item?.id ||
                          `${tipo}:${String(item?.numero ?? '')}:${String(item?.titulo ?? '')}`,
                        )
                      }
                      contentContainerStyle={[styles.listContent, { marginTop: 8 }]}
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
                              {item.numero ? `${item.numero}. ` : ''}{item.titulo}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {Array.isArray(item.parrafos)
                                ? `${item.parrafos.length} párrafos`
                                : '—'}
                            </Text>
                          </Pressable>

                          {/* Editar — solo himnos personalizados */}
                          {String(item?.id || '').startsWith('db:') && (
                            <Pressable
                              onPress={() => conectado && abrirFormHimno(item)}
                              disabled={!conectado}
                              style={({ pressed }) => [
                                styles.iconButton,
                                !conectado && styles.buttonDisabled,
                                pressed && conectado && styles.buttonPressed,
                              ]}
                              hitSlop={8}
                            >
                              <Ionicons name="pencil" size={14} color="#94a3b8" />
                            </Pressable>
                          )}

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
                      ListEmptyComponent={
                        tipo === 'personal' && !cargandoCatalogo ? (
                          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                            <Text style={styles.smallText}>No hay himnos personalizados.</Text>
                            <Pressable
                              onPress={() => conectado && abrirFormHimno()}
                              disabled={!conectado}
                              style={({ pressed }) => [styles.smallButtonPrimary, { marginTop: 12 }, pressed && styles.buttonPressed]}
                            >
                              <Text style={styles.smallButtonPrimaryText}>Agregar el primero</Text>
                            </Pressable>
                          </View>
                        ) : null
                      }
                    />
                  </View>
                )}
              </View>
            )}

            {/* ── Modal: Formulario Himno Personalizado ──────────────────── */}
            <Modal
              visible={modalHimnoForm}
              transparent
              animationType="slide"
              onRequestClose={() => !guardandoHimno && setModalHimnoForm(false)}
            >
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <Pressable
                  style={[styles.drawerBackdrop, { justifyContent: 'flex-end' }]}
                  onPress={() => !guardandoHimno && setModalHimnoForm(false)}
                >
                  <Pressable onPress={() => {}} style={[styles.card, { borderRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, margin: 0, paddingBottom: 32, maxHeight: '90%' }]}>
                    {/* Cabecera */}
                    <View style={[styles.rowBetween, { marginBottom: 16 }]}>
                      <Text style={styles.sectionTitle}>
                        {himnoFormId ? 'Editar Himno' : 'Nuevo Himno'}
                      </Text>
                      <Pressable onPress={() => !guardandoHimno && setModalHimnoForm(false)}>
                        <Ionicons name="close" size={22} color="#94a3b8" />
                      </Pressable>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      {/* Número */}
                      <Text style={[styles.smallText, { marginBottom: 4 }]}>Número (opcional)</Text>
                      <TextInput
                        value={himnoFormNumero}
                        onChangeText={setHimnoFormNumero}
                        placeholder="Ej: 145"
                        placeholderTextColor="#7c7c7c"
                        keyboardType="default"
                        style={[styles.input, { marginBottom: 12 }]}
                      />

                      {/* Título */}
                      <Text style={[styles.smallText, { marginBottom: 4 }]}>Título *</Text>
                      <TextInput
                        value={himnoFormTitulo}
                        onChangeText={setHimnoFormTitulo}
                        placeholder="Ej: Sublime Gracia"
                        placeholderTextColor="#7c7c7c"
                        style={[styles.input, { marginBottom: 12 }]}
                      />

                      {/* Letra */}
                      <Text style={[styles.smallText, { marginBottom: 4 }]}>Letra * <Text style={{ color: '#475569' }}>(separa estrofas con una línea en blanco)</Text></Text>
                      <TextInput
                        value={himnoFormLetra}
                        onChangeText={setHimnoFormLetra}
                        placeholder={"Primera estrofa…\n\nSegunda estrofa…"}
                        placeholderTextColor="#7c7c7c"
                        multiline
                        textAlignVertical="top"
                        style={[styles.input, { height: 200, marginBottom: 16 }]}
                      />

                      {/* Botones */}
                      <Pressable
                        onPress={guardarHimnoPersonal}
                        disabled={guardandoHimno}
                        style={({ pressed }) => [styles.smallButtonPrimary, { paddingVertical: 14, marginBottom: 10 }, guardandoHimno && styles.buttonDisabled, pressed && !guardandoHimno && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonPrimaryText}>
                          {guardandoHimno ? 'Guardando…' : himnoFormId ? 'Guardar cambios' : 'Agregar himno'}
                        </Text>
                      </Pressable>

                      {himnoFormId && (
                        <Pressable
                          onPress={() => eliminarHimnoPersonal({
                            id: `db:${himnoFormId}`,
                            titulo: himnoFormTitulo,
                          })}
                          disabled={guardandoHimno}
                          style={({ pressed }) => [
                            { paddingVertical: 14, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' },
                            guardandoHimno && styles.buttonDisabled,
                            pressed && !guardandoHimno && { opacity: 0.7 },
                          ]}
                        >
                          <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 14 }}>
                            {guardandoHimno ? 'Eliminando…' : 'Eliminar himno'}
                          </Text>
                        </Pressable>
                      )}
                    </ScrollView>
                  </Pressable>
                </Pressable>
              </KeyboardAvoidingView>
            </Modal>

            {seccion === 'biblia' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <Text style={styles.sectionTitle}>Biblia</Text>
                  <Text style={styles.smallText}>
                    Selecciona referencia y envía al proyector.
                  </Text>

                  {!libroSeleccionado ? (
                    <>
                      {/* Tabs para Antiguo y Nuevo Testamento */}
                      <View style={styles.tabsContainer}>
                        <Pressable
                          onPress={() => {
                            setBibliaTabActivo('antiguo');
                            Keyboard.dismiss();
                          }}
                          style={({ pressed }) => [
                            styles.tabButton,
                            bibliaTabActivo === 'antiguo' && styles.tabButtonActive,
                            pressed && styles.tabButtonPressed,
                          ]}
                        >
                          <Text style={[
                            styles.tabButtonText,
                            bibliaTabActivo === 'antiguo' && styles.tabButtonTextActive,
                          ]}>
                            Antiguo Testamento
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            setBibliaTabActivo('nuevo');
                            Keyboard.dismiss();
                          }}
                          style={({ pressed }) => [
                            styles.tabButton,
                            bibliaTabActivo === 'nuevo' && styles.tabButtonActive,
                            pressed && styles.tabButtonPressed,
                          ]}
                        >
                          <Text style={[
                            styles.tabButtonText,
                            bibliaTabActivo === 'nuevo' && styles.tabButtonTextActive,
                          ]}>
                            Nuevo Testamento
                          </Text>
                        </Pressable>
                      </View>

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
                          {capitulo && ` - Cap. ${capitulo}`}
                        </Text>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            if (capitulo) {
                              setCapitulo('');
                              setVersiculo('');
                            } else {
                              setLibroSeleccionado(null);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.smallButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonText}>
                            {capitulo ? 'Cambiar Cap.' : 'Cambiar Libro'}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Mostrar botones de capítulos si no hay capítulo seleccionado */}
                      {!capitulo && (
                        <>
                          <Text style={styles.label}>Selecciona un capítulo:</Text>
                          <ScrollView
                            style={{ maxHeight: 280, marginTop: 8 }}
                            showsVerticalScrollIndicator={true}
                          >
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 }}>
                              {capitulosDisponibles.map((numCap) => (
                                <Pressable
                                  key={numCap}
                                  onPress={() => {
                                    setCapitulo(String(numCap));
                                    setVersiculo('');
                                  }}
                                  style={({ pressed }) => [
                                    styles.bibliaButton,
                                    pressed && styles.bibliaButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.bibliaButtonText}>
                                    {numCap}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          </ScrollView>
                        </>
                      )}

                      {/* Mostrar botones de versículos si hay capítulo seleccionado */}
                      {capitulo && (
                        <>
                          <Text style={styles.label}>Selecciona un versículo:</Text>
                          <ScrollView
                            style={{ maxHeight: 200, marginTop: 8 }}
                            showsVerticalScrollIndicator={true}
                          >
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 }}>
                              {versiculosDisponibles.map((numVer) => (
                                <Pressable
                                  key={numVer}
                                  onPress={() => {
                                    setVersiculo(String(numVer));
                                  }}
                                  style={({ pressed }) => [
                                    styles.bibliaButton,
                                    versiculo === String(numVer) && styles.bibliaButtonActive,
                                    pressed && styles.bibliaButtonPressed,
                                  ]}
                                >
                                  <Text style={[
                                    styles.bibliaButtonText,
                                    versiculo === String(numVer) && styles.bibliaButtonTextActive,
                                  ]}>
                                    {numVer}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          </ScrollView>

                          <View style={{ marginTop: 12 }}>
                            <Text style={styles.smallText}>
                              Vista previa (anterior / actual / siguiente)
                            </Text>

                            {cargandoBibliaPreview && (
                              <View style={[styles.row, { marginTop: 8 }]}>
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
                        </>
                      )}

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

                  {!hayInternet && (
                    <View
                      style={{
                        backgroundColor: 'rgba(245,158,11,0.12)',
                        borderColor: 'rgba(245,158,11,0.3)',
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="wifi-outline" size={20} color="#f59e0b" />
                      <Text style={{ color: '#fbbf24', fontSize: 13, flex: 1 }}>
                        Sin conexión a Internet. Contenido en línea (YouTube) no estará disponible.
                      </Text>
                    </View>
                  )}

                  {!!multimediaError && (
                    <View style={styles.statusBox}>
                      <Text style={[styles.statusText, styles.statusError]}>{multimediaError}</Text>
                      {!!multimediaApiUrl && <Text style={styles.smallText}>Endpoint: {multimediaApiUrl}</Text>}
                    </View>
                  )}

                  {multimediaActiva ? (
                    <Pressable
                      key={`multimedia-banner-${multimediaActiva.id || 'active'}`}
                      onPress={() => {
                        const item = multimediaFiles.find((m) => String(m?.id) === String(multimediaActiva.id));
                        if (item) {
                          abrirModalMultimedia(item);
                        }
                      }}
                      style={({ pressed }) => [
                        {
                          backgroundColor: multimediaActiva.isPlaying ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          borderColor: multimediaActiva.isPlaying ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 12,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: multimediaActiva.isPlaying ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {multimediaActiva.isPlaying ? (
                            <View key="playing" style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                              <AnimatedSoundBars />
                            </View>
                          ) : (
                            <View key="paused" style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="pause" size={20} color="#f59e0b" />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 2 }} numberOfLines={1}>
                            {multimediaActiva.isPlaying ? '▶ Reproduciendo' : '⏸ En pausa'}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }} numberOfLines={1}>
                            {multimediaActiva.nombre} · {multimediaActiva.destino === 'pc' ? 'PC (audio)' : 'Proyector'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                      </View>
                    </Pressable>
                  ) : null}

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

                      const isItemActivo = multimediaActiva && String(multimediaActiva.id) === String(item?.id || '');

                      // Detectar si requiere internet (YouTube)
                      const ytId = getYouTubeIdFromItem(item);
                      const isYouTubeVideo = Boolean(ytId);
                      const requiereInternet = isYouTubeVideo;

                      return (
                        <View style={[
                          styles.itemRow,
                          isItemActivo && {
                            backgroundColor: multimediaActiva.isPlaying ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
                            borderColor: multimediaActiva.isPlaying ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)',
                            borderWidth: 1,
                          }
                        ]}>
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
                              <Text style={styles.itemMeta} numberOfLines={1}>
                                {String(item?.tipo || '—')}
                              </Text>
                            </View>
                          </Pressable>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {requiereInternet && !hayInternet && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(245,158,11,0.18)',
                                  borderWidth: 1,
                                  borderColor: 'rgba(245,158,11,0.35)',
                                  borderRadius: 8,
                                  padding: 4,
                                }}
                                key={`wifi-${item?.id}`}
                              >
                                <Ionicons name="wifi-outline" size={16} color="#f59e0b" />
                              </View>
                            )}
                            {String(multimediaSesion?.id || '') === String(item?.id || '') && (
                              <View key={`status-${item?.id}`} style={{ minWidth: 24, alignItems: 'center', justifyContent: 'center' }}>
                                {estadoReproduccion === 'playing' ? (
                                  <AnimatedSoundBars />
                                ) : (
                                  <View style={{ backgroundColor: 'rgba(220,38,38,0.18)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.35)', borderRadius: 8, padding: 4 }}>
                                    <Ionicons name="pause" size={16} color="#f87171" />
                                  </View>
                                )}
                              </View>
                            )}
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
                  <Text style={styles.sectionTitle}>Favoritos</Text>
                  <Text style={styles.smallText}>Acceso rápido a himnos y multimedia guardados.</Text>
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

                </View>
              </ScrollView>
            )}

            {/* ── Anuncios ────────────────────────────────────────────────────── */}
            {seccion === 'anuncios' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Anuncios</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={limpiarAnuncioProyector}
                        disabled={!conectado || limpiandoAnuncio}
                        style={({ pressed }) => [styles.smallButton, (!conectado || limpiandoAnuncio) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Limpiar</Text>
                      </Pressable>
                      <Pressable
                        onPress={cargarAnuncios}
                        disabled={!conectado || cargandoAnuncios}
                        style={({ pressed }) => [styles.smallButton, (!conectado || cargandoAnuncios) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.smallText}>Proyecta anuncios en el proyector.</Text>
                  {!conectado && <Text style={styles.smallText}>Tip: ve a Conexión para conectar al servidor.</Text>}
                  {cargandoAnuncios && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  <FlatList
                    data={anuncios}
                    keyExtractor={(item) => String(item?.id ?? item?.orden)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                      <View style={styles.itemRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          {!!item?.titulo && (
                            <Text style={styles.itemTitle} numberOfLines={1}>{String(item.titulo)}</Text>
                          )}
                          <Text style={[styles.itemMeta, item?.titulo ? {} : { color: '#e2e8f0', fontSize: 14 }]} numberOfLines={2}>
                            {String(item?.texto || '—')}
                          </Text>
                          <Text style={[styles.itemMeta, { fontSize: 11, marginTop: 2 }]}>
                            {String(item?.plantilla || 'moderno')}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => proyectarAnuncio(item.id)}
                          disabled={!conectado || !!proyectandoAnuncioId}
                          style={({ pressed }) => [
                            styles.smallButtonPrimary,
                            (!conectado || !!proyectandoAnuncioId) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonPrimaryText}>
                            {proyectandoAnuncioId === item.id ? '…' : 'Proyectar'}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    ListEmptyComponent={!cargandoAnuncios ? <Text style={styles.smallText}>No hay anuncios. Créalos desde el PC.</Text> : null}
                  />
                </View>
              </View>
            )}

            {/* ── Temporizador ────────────────────────────────────────────────── */}
            {seccion === 'temporizador' && (() => {
              const corriendo = Boolean(timerEstado?.corriendo);
              const proyectando = Boolean(timerEstado?.proyectando);
              const terminado = Boolean(timerEstado?.terminado);
              // Cuando el timer está parado, mostrar el preset seleccionado como preview
              const enReposo = !corriendo && !terminado;
              const seg = enReposo
                ? timerMinutos * 60
                : Number(timerEstado?.segundosRestantes ?? 0);
              const total = enReposo
                ? timerMinutos * 60
                : Number(timerEstado?.total ?? 600);
              const progreso = total > 0 ? Math.min(100, ((total - seg) / total) * 100) : 0;
              const esCritico = seg <= 60 && seg > 0 && !enReposo;
              const m = Math.floor(seg / 60);
              const s = seg % 60;
              const tiempoStr = terminado ? '¡Ya!' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              return (
                <ScrollView contentContainerStyle={{ paddingBottom: 14 }} keyboardShouldPersistTaps="handled">
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Temporizador</Text>
                    <Text style={styles.smallText}>Cuenta regresiva en el proyector.</Text>
                    {!conectado && <Text style={styles.smallText}>Tip: ve a Conexión para conectar al servidor.</Text>}

                    {/* Mensaje */}
                    <Text style={styles.label}>Mensaje en pantalla</Text>
                    <TextInput
                      value={timerMensajeInput}
                      onChangeText={setTimerMensajeInput}
                      placeholder="El culto comienza en"
                      placeholderTextColor="#64748b"
                      style={styles.input}
                      editable={!corriendo}
                    />

                    {/* Presets */}
                    <Text style={[styles.label, { marginTop: 8 }]}>Duración</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {[5, 10, 15, 20, 30].map((min) => (
                        <Pressable
                          key={min}
                          onPress={() => configurarTimer(min)}
                          disabled={corriendo}
                          style={({ pressed }) => [
                            styles.bibliaButton,
                            timerMinutos === min && styles.bibliaButtonActive,
                            corriendo && styles.buttonDisabled,
                            pressed && !corriendo && styles.bibliaButtonPressed,
                          ]}
                        >
                          <Text style={[styles.bibliaButtonText, timerMinutos === min && styles.bibliaButtonTextActive]}>
                            {min}m
                          </Text>
                        </Pressable>
                      ))}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                        <Pressable
                          onPress={() => !corriendo && timerMinutos > 1 && configurarTimer(timerMinutos - 1)}
                          disabled={corriendo || timerMinutos <= 1}
                          style={({ pressed }) => [{ width: 32, height: 34, alignItems: 'center', justifyContent: 'center' }, (corriendo || timerMinutos <= 1) && { opacity: 0.3 }]}
                        >
                          <Text style={{ color: '#e2e8f0', fontSize: 16 }}>−</Text>
                        </Pressable>
                        <Text style={{ color: '#fff', fontWeight: '700', minWidth: 28, textAlign: 'center', fontSize: 13 }}>{timerMinutos}m</Text>
                        <Pressable
                          onPress={() => !corriendo && timerMinutos < 99 && configurarTimer(timerMinutos + 1)}
                          disabled={corriendo || timerMinutos >= 99}
                          style={({ pressed }) => [{ width: 32, height: 34, alignItems: 'center', justifyContent: 'center' }, (corriendo || timerMinutos >= 99) && { opacity: 0.3 }]}
                        >
                          <Text style={{ color: '#e2e8f0', fontSize: 16 }}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Pantalla timer */}
                    <View style={{
                      borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
                      borderColor: terminado ? 'rgba(16,185,129,0.4)' : esCritico ? 'rgba(239,68,68,0.4)' : proyectando ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)',
                      backgroundColor: terminado ? 'rgba(16,185,129,0.07)' : esCritico ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.04)',
                    }}>
                      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <View style={{ height: 4, width: `${progreso}%`, backgroundColor: terminado ? '#10b981' : esCritico ? '#ef4444' : '#6366f1' }} />
                      </View>
                      <View style={{ paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center' }}>
                        {!!timerEstado?.mensaje && <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{timerEstado.mensaje}</Text>}
                        <Text style={{ fontSize: 64, fontWeight: '800', color: terminado ? '#10b981' : esCritico ? '#ef4444' : '#fff', letterSpacing: -2 }}>
                          {tiempoStr}
                        </Text>
                        {proyectando && !terminado && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1' }} />
                            <Text style={{ color: '#818cf8', fontSize: 11, fontWeight: '700' }}>EN PANTALLA</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Controles */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      {!corriendo ? (
                        <Pressable
                          onPress={() => controlarTimer('iniciar', { minutos: timerMinutos, mensaje: timerMensajeInput })}
                          disabled={!conectado || controlandoTimer || terminado}
                          style={({ pressed }) => [
                            styles.buttonSecondary, { flex: 1 },
                            (!conectado || controlandoTimer || terminado) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.buttonSecondaryText}>▶ Iniciar</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => controlarTimer('pausar')}
                          disabled={!conectado || controlandoTimer}
                          style={({ pressed }) => [
                            { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', alignItems: 'center' },
                            (!conectado || controlandoTimer) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={{ color: '#fbbf24', fontWeight: '700' }}>⏸ Pausar</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => controlarTimer('reiniciar')}
                        disabled={!conectado || controlandoTimer}
                        style={({ pressed }) => [
                          styles.buttonSecondary, { flex: 1 },
                          (!conectado || controlandoTimer) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.buttonSecondaryText}>↺ Reiniciar</Text>
                      </Pressable>
                    </View>

                    {!proyectando ? (
                      <Pressable
                        onPress={() => controlarTimer('proyectar', { minutos: timerMinutos, mensaje: timerMensajeInput })}
                        disabled={!conectado || controlandoTimer}
                        style={({ pressed }) => [
                          styles.button,
                          (!conectado || controlandoTimer) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.buttonText}>📺 Proyectar en pantalla</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => controlarTimer('detener')}
                        disabled={!conectado || controlandoTimer}
                        style={({ pressed }) => [
                          { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' },
                          (!conectado || controlandoTimer) && styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={{ color: '#f87171', fontWeight: '700' }}>⏹ Detener proyección</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}

            {/* ── Plantillas ──────────────────────────────────────────────────── */}
            {seccion === 'plantillas' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Plantillas</Text>
                    <View style={styles.row}>
                      {plantillaActivaId && (
                        <Pressable
                          onPress={desactivarPlantilla}
                          disabled={!conectado || activandoPlantillaId === 'desactivar'}
                          style={({ pressed }) => [styles.smallButton, (!conectado || activandoPlantillaId === 'desactivar') && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                        >
                          <Text style={styles.smallButtonText}>Desactivar</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={cargarPlantillas}
                        disabled={!conectado || cargandoPlantillas}
                        style={({ pressed }) => [styles.smallButton, (!conectado || cargandoPlantillas) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.smallText}>Selecciona una animación global para el proyector.</Text>
                  {!conectado && <Text style={styles.smallText}>Tip: ve a Conexión para conectar al servidor.</Text>}
                  {cargandoPlantillas && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  <FlatList
                    data={plantillas}
                    keyExtractor={(item) => String(item?.id)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                      const isActiva = Boolean(item?.activa) || item?.id === plantillaActivaId;
                      return (
                        <View style={[styles.itemRow, isActiva && styles.itemRowActive]}>
                          <View style={{ width: 32, alignItems: 'center' }}>
                            <Text style={{ fontSize: 20, color: isActiva ? '#14b8a6' : '#94a3b8' }}>{String(item?.icono || '◈')}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>{String(item?.nombre || item?.id)}</Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>{String(item?.desc || '')}</Text>
                            {isActiva && <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '700', marginTop: 2 }}>ACTIVA</Text>}
                          </View>
                          <Pressable
                            onPress={() => isActiva ? desactivarPlantilla() : activarPlantilla(item.id)}
                            disabled={!conectado || !!activandoPlantillaId}
                            style={({ pressed }) => [
                              isActiva ? styles.smallButton : styles.smallButtonPrimary,
                              (!conectado || !!activandoPlantillaId) && styles.buttonDisabled,
                              pressed && conectado && styles.buttonPressed,
                            ]}
                          >
                            <Text style={isActiva ? styles.smallButtonText : styles.smallButtonPrimaryText}>
                              {activandoPlantillaId === item.id ? '…' : isActiva ? 'Desact.' : 'Activar'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    }}
                    ListEmptyComponent={!cargandoPlantillas ? <Text style={styles.smallText}>No se cargaron plantillas.</Text> : null}
                  />
                </View>
              </View>
            )}

            {/* ── Orden de Servicio ────────────────────────────────────────────── */}
            {seccion === 'presentaciones' && (
              <View style={{ flex: 1, minHeight: 0 }}>
                <View style={[styles.card, { flex: 1, minHeight: 0 }]}>

                  {/* Cabecera */}
                  <View style={styles.rowBetween}>
                    <View style={[styles.row, { flex: 1, minWidth: 0 }]}>
                      {ordenSeleccionada && (
                        <Pressable onPress={() => setOrdenSeleccionada(null)} style={{ marginRight: 6, padding: 2 }}>
                          <Ionicons name="arrow-back" size={18} color="#94a3b8" />
                        </Pressable>
                      )}
                      <Text style={[styles.sectionTitle, { flex: 1 }]} numberOfLines={1}>
                        {ordenSeleccionada ? ordenSeleccionada.titulo : 'Orden de Servicio'}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      {!ordenSeleccionada && !modalOrdenEditor && (
                        <Pressable
                          onPress={() => abrirEditorOrden()}
                          disabled={!conectado}
                          style={({ pressed }) => [styles.smallButtonPrimary, !conectado && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                        >
                          <Text style={styles.smallButtonPrimaryText}>＋ Nueva</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={cargarOrdenes}
                        disabled={!conectado || cargandoOrdenes}
                        style={({ pressed }) => [styles.smallButton, (!conectado || cargandoOrdenes) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonText}>Actualizar</Text>
                      </Pressable>
                    </View>
                  </View>

                  {!conectado && <Text style={styles.smallText}>Tip: ve a Conexión para conectar al servidor.</Text>}

                  {cargandoOrdenes && (
                    <View style={[styles.row, { marginTop: 6, marginBottom: 6 }]}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}

                  {/* Barra de navegación rápida — solo cuando hay orden abierta */}
                  {ordenSeleccionada && (() => {
                    const items = Array.isArray(ordenSeleccionada.items) ? ordenSeleccionada.items : [];
                    const item = items[itemOrdActivo];
                    const parrafos = item?.tipo === 'himno' && Array.isArray(item.parrafos) ? item.parrafos : [];
                    const totalParrafos = parrafos.length;
                    const puedeAnterior = parrafoOrdActivo > 0;
                    const puedeSiguiente = totalParrafos > 0 && parrafoOrdActivo < totalParrafos - 1;
                    return (
                      <View style={{ backgroundColor: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                        <Text style={[styles.itemMeta, { marginBottom: 6 }]} numberOfLines={1}>
                          {item
                            ? (item.tipo === 'himno'
                                ? `#${item.numeroHimno} ${item.tituloHimno || ''}`
                                : item.tipo === 'versiculo'
                                  ? `${item.libroNombre || ''} ${item.capitulo}:${item.versiculo}`
                                  : (item.texto || '').substring(0, 50) || 'Nota')
                            : 'Sin elementos'}
                          {totalParrafos > 1 ? ` · Estrofa ${parrafoOrdActivo + 1}/${totalParrafos}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            onPress={anteriorItemOrden}
                            disabled={!conectado || proyectandoOrden || !puedeAnterior}
                            style={({ pressed }) => [styles.buttonSecondaryCompact, { flex: 1 }, (!conectado || proyectandoOrden || !puedeAnterior) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                          >
                            <Text style={styles.buttonSecondaryText}>← Anterior</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => proyectarItemOrden(itemOrdActivo, parrafoOrdActivo)}
                            disabled={!conectado || proyectandoOrden || !item}
                            style={({ pressed }) => [styles.smallButtonPrimary, { flex: 1, paddingVertical: 8 }, (!conectado || proyectandoOrden || !item) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                          >
                            <Text style={styles.smallButtonPrimaryText}>Proyectar</Text>
                          </Pressable>
                          <Pressable
                            onPress={siguienteItemOrden}
                            disabled={!conectado || proyectandoOrden || !puedeSiguiente}
                            style={({ pressed }) => [styles.buttonSecondaryCompact, { flex: 1 }, (!conectado || proyectandoOrden || !puedeSiguiente) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                          >
                            <Text style={styles.buttonSecondaryText}>Siguiente →</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Lista de órdenes — o lista de elementos si hay orden seleccionada */}
                  {!ordenSeleccionada ? (
                    <FlatList
                      data={ordenes}
                      keyExtractor={(item) => String(item?.id)}
                      keyboardDismissMode="on-drag"
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item }) => {
                        const totalItems = Array.isArray(item?.items) ? item.items.length : 0;
                        return (
                          <Pressable
                            onPress={() => { setOrdenSeleccionada(item); setItemOrdActivo(0); setParrafoOrdActivo(0); }}
                            style={({ pressed }) => [styles.itemRow, pressed && styles.buttonPressed]}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>{String(item?.titulo || 'Orden')}</Text>
                              <Text style={styles.itemMeta} numberOfLines={1}>
                                {totalItems} {totalItems === 1 ? 'elemento' : 'elementos'}
                                {item?.fecha ? ` · ${item.fecha}` : ''}
                              </Text>
                            </View>
                            <Pressable
                              onPress={(e) => { e.stopPropagation(); abrirEditorOrden(item); }}
                              disabled={!conectado}
                              style={({ pressed }) => [{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' }, !conectado && styles.buttonDisabled, pressed && styles.buttonPressed]}
                            >
                              <Ionicons name="pencil" size={15} color="#94a3b8" />
                            </Pressable>
                            <Ionicons name="chevron-forward" size={18} color="#475569" />
                          </Pressable>
                        );
                      }}
                      ListEmptyComponent={!cargandoOrdenes ? <Text style={styles.smallText}>No hay órdenes de servicio. Toca "＋ Nueva" para crear una.</Text> : null}
                    />
                  ) : (
                    <FlatList
                      data={Array.isArray(ordenSeleccionada.items) ? ordenSeleccionada.items : []}
                      keyExtractor={(_, idx) => String(idx)}
                      keyboardDismissMode="on-drag"
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item, index }) => {
                        const isActivo = index === itemOrdActivo;
                        let label = '';
                        let sub = '';
                        if (item?.tipo === 'himno') {
                          label = `#${item.numeroHimno} ${item.tituloHimno || ''}`;
                          sub = item.tipoHimno === 'vida' ? 'Vida Cristiana' : 'Himno Moravo';
                        } else if (item?.tipo === 'versiculo') {
                          label = `${item.libroNombre || ''} ${item.capitulo}:${item.versiculo}`;
                          sub = (item.texto || '').substring(0, 60) + ((item.texto || '').length > 60 ? '…' : '');
                        } else {
                          label = (item?.texto || '').substring(0, 50) || 'Nota';
                          sub = 'Nota / Separador';
                        }
                        return (
                          <View style={[styles.itemRow, isActivo && styles.itemRowActive]}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>{label}</Text>
                              <Text style={styles.itemMeta} numberOfLines={1}>{sub}</Text>
                            </View>
                            <Pressable
                              onPress={() => proyectarItemOrden(index, 0)}
                              disabled={!conectado || proyectandoOrden}
                              style={({ pressed }) => [styles.smallButtonPrimary, (!conectado || proyectandoOrden) && styles.buttonDisabled, pressed && conectado && styles.buttonPressed]}
                            >
                              <Text style={styles.smallButtonPrimaryText}>Proyectar</Text>
                            </Pressable>
                          </View>
                        );
                      }}
                      ListEmptyComponent={<Text style={styles.smallText}>Este orden no tiene elementos.</Text>}
                    />
                  )}
                </View>
              </View>
            )}
          </View>

          {/* ── Modal Editor Orden de Servicio ─────────────────────────────── */}
          <Modal
            visible={modalOrdenEditor}
            animationType="slide"
            onRequestClose={() => setModalOrdenEditor(false)}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                  <Pressable onPress={() => setModalOrdenEditor(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color="#94a3b8" />
                  </Pressable>
                  <Text style={styles.sectionTitle}>{ordenEditId ? 'Editar Orden' : 'Nueva Orden'}</Text>
                  <Pressable
                    onPress={guardarOrdenEdicion}
                    disabled={guardandoOrden}
                    style={({ pressed }) => [styles.smallButtonPrimary, guardandoOrden && styles.buttonDisabled, pressed && !guardandoOrden && styles.buttonPressed]}
                  >
                    {guardandoOrden ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.smallButtonPrimaryText}>Guardar</Text>}
                  </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                  {/* Título */}
                  <Text style={styles.label}>Título</Text>
                  <TextInput
                    value={ordenEditTitulo}
                    onChangeText={setOrdenEditTitulo}
                    placeholder="Título de la orden"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                  />

                  {/* Fecha */}
                  <Text style={styles.label}>Fecha</Text>
                  <TextInput
                    value={ordenEditFecha}
                    onChangeText={setOrdenEditFecha}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                  />

                  {/* Elementos */}
                  <Text style={[styles.label, { marginTop: 4 }]}>Elementos ({ordenEditItems.length})</Text>
                  {ordenEditItems.length === 0 && (
                    <Text style={styles.smallText}>No hay elementos. Agrégalos abajo.</Text>
                  )}
                  {ordenEditItems.map((it, idx) => {
                    let label = '';
                    if (it.tipo === 'himno') {
                      label = `#${it.numeroHimno} ${it.tituloHimno || ''}`;
                    } else if (it.tipo === 'versiculo') {
                      label = `${it.libroNombre || ''} ${it.capitulo}:${it.versiculo}`;
                    } else {
                      label = (it.texto || '').substring(0, 50) || 'Nota';
                    }
                    return (
                      <View key={it.id || idx} style={[styles.itemRow, { marginBottom: 8 }]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{label}</Text>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {it.tipo === 'himno' ? (it.tipoHimno === 'vida' ? 'Vida Cristiana' : it.tipoHimno === 'personal' ? 'Personal' : 'Moravo') : it.tipo === 'versiculo' ? 'Versículo' : 'Nota'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Pressable onPress={() => moveOrdenItem(idx, -1)} disabled={idx === 0} style={({ pressed }) => [{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' }, idx === 0 && { opacity: 0.3 }, pressed && styles.buttonPressed]}>
                            <Ionicons name="arrow-up" size={15} color="#94a3b8" />
                          </Pressable>
                          <Pressable onPress={() => moveOrdenItem(idx, 1)} disabled={idx === ordenEditItems.length - 1} style={({ pressed }) => [{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' }, idx === ordenEditItems.length - 1 && { opacity: 0.3 }, pressed && styles.buttonPressed]}>
                            <Ionicons name="arrow-down" size={15} color="#94a3b8" />
                          </Pressable>
                          <Pressable onPress={() => removeOrdenItem(idx)} style={({ pressed }) => [{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.12)' }, pressed && styles.buttonPressed]}>
                            <Ionicons name="trash" size={15} color="#f87171" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  {/* Barra agregar */}
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12 }}>
                    <Text style={[styles.label, { marginBottom: 10 }]}>Agregar elemento:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => { setPickerHimnoTipo('moravo'); setPickerHimnoBusqueda(''); setPickerHimnoLista([]); setModalPickerHimno(true); cargarHimnosParaPicker('moravo'); }}
                        style={({ pressed }) => [styles.smallButtonPrimary, { flex: 1 }, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonPrimaryText}>🎵 Himno</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setPickerVersiLibro(null); setPickerVersiCap(null); setPickerVersiVersos([]); setPickerVersiCantidadCaps(0); setPickerVersiBusqueda(''); setModalPickerVersi(true); }}
                        style={({ pressed }) => [styles.smallButtonPrimary, { flex: 1 }, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonPrimaryText}>📖 Versículo</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setPickerNotaTexto(''); setModalPickerNota(true); }}
                        style={({ pressed }) => [styles.smallButtonPrimary, { flex: 1 }, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.smallButtonPrimaryText}>📝 Nota</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Eliminar orden */}
                  {ordenEditId && (
                    <Pressable
                      onPress={eliminarOrdenEdicion}
                      style={({ pressed }) => [{ marginTop: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' }, pressed && styles.buttonPressed]}
                    >
                      <Text style={{ color: '#f87171', fontWeight: '700' }}>Eliminar esta orden</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>

          {/* ── Modal Picker Himno ──────────────────────────────────────────── */}
          <Modal
            visible={modalPickerHimno}
            animationType="slide"
            onRequestClose={() => setModalPickerHimno(false)}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <Pressable onPress={() => setModalPickerHimno(false)} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={22} color="#94a3b8" />
                </Pressable>
                <Text style={styles.sectionTitle}>Seleccionar Himno</Text>
                <View style={{ width: 30 }} />
              </View>

              {/* Tabs tipo */}
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
                {[{ key: 'moravo', label: 'Moravo' }, { key: 'vidaCristiana', label: 'Vida' }, { key: 'personal', label: 'Personal' }].map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => { setPickerHimnoTipo(t.key); setPickerHimnoBusqueda(''); cargarHimnosParaPicker(t.key); }}
                    style={({ pressed }) => [styles.tabPill, pickerHimnoTipo === t.key && styles.tabPillActive, { flex: 1 }, pressed && styles.buttonPressed]}
                  >
                    <Text style={[styles.tabText, pickerHimnoTipo === t.key && styles.tabTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Búsqueda */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <TextInput
                  value={pickerHimnoBusqueda}
                  onChangeText={setPickerHimnoBusqueda}
                  placeholder="Buscar por número o título…"
                  placeholderTextColor="#64748b"
                  style={[styles.input, { marginBottom: 0 }]}
                />
              </View>

              {cargandoPickerHimno && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.smallText}>Cargando…</Text>
                </View>
              )}

              <FlatList
                data={pickerHimnoLista.filter((h) => {
                  if (!pickerHimnoBusqueda.trim()) return true;
                  const q = pickerHimnoBusqueda.toLowerCase();
                  return String(h.numero || '').includes(q) || (h.titulo || '').toLowerCase().includes(q);
                })}
                keyExtractor={(item, i) => String(item?.id || item?.numero || i)}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => addItemHimno(item)}
                    style={({ pressed }) => [styles.itemRow, pressed && styles.buttonPressed]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>#{item.numero} {item.titulo || ''}</Text>
                      {item.parrafos?.length > 0 && (
                        <Text style={styles.itemMeta} numberOfLines={1}>{item.parrafos.length} {item.parrafos.length === 1 ? 'estrofa' : 'estrofas'}</Text>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color="#10b981" />
                  </Pressable>
                )}
                ListEmptyComponent={!cargandoPickerHimno ? <Text style={styles.smallText}>No hay himnos.</Text> : null}
              />
            </SafeAreaView>
          </Modal>

          {/* ── Modal Picker Versículo ──────────────────────────────────────── */}
          <Modal
            visible={modalPickerVersi}
            animationType="slide"
            onRequestClose={() => { setModalPickerVersi(false); setPickerVersiLibro(null); setPickerVersiCap(null); setPickerVersiVersos([]); setPickerVersiCantidadCaps(0); setPickerVersiBusqueda(''); }}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', gap: 10 }}>
                <Pressable
                  onPress={() => {
                    if (pickerVersiCap !== null) { setPickerVersiCap(null); setPickerVersiVersos([]); }
                    else if (pickerVersiLibro !== null) { setPickerVersiLibro(null); setPickerVersiCantidadCaps(0); }
                    else { setModalPickerVersi(false); setPickerVersiLibro(null); setPickerVersiCap(null); setPickerVersiVersos([]); setPickerVersiCantidadCaps(0); setPickerVersiBusqueda(''); }
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="arrow-back" size={22} color="#94a3b8" />
                </Pressable>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.sectionTitle, { flex: 1 }]} numberOfLines={1}>
                    {pickerVersiCap !== null
                      ? `${pickerVersiLibro?.nombre || ''} ${pickerVersiCap}`
                      : pickerVersiLibro !== null ? pickerVersiLibro.nombre : 'Seleccionar Libro'}
                  </Text>
                  {(() => {
                    const count = pickerVersiCap !== null && pickerVersiLibro
                      ? ordenEditItems.filter(it => it.tipo === 'versiculo' && it.libroId === pickerVersiLibro.id && it.capitulo === pickerVersiCap).length
                      : 0;
                    return count > 0 ? (
                      <View style={{ backgroundColor: 'rgba(99,102,241,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#818cf8', fontSize: 11, fontWeight: '700' }}>{count} ✓</Text>
                      </View>
                    ) : null;
                  })()}
                </View>

                {pickerVersiCap !== null ? (
                  <Pressable
                    onPress={() => { setModalPickerVersi(false); setPickerVersiLibro(null); setPickerVersiCap(null); setPickerVersiVersos([]); setPickerVersiCantidadCaps(0); setPickerVersiBusqueda(''); }}
                    style={({ pressed }) => [styles.smallButtonPrimary, { paddingHorizontal: 14 }, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.smallButtonPrimaryText}>Listo</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => { setModalPickerVersi(false); setPickerVersiLibro(null); setPickerVersiCap(null); setPickerVersiVersos([]); setPickerVersiCantidadCaps(0); setPickerVersiBusqueda(''); }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={22} color="#94a3b8" />
                  </Pressable>
                )}
              </View>

              {/* Step 1: lista de libros */}
              {pickerVersiLibro === null && (
                <>
                  <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                    <TextInput
                      value={pickerVersiBusqueda}
                      onChangeText={setPickerVersiBusqueda}
                      placeholder="Buscar libro…"
                      placeholderTextColor="#64748b"
                      style={[styles.input, { marginBottom: 0 }]}
                    />
                  </View>
                  <FlatList
                    data={librosBiblia.filter((l) => {
                      if (!pickerVersiBusqueda.trim()) return true;
                      const q = pickerVersiBusqueda.toLowerCase();
                      return (l.nombre || '').toLowerCase().includes(q) || (l.abbreviation || '').toLowerCase().includes(q);
                    })}
                    keyExtractor={(item) => String(item?.id)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={async () => {
                          setPickerVersiLibro(item);
                          setPickerVersiCap(null);
                          setPickerVersiVersos([]);
                          setPickerVersiCantidadCaps(0);
                          setCargandoPickerVersi(true);
                          try {
                            const base = normalizarBaseUrl(serverBaseUrl);
                            if (!base) throw new Error('Sin URL de servidor');
                            const { res, json } = await fetchJsonTimeout(
                              `${base}/api/biblia/estructura/${encodeURIComponent(item.id)}`,
                              { method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 10000 }
                            );
                            if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
                            setPickerVersiCantidadCaps(json.capitulos || 0);
                          } catch (e) {
                            Alert.alert('Error', `No se pudo cargar ${item.nombre}: ${e.message}`);
                          } finally { setCargandoPickerVersi(false); }
                        }}
                        style={({ pressed }) => [styles.itemRow, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.itemTitle}>{item.nombre}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#475569" />
                      </Pressable>
                    )}
                  />
                </>
              )}

              {/* Step 2: grilla de capítulos */}
              {pickerVersiLibro !== null && pickerVersiCap === null && (
                <>
                  {cargandoPickerVersi && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  <ScrollView contentContainerStyle={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} keyboardShouldPersistTaps="handled">
                    {Array.from({ length: pickerVersiCantidadCaps }, (_, i) => i + 1).map((cap) => (
                      <Pressable
                        key={cap}
                        onPress={async () => {
                          setPickerVersiCap(cap);
                          setPickerVersiVersos([]);
                          setCargandoPickerVersi(true);
                          try {
                            const base = normalizarBaseUrl(serverBaseUrl);
                            if (!base) throw new Error('Sin URL de servidor');
                            const { res, json } = await fetchJsonTimeout(
                              `${base}/api/biblia/capitulo/${encodeURIComponent(pickerVersiLibro.id)}/${cap}`,
                              { method: 'GET', headers: { Accept: 'application/json' }, timeoutMs: 10000 }
                            );
                            if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
                            setPickerVersiVersos(Array.isArray(json.versos) ? json.versos : []);
                          } catch (e) {
                            Alert.alert('Error', `No se pudo cargar el capítulo: ${e.message}`);
                            setPickerVersiVersos([]);
                          } finally { setCargandoPickerVersi(false); }
                        }}
                        style={({ pressed }) => [styles.bibliaButton, { minWidth: 44 }, pressed && styles.bibliaButtonPressed]}
                      >
                        <Text style={styles.bibliaButtonText}>{cap}</Text>
                      </Pressable>
                    ))}
                    {pickerVersiCantidadCaps === 0 && !cargandoPickerVersi && (
                      <Text style={styles.smallText}>No se encontraron capítulos.</Text>
                    )}
                  </ScrollView>
                </>
              )}

              {/* Step 3: lista de versículos */}
              {pickerVersiLibro !== null && pickerVersiCap !== null && (
                <>
                  {cargandoPickerVersi && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.smallText}>Cargando…</Text>
                    </View>
                  )}
                  <FlatList
                    data={pickerVersiVersos}
                    keyExtractor={(_, i) => String(i)}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                    renderItem={({ item: texto, index: verIdx }) => {
                      const yaAgregado = ordenEditItems.some(
                        it => it.tipo === 'versiculo' && it.libroId === pickerVersiLibro.id &&
                              it.capitulo === pickerVersiCap && it.versiculo === verIdx + 1
                      );
                      return (
                        <Pressable
                          onPress={() => addItemVersiculo(pickerVersiLibro.id, pickerVersiLibro.nombre, pickerVersiCap, verIdx, texto)}
                          style={({ pressed }) => [
                            styles.itemRow,
                            yaAgregado && { backgroundColor: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.25)' },
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemMeta, { fontWeight: '800', marginTop: 0, marginBottom: 2, color: yaAgregado ? '#818cf8' : undefined }]}>{verIdx + 1}</Text>
                            <Text style={[styles.itemTitle, yaAgregado && { color: '#c7d2fe' }]} numberOfLines={3}>{texto}</Text>
                          </View>
                          <Ionicons
                            name={yaAgregado ? "checkmark-circle" : "add-circle-outline"}
                            size={20}
                            color={yaAgregado ? "#6366f1" : "#10b981"}
                          />
                        </Pressable>
                      );
                    }}
                    ListEmptyComponent={!cargandoPickerVersi ? <Text style={styles.smallText}>No hay versículos.</Text> : null}
                  />
                </>
              )}
            </SafeAreaView>
          </Modal>

          {/* ── Modal Picker Nota ───────────────────────────────────────────── */}
          <Modal
            visible={modalPickerNota}
            transparent
            animationType="fade"
            onRequestClose={() => setModalPickerNota(false)}
          >
            <Pressable
              onPress={() => setModalPickerNota(false)}
              style={[styles.drawerBackdrop, { justifyContent: 'center', padding: 20 }]}
            >
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Pressable
                  onPress={() => {}}
                  style={[styles.card, { backgroundColor: 'rgba(15,23,42,0.97)', borderColor: 'rgba(255,255,255,0.15)' }]}
                >
                  <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Agregar Nota</Text>
                  <TextInput
                    value={pickerNotaTexto}
                    onChangeText={setPickerNotaTexto}
                    placeholder="Texto de la nota o separador…"
                    placeholderTextColor="#64748b"
                    multiline
                    style={[styles.input, { minHeight: 80 }]}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setModalPickerNota(false)}
                      style={({ pressed }) => [styles.smallButton, { flex: 1 }, pressed && styles.buttonPressed]}
                    >
                      <Text style={[styles.smallButtonText, { textAlign: 'center' }]}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      onPress={addItemNota}
                      disabled={!pickerNotaTexto.trim()}
                      style={({ pressed }) => [styles.smallButtonPrimary, { flex: 1 }, !pickerNotaTexto.trim() && styles.buttonDisabled, pressed && pickerNotaTexto.trim() && styles.buttonPressed]}
                    >
                      <Text style={[styles.smallButtonPrimaryText, { textAlign: 'center' }]}>Agregar</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>

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
                      backgroundColor: 'rgba(255,255,255,0.05)',
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

                    // Determinar si requiere internet
                    const requiereInternet = isYouTubeVideo;
                    const mostrarAdvertenciaInternet = requiereInternet && !hayInternet;

                    const onPressPrimary = async () => {
                      if (!item) return;
                      if (!conectado) return;
                      if (ocupado) return;

                      // Validar si requiere internet y no hay conexión
                      if (requiereInternet && !hayInternet) {
                        // No hacer nada, el mensaje de advertencia ya está visible
                        return;
                      }

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
                      if (multimediaSesion?.destino === 'proyector' && estadoDestino !== 'stopped') {
                        await controlarMultimedia(
                          estadoDestino === 'playing' ? 'pause' : 'play',
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
                      : puedeControlarPlaybackAuto && !(requiereInternet && !hayInternet);

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

                    // ── Colores según estado ──────────────────────────────
                    const stateColor =
                      estadoDestino === 'playing' ? '#10b981' :
                      estadoDestino === 'paused'  ? '#f59e0b' : '#475569';
                    const stateColorBg =
                      estadoDestino === 'playing' ? 'rgba(16,185,129,0.12)' :
                      estadoDestino === 'paused'  ? 'rgba(245,158,11,0.12)' : 'rgba(71,85,105,0.12)';

                    return (
                      <>
                        {/* ── CABECERA ──────────────────────────────────── */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
                              {tituloItem}
                            </Text>
                            {/* Pill de estado */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: stateColorBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                                {estadoDestino === 'playing' && <AnimatedSoundBars />}
                                {estadoDestino !== 'playing' && (
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stateColor }} />
                                )}
                                <Text style={{ color: stateColor, fontSize: 11, fontWeight: '700' }}>{estadoLabel}</Text>
                              </View>
                              <Text style={{ color: '#475569', fontSize: 11 }}>
                                {tipoItem.toUpperCase()} · {isImagen ? 'PROYECTOR' : esPC ? 'PC' : 'PROYECTOR'}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => setModalControlMultimediaVisible(false)}
                            style={({ pressed }) => [{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}
                          >
                            <Ionicons name="close" size={18} color="#94a3b8" />
                          </Pressable>
                        </View>

                        {/* ── ADVERTENCIA INTERNET ──────────────────────── */}
                        {mostrarAdvertenciaInternet && (
                          <View style={{ backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="wifi-outline" size={20} color="#f59e0b" />
                            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600', flex: 1 }}>
                              {isYouTubeVideo ? 'YouTube necesita conexión a Internet.' : 'Este contenido requiere Internet.'}
                            </Text>
                          </View>
                        )}

                        {/* ── THUMBNAIL ─────────────────────────────────── */}
                        <View style={{ width: '100%', height: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: 14, alignItems: 'center', justifyContent: 'center' }}>
                          {kind === 'video' && !isYouTubeVideo ? (
                            <VideoThumbPreview uri={localVideoThumb || thumb || ''} />
                          ) : canShowVideoPreview ? (
                            <ModalVideoPreview uri={previewUri} />
                          ) : thumb ? (
                            <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <View style={{ alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 24 }}>{fallbackLabel}</Text>
                              </View>
                              <Text style={{ color: '#475569', fontSize: 11 }}>{tipoItem}</Text>
                            </View>
                          )}
                          {/* Overlay de estado sobre thumbnail */}
                          {estadoDestino === 'playing' && (
                            <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <AnimatedSoundBars />
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>EN VIVO</Text>
                            </View>
                          )}
                        </View>

                        {/* ── SEEK BAR ──────────────────────────────────── */}
                        {!isImagen && (
                          <View style={{ marginBottom: 14 }}>
                            <View
                              style={[styles.seekBarTrack, !canSeek && { opacity: 0.35 }]}
                              onLayout={(e) => setSeekBarWidth(e?.nativeEvent?.layout?.width || 1)}
                              onStartShouldSetResponder={() => Boolean(canSeek)}
                              onMoveShouldSetResponder={() => Boolean(canSeek)}
                              onResponderGrant={(evt) => { if (!canSeek) return; setScrubbing(true); scrubbingRef.current = true; setScrubTime(seekFromEvent(evt)); }}
                              onResponderMove={(evt) => { if (!canSeek) return; setScrubTime(seekFromEvent(evt)); }}
                              onResponderRelease={async (evt) => { if (!canSeek) return; const t = seekFromEvent(evt); setScrubbing(false); scrubbingRef.current = false; setScrubTime(0); await commitSeek(t); }}
                              onResponderTerminate={async (evt) => { if (!canSeek) return; const t = seekFromEvent(evt); setScrubbing(false); scrubbingRef.current = false; setScrubTime(0); await commitSeek(t); }}
                            >
                              <View style={[styles.seekBarFill, { width: `${percent * 100}%`, backgroundColor: stateColor }]} />
                              <View style={[styles.seekBarKnob, { left: knobLeft, backgroundColor: stateColor }]} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                              <Text style={{ color: '#64748b', fontSize: 11 }}>{formatTimeSec(currentSec)}</Text>
                              <Text style={{ color: '#64748b', fontSize: 11 }}>{durationSec > 0 ? formatTimeSec(durationSec) : '--:--'}</Text>
                            </View>
                          </View>
                        )}

                        {/* ── SELECTOR DESTINO ──────────────────────────── */}
                        {!isImagen && (
                          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3, marginBottom: 16, gap: 3 }}>
                            {[
                              { key: 'proyector', icon: 'tv-outline', label: 'Proyector' },
                              { key: 'pc', icon: 'laptop-outline', label: 'PC (audio)' },
                            ].map(({ key, icon, label }) => {
                              const active = destinoControlMultimedia === key;
                              return (
                                <Pressable
                                  key={key}
                                  onPress={() => puedeControlarDestino && setDestinoControlMultimedia(key)}
                                  style={({ pressed }) => [{
                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    paddingVertical: 9, borderRadius: 10,
                                    backgroundColor: active ? 'rgba(16,185,129,0.15)' : 'transparent',
                                    borderWidth: active ? 1 : 0,
                                    borderColor: active ? 'rgba(16,185,129,0.30)' : 'transparent',
                                  }, pressed && { opacity: 0.7 }]}
                                >
                                  <Ionicons name={icon} size={16} color={active ? '#10b981' : '#64748b'} />
                                  <Text style={{ color: active ? '#10b981' : '#64748b', fontSize: 13, fontWeight: active ? '700' : '500' }}>{label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}

                        {/* ── CONTROLES PRINCIPALES ─────────────────────── */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
                          {/* Botón Detener */}
                          {!isImagen && (
                            <Pressable
                              onPress={onPressStop}
                              disabled={!puedeStop}
                              style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: puedeStop ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)' }, !puedeStop && { opacity: 0.35 }, pressed && puedeStop && { opacity: 0.6 }]}
                            >
                              <Ionicons name="stop" size={20} color={puedeStop ? '#e2e8f0' : '#475569'} />
                            </Pressable>
                          )}

                          {/* Botón Play/Pause principal */}
                          <Pressable
                            onPress={onPressPrimary}
                            disabled={!primaryEnabled || (ocupado && estadoDestino === 'stopped')}
                            style={({ pressed }) => [{
                              width: 68, height: 68, borderRadius: 34,
                              backgroundColor: primaryEnabled
                                ? (estadoDestino === 'playing' ? 'rgba(245,158,11,0.20)' : 'rgba(16,185,129,0.20)')
                                : 'rgba(255,255,255,0.05)',
                              borderWidth: 2,
                              borderColor: primaryEnabled
                                ? (estadoDestino === 'playing' ? '#f59e0b' : '#10b981')
                                : 'rgba(255,255,255,0.08)',
                              alignItems: 'center', justifyContent: 'center',
                            }, pressed && primaryEnabled && { transform: [{ scale: 0.94 }] }]}
                          >
                            {ocupado
                              ? <ActivityIndicator size="small" color={estadoDestino === 'playing' ? '#f59e0b' : '#10b981'} />
                              : <Ionicons
                                  name={primaryIcon}
                                  size={primaryIcon === 'pause' ? 30 : 28}
                                  color={primaryEnabled ? (estadoDestino === 'playing' ? '#f59e0b' : '#10b981') : '#475569'}
                                />
                            }
                          </Pressable>

                          {/* Botón Proyectar / Limpiar */}
                          {!isImagen && destinoControlMultimedia === 'proyector' ? (
                            <Pressable
                              onPress={onPressProyectar}
                              disabled={!puedeForzarProyectar}
                              style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: puedeForzarProyectar ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)' }, !puedeForzarProyectar && { opacity: 0.35 }, pressed && puedeForzarProyectar && { opacity: 0.6 }]}
                            >
                              <Ionicons name="tv-outline" size={20} color={puedeForzarProyectar ? '#e2e8f0' : '#475569'} />
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={onPressLimpiar}
                              disabled={!puedeLimpiar}
                              style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: puedeLimpiar ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.04)' }, !puedeLimpiar && { opacity: 0.35 }, pressed && puedeLimpiar && { opacity: 0.6 }]}
                            >
                              <Ionicons name="trash-outline" size={20} color={puedeLimpiar ? '#ef4444' : '#475569'} />
                            </Pressable>
                          )}
                        </View>

                        {/* Botón limpiar separado cuando está en proyector (ya que proyectar ocupa el tercer slot) */}
                        {!isImagen && destinoControlMultimedia === 'proyector' && (
                          <Pressable
                            onPress={onPressLimpiar}
                            disabled={!puedeLimpiar}
                            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: puedeLimpiar ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.05)', marginBottom: 14 }, !puedeLimpiar && { opacity: 0.35 }, pressed && puedeLimpiar && { opacity: 0.7 }]}
                          >
                            <Ionicons name="trash-outline" size={15} color={puedeLimpiar ? '#ef4444' : '#475569'} />
                            <Text style={{ color: puedeLimpiar ? '#ef4444' : '#475569', fontSize: 12, fontWeight: '600' }}>Limpiar proyector</Text>
                          </Pressable>
                        )}

                        {/* ── VOLUMEN ───────────────────────────────────── */}
                        {!isImagen && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Pressable onPress={onPressToggleMute} disabled={!puedeVolumen} style={({ pressed }) => [{ opacity: puedeVolumen ? 1 : 0.35 }, pressed && { opacity: 0.5 }]}>
                              <Ionicons name={volumenNivel === 0 ? 'volume-mute' : volumenNivel < 0.5 ? 'volume-low' : 'volume-high'} size={18} color="#94a3b8" />
                            </Pressable>
                            {/* Barra de volumen visual */}
                            <View style={{ flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2 }}>
                              <View style={{ height: 4, width: `${Math.round(Number(volumenNivel) * 100)}%`, backgroundColor: puedeVolumen ? '#10b981' : '#334155', borderRadius: 2 }} />
                            </View>
                            <Text style={{ color: puedeVolumen ? '#94a3b8' : '#334155', fontSize: 11, fontWeight: '600', minWidth: 30, textAlign: 'right' }}>
                              {Math.round(Number(volumenNivel) * 100)}%
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              <Pressable onPress={onPressVolDown} disabled={!puedeVolumen} style={({ pressed }) => [{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }, !puedeVolumen && { opacity: 0.35 }, pressed && { opacity: 0.5 }]}>
                                <Ionicons name="remove" size={16} color="#e2e8f0" />
                              </Pressable>
                              <Pressable onPress={onPressVolUp} disabled={!puedeVolumen} style={({ pressed }) => [{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }, !puedeVolumen && { opacity: 0.35 }, pressed && { opacity: 0.5 }]}>
                                <Ionicons name="add" size={16} color="#e2e8f0" />
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {/* ── MENSAJE CONTEXTUAL ────────────────────────── */}
                        {!conectado && (
                          <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                            Conéctate al servidor para controlar la reproducción.
                          </Text>
                        )}
                        {conectado && destinoControlMultimedia === 'pc' && !isImagen && (
                          <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                            Modo PC: el audio se reproduce en el PC sin cambiar lo proyectado.
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
            <SafeAreaView style={styles.safe}>
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
    </SafeAreaProvider >
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: '#10b981',
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
  statusSuccess: { color: '#10b981' },
  statusError: { color: '#f43f5e' },
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
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.40)',
  },
  tabText: { color: '#e2e8f0', fontWeight: '700' },
  tabTextActive: { color: '#10b981' },

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
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.40)',
  },
  filterText: { color: '#e2e8f0', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fbbf24' },

  listContent: { paddingVertical: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
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
  itemTitle: { color: '#ffffff', fontWeight: '800', fontSize: 14, lineHeight: 18 },
  itemMeta: { color: '#94a3b8', marginTop: 5, fontSize: 12 },

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
    backgroundColor: 'rgba(16,185,129,0.85)',
  },
  seekBarKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
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
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(99,102,241,0.35)',
  },
  bibliaPreviewLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  bibliaPreviewText: { color: '#e2e8f0', lineHeight: 20 },

  bibliaButton: {
    minWidth: 50,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderColor: 'rgba(99,102,241,0.30)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bibliaButtonActive: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderColor: 'rgba(99,102,241,0.70)',
  },
  bibliaButtonPressed: {
    opacity: 0.7,
  },
  bibliaButtonText: {
    color: '#c7d2fe',
    fontSize: 15,
    fontWeight: '800',
  },
  bibliaButtonTextActive: {
    color: '#ffffff',
  },

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
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
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
    backgroundColor: '#10b981',
    borderColor: 'rgba(16,185,129,0.35)',
    borderWidth: 1,
  },
  playerPrimaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  playerPrimaryButtonPause: {
    width: 82,
    height: 82,
    backgroundColor: '#dc2626',
    borderColor: 'rgba(220,38,38,0.45)',
    shadowColor: '#dc2626',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
  },
  playerIconButtonDisabled: { opacity: 0.4 },
  playerVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  playerVolumeText: { color: '#94a3b8', fontSize: 12, fontWeight: '900', minWidth: 56, textAlign: 'center' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.35)' },
  badgeMuted: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  badgeText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
  badgeTextSuccess: { color: '#10b981' },
  badgeTextMuted: { color: '#94a3b8' },

  homeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: 'rgba(16,185,129,0.35)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  limpiarButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#1e293b',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 18,
  },
  drawerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  drawerItemText: { color: '#cbd5e1', fontWeight: '900', flex: 1 },
  drawerFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  drawerVersion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerVersionText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  drawerDeveloper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  drawerDeveloperText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  drawerDeveloperName: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 20,
  },

  // Tabs para Biblia
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(99,102,241,0.16)',
    borderColor: 'rgba(99,102,241,0.35)',
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#6366f1',
    fontWeight: '900',
  },
});
