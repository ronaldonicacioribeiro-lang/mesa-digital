// Gera public/modelos/teste-cubo.glb: um cubo laranja de 15 cm.
// NÃO é um prato. Serve só para testar o visualizador 3D e a realidade aumentada
// enquanto os modelos reais dos pratos não existem. Rodar: node scripts/make-test-glb.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const h = 0.075; // metade do lado (cubo de 15 cm)

// Cada face: normal n e dois eixos u, v com u × v = n (assim a face aponta para fora).
const faces = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];

const positions = [];
const normals = [];
const indices = [];
faces.forEach(({ n, u, v }, f) => {
  for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let k = 0; k < 3; k++) positions.push((n[k] + su * u[k] + sv * v[k]) * h);
    normals.push(...n);
  }
  const b = f * 4;
  indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
});

const posBuf = Buffer.from(new Float32Array(positions).buffer);
const norBuf = Buffer.from(new Float32Array(normals).buffer);
const idxBuf = Buffer.from(new Uint16Array(indices).buffer);
const bin = Buffer.concat([posBuf, norBuf, idxBuf]);

const json = {
  asset: { version: "2.0", generator: "mesa-digital teste" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "cubo-de-teste" }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [
    { name: "laranja", pbrMetallicRoughness: { baseColorFactor: [0.95, 0.45, 0.1, 1], metallicFactor: 0, roughnessFactor: 0.6 } },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length, byteLength: norBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + norBuf.length, byteLength: idxBuf.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-h, -h, -h], max: [h, h, h] },
    { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" },
  ],
};

const pad = (buf, byte) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4, byte)]);
const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 0x20);
const binChunk = pad(bin, 0);

const header = Buffer.alloc(12);
header.write("glTF", 0, "ascii");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHead = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.writeUInt32LE(type, 4);
  return b;
};

mkdirSync("public/modelos", { recursive: true });
writeFileSync(
  "public/modelos/teste-cubo.glb",
  Buffer.concat([header, chunkHead(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHead(binChunk.length, 0x004e4942), binChunk]),
);
console.log("Criado public/modelos/teste-cubo.glb");
