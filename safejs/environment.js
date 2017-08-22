const has = require("lodash/has");
const get = require("lodash/get");
const set = require("lodash/set");

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
    throw new Error("Undefined variable (get) " + name);
  },
  set(name, value) {
    const baseName = name.replace(/\..*/, "");
    var scope = this.lookup(baseName);
    if (!scope && this.parent) {
      throw new Error("Undefined variable (set) " + name);
    }
    set((scope || this).vars, name, value);
    return value;
  },
  def(name, value) {
    set(this.vars, name, value);
    return value;
  }
};

module.exports = Environment;
