import React, {useState} from "react";
import {
  FaTimes,
  FaPlus,
  FaFileAlt,
  FaPaintBrush,
  FaFont,
  FaUsers,
  FaCalendarAlt,
  FaMagic,
} from "react-icons/fa";

const CreatePresentationModal = ({isOpen, onClose, onCreate}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [],
    template: "blank",
    slidesCount: 5,
    backgroundColor: "#1e293b",
    textColor: "#ffffff",
    titleFontSize: "48px",
    contentFontSize: "32px",
    textAlign: "center",
  });

  const [newTag, setNewTag] = useState("");

  if (!isOpen) return null;

  const templates = [
    {
      id: "blank",
      name: "Presentación en Blanco",
      description: "Comienza con diapositivas vacías",
      icon: <FaFileAlt />,
      backgroundColor: "#1e293b",
      textColor: "#ffffff",
    },
    {
      id: "worship",
      name: "Alabanza y Adoración",
      description: "Plantilla para himnos y canciones",
      icon: <FaUsers />,
      backgroundColor: "#4c1d95",
      textColor: "#ffffff",
    },
    {
      id: "sermon",
      name: "Predicación",
      description: "Diseño para sermones y enseñanzas",
      icon: <FaFont />,
      backgroundColor: "#1e40af",
      textColor: "#ffffff",
    },
    {
      id: "announcement",
      name: "Anuncios",
      description: "Para avisos y comunicados",
      icon: <FaCalendarAlt />,
      backgroundColor: "#059669",
      textColor: "#ffffff",
    },
    {
      id: "creative",
      name: "Creativa",
      description: "Diseño moderno y colorido",
      icon: <FaPaintBrush />,
      backgroundColor: "#dc2626",
      textColor: "#ffffff",
    },
    {
      id: "elegant",
      name: "Elegante",
      description: "Estilo sofisticado y minimalista",
      icon: <FaMagic />,
      backgroundColor: "#374151",
      textColor: "#f3f4f6",
    },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTemplateSelect = (template) => {
    setFormData((prev) => ({
      ...prev,
      template: template.id,
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = () => {
    console.log("🔘 [CreateModal] BOTÓN CREAR CLICKEADO");
    console.log("📝 [CreateModal] Datos del formulario:", formData);

    if (!formData.name.trim()) {
      alert("Por favor ingresa un nombre para la presentación");
      return;
    }

    // Crear slides iniciales basados en la plantilla
    const initialSlides = Array.from(
      {length: formData.slidesCount},
      (_, index) => ({
        id: Date.now() + index,
        title: index === 0 ? formData.name : `Diapositiva ${index + 1}`,
        content: index === 0 ? formData.description : "",
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        fontSize: formData.contentFontSize,
        titleFontSize: formData.titleFontSize,
        backgroundImage: null,
        layout: "title-content",
        textAlign: formData.textAlign,
      })
    );

    const newPresentation = {
      id: null,
      name: formData.name,
      slides: initialSlides,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      description: formData.description,
      fileType: "custom",
      fileSize: 0,
      favorito: false,
      tags: formData.tags,
      configuracion: {
        template: formData.template,
        defaultBackgroundColor: formData.backgroundColor,
        defaultTextColor: formData.textColor,
        defaultTitleFontSize: formData.titleFontSize,
        defaultContentFontSize: formData.contentFontSize,
        defaultTextAlign: formData.textAlign,
      },
      slideActual: 0,
    };

    onCreate(newPresentation);
    onClose();

    // Reset form
    setFormData({
      name: "",
      description: "",
      tags: [],
      template: "blank",
      slidesCount: 5,
      backgroundColor: "#1e293b",
      textColor: "#ffffff",
      titleFontSize: "48px",
      contentFontSize: "32px",
      textAlign: "center",
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Solo cerrar si se hace clic en el fondo, no en el contenido
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">
            Crear Nueva Presentación
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Presentación *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="Ej: Servicio Dominical"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Diapositivas
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.slidesCount}
                onChange={(e) =>
                  handleInputChange(
                    "slidesCount",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
              placeholder="Descripción opcional de la presentación..."
            />
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Etiquetas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTag()}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="Agregar etiqueta..."
              />
              <button
                onClick={addTag}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaPlus />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-blue-300 hover:text-white"
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Plantillas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Seleccionar Plantilla
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.template === template.id
                      ? "border-blue-400 bg-blue-600/20"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white"
                      style={{backgroundColor: template.backgroundColor}}
                    >
                      {template.icon}
                    </div>
                    <h3 className="font-medium text-white">{template.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {template.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{backgroundColor: template.backgroundColor}}
                    ></div>
                    <div
                      className="w-4 h-4 rounded border"
                      style={{backgroundColor: template.textColor}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de estilo */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Configuración de Estilo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color de Fondo
                </label>
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    handleInputChange("backgroundColor", e.target.value)
                  }
                  className="w-full h-10 rounded border border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color de Texto
                </label>
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) =>
                    handleInputChange("textColor", e.target.value)
                  }
                  className="w-full h-10 rounded border border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tamaño Título
                </label>
                <select
                  value={formData.titleFontSize}
                  onChange={(e) =>
                    handleInputChange("titleFontSize", e.target.value)
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="32px">32px</option>
                  <option value="40px">40px</option>
                  <option value="48px">48px</option>
                  <option value="56px">56px</option>
                  <option value="64px">64px</option>
                  <option value="72px">72px</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alineación
                </label>
                <select
                  value={formData.textAlign}
                  onChange={(e) =>
                    handleInputChange("textAlign", e.target.value)
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Vista Previa
            </h3>
            <div
              className="w-full aspect-video rounded-lg flex flex-col justify-center items-center p-8 border border-slate-600"
              style={{
                backgroundColor: formData.backgroundColor,
                color: formData.textColor,
                textAlign: formData.textAlign,
              }}
            >
              <h1
                className="font-bold mb-4"
                style={{fontSize: formData.titleFontSize}}
              >
                {formData.name || "Nombre de la Presentación"}
              </h1>
              <p style={{fontSize: formData.contentFontSize}}>
                {formData.description || "Descripción de la presentación"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Crear Presentación
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePresentationModal;
