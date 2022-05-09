function createDescriptorApi (lib, ArryOps) {
  function pushToArraySafe (arryname, desc, element) {
    if (!lib.isString(arryname)) {
      throw new lib.Error('NOT_A_STRING', 'The first parameter has to be a string');
    }
    if (!desc) {
      throw new lib.Error('INVALID_DESCRIPTOR', 'The second parameter has to be an object');
    }
    var arry = desc[arryname];
    if (!arry) {
      arry = [];
      desc[arryname] = arry;
    }
    arry.push(element);
  }
  function ensureDescriptorArrayElementByPropertyName (propertyname, desc, arryname, arryelementname, defaultelement) {
    var arry, elem, mydefault;
    if (!desc) {
      return null;
    }
    arry = desc[arryname];
    if (!arry) {
      arry = [];
      desc[arryname] = arry;
    }
    elem = ArryOps.findElementWithProperty(arry, propertyname, arryelementname);
    if (!elem) {
      mydefault = {};
      mydefault[propertyname] = arryelementname;
      elem = lib.extend(defaultelement || {}, mydefault);
      arry.push(elem);
    }
    return elem;
  }

  function ensureDescriptorArrayElementByName (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('name', desc, arryname, arryelementname, defaultelement);
  }

  function ensureDescriptorArrayElementByType (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('type', desc, arryname, arryelementname, defaultelement);
  }

  return {
    pushToArraySafe: pushToArraySafe,
    ensureDescriptorArrayElementByPropertyName: ensureDescriptorArrayElementByPropertyName, 
    ensureDescriptorArrayElementByName: ensureDescriptorArrayElementByName,
    ensureDescriptorArrayElementByType: ensureDescriptorArrayElementByType
  };
}

module.exports = createDescriptorApi;
    
