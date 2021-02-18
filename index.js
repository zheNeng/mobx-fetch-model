"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRequestState = void 0;
const mobx_1 = require("mobx");
const syncHook_1 = require("./syncHook");
const lodash_1 = require("lodash");
const requestDataPlugin = (state, params, hook) => {
    const { url, initValue, failValue } = params;
    hook.tap('init', () => state.requestData[url] = lodash_1.cloneDeep(initValue));
    hook.tap('handelSuccess', (res) => state.requestData[url] = res);
    hook.tap('handelFail', (err) => {
        if (failValue) {
            state.requestData[url] = failValue;
        }
    });
};
const persistencePlugin = (state, params, hook) => {
    const { persistence = {}, url, initValue, failValue } = params;
    const { isNeed = false } = persistence;
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
        hook.tap('init', () => {
            state.requestData[url] = getCacheFromLocalStore(url, lodash_1.cloneDeep(initValue));
        });
        hook.tap('handelSuccess', (res) => {
            setCacheToLocalStore(url, res);
        });
    }
};
const requestStatusPlugin = (state, params, hook) => {
    const { url } = params;
    hook.tap('init', () => {
        state.requestStatus[url] = "init";
    });
    hook.tap('handelSuccess', () => state.requestStatus[url] = "success");
    hook.tap('handelFail', () => state.requestStatus[url] = "fail");
};
const structureFromInitValuePlugin = (state, params, hook) => {
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
    hook.tap('handelSuccess', (res) => {
        checkResponse(res, structureFromInitValue);
    });
};
const factoryFetchModel = (params) => {
    const { fetch = window.fetch, plugins = [] } = params;
    const initPlugins = [structureFromInitValuePlugin, requestDataPlugin, requestStatusPlugin, persistencePlugin, ...plugins];
    const state = { requestData: {}, requestStatus: {} };
    const createFetchModel = (params) => {
        const { url, initValue, mergeParams = (value) => value, requestOption = {}, frequencyFn = null, delayGc = { isNeed: false } } = params;
        const syncHook = new syncHook_1.default();
        initPlugins.forEach((plugin) => {
            if (typeof plugin === "function") {
                return plugin(state, params, syncHook);
            }
            syncHook.call('init');
        });
        const resetState = () => {
            state.requestData[url] = lodash_1.cloneDeep(initValue);
            state.requestStatus[url] = 'init';
        };
        const delayResetState = lodash_1.debounce(resetState, delayGc.time || 1000 * 60 * 10); // 10m
        const dispatch = (params) => new Promise((resolve, reject) => {
            state.requestStatus[url] = "loading";
            fetch(url, mergeParams(params), requestOption)
                .then((res) => {
                syncHook.call('handelSuccess', res);
                resolve(res);
                return res;
            })
                .catch((err) => {
                syncHook.call('handelFail', err);
                reject(err);
            });
        });
        const getContext = () => {
            if (delayGc && delayGc.isNeed) {
                delayResetState();
            }
            return state.requestData[url] !== undefined
                ? state.requestData[url]
                : lodash_1.cloneDeep(initValue);
        };
        return {
            resetState,
            dispatch: frequencyFn ? frequencyFn(dispatch) : dispatch,
            getContext,
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
