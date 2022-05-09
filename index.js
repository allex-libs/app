function createLib(execlib) {
  return execlib.loadDependencies(
    'client', 
    [
      'allex:applinking:lib',
      'allex:hierarchymixins:lib',
      'allex:environment:lib',
      'allex:bufferableevent:lib',
      'allex:datafilters:lib',
      'allex:arrayoperations:lib'
    ],
    require('./libindex').bind(null, execlib)
  );
}

module.exports = createLib;
