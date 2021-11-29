/**
 * Filename: server.js
 * Purpose:
 * This script contains the Node.js/Express.js server-side API code
 * for the Awhina Welfare System.
 * It is used to create, edit or delete Awhina Welfare System Deployment Instances.
 * Author: Dion Fabbro - dion.fabbro@nema.govt.nz, dionfabbro@gmail.com
 * Version: 0.02
*/

// TODO - add a validator for checking filenames for the project folders being created/edited.
// Will also need to add it into the delete functionality.

const awhinaServer = {
  express: require("express"),
  fse: require('fs-extra'),
  fetch: require('node-fetch'),
  bodyParser: require('body-parser'),
  cors: require('cors'),
  helmet: require('helmet'),
  morgan: require('morgan'),
  getRawBody: require('raw-body'),
  hpp: require('hpp'),
  app: {},
  port: 9000,
  // Server folder for storing the deployments
  deploymentFolder: '/awhina_deployments/',
  // Contains the names and id's of the Awhina Administration Groups in the Enterprise Portal.
  // Clients must be in one of the groups to proceed with any API functionality
  adminGroups: {
    "01c681f4b16e4cffaaa444c0663846ed": "Auckland CDEM",
    "c693cdaec3274f93a73714266353886b": "Bay of Plenty CDEM",
    "66f94b7bcfd14754b96463733f8cacca": "Canterbury CDEM",
    "9b44bb67ab4b49e8a4d4d44c077f24c3": "Chatham Islands CDEM",
    "569de6350b544d5da295bb01b4a69f80": "Hawke's Bay CDEM",
    "57763cb58a4d422ba7f028ada7d108a7": "Manawatu Wanganui CDEM",
    "e6329f6242e9413d9100bf4a4332ad35": "Marlborough CDEM",
    "c9d1d4af7c9b47468d7c3a16474ee669": "Nelson Tasman CDEM",
    "ae3fba7cc36e4dca8cef3260d0a40b81": "Northland CDEM",
    "1ea17d1d14974cbd982a9e783e1f280e": "Otago CDEM",
    "c5d8b77f17ab436aac4ac43197cdae9d": "Southland CDEM",
    "b1c9be3943a84650ab7a86ec0df547a4": "Tairāwhiti CDEM",
    "a3b0e9ef93274413a3b18293528ccce4": "Taranaki CDEM",
    "b00d5a9c65ef4071838d6abfd7518fd8": "Waikato CDEM",
    "f28f20622e6d47bc85119393d0ac8633": "Wellington CDEM",
    "b3dcf7aa55244833a14918392e235236": "West Coast CDEM"
  },
  // URL for REST calls to the enterprise server FOR VALIDATION
  portalURL: "https://awhina.emergencymanagement.govt.nz/portal/sharing/rest/community/groups?",
};

/**
 * TODO check that these can sit in the awhinaServer object above.
 * If not, reset to global variables.
// Import dependencies
const express = require("express");
const fs = require("fs");
const fse = require('fs-extra');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const getRawBody = require('raw-body');
const hpp = require('hpp');
// Define the Express app
const app = express();
 */

// Define the Express app
awhinaServer.app = awhinaServer.express();

// Add Helmet to enhance API's security
awhinaServer.app.use(awhinaServer.helmet());
// awhinaServer.app.use(awhinaServer.helmet.hsts()); // HTTPS only. TODO Enable when in PROD

// Use bodyParser to parse JSON bodies into JS objects
awhinaServer.app.use(awhinaServer.bodyParser.json());

// Use HPP to prevent HTTP Parameter Pollution
awhinaServer.app.use(awhinaServer.hpp());

/**
 * TODO - REMOVE IN PRODUCTION - ONLY USED FOR TESTING.
 * Set the CORS config to only allow access from the Awhina Admin Portal.
 * @param  {object} corsOptions - parameters used for CORS.
 */
