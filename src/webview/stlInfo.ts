// Pure, dependency-free STL sniffing used by both the extension host (to log/
// show quick info) and unit tests. Kept separate from the Three.js parsing path
// (STLLoader) so it has no DOM/Three dependency and is trivial to test.

export interface StlSniffResult {
  format: 'binary' | 'ascii';
  triangles: number | null;
}

// Normalize whatever the extension host's postMessage payload turned into back
// to a Uint8Array. The webview transport does not always preserve the typed
// array: depending on the VS Code version and the message path, a Uint8Array can
// arrive as a real Uint8Array, a bare ArrayBuffer, a numeric-keyed plain object
// ({"0":12,"1":34,...}, what JSON.stringify makes of a typed array), or a
// serialized Node Buffer ({type:'Buffer',data:[...]}). `new Uint8Array(obj)` on
// the last two reads a missing `.length` and silently yields a ZERO-length
// array, which downstream looks exactly like a truncated file, so each shape has
// to be handled explicitly.
export function toBytes(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (Array.isArray(input)) {
    return Uint8Array.from(input as number[]);
  }
  if (input !== null && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return Uint8Array.from(obj.data as number[]);
    }
    // Lost its prototype but kept a usable length: treat as array-like.
    if (typeof obj.length === 'number') {
      return Uint8Array.from(obj as unknown as ArrayLike<number>);
    }
    // Numeric keys, no length. Size from the highest index so a payload with a
    // gap still lands each byte at its original offset.
    const keys = Object.keys(obj).filter((k) => /^\d+$/.test(k));
    if (keys.length > 0) {
      let max = -1;
      for (const k of keys) {
        max = Math.max(max, Number(k));
      }
      const out = new Uint8Array(max + 1);
      for (const k of keys) {
        out[Number(k)] = Number(obj[k]) & 0xff;
      }
      return out;
    }
  }
  return new Uint8Array(0);
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

// Safe upper bound on triangles for a viewer. A binary STL header can declare up
// to ~4.29B triangles (a uint32), and STLLoader allocates Float32Arrays sized
// from that value (faces * 9 floats), so an ~84-byte crafted file could request
// tens of GB and hang the webview. checkStl() gates parsing on this.
export const MAX_TRIANGLES = 10_000_000;

export interface StlCheck {
  ok: boolean;
  reason?: string;
  format: 'binary' | 'ascii';
  triangles: number | null;
}

// Decide whether `bytes` is safe to hand to STLLoader.parse(). For binary STL we
// reject when the header's declared triangle count needs more bytes than the
// file actually holds (the small-file / huge-count amplification that drives a
// giant allocation) or when it exceeds `maxTriangles`. ASCII STL is parsed
// facet-by-facet, bounded by the real file length, so it is always allowed here.
export function checkStl(bytes: Uint8Array, maxTriangles = MAX_TRIANGLES): StlCheck {
  const { format, triangles } = sniffStl(bytes);
  if (format === 'ascii') {
    return { ok: true, format, triangles };
  }
  if (triangles === null) {
    return { ok: false, reason: 'File is too short to be a valid STL.', format, triangles };
  }
  if (84 + triangles * 50 > bytes.byteLength) {
    return {
      ok: false,
      reason: `Binary STL header claims ${triangles.toLocaleString()} triangles, more than the file can hold. Refusing to load (possibly a corrupt or malicious file).`,
      format,
      triangles,
    };
  }
  if (triangles > maxTriangles) {
    return {
      ok: false,
      reason: `Model has ${triangles.toLocaleString()} triangles, above MeshView's ${maxTriangles.toLocaleString()} limit.`,
      format,
      triangles,
    };
  }
  return { ok: true, format, triangles };
}
