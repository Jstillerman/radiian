var regexes = require('../../lib/regexes.js');

describe('regexes.js', function() {

  describe('pem', function() {
    it('should fail on anything not ending in pem', function() {
      expect(regexes.pem.test('invalid')).toBeFalsy();
    });

    it('should succeed on anything ending in pem', function() {
      expect(regexes.pem.test('valid.pem')).toBeTruthy();
    });
  });

  describe('vpc_subnet_id', function(){
    it("should fail on anything that doesnt start with vpc", function(){
      expect(regexes.vpc.test('ami-47a23a30')).toBeFalsy();
    });

    it("should fail on anything that doesnt end with 8 alphanumeric chars", function(){
      expect(regexes.vpc.test('vpc-47a2330')).toBeFalsy();
    });
  });

  describe('awsKey', function() {
    // TODO
  });

  describe('awsSecret', function() {
    // TODO
  });
});
