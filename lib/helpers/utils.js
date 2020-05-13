class Utils {
    static checkPath(object, steps) {
        if (!object) {
            return false;
        }
        if (steps.length == 0) {
            return true;
        }
        let nextStep = steps[0];
        if (object[nextStep] == null) {
            return false;
        }
        steps.shift();
        return this.checkPath(object[nextStep], steps);
    }

    static getPath (object, steps){
        if (!object) {
            return null;
        }
        if (steps.length == 0) {
            return object;
        }
        let nextStep = steps[0];
        if (object[nextStep] == null) {
            return null;
        }
        steps.shift();
        return this.getPath(object[nextStep], steps);
    }

    static createPath (object, steps) {
        if(!object) return null;
        if(!steps.length) return object;
        let key = steps[0];
        if(!object[key]) {
            if(typeof key === "string") object[key] = [];
            if(typeof key === "number") object[key] = {};
            if(key === "$") object[key] = {};
        }
        steps.shift();
        return this.createPath(object[key], steps);
    }
}

module.exports.Utils = Utils;