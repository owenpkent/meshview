// Generates sample STL fixtures of a unit cube (12 triangles), in both
// binary and ASCII STL format, for manual testing and the "Try it" section
// of the README.
//
// Usage: node scripts/make-samples.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'samples');
mkdirSync(outDir, { recursive: true });

// Unit cube corners.
const vertices = [
  [0, 0, 0], // 0
  [1, 0, 0], // 1
  [1, 1, 0], // 2
  [0, 1, 0], // 3
  [0, 0, 1], // 4
  [1, 0, 1], // 5
  [1, 1, 1], // 6
  [0, 1, 1], // 7
];

// 12 triangles (2 per face), wound so each face's normal points outward.
const faces = [
  // bottom (z=0)
  [0, 2, 1],
  [0, 3, 2],
  // top (z=1)
  [4, 5, 6],
  [4, 6, 7],
  // front (y=0)
  [0, 1, 5],
  [0, 5, 4],
  // back (y=1)
  [3, 6, 2],
  [3, 7, 6],
  // left (x=0)
  [0, 7, 3],
  [0, 4, 7],
  // right (x=1)
  [1, 2, 6],
  [1, 6, 5],
];

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len === 0 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len];
}

const triangles = faces.map(([ia, ib, ic]) => {
  const a = vertices[ia];
  const b = vertices[ib];
  const c = vertices[ic];
  const normal = normalize(cross(sub(b, a), sub(c, a)));
  return { normal, a, b, c };
});

// --- Binary STL: 80-byte header, uint32 LE triangle count, then per
// triangle 12 floats (normal + 3 vertices) + a 2-byte attribute count. ---
function writeBinarySTL() {
  const headerSize = 80;
  const triCount = triangles.length;
  const bytesPerTri = 12 * 4 + 2;
  const buf = Buffer.alloc(headerSize + 4 + bytesPerTri * triCount);

  buf.write('MeshView sample cube - binary STL', 0, 'ascii');
  buf.writeUInt32LE(triCount, headerSize);

  let offset = headerSize + 4;
  for (const tri of triangles) {
    const floats = [...tri.normal, ...tri.a, ...tri.b, ...tri.c];
    for (const f of floats) {
      buf.writeFloatLE(f, offset);
      offset += 4;
    }
    buf.writeUInt16LE(0, offset); // attribute byte count
    offset += 2;
  }

  return buf;
}

// --- ASCII STL ---
function writeAsciiSTL() {
  const fmt = (n) => n.toFixed(6);
  const lines = ['solid cube'];
  for (const tri of triangles) {
    lines.push(`  facet normal ${fmt(tri.normal[0])} ${fmt(tri.normal[1])} ${fmt(tri.normal[2])}`);
    lines.push('    outer loop');
    for (const v of [tri.a, tri.b, tri.c]) {
      lines.push(`      vertex ${fmt(v[0])} ${fmt(v[1])} ${fmt(v[2])}`);
    }
    lines.push('    endloop');
    lines.push('  endfacet');
  }
  lines.push('endsolid cube');
  return lines.join('\n') + '\n';
}

const binaryPath = path.join(outDir, 'cube-binary.stl');
const asciiPath = path.join(outDir, 'cube-ascii.stl');

writeFileSync(binaryPath, writeBinarySTL());
writeFileSync(asciiPath, writeAsciiSTL());

console.log('Wrote', path.relative(root, binaryPath));
console.log('Wrote', path.relative(root, asciiPath));
