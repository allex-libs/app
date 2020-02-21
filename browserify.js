ALLEX.execSuite.libRegistry.register('allex_applib',require('./libindex')(
  ALLEX,
  ALLEX.execSuite.libRegistry.get('allex_applinkinglib'),
  ALLEX.execSuite.libRegistry.get('allex_hierarchymixinslib'),
  ALLEX.execSuite.libRegistry.get('allex_environmentlib'),
  ALLEX.execSuite.libRegistry.get('allex_bufferableeventlib')
));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');
