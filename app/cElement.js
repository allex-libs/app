function createAppSideElement (lib) {
  'use strict';

  function AppElement (desc) {
    this.name = desc.name;
    this.type = desc.type

    if (!this.name) throw new Error('Missing name for AppElement');
    if (!this.type) throw new Error('Missing type for AppElement');
    this.options = desc.options;
  }

  AppElement.prototype.destroy = function () {
    this.name = null;
    this.type = null;
    this.options = null;
  };

  return AppElement;
}

module.exports = createAppSideElement;
