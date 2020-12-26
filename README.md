# 请求模型层
  介于请求数据与store之间的一层处理层。

  通过减少 store 中的 action/init 模板代码,能够使 store 更精炼

  同时对于解决请求数据的存储、持久化、补丁、请求状态、代码提示相关功能能够集中管理

  支持以插件的形式,进行数据操作

  相较于 store 这种形式而言，控制的颗粒度更细
# 使用情景
  ### 跨组件/模块共享数据
  ### 能够刷新留存
  ### 共享的数据需要异步更新
  ### 支持响应式依赖收集（比如计算属性/响应式渲染。）

# 使用流程
## 初始化一个工厂函数
```js
// fetch 是你的请求函数，返回一个promise,resolve表示请求成功，返回请求的数据；reject 表示请求失败，返回错误原因
// plugin ,是形如 ()=>{
//   // do something
// return {handelSuccess(){},handelFail(){}}
// } 的函数，用来处理 初始、请求失败、请求成功的回调，参考内部插件requestStatusPlugin 的实现。
const {createFetchModel,initModel}=factoryFetchModel({fetch:fetch,plugin:[]})
```
## 使用工厂函数创建你的请求执行体
```ts
// createFetchModel<请求参数类型,数据类型>
// url 是你请求的地址，会透传给初始化工厂函数时你传递的fetch方法。
// initValue 表示接口返回的初始值
const login= createFetchModel<{mobile:number,code:string},{token:string}>({
  url:'yourHost/login',
  initValue:{token:''}
})

initModel()
//initModel 在创建完之后，记得初始化。
```
## 在项目中发起请求
```ts
import login from 'service'
// params 你的请求参数
login.dispatch(params)
//  login.dispatch(params).then(res=>{
//  这里可以拿到请求返回值
//  })
```
## 在项目获得返回请求值
```tsx
import login from 'service'
import { observer } from 'mobx-react'
// 当发起dispatch 成功的时候，视图也会更新
const RenderDiv=observer(()=>{
  // 这里不需要担心解构会失败，因为内部根据 initValue 做的布丁，无论如何都会返回一个{ token }的对象结构
  const {token} = login.getContext()
  // status 可能有"loading" | "fail" | "success" | "init"; 4 个状态。
  const status= login.getStatus() 
  const {token} = login.getContext()
  return <div>
  {`token:${token}`}
   {`status:${status}`}
  </div>
})



```
## 在 mobx 的 store 中使用
```ts
import {compute} from 'mobx'
class DemoStore{
  @compute
  get myToken(){
     // 当 dispatch 触发的时候，会自动触发该计算属性重新计算
    return login.getContext().token
  }
}
```
# 在非请求中使用 fetch-model，进行数据共享和缓存
```ts
const {createFetchModel,initModel}=factoryFetchModel({fetch:(url,value)=>new Promise(res=>res(value)),plugin:[]})
const tokenService = createFetchModel({url:'token',initValue:123，persistence:{isNeed:true}})
// 在其他地方，随意 import 该 tokenService ,并且该数据是能防刷新。
```

# api 相关
## factoryFetchModel(params)
```ts
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
}
type FactoryFetchModel=(params:{fetch:Function,plugins:Plugin[]})=>({
  createFetchModel:CreateFetchModel, initModel:()=>void
})
```
### params.fetch
  发起 dispatch 的请求函数
  ```ts
    type Fetch = (url:string,params:any)=>Promise<any>
  ```
### params.plugins
  发起 plugins 的请求函数
  ```ts
    type Plugin=(state:any,params:any)=>({
      handelSuccess:(res:any)=>void,
      handelFail:(res:any)=>void,
    })
    type Plugins=Plugin[]
  ```
# 内置插件
## persistencePlugin 
  * 持久化插件，放置刷新丢失数据，内部使用 localStorage 进行存储。
  * 需要在实例化model的时候，传递 persistence 参数
## structureFromInitValuePlugin 
  * 对请求回来的数据，进行 polify 
  * 修复规则是根据 initValue 的初设值进行校准
