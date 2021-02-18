"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SyncHook {
    constructor() {
        this.tasks = {
            default: []
        }; //存放监听函数的数组
    }
    tap(name, task) {
        if (this.tasks[name]) {
            this.tasks[name].push(task);
        }
        else {
            this.tasks[name] = [task];
        }
    }
    call(name, ...args) {
        // 依次执行事件处理函数
        const fns = this.tasks[name] || this.tasks.default;
        fns.forEach(task => task(...args));
    }
}
exports.default = SyncHook;
