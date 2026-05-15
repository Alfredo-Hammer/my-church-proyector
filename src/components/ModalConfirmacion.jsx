import React from "react";

const ModalConfirmacion = ({isOpen, onClose, onConfirm, mensaje, titulo}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900/95 backdrop-blur text-white rounded-lg shadow-2xl border border-slate-700/50 p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">{titulo}</h2>
        <p className="text-slate-300 mb-6">{mensaje}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacion;
