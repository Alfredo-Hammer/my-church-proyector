import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import himnosData from './src/data/himnos.json';
import vidaCristianaData from './src/data/vidacristiana.json';
import librosBiblia from './src/data/librosBiblia';

const STORAGE_KEY_LAST_URL = 'gloryview:lastServerBaseUrl';

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

export default function App() {
  const [seccion, setSeccion] = useState('inicio'); // 'inicio' | 'conexion' | 'himnos' | 'biblia' | 'multimedia' | 'presentaciones' | 'fondos' | 'favoritos'
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [serverBaseUrl, setServerBaseUrl] = useState('');
  const [estado, setEstado] = useState({
    status: 'idle',
    message: 'Ingresa la IP del PC y prueba conexión.',
    payload: null,
  });

  const [tipo, setTipo] = useState('himnos'); // 'himnos' | 'vidaCristiana'
  const [busqueda, setBusqueda] = useState('');
  const [himnoSeleccionado, setHimnoSeleccionado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [parrafoProyectando, setParrafoProyectando] = useState(null);

  const [catalogoHimnos, setCatalogoHimnos] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);

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
    const tipoApi = tipo === 'vidaCristiana' ? 'vida' : 'moravo';
    return `${base}/api/himnos?tipo=${tipoApi}`;
  }, [serverBaseUrl, tipo]);

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

  const dataFallback = useMemo(() => {
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

  const cargarMultimedia = async () => {
    if (!multimediaApiUrl) return;
    if (cargandoMultimedia) return;
    setCargandoMultimedia(true);
    try {
      const { res, json } = await fetchJsonTimeout(multimediaApiUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 15000,
      });
      if (!res.ok || !json?.ok || !Array.isArray(json?.multimedia)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      setMultimediaFiles(json.multimedia);
    } catch (err) {
      setMultimediaFiles([]);
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout cargando multimedia.' : err?.message || 'Error cargando multimedia.',
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

      setEstado((prev) => ({
        ...prev,
        status: 'success',
        message: `Proyectando: ${String(item?.nombre || 'Multimedia')}`,
      }));
    } catch (err) {
      reportarErrorSinDesconectar(
        err?.name === 'AbortError' ? 'Timeout proyectando multimedia.' : err?.message || 'Error proyectando multimedia.',
      );
    } finally {
      setProyectandoMultimediaId(null);
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
      if (multimediaFiltro !== 'all' && String(m?.tipo || '') !== multimediaFiltro) return false;
      if (!term) return true;
      const nombre = String(m?.nombre || '').toLowerCase();
      const tipo = String(m?.tipo || '').toLowerCase();
      return nombre.includes(term) || tipo.includes(term);
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

  useEffect(() => {
    if (!conectado) return;

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, conectado]);

  return (
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
                      <Pressable
                        onPress={() => {
                          setHimnoSeleccionado(item);
                          setParrafoProyectando(null);
                        }}
                        style={({ pressed }) => [
                          styles.himnoRow,
                          pressed && styles.parrafoPressed,
                        ]}
                      >
                        <Text style={styles.himnoTitle} numberOfLines={1}>
                          {item.numero}. {item.titulo}
                        </Text>
                        <Text style={styles.himnoSub}>
                          {Array.isArray(item.parrafos)
                            ? `${item.parrafos.length} párrafos`
                            : '—'}
                        </Text>
                      </Pressable>
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
                    const isProyectando = String(proyectandoMultimediaId || '') === String(item?.id || '');
                    return (
                      <View style={styles.itemRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {String(item?.nombre || 'Sin nombre')}
                          </Text>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {String(item?.tipo || '—')}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => toggleFavoritoMultimedia(item)}
                          disabled={!conectado}
                          style={({ pressed }) => [
                            styles.iconButton,
                            !conectado && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.iconButtonText}>{item?.favorito ? '★' : '☆'}</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => proyectarMultimedia(item)}
                          disabled={!conectado || isProyectando}
                          style={({ pressed }) => [
                            styles.smallButtonPrimary,
                            (!conectado || isProyectando) && styles.buttonDisabled,
                            pressed && conectado && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.smallButtonPrimaryText}>
                            {isProyectando ? '…' : 'Proyectar'}
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
                            <Text style={styles.iconButtonText}>{item?.favorito ? '★' : '☆'}</Text>
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
                          <Text style={styles.iconButtonText}>
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

                <Text style={styles.smallText}>Acceso rápido a multimedia y presentaciones guardadas.</Text>
                {!conectado && (
                  <Text style={styles.smallText}>Tip: ve a Conexión para confirmar el servidor.</Text>
                )}

                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Multimedia</Text>
                {favoritosMultimedia.length === 0 ? (
                  <Text style={styles.smallText}>Sin favoritos de multimedia.</Text>
                ) : (
                  favoritosMultimedia.map((m) => (
                    <View key={`mf-${m.id}`} style={styles.itemRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {String(m?.nombre || 'Multimedia')}
                        </Text>
                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {String(m?.tipo || '—')}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => toggleFavoritoMultimedia(m)}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
                      >
                        <Text style={styles.iconButtonText}>★</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => proyectarMultimedia(m)}
                        disabled={!conectado || String(proyectandoMultimediaId || '') === String(m?.id || '')}
                        style={({ pressed }) => [
                          styles.smallButtonPrimary,
                          (!conectado || String(proyectandoMultimediaId || '') === String(m?.id || '')) &&
                          styles.buttonDisabled,
                          pressed && conectado && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonPrimaryText}>Proyectar</Text>
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
                        <Text style={styles.iconButtonText}>★</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
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
