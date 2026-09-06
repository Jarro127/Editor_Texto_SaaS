package Jar.controller;

import Jar.model.Documento;
import Jar.repository.DocumentoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    private final DocumentoRepository documentoRepository;

    public DocumentoController(DocumentoRepository documentoRepository) {
        this.documentoRepository = documentoRepository;
    }

    @GetMapping
    public List<Documento> obtenerTodos() {
        return documentoRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Documento> obtenerPorId(@PathVariable Long id) {
        return documentoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Documento> crearDocumento(@RequestBody Documento documento) {
        Documento nuevoDocumento = documentoRepository.save(documento);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoDocumento);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Documento> actualizarDocumento(@PathVariable Long id, @RequestBody Documento documentoDetalles) {
        return documentoRepository.findById(id)
                .map(documentoExistente -> {
                    documentoExistente.setTitulo(documentoDetalles.getTitulo());
                    documentoExistente.setContenido(documentoDetalles.getContenido());
                    documentoExistente.setAutor(documentoDetalles.getAutor());
                    Documento actualizado = documentoRepository.save(documentoExistente);
                    return ResponseEntity.ok(actualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarDocumento(@PathVariable Long id) {
        if (documentoRepository.existsById(id)) {
            documentoRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
