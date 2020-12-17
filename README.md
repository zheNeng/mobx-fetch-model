# 请求模型层
  介于请求数据与store之间的一层处理层。

  通过减少 store 中的 action/init 模板代码,能够使 store 更精炼

  同时对于解决请求数据的存储、持久化、补丁、请求状态、代码提示相关功能能够集中管理

  支持以插件的形式,进行数据操作
# 使用流程
## 初始化一个工厂函数
```js
// fetch 是你的请求函数，返回一个promise,resolve表示请求成功，返回请求的数据；reject 表示请求失败，返回错误原因
// plugin ,是形如 ()=>{
//   // do something
// return {handelSuccess(){},handelFail(){}}
// } 的函数，用来处理 初始、请求失败、请求成功的回调，参考内部插件requestStatusPlugin 的实现。
const createFetchModel=factoryFetchModel({fetch:fetch,plugin:[]})
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
```
## 在项目中发起请求
```ts
// params 你的请求参数
login.dispatch(params)
//  login.dispatch(params).then(res=>{
//  这里可以拿到请求返回值
//  })
```
## 在项目获得返回请求值
```ts
const {token} = login.getContext()
// 这里不需要担心解构会失败，因为内部根据 initValue 做的布丁，无论如何都会返回一个{ token }的对象结构
// 同时，如果你的react组件是被 observer 的，那么
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