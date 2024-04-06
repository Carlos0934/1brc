import { CHAR_NEWLINE, quickSort } from "./utils.ts";
import { createWorker } from "./utils.ts";
import { MAX_LINE_LENGTH } from "./utils.ts";
import { Station } from "./utils.ts";

const filename = Deno.args[0];

console.log(`Processing ${filename}`);

const file = await Deno.open(filename);
const size = Deno.statSync(filename).size;

const stations = new Map<string, Omit<Station, "name">>();
console.log(`File size: ${size}`);
const threads = navigator.hardwareConcurrency || 1;
console.log(`Threads: ${threads}`);

const chunkOffsets = new Array(threads);

const t1 = performance.now();

const chunkSize = Math.ceil(size / threads);

let offset = 0;
let i = 0;

while (true) {
  offset += chunkSize;
  const buffer = new Uint8Array(MAX_LINE_LENGTH);

  file.seekSync(offset - MAX_LINE_LENGTH, Deno.SeekMode.Start);

  file.readSync(buffer);

  const newlinePos = buffer.lastIndexOf(CHAR_NEWLINE);

  if (newlinePos === -1) {
    chunkOffsets[i] = offset - MAX_LINE_LENGTH;
    break;
  } else {
    offset -= MAX_LINE_LENGTH - newlinePos;
    chunkOffsets[i] = offset;

    i++;
  }
}

const promises: Promise<void>[] = [];

for (let i = 0; i < threads; i++) {
  const start = i === 0 ? 0 : chunkOffsets[i - 1];
  const end = chunkOffsets[i];

  const worker = createWorker({ start, end, filename }, stations);
  promises.push(worker);
}

await Promise.all(promises);

const sort = quickSort(
  Array.from(stations.entries()).map(
    ([stationId, { count, total, min, max }]) => ({
      name: stationId,
      count,
      total,
      min,
      max,
    })
  )
);

for (const { name, count, total, min, max } of sort) {
  console.log(
    `${name} - count: ${count}, total: ${total}, min: ${min}, max: ${max}`
  );
}
const t2 = performance.now();

console.log(`Processing took ${t2 - t1} milliseconds`);

Deno.exit(0);
