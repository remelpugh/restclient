/// <reference path="../typings/tsd.d.ts" />
declare module Utilities {
    var formatString: (format: string, ...params: any[]) => string;
    var serialize: (data: any) => string;
}
export = Utilities;
