export type PathPartType = 'function' | 'object' | 'string' | 'number';

export type PathPart =  {
  key: string;
  type: PathPartType;
} | {
  type: 'function';
  callArgs: any[];
};

export interface TracePropAccessOptions {
  callback?: (paths: PathPart[][], result: any) => void,
  shouldFollow?: (target: any, propKey: any) => boolean
}

export function tracePropAccess(
  obj: any,
  options: TracePropAccessOptions,
  paths: PathPart[][] = [[]]
): any {
  const actualOptions = Object.assign({}, {
    callback: () => { },
    shouldFollow: () => true,
  }, options);
  return new Proxy(obj, {
    get(target, propKey, receiver) {
      const reflectedProp = Reflect.get(target, propKey, receiver);
      if (!(propKey in target) || !actualOptions.shouldFollow(target, propKey)) {
        return reflectedProp;
      }
      paths[paths.length - 1] = [...paths[paths.length - 1], { key: propKey.toString(), type: (typeof reflectedProp) as PathPartType }];
      if (reflectedProp) {
        if (typeof reflectedProp === "object") {
          return tracePropAccess(reflectedProp, actualOptions, paths);
        }

        if (typeof reflectedProp === "function") {
          return (...args: any) => {
            paths[paths.length - 1].pop();
            paths[paths.length - 1].push({
              key: propKey.toString(),
              type: 'function',
              callArgs: args,
            });
            const newPaths = [...paths, []];
            const fnResult = reflectedProp.apply(target, args);

            if (typeof fnResult !== "object" || !fnResult) {
              return fnResult;
            }

            if (typeof fnResult.then === "function") {
              return fnResult.then((result: any) => {
                if (typeof result === 'object' && result) {
                  return tracePropAccess(result, actualOptions, newPaths);
                }

                actualOptions.callback(newPaths, result);
                return result;
              })
            }

            return tracePropAccess(fnResult, actualOptions, newPaths);
          };
        }
      }

      actualOptions.callback(paths, target[propKey]);
      return reflectedProp;
    },
  });
}
