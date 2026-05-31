import {useCallback, useEffect, useRef} from "react";
import {useIpcListener} from "./useIpcListener";

// ─── Playback status ──────────────────────────────────────────────────────────

function createEmitter(lastSentRef) {
  return function emit(payload) {
    try {
      if (!window.electron?.send) return;
      const now = Date.now();
      if (now - (lastSentRef.current || 0) < 250) return;
      lastSentRef.current = now;
      window.electron.send("multimedia-playback-status", {destino: "proyector", ...payload});
    } catch { /* noop */ }
  };
}

const mapYTStatePaused = (s) => s !== 1 && s !== 3;

// ─── YouTube API loader ───────────────────────────────────────────────────────

let ytApiPromise = null;

function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const existing = document.getElementById("yt-iframe-api");
    if (existing) {
      // API script ya inyectado — esperar onYouTubeIframeAPIReady
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement("script");
    tag.id  = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Maneja el tracking de estado (HTML5 + YouTube) y el control remoto de multimedia.
 * Extrae ~700 líneas del Proyector.jsx original.
 *
 * @param {object} opts
 * @param {object|null}        opts.multimediaActiva  - multimedia actual (state)
 * @param {React.MutableRefObject} opts.limpiarRef    - ref a limpiarProyector()
 */
export function useMultimediaControl({multimediaActiva, limpiarRef}) {
  // ── Refs compartidos entre tracking y control ──
  const multimediaActivaRef            = useRef(null);
  const youtubePlayerRef               = useRef(null);
  const youtubeApiLoadingRef           = useRef(false);
  const youtubeInfoRef                 = useRef({currentTime:0,duration:0,playerState:null,volume:null,muted:null,lastUpdateAt:0});
  const lastPlaybackStatusSentAtRef    = useRef(0);
  const pendingControlRef              = useRef(null);
  const pendingRetriesRef              = useRef(0);
  const mountedAtRef                   = useRef(Date.now());
  const youtubeForcedAutoplayRef       = useRef(false);
  const modoRef                        = useRef("bienvenida");

  // Sincronizar ref con state
  useEffect(() => { multimediaActivaRef.current = multimediaActiva; }, [multimediaActiva]);

  // Resetear cola de controles al cambiar multimedia
  useEffect(() => {
    pendingControlRef.current  = null;
    pendingRetriesRef.current  = 0;
    mountedAtRef.current       = Date.now();
    youtubeForcedAutoplayRef.current = false;
  }, [multimediaActiva?.id, multimediaActiva?.url, multimediaActiva?.tipo]);

  const emitStatus = createEmitter(lastPlaybackStatusSentAtRef);

  // ── Emit vacío cuando no hay multimedia ──
  useEffect(() => {
    if (!multimediaActiva) {
      emitStatus({id:null,nombre:null,currentTime:0,duration:0,paused:true,volume:null,tipo:null});
      return;
    }

    const tipo = String(multimediaActiva?.tipo || multimediaActiva?.type || "").trim().toLowerCase();
    const url  = String(multimediaActiva?.url  || "").toLowerCase();
    const isYT = tipo==="youtube" || tipo==="yt" || url.includes("youtube.com") || url.includes("youtu.be");

    // Reset info YouTube
    youtubeInfoRef.current = {currentTime:0,duration:0,playerState:null,volume:null,muted:null,lastUpdateAt:0};

    // Destruir player anterior si cambiamos a non-YT
    if (!isYT) {
      try { youtubePlayerRef.current?.destroy?.(); } catch { /* noop */ }
      youtubePlayerRef.current   = null;
      youtubeApiLoadingRef.current = false;
    }

    const selector = "video.multimedia-video, audio.multimedia-audio";
    let el = null, canceled = false, retryTimer = null;
    let ytIframe = null, ytDetach = null, ytPoll = null, ytAttachTimer = null;

    const emitFromRef = () => {
      const i = youtubeInfoRef.current;
      const ct = Number(i.currentTime), dur = Number(i.duration);
      const vol = Number(i.volume);
      const muted = i.muted == null ? null : Boolean(i.muted) || vol === 0;
      emitStatus({
        id: multimediaActiva?.id ?? null,
        nombre: multimediaActiva?.nombre ?? null,
        currentTime: Number.isFinite(ct) && ct >= 0 ? ct : 0,
        duration: Number.isFinite(dur) && dur >= 0 ? dur : 0,
        paused: mapYTStatePaused(i.playerState == null ? null : Number(i.playerState)),
        volume: muted ? 0 : (Number.isFinite(vol) ? Math.max(0, Math.min(1, vol/100)) : null),
        tipo: "youtube",
      });
    };

    const initYTPlayer = async (iframe) => {
      if (youtubePlayerRef.current || youtubeApiLoadingRef.current) return;
      youtubeApiLoadingRef.current = true;
      try {
        await loadYouTubeApi(); // Promise — sin busy-wait loop
        if (canceled) return;
        youtubePlayerRef.current = new window.YT.Player(iframe, {
          events: {
            onReady: () => {
              try {
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                youtubeInfoRef.current.duration = Number(youtubePlayerRef.current?.getDuration?.() || 0);
                youtubeInfoRef.current.volume   = Number(youtubePlayerRef.current?.getVolume?.()   || 0);
                youtubeInfoRef.current.muted    = Boolean(youtubePlayerRef.current?.isMuted?.()    || false);
                emitFromRef();
              } catch { /* noop */ }
            },
            onStateChange: (ev) => {
              try {
                youtubeInfoRef.current.playerState  = ev?.data;
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitFromRef();
              } catch { /* noop */ }
            },
          },
        });
      } catch { youtubePlayerRef.current = null; }
    };

    const readAndEmitHTML5 = () => {
      try {
        if (!el) return;
        const ct = Number(el.currentTime), dur = Number(el.duration), vol = Number(el.volume);
        const t = String(el.tagName||"").toLowerCase() === "audio" ? "audio"
                : String(el.tagName||"").toLowerCase() === "video" ? "video"
                : String(multimediaActiva?.tipo||"").trim() || null;
        emitStatus({
          id: multimediaActiva?.id ?? null,
          nombre: multimediaActiva?.nombre ?? null,
          currentTime: Number.isFinite(ct)  && ct  >= 0 ? ct  : 0,
          duration:    Number.isFinite(dur) && dur >= 0 ? dur : 0,
          paused: Boolean(el.paused),
          volume: Number.isFinite(vol) ? vol : null,
          tipo: t,
        });
      } catch { /* noop */ }
    };

    const attach = () => {
      if (canceled) return;

      if (isYT) {
        const tryAttach = () => {
          if (canceled) return;
          ytIframe = document.getElementById("youtube-player");
          if (!ytIframe) { ytAttachTimer = setTimeout(tryAttach, 200); return; }

          const onMessage = (ev) => {
            try {
              if (!ytIframe?.contentWindow || ev?.source !== ytIframe.contentWindow) return;
              const msg = typeof ev?.data === "string" ? JSON.parse(ev.data) : ev?.data;
              if (!msg || typeof msg !== "object") return;
              if (msg.event === "infoDelivery" && msg.info) {
                const {currentTime:ct, duration:dur, volume:vol, muted} = msg.info;
                if (Number.isFinite(Number(ct)))  youtubeInfoRef.current.currentTime = Number(ct);
                if (Number.isFinite(Number(dur)) && Number(dur)>0) youtubeInfoRef.current.duration = Number(dur);
                if (Number.isFinite(Number(vol))) youtubeInfoRef.current.volume = Number(vol);
                if (muted != null) youtubeInfoRef.current.muted = Boolean(muted);
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitFromRef();
              }
              if (msg.event === "onStateChange") {
                youtubeInfoRef.current.playerState = msg.info;
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitFromRef();
              }
            } catch { /* noop */ }
          };
          window.addEventListener("message", onMessage);
          ytDetach = () => window.removeEventListener("message", onMessage);

          try {
            ytIframe.contentWindow.postMessage(JSON.stringify({event:"listening", id:"youtube-player"}), "*");
            ytIframe.contentWindow.postMessage(JSON.stringify({event:"command", func:"addEventListener", args:["onStateChange"]}), "*");
          } catch { /* noop */ }

          ytPoll = setInterval(() => {
            try {
              if (youtubePlayerRef.current?.getCurrentTime) {
                youtubeInfoRef.current.currentTime  = Number(youtubePlayerRef.current.getCurrentTime() || 0);
                youtubeInfoRef.current.duration     = Number(youtubePlayerRef.current.getDuration()    || 0);
                youtubeInfoRef.current.volume       = Number(youtubePlayerRef.current.getVolume()      || 0);
                youtubeInfoRef.current.muted        = Boolean(youtubePlayerRef.current.isMuted?.()     || false);
                youtubeInfoRef.current.playerState  = Number(youtubePlayerRef.current.getPlayerState?.() ?? youtubeInfoRef.current.playerState);
                youtubeInfoRef.current.lastUpdateAt = Date.now();
              }
            } catch { /* noop */ }
            emitFromRef();
          }, 500);

          initYTPlayer(ytIframe);
        };
        tryAttach();

        return () => {
          if (ytAttachTimer) clearTimeout(ytAttachTimer);
          if (ytPoll) clearInterval(ytPoll);
          if (typeof ytDetach === "function") ytDetach();
          try { youtubePlayerRef.current?.destroy?.(); } catch { /* noop */ }
          youtubePlayerRef.current    = null;
          youtubeApiLoadingRef.current = false;
        };
      }

      // HTML5
      el = document.querySelector(selector);
      if (!el) { retryTimer = setTimeout(attach, 200); return; }
      const h = () => readAndEmitHTML5();
      ["timeupdate","loadedmetadata","durationchange","play","pause","ended","seeked","volumechange"].forEach(ev => el.addEventListener(ev, h));
      readAndEmitHTML5();
      return () => {
        try {
          ["timeupdate","loadedmetadata","durationchange","play","pause","ended","seeked","volumechange"].forEach(ev => el?.removeEventListener(ev, h));
        } catch { /* noop */ }
      };
    };

    let detach = attach();
    return () => {
      canceled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (typeof detach === "function") detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaActiva]);

  // ── Control remoto ────────────────────────────────────────────────────────

  const handleControl = useCallback((_, payload, meta = {}) => {
    const {action, time, volume} = payload || {};

    // ACK al main (solo en eventos reales, no en reintentos internos)
    if (!meta?.isRetry && window.electron?.send && action) {
      try {
        window.electron.send("proyector-control-ack", {action, source: meta?.source||"ipc", ts: Date.now()});
      } catch { /* noop */ }
    }

    const multimedia = multimediaActivaRef.current;
    if (!multimedia) {
      if (payload?.action) {
        pendingControlRef.current = payload;
        if (pendingRetriesRef.current < 12) {
          pendingRetriesRef.current++;
          setTimeout(() => {
            const p = pendingControlRef.current;
            if (p) handleControl(null, p, {isRetry:true, source: meta?.source||"retry"});
          }, 200);
        }
      }
      return;
    }

    const mediaType  = multimedia.tipo || multimedia.type;
    const mediaEl    = mediaType === "video"
      ? document.querySelector(".multimedia-video")
      : mediaType === "audio"
        ? document.querySelector(".multimedia-audio")
        : null;

    const ytPlayer  = youtubePlayerRef.current;
    const ytIframe  = document.getElementById("youtube-player");
    const ytReady   = !!ytIframe && String(ytIframe?.dataset?.ready || "") === "1";
    const canPostYT = !!ytIframe && typeof ytIframe.contentWindow?.postMessage === "function";

    const postYT = (func, args=[]) => {
      if (!canPostYT) return false;
      try { ytIframe.contentWindow.postMessage(JSON.stringify({event:"command", func, args}), "*"); return true; }
      catch { return false; }
    };

    const callYT = (method, ...args) => {
      try { if (!ytPlayer) return false; const fn = ytPlayer[method]; if (typeof fn!=="function") return false; fn.apply(ytPlayer, args); return true; }
      catch { return false; }
    };

    const scheduleRetry = () => {
      pendingControlRef.current = payload;
      const MAX = 40;
      if (pendingRetriesRef.current >= MAX) return;
      const delay = Math.min(800, 200 + pendingRetriesRef.current * 50);
      pendingRetriesRef.current++;
      setTimeout(() => {
        const p = pendingControlRef.current;
        if (p) handleControl(null, p, {isRetry:true, source: meta?.source||"retry"});
      }, delay);
    };

    const isYT = mediaType==="youtube" || mediaType==="yt"
      || String(multimedia?.url||"").includes("youtube")
      || String(multimedia?.url||"").includes("youtu.be");

    const reinforceYT = () => {
      if (!isYT) return;
      const ms = Date.now() - (mountedAtRef.current || 0);
      if (!ytReady || ms < 8000) scheduleRetry();
    };

    const forceYTAutoplay = () => {
      if (!ytIframe?.src) return false;
      try {
        const u = new URL(ytIframe.src);
        u.searchParams.set("autoplay","1");
        u.searchParams.set("mute","1");
        ytIframe.src = u.toString();
        setTimeout(() => { try { postYT("unMute",[]); } catch { /* noop */ } }, 1400);
        return true;
      } catch { return false; }
    };

    try {
      switch (action) {
        case "play":
          if (mediaEl) {
            mediaEl.play().catch(() => {});
          } else if (callYT("playVideo") || callYT("unMute") || postYT("playVideo",[]) || postYT("unMute",[])) {
            callYT("unMute"); callYT("playVideo"); postYT("playVideo",[]); postYT("unMute",[]);
            reinforceYT();
            if (meta?.isRetry && pendingRetriesRef.current >= 12 && !youtubeForcedAutoplayRef.current) {
              if (forceYTAutoplay()) youtubeForcedAutoplayRef.current = true;
            }
          } else { scheduleRetry(); }
          break;

        case "pause":
          if (mediaEl) {
            mediaEl.pause();
          } else if (callYT("pauseVideo") || postYT("pauseVideo",[])) {
            reinforceYT();
          } else { scheduleRetry(); }
          break;

        case "stop":
          if (mediaEl) {
            mediaEl.pause();
          } else if (callYT("pauseVideo") || postYT("pauseVideo",[])) {
            reinforceYT();
          } else { scheduleRetry(); }
          break;

        case "seek":
          if (typeof time !== "number" || Number.isNaN(time)) break;
          if (mediaEl) {
            mediaEl.currentTime = time;
          } else if (callYT("seekTo", time, true) || postYT("seekTo",[time,true])) {
            reinforceYT();
          } else { scheduleRetry(); }
          break;

        case "volume": {
          if (typeof volume !== "number" || Number.isNaN(volume)) break;
          if (mediaEl) {
            mediaEl.volume = Math.max(0, Math.min(1, volume));
          } else {
            const ytVol = Math.round(Math.max(0, Math.min(1, volume)) * 100);
            if (callYT("setVolume", ytVol) || postYT("setVolume",[ytVol])) {
              if (ytVol === 0) { callYT("mute"); postYT("mute",[]); }
              else             { callYT("unMute"); postYT("unMute",[]); }
              reinforceYT();
            } else { scheduleRetry(); }
          }
          break;
        }

        case "limpiar":
          limpiarRef?.current?.();
          break;

        default:
          break;
      }
    } catch { /* noop */ }
  }, []); // refs are stable — no deps needed

  useIpcListener("control-multimedia", handleControl);

  // BroadcastChannel como fallback cross-ventana
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let bc;
    const handleBroadcast = (ev) => {
      const p = ev?.data;
      if (p?.action) handleControl(null, p, {source:"broadcast"});
    };
    try {
      bc = new BroadcastChannel("gloryview-proyector-control");
      bc.addEventListener("message", handleBroadcast);
    } catch { /* noop */ }
    return () => { try { bc?.removeEventListener("message", handleBroadcast); bc?.close(); } catch { /* noop */ } };
  }, [handleControl]);

  return {modoRef, multimediaActivaRef};
}
