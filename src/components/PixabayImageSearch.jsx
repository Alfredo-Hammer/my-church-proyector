import React, {useState, useEffect} from "react";
import {FaSearch, FaSpinner, FaPlus, FaTimes} from "react-icons/fa";

// Función para obtener la URL base del servidor multimedia
const getBaseURL = () => {
  return "http://localhost:3001";
};

const PixabayImageSearch = ({onImageSelect, onClose}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tu API key de Pixabay (debe estar en .env)
  const PIXABAY_API_KEY =
    process.env.REACT_APP_PIXABAY_API_KEY ||
    "29325243-29bd81b56bd1800c81b3482a7";

  // ✨ Términos de búsqueda por defecto para iglesias
  const defaultSearchTerms = [
    "church",
    "worship",
    "cross",
    "nature",
    "mountains",
    "sky",
    "sunrise",
    "peaceful",
    "spiritual",
    "light",
  ];

  const searchImages = async (term = searchTerm) => {
    const queryTerm = term || searchTerm;
    if (!queryTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(
          queryTerm
        )}&image_type=photo&orientation=horizontal&category=backgrounds&min_width=1200&safesearch=true&per_page=20`
      );

      if (!response.ok) {
        throw new Error("Error en la búsqueda de imágenes");
      }

      const data = await response.json();
      setImages(data.hits || []);
    } catch (err) {
      setError(err.message);
      console.error("Error buscando imágenes:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✨ Cargar imágenes por defecto al montar el componente
  useEffect(() => {
    const randomTerm =
      defaultSearchTerms[Math.floor(Math.random() * defaultSearchTerms.length)];
    setSearchTerm(randomTerm);
    searchImages(randomTerm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      searchImages();
    }
  };

  const handleSearch = () => {
    searchImages();
  };

  const handleImageSelect = async (image) => {
    try {
      // 🔄 Descargar la imagen localmente en lugar de usar proxy
      console.log("📥 Descargando imagen de Pixabay...");
      console.log("📥 Datos a enviar:", {
        imageUrl: image.largeImageURL,
        imageId: image.id,
        tags: image.tags,
      });

      const response = await fetch(
        `${getBaseURL()}/api/download-pixabay-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: image.largeImageURL,
            imageId: image.id,
            tags: image.tags,
          }),
        }
      );

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Error del servidor:", errorData);
        throw new Error(
          `Error al descargar imagen: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ Imagen descargada:", data.localPath);
      console.log("✅ Datos completos:", data);

      // Usar la ruta local de la imagen descargada
      onImageSelect({
        url: data.localPath,
        largeUrl: data.localPath,
        originalUrl: image.webformatURL,
        originalLargeUrl: image.largeImageURL,
        tags: image.tags,
        user: image.user,
        id: image.id,
      });
    } catch (error) {
      console.error("❌ Error al descargar imagen de Pixabay:", error);
      console.error("❌ Stack:", error.stack);
      // Fallback: intentar usar las URLs originales directamente
      onImageSelect({
        url: image.webformatURL,
        largeUrl: image.largeImageURL,
        originalUrl: image.webformatURL,
        originalLargeUrl: image.largeImageURL,
        tags: image.tags,
        user: image.user,
        id: image.id,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Buscar Imágenes en Pixabay
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Buscar imágenes (ej: naturaleza, iglesia, música)"
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            Buscar
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 text-red-400 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* API Key Warning */}
        {PIXABAY_API_KEY === "TU_API_KEY_AQUI" && (
          <div className="bg-yellow-600/20 text-yellow-400 p-3 rounded-lg mb-4">
            ⚠️ Configura tu API key de Pixabay en el archivo .env como
            REACT_APP_PIXABAY_API_KEY
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <FaSpinner className="animate-spin text-blue-500 text-2xl" />
              <span className="ml-2 text-white">Buscando imágenes...</span>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={`${getBaseURL()}/pixabay-proxy?url=${encodeURIComponent(
                      image.webformatURL
                    )}`}
                    alt={image.tags}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => handleImageSelect(image)}
                    onError={(e) => {
                      // Fallback a la URL original si el proxy falla
                      console.warn(
                        `⚠️ [Pixabay] Error cargando imagen via proxy, usando URL original:`,
                        image.webformatURL
                      );
                      e.target.src = image.webformatURL;

                      // Si la URL original también falla, mostrar una imagen placeholder
                      e.target.onerror = () => {
                        console.error(
                          `❌ [Pixabay] Error cargando imagen original:`,
                          image.webformatURL
                        );
                        e.target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23374151"/%3E%3Ctext x="100" y="75" text-anchor="middle" fill="%23ffffff" font-family="Arial" font-size="12"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                      };
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => handleImageSelect(image)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                    >
                      <FaPlus /> Usar
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg">
                    <p className="truncate">{image.tags}</p>
                    <p className="text-gray-300">por {image.user}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm && !loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FaSearch className="mx-auto text-4xl mb-2" />
                <p>No se encontraron imágenes para "{searchTerm}"</p>
                <p className="text-sm">
                  Intenta con otros términos de búsqueda
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FaSearch className="mx-auto text-4xl mb-2" />
                <p>Busca imágenes para añadir a tus diapositivas</p>
                <p className="text-sm">Escribe un término y presiona Enter</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Imágenes proporcionadas por{" "}
          <a
            href="https://pixabay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Pixabay
          </a>
        </div>
      </div>
    </div>
  );
};

export default PixabayImageSearch;
