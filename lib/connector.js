let { ElementProperties } = require('./element-properties');
let { Utils } = require("./helpers/utils");

class Connector extends ElementProperties {

    constructor(args) {
        super();
        Object.assign(this, args);
    }

    id() {
        return this._id;
    }

    name(name) {
        if(arguments.length === 0) return this._name;
        this._name = name;
        return this;
    }

    setContent(content) {
        this.content = content;
        if (Utils.checkPath(this.content, ['p:spPr', 0, 'a:xfrm', 0])) super.setPropertyContent(this.content['p:spPr'][0]['a:xfrm'][0]);
        let attributes = Utils.getPath(content, ["p:nvCxnSpPr", 0, "p:cNvPr", 0, "$"]);
        this._id = attributes.id;
        this._name = attributes.name;
        return this;
    }

    start(sId) {
        if(arguments.length === 0) return this.options.start;
        this.options.start = sId;
        return this;
    };

    startPosition(sPosition) {
        if(arguments.length === 0) return this.options.startPosition;
        this.options.startPosition = sPosition;
        return this;
    };

}


module.exports.Connector = Connector;