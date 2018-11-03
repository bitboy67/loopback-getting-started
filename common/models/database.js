'use strict';

module.exports = function(Db) {

  Db.afterRemote('find', function(ctx, db, next) {
    if(ctx.result) {
      ctx.result = {'data': db};
    }
    next();
  });

};