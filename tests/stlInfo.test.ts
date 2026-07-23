import { describe, expect, it } from 'vitest';
import { sniffStl } from '../src/webview/stlInfo';

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
