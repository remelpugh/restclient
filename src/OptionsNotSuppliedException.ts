/**
 * Created by remelpugh on 9/5/2014.
 */
import Exception = require("./Exception");

class OptionsNotSuppliedException extends Exception {
    /**
     *
     */
    constructor() {
        super("Options must be supplied.");
    }
}

export = OptionsNotSuppliedException;