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
export declare const useRequestState: (arr: any) => any;
export declare const useAutoRequest: (params: ReturnType<CreateFetchModel>) => void;
export default createFetchModel;
