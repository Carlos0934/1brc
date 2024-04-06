export type Station = {
  count: number;
  total: number;
  min: number;
  max: number;
  name: string;
};

export const CHAR_NEWLINE = "\n".charCodeAt(0);

export const MAX_LINE_LENGTH = 100 + 1 + 5; // 100 bytes for station id, 1 for semicolon, 5 for value

const workerUrl = new URL("worker.ts", import.meta.url).href;

export function createWorker(
  data: { start: number; end: number; filename: string },
  stations: Map<string, Omit<Station, "name">>
) {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: "module" });
    worker.postMessage(data);
    worker.onerror = reject;
    worker.onmessage = (e) => {
      const map = e.data as Map<string, Omit<Station, "name">>;

      for (const [stationIdStr, { count, total, min, max }] of map.entries()) {
        const station = stations.get(stationIdStr);

        if (station) {
          station.count += count;
          station.total += total;
          if (station.min > min) {
            station.min = min;
          }
          if (station.max < max) {
            station.max = max;
          }

          stations.set(stationIdStr, station);
        } else {
          stations.set(stationIdStr, {
            count,
            min,
            max,
            total,
          });
        }

        resolve();
      }
    };
  });
}

export function quickSort(arr: Station[]) {
  const partition = (arr: Station[], left: number, right: number) => {
    const pivot = arr[Math.floor((right + left) / 2)];
    let i = left;
    let j = right;

    while (i <= j) {
      while (arr[i].name.localeCompare(pivot.name) < 0) {
        i++;
      }

      while (arr[j].name.localeCompare(pivot.name) > 0) {
        j--;
      }

      if (i <= j) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        i++;
        j--;
      }
    }

    return i;
  };

  const sort = (arr: Station[], left: number, right: number) => {
    let index;

    if (arr.length > 1) {
      index = partition(arr, left, right);

      if (left < index - 1) {
        sort(arr, left, index - 1);
      }

      if (index < right) {
        sort(arr, index, right);
      }
    }

    return arr;
  };

  return sort(arr, 0, arr.length - 1);
}
