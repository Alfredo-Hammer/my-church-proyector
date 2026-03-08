function parseBibFile(content) {
  const lines = content.split(/\r?\n/);
  const biblia = {};
  let libroActual = "";
  let capituloActual = "";

  for (const line of lines) {
    const encabezadoMatch = line.match(/^\[(.+?) (\d+)\]$/); // ej. [Juan 3]

    if (encabezadoMatch) {
      libroActual = encabezadoMatch[1];
      capituloActual = encabezadoMatch[2];

      if (!biblia[libroActual]) {
        biblia[libroActual] = {};
      }

      biblia[libroActual][capituloActual] = [];
    } else if (/^\d+ /.test(line)) {
      const numeroVersiculo = line.match(/^(\d+)\s+/)[1];
      const textoVersiculo = line.replace(/^\d+\s+/, "");

      if (biblia[libroActual] && biblia[libroActual][capituloActual]) {
        biblia[libroActual][capituloActual].push({
          numero: parseInt(numeroVersiculo, 10),
          texto: textoVersiculo,
        });
      }
    }
  }

  return biblia;
}

module.exports = {parseBibFile};
