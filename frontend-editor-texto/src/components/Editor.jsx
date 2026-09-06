import { useState } from "react";

function Editor() {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");

  function guardarDocumento() {
    console.log("Documento:", {
      titulo,
      contenido,
    });
  }

  const palabras = contenido.trim() === "" ? 0 : contenido.trim().split(/\s+/).length;

  return (
    <section className="editor">
      <h2>Documento</h2>
      <input
        type="text"
        placeholder="Título del documento"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      {titulo && <p>Título actual: {titulo}</p>}
      <textarea
        placeholder="Escribe aquí..."
        rows="15"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
      />
      <p>Caracteres: {contenido.length}</p>
      <p>Palabras: {palabras}</p>
      <button onClick={guardarDocumento}>Guardar</button>
    </section>
  );
}

export default Editor;
