import SyncHook from './syncHook';
declare type Status = "loading" | "fail" | "success" | "init";
declare type CreateFetchModel = <P = any, V = any>(params: {
    url: string;
    initValue: V;
    failValue?: V;
    mergeParams?: (params: any) => any;
    persistence?: {
        isNeed: boolean;
    };
    frequencyFn?: (...arg: any[]) => any;
    requestOption?: any;
    delayGc?: {
        time?: number;
        isNeed: boolean;
    };
    [key: string]: any;
}) => {
    dispatch: (params: P, option?: any) => Promise<V>;
    getContext: () => V;
    getStatus: () => Status;
    resetState: () => void;
};
declare type Plugin = (state: any, params: any, hooks: SyncHook) => void;
declare type FactoryFetchModel = (params: {
    fetch: any;
    plugins: Plugin[];
}) => ({
    createFetchModel: CreateFetchModel;
    initModel: () => void;
});
declare const factoryFetchModel: FactoryFetchModel;
export declare const useRequestState: (arr: any) => any;
export default factoryFetchModel;
