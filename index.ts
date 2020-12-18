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

const requestDataPlugin = (state, params) => {
  const { url, initValue, failValue } = params;
  state.requestData[url] = cloneDeep(initValue);
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
  if (isNeed) {
    state.requestData[url] = getCacheFromLocalStore(url, cloneDeep(initValue))
    return {
      handelSuccess(res) {
        setCacheToLocalStore(url, res);
      },
      handelFail() { }
    }
  } else {
    return {
      handelSuccess() {
      },
      handelFail() { }
    }
  }

}
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
  const { initValue } = params
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
  const structureFromInitValue = toStructureFromObj(initValue)
  return {
    handelSuccess(res) {
      checkResponse(res, structureFromInitValue)
    },
    handelFail(err) {
    },
  }
}

const factoryFetchModel = (params: { fetch: Function; plugins?: [] }) => {
  const { fetch = window.fetch, plugins = [] } = params;
  const initPlugins = [structureFromInitValuePlugin, requestDataPlugin, requestStatusPlugin, persistencePlugin, ...plugins];
  const state:{requestData: { [key: string]: any },requestStatus: { [key: string]: Status }}={requestData:{},requestStatus:{}}
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
        return plugin(state, params);
      }
      return {
        handelSuccess() { },
        handelFail() { },
      };
    });
    const dispatch: (params: any) => any = (params) =>
      new Promise((resolve, reject) => {
        state.requestStatus[url] = "loading";
        fetch(url, mergeParams(params), requestOption)
          .then((res: any) => {
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
      state.requestData[url] !== undefined
          ? state.requestData[url]
          : cloneDeep(initValue),
      getStatus: () =>
      state.requestStatus[url] !== undefined ? state.requestStatus[url] : "init",
    };
  };
  const initModel = () => {
    state.requestData = observable(state.requestData);
    state.requestStatus = observable(state.requestStatus);
  };
  return { createFetchModel, initModel };
};

export const useRequestState = (arr) => {
  return arr.map((item) => item.getContext());
};

export default factoryFetchModel;


