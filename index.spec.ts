import { tracePropAccess } from './index'

describe('proxy', () => {
    it('get value', () => {
        const obj = {
            'hello': 'world'
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(proxiedObj.hello).toBe('world');
        expect(mockFn).toBeCalledWith([[{key: 'hello', type: 'string'}]], 'world');
    });

    it('nested value', () => {
        const obj = {
            nested: {
                value: 'hello'
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(proxiedObj.nested.value).toBe('hello');
        expect(mockFn).toBeCalledWith([[{key: 'nested', type: 'object'}, {key: 'value', type: 'string'}]], 'hello');
    });


    it('function', () => {
        const obj = {
            nested: {
                fn: () => 'world'
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(proxiedObj.nested.fn('da')).toBe('world');
    });

    it('function returns object', () => {
        const obj = {
            nested: {
                fn: () => ({
                    'hello': 'world'
                })
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(proxiedObj.nested.fn('someArg').hello).toBe('world');
        expect(mockFn).toBeCalledWith([[{key: 'nested', type: 'object'}, {key: 'fn', type: 'function', callArgs: ['someArg'] }], [{key: 'hello', type: 'string'}]], 'world');
    });

    it('async function returns literal', async () => {
        const obj = {
            nested: {
                fn: async () => {
                    return 5;
                }
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(await proxiedObj.nested.fn('someArg')).toBe(5);
        expect(mockFn).toBeCalledWith([[{key: 'nested', type: 'object'}, {key: 'fn', type: 'function', callArgs: ['someArg'] }]], 5);
    });

    it('async function returns object', async () => {
        const obj = {
            nested: {
                fn: async () => {
                    return {
                        'hello': 'world'
                    };
                }
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect((await proxiedObj.nested.fn('someArg')).hello).toBe('world');
        expect(mockFn).toBeCalledWith([[{key: 'nested', type: 'object'}, {key: 'fn', type: 'function', callArgs: ['someArg'] }], [{key: 'hello', type: 'string'}]], 'world');
    });


    it('should not follow if predicate returns false', async () => {
        const obj = {
            nested: {
                _fn: async () => {
                    return {
                        'hello': 'world'
                    };
                }
            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn, shouldFollow: (target: any, propKey: any) => !propKey.toString().startsWith('_') });

        expect((await proxiedObj.nested._fn('someArg')).hello).toBe('world');
        expect(mockFn).not.toBeCalled();
    });

    it('should not follow non existant', async () => {
        const obj = {
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect(proxiedObj.hello).toBe(undefined);
        expect(mockFn).not.toBeCalled();
    });

    it('async function returns object', async () => {
        const obj = {
            nested: {
                fn1: async () => {
                    return {
                        'hello': 'world'
                    };
                },
                fn2: async () => {
                    return {
                        'hello': 'this is dog'
                    };
                }

            }
        };

        const mockFn = jest.fn();
        const proxiedObj = tracePropAccess(obj, { callback: mockFn });

        expect((await proxiedObj.nested.fn1('someArg')).hello).toBe('world');
        expect((await proxiedObj.nested.fn2()).hello).toBe('this is dog');
        expect(mockFn).nthCalledWith(1, [
            [{key: 'nested', type: 'object'}, {key: 'fn1', type: 'function', callArgs: ['someArg'] }],
            [{key: 'hello', type: 'string'}]
        ], 'world');
        expect(mockFn).nthCalledWith(2, [
            [{key: 'nested', type: 'object'}, {key: 'fn2', type: 'function', callArgs: [] }],
            [{key: 'hello', type: 'string'}]
        ], 'this is dog');
    });
});
