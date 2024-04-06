/// <reference lib="deno.worker" />
import { ByteSliceStream } from "https://deno.land/std@0.221.0/streams/mod.ts";

let remainingBuffer: Uint8Array | null = null;
let remainingCursor = 0;
const stations = new Map();
const textDecoder = new TextDecoder();
const CHAR_NEWLINE = "\n".charCodeAt(0);
const CHAR_SEMICOLON = ";".charCodeAt(0);
const NEGATIVE_SIGN = "-".charCodeAt(0);
const WHITESPACE = "\r".charCodeAt(0);

function charToNumber(char: number): number {
  return char - 48;
}

function parseBufferToFloatInt(buffer: Uint8Array): number {
  const isNegative = buffer[0] === NEGATIVE_SIGN;

  const hasWhitespace = buffer[buffer.length - 1] === WHITESPACE;
  if (hasWhitespace) {
    buffer = buffer.subarray(0, buffer.length - 1);
  }
  const length = buffer.length;

  if (isNegative) {
    switch (length) {
      case 5:
        return -(
          charToNumber(buffer[1]) * 100 +
          charToNumber(buffer[2]) * 10 +
          charToNumber(buffer[4])
        );
      case 4:
        return -(charToNumber(buffer[1]) * 10 + charToNumber(buffer[3]));

      default:
        throw new Error("Invalid negative number length " + length);
    }
  }

  switch (length) {
    case 4:
      return (
        charToNumber(buffer[0]) * 100 +
        charToNumber(buffer[1]) * 10 +
        charToNumber(buffer[3])
      );

    case 3:
      return charToNumber(buffer[0]) * 10 + charToNumber(buffer[2]);

    default:
      throw new Error("Invalid number length " + length);
  }
}

function addLineToMap(
  line: Uint8Array,
  stations: Map<
    string,
    { count: number; total: number; min: number; max: number }
  >
) {
  const semicolonPos = line.indexOf(CHAR_SEMICOLON);

  if (semicolonPos === -1) {
    return;
  }

  const stationId = line.subarray(0, semicolonPos);

  const value = parseBufferToFloatInt(line.subarray(semicolonPos + 1));

  // add to map
  const stationIdStr = textDecoder.decode(stationId);

  const station = stations.get(stationIdStr);

  if (station) {
    station.count++;
    station.total += value;
    if (station.min > value) {
      station.min = value;
    }
    if (station.max < value) {
      station.max = value;
    }

    stations.set(stationIdStr, station);
  } else {
    stations.set(stationIdStr, {
      count: 1,
      min: value,
      max: value,
      total: value,
    });
  }
}

function processChunk(chunk: Uint8Array) {
  if (remainingCursor > 0 && remainingBuffer) {
    const firstLineIndex = chunk.indexOf(CHAR_NEWLINE);
    const line = new Uint8Array(remainingCursor + firstLineIndex);
    line.set(remainingBuffer.subarray(0, remainingCursor), 0);
    line.set(chunk.subarray(0, firstLineIndex), remainingCursor);

    addLineToMap(line, stations);

    remainingBuffer = null;
    remainingCursor = 0;

    chunk = chunk.subarray(firstLineIndex + 1);
  }

  const lastNewline = chunk.lastIndexOf(CHAR_NEWLINE);

  if (lastNewline < chunk.length - 1) {
    remainingBuffer = chunk.subarray(lastNewline + 1);
    remainingCursor = chunk.length - lastNewline - 1;
  }

  let lines = chunk.subarray(0, lastNewline + 1);

  while (true) {
    const newlinePos = lines.indexOf(CHAR_NEWLINE);

    if (newlinePos === -1) {
      break;
    }
    const line = lines.subarray(0, newlinePos);
    lines = lines.subarray(newlinePos + 1);
    addLineToMap(line, stations);
  }
}

self.onmessage = (
  e: MessageEvent<{ filename: string; start: number; end: number }>
) => {
  const { filename, start, end } = e.data;
  const file = Deno.openSync(filename);

  file.readable.pipeThrough(new ByteSliceStream(start, end)).pipeTo(
    new WritableStream({
      write(chunk) {
        processChunk(chunk);
      },
      close() {
        if (remainingCursor > 0 && remainingBuffer) {
          addLineToMap(remainingBuffer.subarray(0, remainingCursor), stations);
        }
        postMessage(stations);
      },
    })
  );
};
