(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "mobx", "lodash/cloneDeep", "lodash/get", "lodash/set", "react"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.useAutoRequest = exports.useRequestState = void 0;
    const mobx_1 = require("mobx");
    const cloneDeep_1 = require("lodash/cloneDeep");
    const get_1 = require("lodash/get");
    const set_1 = require("lodash/set");
    const React = require("react");
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
            const resValue = get_1.default(res, key);
            if ([null, undefined].includes(resValue)) {
                set_1.default(res, key, value);
                console.log(`值检查错误，进行补值`, res);
            }
        });
    };
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
    const requestDataPlugin = ({ requestData }, params) => {
        const { persistence = {}, url, initValue, failValue } = params;
        const { isNeed } = persistence;
        requestData[url] = isNeed
            ? getCacheFromLocalStore(url, cloneDeep_1.default(initValue))
            : cloneDeep_1.default(initValue);
        return {
            handelSuccess(res) {
                requestData[url] = res;
                if (isNeed) {
                    setCacheToLocalStore(url, res);
                }
            },
            handelFail(err) {
                if (failValue) {
                    requestData[url] = failValue;
                }
            },
        };
    };
    const requestStatusPlugin = ({ requestStatus }, params) => {
        const { url } = params;
        requestStatus[url] = "init";
        return {
            handelSuccess(res) {
                requestStatus[url] = "success";
            },
            handelFail(err) {
                requestStatus[url] = "fail";
            },
        };
    };
    const factoryFetchModel = (params) => {
        const { fetch = window.fetch, plugins = [] } = params;
        const initPlugins = [requestDataPlugin, requestStatusPlugin, ...plugins];
        let requestData = {};
        let requestStatus = {};
        const createFetchModel = (params) => {
            const { url, initValue, mergeParams = (value) => value, requestOption = {}, frequencyFn = null, } = params;
            const handelPlugin = initPlugins.map((plugin) => {
                if (typeof plugin === "function") {
                    return plugin({ requestData, requestStatus }, params);
                }
                return {
                    handelSuccess() { },
                    handelFail() { },
                };
            });
            const structureFromInitValue = toStructureFromObj(cloneDeep_1.default(initValue));
            const dispatch = (params) => new Promise((resolve, reject) => {
                requestStatus[url] = "loading";
                fetch(url, mergeParams(params), requestOption)
                    .then((res) => {
                    checkResponse(res, structureFromInitValue);
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
                getContext: () => requestData[url] !== undefined
                    ? requestData[url]
                    : cloneDeep_1.default(initValue),
                getStatus: () => requestStatus[url] !== undefined ? requestStatus[url] : "init",
            };
        };
        const initModel = () => {
            requestData = mobx_1.observable(requestData);
            requestStatus = mobx_1.observable(requestStatus);
        };
        return { createFetchModel, initModel };
    };
    // export const { createFetchModel, initModel } = factoryFetchModel({
    //   fetch: request,
    // });
    exports.useRequestState = (arr) => {
        return arr.map((item) => item.getContext());
    };
    exports.useAutoRequest = (model, params = {}) => {
        React.useMemo(async () => {
            if (model.getStatus() !== "loading") {
                await model.dispatch(params);
            }
        }, []);
    };
    exports.default = createFetchModel;
});
