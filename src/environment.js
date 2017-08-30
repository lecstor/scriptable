const _has = require("lodash/has");
const _get = require("lodash/get");
const _set = require("lodash/set");

function Environment(parent) {
  this.vars = Object.create(parent ? parent.vars : null);
  this.parent = parent;
}

Environment.prototype = {
  extend() {
    return new Environment(this);
  },
  lookup(name) {
    let scope = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
        return scope;
      }
      scope = scope.parent;
    }
  },
  defined(name) {
    if (name in this.vars) {
      return true;
    }
    // `has` does not include inherited properties
    // but does handle "deep" properties
    if (_has(this.vars, name)) {
      return true;
    }
  },
  get(name, loc) {
    // `in` includes inherited properties
    if (name in this.vars) {
      return this.vars[name];
    }
    // `has` does not include inherited properties
    // but does handle "deep" properties
    if (_has(this.vars, name)) {
      return _get(this.vars, name);
    }
    throw new Error(`"${name}" is undefined (${loc.line}:${loc.column})`);
  },
  set(name, value, loc) {
    const baseName = name.replace(/\..*/, "");
    let scope = this.lookup(baseName);
    if (!scope && this.parent) {
      throw new Error(`"${name}" is undefined (${loc.line}:${loc.column})`);
    }
    _set((scope || this).vars, name, value);
    return value;
  },
  def(name, value) {
    _set(this.vars, name, value);
    return value;
  }
};

module.exports = Environment;
