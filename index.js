function createLib(execlib) {
  return execlib.loadDependencies('client', ['allex:applinking:lib', 'allex:jobondestroyable:lib', 'allex:hierarchymixins:lib', 'allex:environment:lib'], require('./libindex').bind(null, execlib));
}

module.exports = createLib;
