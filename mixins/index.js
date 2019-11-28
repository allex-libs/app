function createMixins (lib) {
  'use strict';

  return {
    LinksAndLogicDestroyableMixin: require('./linksandlogicdestroyablecreator')(lib),
    NeededConfigurationNamesMixin: require('./neededconfigurationnamescreator')(lib),
    DataElementMixin: require('./dataelementcreator')(lib),
    DataElementFollowerMixin: require('./dataelementfollowercreator')(lib)
  };
}

module.exports = createMixins;
