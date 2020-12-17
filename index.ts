import { observable } from "mobx";
import { cloneDeep, get, set } from "lodash";

type Status = "loading" | "fail" | "success" | "init";
// V 是返回值,P 是请求参数
type CreateFetchModel = <P = any, V = any>(params: {
  url: string; // 请求地址
  initValue: V; // 初始值
  failValue?: V; // 请求失败的替代值
  mergeParams?: (params: any) => any;
  persistence?: { isNeed: boolean };
  frequencyFn?: (...arg: any[]) => any;
  requestOption?: any;
  [key: string]: any;
}) => {
  dispatch: (params: P, option?: any) => Promise<V>;
  getContext: () => V;
  getStatus: () => Status;
};
const toStructureFromObj = (obj) => {
  const res = [];
  const getType = (obj) =>
    / (.*)\]/.exec(Object.prototype.toString.call(obj))[1].toLocaleLowerCase();
  const run = (obj, path = []) => {
    // todo array
    if (getType(obj) === "object") {
      Object.keys(obj).forEach((key) => {
        run(obj[key], [...path, key]);
      });
    } else {
      res.push([path, obj]);
    }
  };
  run(obj);
  return res;
};

const checkResponse = (res, structureFromInitValue) => {
  structureFromInitValue.forEach(([key, value]) => {
    const resValue = get(res, key);
    if ([null, undefined].includes(resValue)) {
      set(res, key, value);
      console.log(`值检查错误，进行补值`, res);
    }
  });
};

const getCacheFromLocalStore = (key, defaultValue) => {
  let res: any;
  const value = localStorage.getItem(key);
  try {
    res = JSON.parse(value);
  } catch (err) {
    res = defaultValue;
    console.error(`读取缓存序列化失败`);
  }
  return res;
};

const setCacheToLocalStore = (key, value) => {
  let res: any;
  try {
    res = JSON.stringify(value);
  } catch (err) {
    console.error(`存入缓存序列化失败`);
  }
  localStorage.setItem(key, res);
};
const requestDataPlugin = ({ requestData }, params) => {
  const { persistence = {}, url, initValue, failValue } = params;
  const { isNeed } = persistence;
  requestData[url] = isNeed
    ? getCacheFromLocalStore(url, cloneDeep(initValue))
    : cloneDeep(initValue);
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

const factoryFetchModel = (params: { fetch: Function; plugins?: [] }) => {
  const { fetch = window.fetch, plugins = [] } = params;
  const initPlugins = [requestDataPlugin, requestStatusPlugin, ...plugins];
  let requestData: { [key: string]: any } = {};
  let requestStatus: { [key: string]: Status } = {};
  const createFetchModel: CreateFetchModel = (params) => {
    const {
      url,
      initValue,
      mergeParams = (value) => value,
      requestOption = {},
      frequencyFn = null,
    } = params;
    const handelPlugin = initPlugins.map((plugin) => {
      if (typeof plugin === "function") {
        return plugin({ requestData, requestStatus }, params);
      }
      return {
        handelSuccess() { },
        handelFail() { },
      };
    });

    const structureFromInitValue = toStructureFromObj(cloneDeep(initValue));
    const dispatch: (params: any) => any = (params) =>
      new Promise((resolve, reject) => {
        requestStatus[url] = "loading";
        fetch(url, mergeParams(params), requestOption)
          .then((res: any) => {
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
      getContext: () =>
        requestData[url] !== undefined
          ? requestData[url]
          : cloneDeep(initValue),
      getStatus: () =>
        requestStatus[url] !== undefined ? requestStatus[url] : "init",
    };
  };
  const initModel = () => {
    requestData = observable(requestData);
    requestStatus = observable(requestStatus);
  };
  return { createFetchModel, initModel };
};


export const useRequestState = (arr) => {
  return arr.map((item) => item.getContext());
};


export default factoryFetchModel;
