"use strict";

var rp = require("request-promise").defaults({
  rejectUnauthorized: false
});
var _ = require("underscore");
var async = require("async");

module.exports = function (Vm) {

  // Root method for returning VM Data when a GET is called
  Vm.afterRemote("find", function (ctx, vm, next) {
    if (ctx.result) {
      var backups = [];
      var backupsobj = {};

      _.each(vm, function (e, i) {
        if (
          e.hostname &&
          e.vm_loc &&
          e.backup &&
          e.backup_sla_assigned === "No"
        ) {
          if (e.vm_loc === "Silverwater") {
            var obj = {};
            obj.hostname = e.hostname;
            obj.backup_sla = e.backup_sla;
            obj.vm_loc = e.vm_loc;
            backups.push(obj);
          }
        }
      });

      backupsobj = _.object(backups);
      ctx.result = {
        data: vm,
        backups: backups,
        obj: backupsobj
      };
    }
    next();
  });


  // Method to provision a VM using Tower 
  Vm.provision = function (vm_data, callback) {

    console.log(vm_data)

    var app = require('../../server/server'),
      Job = app.models.job

    var workflowURLs = {
        vsphere: {
          windows: "/86/launch/",
          linux: "/92/launch/"
        },
        aws: {
          windows: "/157/launch/",
          linux: "/153/launch/"
        },
        azure: {
          windows: "/162/launch/",
          linux: "/160/launch/"
        }
      },
      workflowURL = workflowURLs[vm_data.extra_vars.vm_cloud][vm_data.extra_vars.os_type],
      tower_url = "https://tower.nsw.education/api/v2/workflow_job_templates",
      username = "admin",
      password = "password",
      auth =
      "Basic " + new Buffer(username + ":" + password).toString("base64");


    rp({
        method: "POST",
        uri: tower_url + workflowURL,
        json: true,
        headers: {
          "Cache-Control": "no-cache",
          Authorization: auth,
          Accept: "application/json"
        },
        body: vm_data
      })
      .then(function (resp) {

        resp.cirrusdb = {}
        var jobdata = {
          "id": resp.id,
          "name": "VM Provisioning - " + vm_data.extra_vars.hostname,
          "status": "pending",
          "progress": 0,
          "submittedby": vm_data.extra_vars.submittedby,
          "submittedtime": resp.created,
          "event": "Submitted Provisioning Job to Ansible"
        }

        Job.create(jobdata, function (err, obj) {
          if (err) {
            console.log(err)
          } else {
            resp.cirrusdb.job = obj

            var newVM = vm_data.extra_vars
            delete newVM.id;

            Vm.create(newVM, function (err, obj) {
              if (err) {
                console.log(err)
              } else {
                resp.cirrusdb.vm = obj

                var response;
                response = resp;
                callback(null, response);

              }
            })

          }
        })

      })
      .catch(function (err) {
        console.log(err);
        var response;
        response = err;
        callback(null, response);
      });

  };


  // Method for updating a VM based on hostname
  Vm.vmupdate = function (vmname, data, callback) {

    var response;

    Vm.find({
      where: {
        hostname: vmname,
        active: 'true'
      },
      limit: 1
    }, function (err, vm) {

      if (err) {
        callback(null, err);
      } else if (vm.length === 0) {
        callback(null, 'No Active VM with this name found');
      } else {
        var instance = vm[0]

        instance.updateAttributes(data, function (err, cb) {

          if (err) {
            response = err
          } else {
            response = cb
          }

          callback(null, response);
        })
      }


    });

  };


  // Method for generating a VM hostname
  Vm.generateHostNames = function (env, os, loc, cloud, app_id, vm_number, callback) {

    var hostname_env,
      hostname_loc,
      hostname_os,
      npad,
      app = require('../../server/server'),
      Vmspec = app.models.vmspec,
      hostnames = []

    if (cloud === "vsphere" || cloud === "ahv") {
      if (loc === "Silverwater") {
        hostname_loc = '0991'
      } else if (loc === "Unanderra") {
        hostname_loc = '0992'
      }
    } else if (cloud === "aws") {
      hostname_loc = '0475'
    } else if (cloud === "azure") {
      hostname_loc = '0472'
    }

    switch (env) {
      case 'Production':
        hostname_env = 'p'
        break;
      case 'Test':
        hostname_env = 't'
        break;
      case 'Dev':
        hostname_env = 'd'
        break;
      case 'PreProd':
        hostname_env = 'q'
        break;
      default:
        hostname_env = 'p'
    }

    switch (os) {
      case 'Windows 2012':
        hostname_os = 'w'
        break;
      case 'Windows 2016':
        hostname_os = 'w'
        break;
      default:
        hostname_os = 'l'
    }

    var proposed_hostname = hostname_env + hostname_os + hostname_loc + app_id
    console.log("proposed hostname = " + proposed_hostname)

    var unumber = 1

    function generateHostNames(hostname) {

      console.log('checking hostname ' + hostname + ' against cirrusdb')

      Vm.find({
        where: {
          hostname: hostname,
          active: true
        },
        limit: 1
      }, function (err, vms_cirrusdb) {

        if (err) {
          console.log(err)
          return

        } else {
          if (vms_cirrusdb.length === 0) {

            console.log('checking hostname ' + hostname + ' against specs')

            Vmspec.find({
              where: {
                hostname: hostname
              },
              limit: 1
            }, function (err, vms_provspecs) {

              if (err) {
                console.log(err)
                return

              } else {

                if (vms_provspecs.length === 0) {

                  hostnames.push(hostname)

                  if (vm_number === 1) {
                    var Response
                    Response = hostnames
                    callback(null, Response);
                  } else {
                    Response = 'More than 1'

                    for (var i = 1; i < vm_number; i++) {
                      unumber = unumber + 1
                      if (unumber < 10) {
                        npad = '0000'.slice(0, 7 - app_id.length)
                      } else {
                        if (app_id.length == 6) {
                          npad = ''
                        } else {
                          npad = '0000'.slice(0, 6 - app_id.length)
                        }
                      }

                      hostnames.push(proposed_hostname + npad + unumber)
                      console.log(proposed_hostname + npad + unumber)

                    }

                    Response = hostnames
                    callback(null, Response);
                  }


                } else {
                  unumber = unumber + 1

                  if (unumber < 10) {
                    npad = '0000'.slice(0, 7 - app_id.length)
                  } else {
                    if (app_id.length == 6) {
                      npad = ''
                    } else {
                      npad = '0000'.slice(0, 6 - app_id.length)
                    }
                  }
                  generateHostNames(proposed_hostname + npad + unumber)
                }
              }

            })


          } else {
            unumber = unumber + 1

            if (unumber < 10) {
              npad = '0000'.slice(0, 7 - app_id.length)
            } else {
              if (app_id.length == 6) {
                npad = ''
              } else {
                npad = '0000'.slice(0, 6 - app_id.length)
              }
            }
            generateHostNames(proposed_hostname + npad + unumber)
          }
        }

      })

    }

    if (app_id.length == 6) {
      generateHostNames(proposed_hostname + '01')
    } else if (app_id.length == 5) {
      generateHostNames(proposed_hostname + '001')
    } else if (app_id.length == 4) {
      generateHostNames(proposed_hostname + '0001')
    }

  }


  // Method to return all VMs in a format that Datatables likes
  Vm.datatables = function (callback) {

    Vm.find({}, function (err, vms_cirrusdb) {

      if (err) {
        console.log(err)
        return

      } else {

        var response;
        // TODO
        response = {
          'data': vms_cirrusdb
        };
        callback(null, response);

      }

    })

  };

  // Method to sync CirrusDB with Ansible inventory
  Vm.syncAnsibleInventory = function (master_callback) {

    var awsInventory = "https://tower.nsw.education/api/v2/inventories/2/hosts/"
    var username = "admin"
    var password = "password"
    var auth = "Basic " + new Buffer(username + ":" + password).toString("base64")

    Vm.find({
      where: {
        or: [{
          vm_loc: 'aws'
        }, {
          content: { inq: ['0475']}
        }]
      }
    }, function (err, vms) {

      if (err) {
        console.log(err)
      } else {


      async.each(vms, function(vm, callback) {

        console.log('Marking VM as inactive');
        console.log(vm)
        callback()
        vm.updateAttributes({active: false}, function (err, instance) {
          if (err) {
            console.log(err)
          } else {
            callback();
          }

        })

      }, function(err) {
        // if any of the file processing produced an error, err would equal that error
        if( err ) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('A file failed to process');
        } else {
          console.log('All files have been processed successfully');

        var response;
        response = err
        // TODO
        master_callback(null, response);


        }
      });        

      }


    });






    // rp({
    //     method: 'GET',
    //     url: awsInventory,
    //     json: true,
    //     headers: {
    //       'Cache-Control': 'no-cache',
    //       Authorization: auth,
    //       Accept: "application/json"
    //     }
    //   })
    //   .then(function (resp) {

    //     // assuming openFiles is an array of file names

    //     var instances = resp.results

    //     async.each(instances, function (instance, callback) {

    //       // Perform operation on file here.
    //       console.log('Instance = ' + instance.name);
    //       callback()

    //     }, function (err) {
    //       // if any of the file processing produced an error, err would equal that error
    //       if (err) {
    //         // One of the iterations produced an error.
    //         // All processing will now stop.
    //         console.log('A file failed to process');
    //       } else {
    //         console.log('All VMs have been trawlled');


    //         var response;
    //         response = resp
    //         // TODO
    //         master_callback(null, response);



    //       }
    //     });




    //   })
    //   .catch(function (err) {
    //     // console.error(err)

    //     var response;
    //     response = err
    //     // TODO
    //     master_callback(null, response);

    //   });


  };



};
