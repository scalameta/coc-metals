export function sequence<X, R>(
  xs: X[],
  func: (x: X, n: number, arr: X[]) => Promise<R>
): Promise<R[]> {
  const seqInternal = async (acc: R[], idx: number): Promise<R[]> => {
    if (idx < xs.length) {
      const newR = await func(xs[idx], idx, xs);
      return seqInternal(acc.concat(newR), idx + 1);
    } else {
      return acc;
    }
  };
  return seqInternal([], 0);
}

export function groupBy<T>(
  array: T[],
  func: (t: T) => string
): Map<string, T[]> {
  const len = array.length;
  const res: Map<string, T[]> = new Map();
  for (let i = 0; i < len; i++) {
    const elem = array[i];
    const key = func(elem);
    let group = res.get(key);
    if (group === undefined) {
      group = [];
      res.set(key, group);
    }
    group.push(elem);
  }
  return res;
}
