export default class SyncHook {
  tasks
  constructor() {
    this.tasks = {
      default: []
    };   //存放监听函数的数组
  }

  tap(name, task) {   //注册监听函数， 注册到一个数组里
    if (this.tasks[name]) {
      this.tasks[name].push(task)
    } else {
      this.tasks[name] = [task]
    }
  }

  call(name, ...args) {
    // 依次执行事件处理函数
    const fns = this.tasks[name] || this.tasks.default
    fns.forEach(task => task(...args))
  }
}