const corsOptions = {
  origin: 'http://localhost:8000/',
  optionsSuccessStatus: 200 // For legacy browser support
}
awhinaServer.app.use(awhinaServer.cors(corsOptions));

/**
 * Set size limit of requests.
 * TODO - verify the maximum expected request size and update the limit value.
 * @argument  {string} limit - The maximum size of the request.
 */
awhinaServer.app.use(function (req, res, next) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    next()
    return
  }
  awhinaServer.getRawBody(req, {
    length: req.headers['content-length'],
    limit: '100kb',
    encoding: contentType.parse(req).parameters.charset
  }, function (err, string) {
    if (err) return next(err)
    req.text = string
    next()
  })
})


/**
 * Add Morgan to log HTTP requests
 */
awhinaServer.app.use(awhinaServer.morgan('combined'));


/**
 * General function for creating a unique ID used for the deployment ID's and for creating
   backups for config files in the project folder (config_uid.json).
 * Using date at the start allows these to be sorted by the date generated.
 */
function generateUID(){
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// VALIDATION ----------------------------------------------------------------------------------------
/**
 * Any API request will need to be validated with the ESRI Enterprise portal.
   This is done by:
   + Checking that the request comes from the ESRI Enterprise Server Awhina
     is running on (DONE IN CORS POLICY - see corsOptions).
     This ensures requests are only coming from the Awhina Admin portal.
   + Checking that the ESRI user token passed by the client and client privileges in the
     Enterprise portal are valid to make the required changes:
     - Queries the portal for user groups (using user token).
       If user token is valid (200 response with user groups returned)
     - Check against the adminGroups object and find what user groups the client is a part of,
       if there is a match between the client user groups, adminGroups and at least one of the
       Awhina deployment CDEM Groups then the validation has succeeded.
       It has failed if either the token is invalid (no access to portal) or no matches
       are found for Awhina admin privileges for the requested CDEM Group.
 * NOTE - Admin privileges extend to all GIS admins for that CDEM Group, a deployment is not tied
   directly to a single user so admin functions can be done by others with sufficient privileges.

 * @param  {string} clientID - The token sent by the user in the admin portal - it is then used for authentication here.
                               It is generated when the user signs into the admin portal.
 * @param  {string} deploymentID - The unique id that is the folder name for the config file hosted in the server
                                   for an existing deployment.
 * @param  {boolean} existingDeployment - Defines if this authentication is for an existing deployment,
                                         it returns the config file for the deployment.
 * @returns {object} {validuser, message, error}
                     {boolean} validuser - true if the user is authenticated,
                     false if not authenticated or code returned an error.
                     {string} message - Message back to client contaning info on authentication success/failure.
                     {boolean} error - true if an error returned, false if not.
 */
function checkClientCredentials(clientID, deploymentID, existingDeployment){
  // Generate the filter from id's of the CDEM Groups
  let groupList = Object.keys(awhinaServer.adminGroups); // interim list to hold the ids
  // String of groups for filter
  let groupIds = groupList.join(" OR id: ");

  // Perform the request
  return awhinaServer.fetch(awhinaServer.portalURL + new URLSearchParams({
    token: clientID,
    q: 'id: ' + groupIds,
    num: 100,
    searchUserAccess: "groupMember",
    f: 'json'
  }), {
    method: 'GET',
  })
  .then(response => {
    // On valid response start admin group matching
    if (response.ok) { // res.status >= 200 && res.status < 300
      // Convert the resolved response to json
      return response.json().then(body => {
        // The admin group values are returned by cheking the group id (stops users being in a fake admin group with the correct name).
        const userGroups = body.results;
        let userAdminGroups = [];
        const adminKeys = Object.keys(awhinaServer.adminGroups);
        for (let i = 0; i < userGroups.length; i++) {
          if (adminKeys.includes(userGroups[i]['id'])){
            userAdminGroups.push(userGroups[i]['title'])
          }
        }
        /**
         * If the user is accessing an existing deployment, check that the user is in one of the CDEM Groups named in the
         * Deployment config file, if so they have correct permissions to edit/delete the deployment.
         * Note, the user match is based on the verified enterprise groups in the variable userAdminGroups - this is
         * what is matched against the names in the config file.
         */
        if (existingDeployment){
          // Grab the config file if it is for an existing deployment to check if user has access to the CDEM Groups it is for.
          let configFile = getConfig(awhinaServer.deploymentFolder + deploymentID);
          // If at least one of the CDEM groups in the configFile matches the cdem admin groups of the user
          Object.keys(configFile).forEach(function(key) {
            // Now check if any one of the config file CDEM Groups match with the admin groups the user is in.
            // Only one match is needed - as the admin user will have privileges over any multi CDEM group deployment
            // That their CDEM Group is part of.
            if (userAdminGroups.includes(key)){
              return {validuser: true, message: 'User validation successful.', error: false};
            }
          });
          // If the return action was not initiated above then the user is not in an admin CDEM group.
          return {validuser: false, message: 'User does not have the correct permissions to perform this action.', error: false};
        }
        // If this is a new deployment, there is no need to check against the config file.
        // Just that the user is in one of the correct admin groups.
        else if (!existingDeployment) {
          if (userAdminGroups.length >= 1){
            return {validuser: true, message: 'User validation successful.', error: false};
          }
          else {
            return {validuser: false, message: 'User does not have the correct permissions to perform this action.', error: false}
          }
        }
        else {
          return {validuser: false, message: 'Server side error.', error: true};
        }
      });
    }
    // For invalid responses
    else {
      console.log(response.statusText);
      return {validuser: false, message: response.statusText, error: true};
    }
  })
  .catch(err => {
    console.log(err);
    return {validuser: false, message: err, error: true};
  });
}


/**
 * Get the existing config.json file for an Awhina Deployment.
 * @param  {string} fileURL - The location on the server of the file config.
 *                          Constructed out of the server folder and project name.
 */
function getConfig(fileURL){
  const rawData = fs.readFileSync(fileURL);
  const configJSON = JSON.parse(rawData);
  console.log(configJSON);
  return configJSON
} 

/**
 * API METHODS ---------------------------------------------------------------------------------------------------
 * All methods are available for a client that has access to one of the administration ESRI Portal
   groups for each of CDEM Groups.
 * Clients are only allowed to edit an Awhina deployment if they are in that group.
*/

awhinaServer.app.post("/generateDeploymentID", function (req, res) {
  // Check client request is authorised
  checkClientCredentials(req.body.token, req.body.deploymentID, existingDeployment = false)
  .then(response => {
    console.log(response);
    // If user is authorised
    if (response.validuser){
      console.log('Deployment ID CREATED.');
      // Create a unique id to associate the deployment generated with the files on the server.
      const deploymentID = generateUID();
      // Send the deployment ID back to client
      res.status(200).send(deploymentID);
    }
    // If not authorised
    else {
      res.status(403).send(new Error(response.message));
    }
  });
});

/**
 * Create a new Awhina deployment by copying the Awhina Template project to the project directory.
 * Changes the name of the project folder. Function /createCongfig will then run after the 200 result
   and the config will be added to the project.
 * @param {object} req - The request sent by the client.
                  req = {
                  body: {
                    token : '' - User token authentication to enterprise protal.
                    deploymentID: '' - The unique id for the deployment being created
                  }
                }
 */
awhinaServer.app.post("/createDeployment", function (req, res) {
  // Check client request is authorised
  checkClientCredentials(req.body.token, req.body.deploymentID, existingDeployment = false)
  .then(response => {
    console.log(response);
    // If user is authorised
    if (response.validuser){
      // Copy the portal files from the template directory to new deployment.
      const srcDir = '/templateDeployment';
      const destDir = '/projects/' + req.body.deploymentID;
      awhinaServer.fse.copySync(srcDir, destDir, function (error) {
        if (error) {
          console.error(error);
          res.status(500).send(new Error(error));
        } else {
          console.log('Deployment project CREATED.');
          res.status(200).send('Deployment project CREATED.');
        }
      });
    }
    // If not authorised
    else {
      res.status(403).send(new Error(response.message));
    }
  });
});


/**
 * Generates the config.json file from the req data parameter.
 * This contains information such as data layer id's, deployment name, CDEM groups etc for the Awhina Portal.
 * @param {object} req - The request sent by the client.
 * req = {
     body: {
      token : '' - User token authentication to enterprise protal.
      deploymentID: '' - The unique id for the deployment being created
      config: '' - Stringified JSON containing the unique portal information.
     }
   }
 */
awhinaServer.app.post("/createConfig", function (req, res) {
  checkClientCredentials(req.body.token, req.body.deploymentID, existingDeployment=false)
  .then(response => {
    console.log(response);
    if (response.validuser){
      // Write the file from the request params to the project folder.
      fs.writeFileSync(awhinaServer.deploymentFolder + req.body.deploymentID + '/config.json', req.body.config);
      // Send the client confirmation the deployment was created.
      res.status(200).send('Deployment config CREATED.');
    }
    // If not authorised
    else {
      res.status(403).send(new Error(response.message));
    }
  });
});

/**
 * Updates the existing config.json file for a deployment by overwriting the old version.
 * A backup of the old config is held in the daproject folder in case of any issues.
 * The config contains information such as data layer id's, deployment name, CDEM groups etc for the Awhina Portal.
 * @param {object} req - The request sent by the client.
 * req = {
     body: {
      token : '' - User token authentication to enterprise protal.
      deploymentID: '' - The unique id for the deployment being created
      config: '' - Stringified JSON containing the unique portal information.
     }
   }
*/
awhinaServer.app.post("/updateConfig", function (req, res) {
  checkClientCredentials(req.body.token, req.body.deploymentID, existingDeployment=false)
  .then(response => {
    console.log(response);
    if (response.validuser){
      // Set the URL path of the existing config.
      const configFilename = awhinaServer.deploymentFolder + req.body.deploymentID + '/config.json';
      // Get the existing config and stringify it.
      const existingConfig = JSON.stringify(getConfig(configFilename));
      // Create a uid to be used for the backup
      const backupUID = generateUID();
      // Set the filename of the backup config we will create.
      const configBackupFilename = awhinaServer.deploymentFolder + req.body.deploymentID + '/config_backup_' + backupUID + '.json'
      // Create a backup of the previous config
      fs.writeFileSync(configBackupFilename, existingConfig);
      // Overwrite the existing file with the client sent config.
      fs.writeFileSync(configFilename, req.body.config);
      // Send the client confirmation the deployment was created.
      res.status(200).send('Deployment config UPDATED.');
    }
    // If not authorised
    else {
      res.status(403).send(new Error(response.message));
    }
  });
});

/**
 * Deletes the Awhina deployment folder and all contents.
 * req = {
     body: {
      token : '' - User token authentication to enterprise protal.
      deploymentID: '' - The unique id for the deployment being created
     }
   }
 */
awhinaServer.app.delete("/deleteDeployment", function (req, res) {
  checkClientCredentials(req.body.token, req.body.deploymentID, existingDeployment=true)
  .then(response => {
    console.log(response);
    // If authenticated
    if (response.validuser){
      // Delete all files in folder and the folder itself.
      // This does not delete any data, layers or maps/dashboards held in enterprise.
      // That is covered in the admin portal.
      fs.rmdirSync(awhinaServer.deploymentFolder + req.body.deploymentID, {recursive: true});
      res.status(200).send('Deployment project DELETED.');
    }
    // If not authorised
    else {
      res.status(403).send(new Error(response.message));
    }
  });
});


/**
 * Start the node.js server.
 * @param  {number} awhinaServer.port - the port for the node.js server to listen to.
 */
let server = app.listen(awhinaServer.port, function () {
   const host = server.address().address
   const port = server.address().port
   console.log("Awhina Admin API listening at http://%s:%s", host, port)
});