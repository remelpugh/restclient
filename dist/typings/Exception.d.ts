declare class Exception implements Error {
    public name: string;
    public message: string;
    constructor(message?: string);
    public toString(): string;
}
export = Exception;
