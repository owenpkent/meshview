// Pure, dependency-free STL sniffing used by both the extension host (to log/
// show quick info) and unit tests. Kept separate from the Three.js parsing path
// (STLLoader) so it has no DOM/Three dependency and is trivial to test.

export interface StlSniffResult {
  format: 'binary' | 'ascii';
  triangles: number | null;
}

// Detect whether `bytes` looks like an ASCII or binary STL, and (for binary)
// read the declared triangle count out of the 80-byte header.
export function sniffStl(bytes: Uint8Array): StlSniffResult {
  if (looksAscii(bytes)) {
    return { format: 'ascii', triangles: null };
  }
  return { format: 'binary', triangles: binaryTriangleCount(bytes) };
}

// ASCII STL files start with "solid" and, within the same header region,
// contain a "facet" keyword introducing the first triangle. Binary STL files
// can technically start with the bytes "solid" too (the 80-byte header is
// free-form text), so requiring "facet" nearby as well avoids misclassifying
// those as ASCII.
function looksAscii(bytes: Uint8Array): boolean {
  const head = decodeLatin1(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return /^\s*solid\b/i.test(head) && /facet/i.test(head);
}

// A binary STL is: 80-byte header, uint32 LE triangle count, then 50 bytes per
// triangle (12 floats + a uint16 attribute byte count). If the file's actual
// size does not match that formula, the header count is still returned as-is
// (some tools write STL files with a stale/incorrect count); the caller can
// treat the size mismatch as a warning if it cares.
function binaryTriangleCount(bytes: Uint8Array): number | null {
  if (bytes.length < 84) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(80, true);
}

function decodeLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}
