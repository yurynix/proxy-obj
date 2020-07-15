//export type PathPartType = 'function' | 'object' | 'string' | 'number';

export enum PathPartType {
  function = 'function',
  object = 'object',
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  symbol = 'symbol',
  undefined = 'undefined',
  bigint = 'bigint',
}

export interface BasePathPart {
  key: string;
  type: Exclude<PathPartType, PathPartType.function>;
}

export interface FunctionPathPart {
  key: string;
  type: PathPartType.function;
  callArgs: any[];
}

export type PathPart = BasePathPart | FunctionPathPart;

export interface TracePropAccessOptions {
  callback?(paths: PathPart[][], result: any): void;
  shouldFollow?(target: any, propKey: any): boolean;
}

export function tracePropAccess(
  obj: any,
  options: TracePropAccessOptions,
  paths: PathPart[][] = [[]],
): any {
  const actualOptions = {
    callback: () => {},
    shouldFollow: () => true,
    ...options,
  };
  return new Proxy(obj, {
    get(target, propKey, receiver) {
      const reflectedProp = Reflect.get(target, propKey, receiver);
      if (
        !(propKey in target) ||
        !actualOptions.shouldFollow(target, propKey)
      ) {
        return reflectedProp;
      }
      const workingPaths = paths.map(pathArr => [...pathArr]);

      const newPathEntry =
        typeof reflectedProp === 'function'
          ? ({
              key: propKey.toString(),
              type: PathPartType.function,
              callArgs: [],
            } as FunctionPathPart)
          : ({
              key: propKey.toString(),
              type: PathPartType[typeof reflectedProp],
            } as BasePathPart);

      workingPaths[workingPaths.length - 1] = [
        ...workingPaths[workingPaths.length - 1],
        newPathEntry,
      ];
      if (reflectedProp) {
        if (typeof reflectedProp === 'object') {
          return tracePropAccess(reflectedProp, actualOptions, workingPaths);
        }

        if (typeof reflectedProp === 'function') {
          return (...args: any) => {
            workingPaths[workingPaths.length - 1].pop();
            workingPaths[workingPaths.length - 1].push({
              key: propKey.toString(),
              type: PathPartType.function,
              callArgs: args,
            });
            const newPaths = [...workingPaths, []];
            const fnResult = reflectedProp.apply(target, args);

            if (typeof fnResult !== 'object' || !fnResult) {
              return fnResult;
            }

            if (typeof fnResult.then === 'function') {
              return fnResult.then((result: any) => {
                if (typeof result === 'object' && result) {
                  return tracePropAccess(result, actualOptions, newPaths);
                }

                newPaths.pop();
                actualOptions.callback(newPaths, result);
                return result;
              });
            }

            return tracePropAccess(fnResult, actualOptions, newPaths);
          };
        }
      }

      actualOptions.callback(workingPaths, target[propKey]);
      return reflectedProp;
    },
  });
}
