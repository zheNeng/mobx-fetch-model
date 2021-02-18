export default class SyncHook {
    tasks: any;
    constructor();
    tap(name: any, task: any): void;
    call(name: any, ...args: any[]): void;
}
