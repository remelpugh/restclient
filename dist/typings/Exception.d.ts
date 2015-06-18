declare class Exception implements Error {
    name: string;
    message: string;
    constructor(message?: string);
    toString(): string;
}
export = Exception;
