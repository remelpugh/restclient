/**
 * Created by remelpugh on 8/28/2014.
 */
declare module vow {
    export class Promise {
        constructor(callback?: (resolve, reject, notify) => void);
    }
}

declare module "vow" {
    export = vow;
}