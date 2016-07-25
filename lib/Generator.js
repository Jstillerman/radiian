(function() {
  'use strict';

  var mustache = require('mustache');
  var fs = require('fs');
  var Q = require('q');
  var mkdirp = require('mkdirp');
  var ncp = require('ncp').ncp;
  // create promise versions of read and write files
  var read = Q.denodeify(fs.readFile);
  var write = Q.denodeify(fs.writeFile);

  module.exports = {
    generate: function(answers) {

      answers.tag_old_app = 'old' + answers.appName.charAt(0).toUpperCase() + answers.appName.slice(1);
      answers.converted_environment = answers.environment.replace(/-/g, "_");

      answers.roles = {};
      answers.builtin_roles.forEach(function(role){
        answers.roles[role] = true;
      });

      // create promise versions of chmod and mkdirp
      var chmod = Q.denodeify(fs.chmod);
      var mkdir = Q.denodeify(mkdirp);



      function cpdir(dir, dest) {
          ncp(__dirname+'/templates/'+dir, dest, function(err){
            if(err) console.log(err);
            return Promise.resolve();
          });
      }
      //function that handles .gitignore
      function gitignore(path) {
        return function() {
          return fs.appendFile('.gitignore', "\n" + path, function(err) {
            if (err) return Promise.reject(err);
            return Promise.resolve();
          });
        };
      }

      // Kick off a promise chain
      mkdir('ansible/inventory', '0755')
        //anible folder
        .then(process('ansible.cfg.mustache', 'ansible/ansible.cfg'))
        .then(process('aws_keys.mustache', 'ansible/inventory/aws_keys'))
        .then(gitignore('ansible/inventory/aws_keys'))
        .then(process('destroy-old-nodes.yaml.mustache', 'ansible/destroy-old-nodes.yaml'))
        .then(process('ec2.ini.mustache', 'ansible/inventory/ec2.ini'))
        .then(process('ec2.py', 'ansible/inventory/ec2.py'))
        .then(process('immutable.yaml.mustache', 'ansible/immutable.yaml'))
        .then(process('provision.sh.mustache', 'ansible/provision.sh'))
        .then(process('tag-old-nodes.yaml.mustache', 'ansible/tag-old-nodes.yaml'))
        .then(mkdir('ansible/roles/' + answers.appName + '/tasks'))
        .then(function(){if(answers.roles.Nginx) cpdir('roles/nginx/', 'ansible/roles/nginx');})
        .then(function(){if(answers.roles["File Transfer"]) cpdir('roles/push-code/', 'ansible/roles/push-code');})
        .then(process('roles/appName/tasks/main.yaml.mustache', 'ansible/roles/' + answers.appName + '/tasks/main.yaml'))
        .then(process('myApp.pem.mustache', 'ansible/' + answers.appPem))
        .then(gitignore('ansible/' + answers.appPem))
        .then(function() {
          fs.chmod('ansible/provision.sh', '0744');
          fs.chmod('ansible/inventory/ec2.py', '0755');
        })
        .then(mkdir('HelloWorld/'))
        .finally(process('HelloWorld.txt.mustache', "HelloWorld/HelloWorld.txt"))

        .catch(handler);


      /**
       * Read, render, and write a template
       *
       * @param {String} template
       * @param {String} outputPath
       * @returns {Function} Promise
       */
      function process(template, outputPath) {
        return function() {
          return getReader(template)().then(render).then(getWriter(outputPath));
        };
      }

      /**
       * Render a template by injecting answers into it
       *
       * @param {String} template
       * @returns {String} rendered template
       */
      function render(template) {
        return mustache.render(template, answers);
      }
    }
  };

  /**
   * Partial application - creates a function which allows reading and returns a promise
   *
   * @param {String} template
   * @returns {Function} Promise
   */
  function getReader(template) {
    return function() {
      return read(__dirname + '/templates/' + template, 'utf8');
    };
  }

  /**
   * Partial application - creates a function which allows file writing and returns a promise
   *
   * @param {String} outputPath e.g. 'out.txt'
   * @returns {Function} Promise with parameter "compiledTemplate", which is ready to write to outputPath
   */
  function getWriter(outputPath) {
    return function(compiledTemplate) {
      return write(outputPath, compiledTemplate);
    };
  }

  /**
   * Generic error handler. Simply logs to the console.
   *
   * @param {Error} err
   */
  function handler(err) {
    console.log(('Something went wrong'));
    console.log(err);
  }

}());
