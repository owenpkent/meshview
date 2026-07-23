import { describe, expect, it } from 'vitest';
import { checkStl, MAX_TRIANGLES, sniffStl, toBytes } from '../src/webview/stlInfo';

// Build a minimal binary STL buffer: 80-byte header + uint32 LE triangle count
// + `count` triangles of 50 bytes each (12 floats + a uint16 attribute count).
function makeBinaryStl(count: number, actualTriangles = count): Uint8Array {
  const byteLength = 84 + 50 * actualTriangles;
  const buf = new ArrayBuffer(byteLength);
  const view = new DataView(buf);
  view.setUint32(80, count, true);
  return new Uint8Array(buf);
}

function makeAsciiStl(): string {
  return [
    'solid cube',
    '  facet normal 0 0 1',
    '    outer loop',
    '      vertex 0 0 0',
    '      vertex 1 0 0',
    '      vertex 1 1 0',
    '    endloop',
    '  endfacet',
    'endsolid cube',
    '',
  ].join('\n');
}

describe('sniffStl', () => {
  it('reports a binary STL with a valid triangle count', () => {
    const bytes = makeBinaryStl(10);
    expect(sniffStl(bytes)).toEqual({ format: 'binary', triangles: 10 });
  });

  it('still returns the header count when the file size does not match it', () => {
    // Header claims 10 triangles but the file only actually holds 3 worth of bytes.
    const bytes = makeBinaryStl(10, 3);
    expect(sniffStl(bytes)).toEqual({ format: 'binary', triangles: 10 });
  });

  it('detects an ASCII STL by its "solid" header and "facet" body', () => {
    const bytes = new TextEncoder().encode(makeAsciiStl());
    expect(sniffStl(bytes)).toEqual({ format: 'ascii', triangles: null });
  });

  it('treats empty input as binary with no readable triangle count', () => {
    expect(sniffStl(new Uint8Array(0))).toEqual({ format: 'binary', triangles: null });
  });

  it('treats short garbage input as binary with no readable triangle count', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(sniffStl(bytes)).toEqual({ format: 'binary', triangles: null });
  });

  it('treats a full 84-byte header of garbage as binary with a (garbage) count', () => {
    const bytes = new Uint8Array(84).fill(0xff);
    // bytes 80-83 are all 0xff -> 4294967295 as an unsigned LE uint32
    expect(sniffStl(bytes)).toEqual({ format: 'binary', triangles: 4294967295 });
  });
});

describe('toBytes', () => {
  const source = new Uint8Array([1, 2, 250, 0, 42]);

  it('passes a real Uint8Array through untouched', () => {
    expect(toBytes(source)).toBe(source);
  });

  it('wraps a bare ArrayBuffer', () => {
    expect(Array.from(toBytes(source.buffer))).toEqual([1, 2, 250, 0, 42]);
  });

  it('respects the offset and length of a view onto a larger buffer', () => {
    const view = new Uint8Array(source.buffer, 1, 3);
    expect(Array.from(toBytes(view))).toEqual([2, 250, 0]);
  });

  it('rebuilds from a numeric-keyed object (a JSON-round-tripped typed array)', () => {
    const mangled = JSON.parse(JSON.stringify(source));
    expect(mangled).not.toBeInstanceOf(Uint8Array);
    expect(Array.from(toBytes(mangled))).toEqual([1, 2, 250, 0, 42]);
  });

  it('rebuilds from a JSON-serialized Node Buffer', () => {
    const mangled = { type: 'Buffer', data: [1, 2, 250, 0, 42] };
    expect(Array.from(toBytes(mangled))).toEqual([1, 2, 250, 0, 42]);
  });

  it('rebuilds from a plain array', () => {
    expect(Array.from(toBytes([1, 2, 250, 0, 42]))).toEqual([1, 2, 250, 0, 42]);
  });

  it('preserves byte offsets when a numeric-keyed payload has gaps', () => {
    expect(Array.from(toBytes({ '0': 7, '3': 9 }))).toEqual([7, 0, 0, 9]);
  });

  it('survives a full binary STL making the JSON round trip', () => {
    const stl = makeBinaryStl(12);
    const rebuilt = toBytes(JSON.parse(JSON.stringify(stl)));
    expect(rebuilt.byteLength).toBe(stl.byteLength);
    expect(checkStl(rebuilt)).toMatchObject({ ok: true, triangles: 12 });
  });

  it('returns an empty array for junk rather than throwing', () => {
    expect(toBytes(null).byteLength).toBe(0);
    expect(toBytes(undefined).byteLength).toBe(0);
    expect(toBytes('nope').byteLength).toBe(0);
    expect(toBytes({}).byteLength).toBe(0);
  });
});

describe('checkStl', () => {
  it('accepts a well-formed binary STL', () => {
    const r = checkStl(makeBinaryStl(10));
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ format: 'binary', triangles: 10 });
  });

  it('rejects a binary header that over-claims its triangle count (amplification)', () => {
    // 84-byte file, but the header declares ~4.29B triangles.
    const r = checkStl(new Uint8Array(84).fill(0xff));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/more than the file can hold/i);
  });

  it('rejects when the declared count needs more bytes than the file holds', () => {
    // Header claims 10 triangles, only 3 worth of bytes present.
    expect(checkStl(makeBinaryStl(10, 3)).ok).toBe(false);
  });

  it('rejects a consistent file that still exceeds the triangle cap', () => {
    const r = checkStl(makeBinaryStl(12), 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/limit/i);
  });

  it('rejects a file too short to be a valid STL', () => {
    expect(checkStl(new Uint8Array(5)).ok).toBe(false);
  });

  it('allows ASCII STL (allocation bounded by file length)', () => {
    const bytes = new TextEncoder().encode(makeAsciiStl());
    expect(checkStl(bytes)).toMatchObject({ ok: true, format: 'ascii' });
  });

  it('exposes a positive default triangle cap', () => {
    expect(MAX_TRIANGLES).toBeGreaterThan(0);
  });
});
