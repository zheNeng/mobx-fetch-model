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
    [key: string]: any;
}) => {
    dispatch: (params: P, option?: any) => Promise<V>;
    getContext: () => V;
    getStatus: () => Status;
};
declare type Plugin = (state: any, params: any) => ({
    handelSuccess: (res: any) => void;
    handelFail: (res: any) => void;
});
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
