"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRequestState = void 0;
const mobx_1 = require("mobx");
const lodash_1 = require("lodash");
const requestDataPlugin = (state, params) => {
    const { url, initValue, failValue } = params;
    state.requestData[url] = lodash_1.cloneDeep(initValue);
    return {
        handelSuccess(res) {
            state.requestData[url] = res;
        },
        handelFail(err) {
            if (failValue) {
                state.requestData[url] = failValue;
            }
        },
    };
};
const persistencePlugin = (state, params) => {
    const { persistence = {}, url, initValue, failValue } = params;
    const { isNeed } = persistence;
    const getCacheFromLocalStore = (key, defaultValue) => {
        let res;
        const value = localStorage.getItem(key);
        try {
            res = JSON.parse(value);
        }
        catch (err) {
            res = defaultValue;
            console.error(`读取缓存序列化失败`);
        }
        return res;
    };
    const setCacheToLocalStore = (key, value) => {
        let res;
        try {
            res = JSON.stringify(value);
        }
        catch (err) {
            console.error(`存入缓存序列化失败`);
        }
        localStorage.setItem(key, res);
    };
    if (isNeed) {
        state.requestData[url] = getCacheFromLocalStore(url, lodash_1.cloneDeep(initValue));
        return {
            handelSuccess(res) {
                setCacheToLocalStore(url, res);
            },
            handelFail() { }
        };
    }
    else {
        return {
            handelSuccess() {
            },
            handelFail() { }
        };
    }
};
const requestStatusPlugin = (state, params) => {
    const { url } = params;
    state.requestStatus[url] = "init";
    return {
        handelSuccess(res) {
            state.requestStatus[url] = "success";
        },
        handelFail(err) {
            state.requestStatus[url] = "fail";
        },
    };
};
const structureFromInitValuePlugin = (state, params) => {
    const { initValue } = params;
    const toStructureFromObj = (obj) => {
        const res = [];
        const getType = (obj) => / (.*)\]/.exec(Object.prototype.toString.call(obj))[1].toLocaleLowerCase();
        const run = (obj, path = []) => {
            // todo array
            if (getType(obj) === "object") {
                Object.keys(obj).forEach((key) => {
                    run(obj[key], [...path, key]);
                });
            }
            else {
                res.push([path, obj]);
            }
        };
        run(obj);
        return res;
    };
    const checkResponse = (res, structureFromInitValue) => {
        structureFromInitValue.forEach(([key, value]) => {
            const resValue = lodash_1.get(res, key);
            if ([null, undefined].includes(resValue)) {
                lodash_1.set(res, key, value);
                console.log(`值检查错误，进行补值`, res);
            }
        });
    };
    const structureFromInitValue = toStructureFromObj(initValue);
    return {
        handelSuccess(res) {
            checkResponse(res, structureFromInitValue);
        },
        handelFail(err) {
        },
    };
};
const factoryFetchModel = (params) => {
    const { fetch = window.fetch, plugins = [] } = params;
    const initPlugins = [structureFromInitValuePlugin, requestDataPlugin, requestStatusPlugin, persistencePlugin, ...plugins];
    const state = { requestData: {}, requestStatus: {} };
    const createFetchModel = (params) => {
        const { url, initValue, mergeParams = (value) => value, requestOption = {}, frequencyFn = null, } = params;
        const handelPlugin = initPlugins.map((plugin) => {
            if (typeof plugin === "function") {
                return plugin(state, params);
            }
            return {
                handelSuccess() { },
                handelFail() { },
            };
        });
        const dispatch = (params) => new Promise((resolve, reject) => {
            state.requestStatus[url] = "loading";
            fetch(url, mergeParams(params), requestOption)
                .then((res) => {
                handelPlugin.forEach((plugin) => plugin.handelSuccess && plugin.handelSuccess(res));
                resolve(res);
                return res;
            })
                .catch((err) => {
                handelPlugin.forEach((plugin) => plugin.handelFail && plugin.handelFail(err));
                reject(err);
            });
        });
        return {
            dispatch: frequencyFn ? frequencyFn(dispatch) : dispatch,
            getContext: () => state.requestData[url] !== undefined
                ? state.requestData[url]
                : lodash_1.cloneDeep(initValue),
            getStatus: () => state.requestStatus[url] !== undefined ? state.requestStatus[url] : "init",
        };
    };
    const initModel = () => {
        state.requestData = mobx_1.observable(state.requestData);
        state.requestStatus = mobx_1.observable(state.requestStatus);
    };
    return { createFetchModel, initModel };
};
const useRequestState = (arr) => {
    return arr.map((item) => item.getContext());
};
exports.useRequestState = useRequestState;
exports.default = factoryFetchModel;
