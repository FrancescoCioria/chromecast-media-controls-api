export const timeoutPromise = <A>(
  promise: Promise<A>,
  timeoutMs: number
): Promise<A> => {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false;

    const timeout = setTimeout(() => {
      hasTimedOut = true;
      reject(new Error(`Timeout of ${timeoutMs} ms exceeded`));
    }, timeoutMs);

    promise
      .then(res => {
        if (!hasTimedOut) {
          clearTimeout(timeout);
          resolve(res);
        }
      })
      .catch(e => {
        if (!hasTimedOut) {
          clearTimeout(timeout);
          reject(e);
        }
      });
  });
};
