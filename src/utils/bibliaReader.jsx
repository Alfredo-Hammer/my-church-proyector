let bibliaTexto = "";

export const leerBiblia = () => {
  if (bibliaTexto) return bibliaTexto;

  // En Electron
  if (window?.electron?.ipcRenderer?.leerBiblia) {
    bibliaTexto = window.electron.ipcRenderer.leerBiblia();
    return bibliaTexto;
  }

  // En modo desarrollo
  console.warn("Usando versión de prueba de la Biblia (modo desarrollo)");
  bibliaTexto = `
[GÉNESIS 1:1]
En el principio creó Dios los cielos y la tierra.

[JUAN 3:16]
Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito...

[SALMOS 23:1]
Jehová es mi pastor; nada me faltará.
  `;
  return bibliaTexto;
};

export const buscarVersiculo = (libro, capitulo, versiculo) => {
  const texto = leerBiblia();
  const referencia = `${libro.toUpperCase()} ${capitulo}:${versiculo}`;
  const regex = new RegExp(
    `\\[${referencia}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`,
    "i"
  );
  const match = texto.match(regex);
  return match ? match[1].trim() : "Versículo no encontrado.";
};
