// const lodash = require("lodash");
const funcs = require("./standard-functions");

Object.keys(funcs).forEach(key => {
  global[key] = funcs[key];
});

function evaluate(code, globalProps = {}) {
  // stash the default global properties
  let globalKeys = {};
  Object.keys(global.window).forEach(key => {
    globalKeys[key] = true;
  });
  // set custom global props
  Object.keys(globalProps).forEach(key => {
    global[key] = globalProps[key];
  });
  console.log({ globalKeys });

  const result = eval(code);

  // stash new global props
  const newProps = Object.keys(global.window).reduce((props, key) => {
    if (!globalKeys[key]) {
      props[key] = global.window[key];
    }
    return props;
  }, {});
  console.log(global);

  return { result, props: newProps };
}

module.exports = evaluate;
