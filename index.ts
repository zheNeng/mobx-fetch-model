import { observable } from "mobx";
import SyncHook from './syncHook'
import { cloneDeep, get, set, debounce } from "lodash";

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
  delayGc?: { time?: number, isNeed: boolean }
  [key: string]: any;
}) => {
  dispatch: (params: P, option?: any) => Promise<V>;
  getContext: () => V;
  getStatus: () => Status;
  resetState: () => void
};
type Plugin = (state: any, params: any, hooks: SyncHook) => void

type FactoryFetchModel = (params: { fetch: any, plugins: Plugin[] }) => ({
  createFetchModel: CreateFetchModel, initModel: () => void
})
const requestDataPlugin: Plugin = (state, params, hook) => {
  const { url, initValue, failValue } = params;
  hook.tap('init', () => state.requestData[url] = cloneDeep(initValue))
  hook.tap('handelSuccess', (res) => state.requestData[url] = res)
  hook.tap('handelFail', (err) => {
    if (failValue) {
      state.requestData[url] = failValue;
    }
  })
};
const persistencePlugin: Plugin = (state, params, hook) => {
  const { persistence = {}, url, initValue, failValue } = params;
  const { isNeed = false } = persistence;
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
    hook.tap('init', () => {
      state.requestData[url] = getCacheFromLocalStore(url, cloneDeep(initValue))
    })
    hook.tap('handelSuccess', (res) => {
      setCacheToLocalStore(url, res);
    })
  }

}
const requestStatusPlugin: Plugin = (state, params, hook) => {
  const { url } = params;
  hook.tap('init', () => {
    state.requestStatus[url] = "init";
  })
  hook.tap('handelSuccess', () => state.requestStatus[url] = "success")
  hook.tap('handelFail', () => state.requestStatus[url] = "fail")
};

const structureFromInitValuePlugin: Plugin = (state, params, hook) => {
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
  hook.tap('handelSuccess', (res) => {
    checkResponse(res, structureFromInitValue)
  })
}

const factoryFetchModel: FactoryFetchModel = (params) => {
  const { fetch = window.fetch, plugins = [] } = params;
  const initPlugins = [structureFromInitValuePlugin, requestDataPlugin, requestStatusPlugin, persistencePlugin, ...plugins];
  const state: { requestData: { [key: string]: any }, requestStatus: { [key: string]: Status } } = { requestData: {}, requestStatus: {} }
  const createFetchModel: CreateFetchModel = (params) => {
    const {
      url,
      initValue,
      mergeParams = (value) => value,
      requestOption = {},
      frequencyFn = null,
      delayGc = { isNeed: false }
    } = params;
    const syncHook = new SyncHook()
    initPlugins.forEach((plugin) => {
      if (typeof plugin === "function") {
        return plugin(state, params, syncHook);
      }
      syncHook.call('init')
    });
    const resetState = () => {
      state.requestData[url] = cloneDeep(initValue)
      state.requestStatus[url] = 'init'
    }
    const delayResetState = debounce(resetState, delayGc.time || 1000 * 60 * 10) // 10m

    const dispatch: (params: any) => any = (params) =>
      new Promise((resolve, reject) => {
        state.requestStatus[url] = "loading";
        fetch(url, mergeParams(params), requestOption)
          .then((res: any) => {
            syncHook.call('handelSuccess', res)
            resolve(res);
            return res;
          })
          .catch((err) => {
            syncHook.call('handelFail', err)
            reject(err);
          });
      });
    const getContext = () => {
      if (delayGc && delayGc.isNeed) {
        delayResetState()
      }
      return state.requestData[url] !== undefined
        ? state.requestData[url]
        : cloneDeep(initValue)
    }

    return {
      resetState,
      dispatch: frequencyFn ? frequencyFn(dispatch) : dispatch,
      getContext,
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


