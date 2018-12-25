function createLib(execlib) {
  return execlib.loadDependencies('client', ['allex:applinking:lib', 'allex:jobondestroyable:lib'], require('./libindex').bind(null, execlib));
}

module.exports = createLib;
