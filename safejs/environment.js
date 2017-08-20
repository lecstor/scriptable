const has = require("lodash/has");
const get = require("lodash/get");

function Environment(parent) {
  this.vars = Object.create(parent ? parent.vars : null);
  this.parent = parent;
}

Environment.prototype = {
  extend() {
    return new Environment(this);
  },
  lookup(name) {
    var scope = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
        return scope;
      }
      scope = scope.parent;
    }
  },
  get(name) {
    // `in` includes inherited properties
    if (name in this.vars) {
      return this.vars[name];
    }
    // `has` does not include inherited properties
    // but does handle "deep" properties
    if (has(this.vars, name)) {
      return get(this.vars, name);
    }
    throw new Error("Undefined variable " + name);
  },
  set(name, value) {
    var scope = this.lookup(name);
    if (!scope && this.parent) {
      throw new Error("Undefined variable " + name);
    }
    return ((scope || this).vars[name] = value);
  },
  def(name, value) {
    return (this.vars[name] = value);
  }
};

module.exports = Environment;
