'use strict';

module.exports = function (User) {

  User.afterRemote('find', function (ctx, user, next) {
    if (ctx.result) {
      ctx.result = {
        'data': user
      };
    }
    next();
  });


  User.observe('after save', function setRoleMapping(ctx, next) {
    if (ctx.instance) {
      if (ctx.isNewInstance) {

        var app = require('../../server/server');
        var RoleMapping = app.models.RoleMapping

        RoleMapping.create({
          principalType: "USER",
          principalId: ctx.instance.id,
          roleId: '5b55339b0a8c2090857f1c44'
        }, function (err, roleMapping) {
          if (err) {
            return console.log(err);
          }

          // success stuff

        })

      }
    }
    next();
  });

  User.addAdminRights = function (userId, callback) {
    var response;
    // TODO

    var app = require('../../server/server');
    var RoleMapping = app.models.RoleMapping

    RoleMapping.create({
      principalType: "USER",
      principalId: userId,
      roleId: '5b5533743ed1ad901b9c9643'
    }, function (err, roleMapping) {
      if (err) {
        return console.log(err)
      }

      // success stuff

      response = roleMapping
      callback(null, response);

    })

  };

}