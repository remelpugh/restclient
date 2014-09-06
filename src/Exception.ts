/**
 * Created by remelpugh on 9/5/2014.
 */
class Exception implements Error {
    name: string;
    message: string;

    constructor(message?: string) {
        this.message = message;
    }

    toString() {
        return this.message;
    }
}

export = Exception;