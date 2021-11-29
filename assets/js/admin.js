/**
 * Filename: admin.js
 * Purpose:
   Contains the javascript code that implements the functionality for the
   Āwhina Welfare System Portal Administration Functions (CRUD App for the Āwhina Welfare System).
   The admin system is is comprised of an html page (admin.html), this js file (admin.js) and a serverside node.js
   file (server.js). A CSS file is used across this admin application and all Āwhina Welfare System Deployments.
   These files are kept in the main awhina folder on the server. The dataset that holds the records
   found in the table for each Āwhina Deployment is hosted in the emergencymanagement.govt.nz
   ESRI Enterprise portal. All groups and users are also held there.
   REST API Calls are used for interacting with the app either direct to the ESRI Enterprise tenancy or to
   the node.js server.
   Further information can be found in the documentation for the Āwhina Welfare System.
   Please note: Due to the constraints on software available at NEMA, this system has been built on vanilla JS.
   Future enhancements could update this to TypeScript. JQuery is required due to the dependencies within bootstrap 4 and
   bootstrap table.
 * Author: Dion Fabbro - dion.fabbro@nema.govt.nz, dionfabbro@gmail.com
 * Version: 0.91
*/

// Destructured rename declaration of console.log() and console.error().
// You can now use l("Log comment"); and e("Error"); in the code.
const {log:l} = console;
const {error:e} = console;

// TODO: 
// Method to sanitise data as part of decomissioning? Form shows all fields, select personal info from
// list and exports a clean version. Can set the long string fields as auto checked.

// App config -------------------------------------------------------------------------------------------
const adminApp = {
  config: {
    layerURL: "https://awhina.emergencymanagement.govt.nz/server/rest/services/Hosted/FakeAwhinaDeploymentTable/FeatureServer/0",
    portalURL: "https://awhina.emergencymanagement.govt.nz/portal",
    appID: "0AKMXvgZlpajuyyg",
    layerQuery: "",
    serverURL: "http://localhost:9000/",
    accessDeniedURL: "http://localhost:8000/Documents/GIS/Awhina_2_DEV/403.html",
    dashboardJSON: "http://localhost:8000/Documents/GIS/Awhina_2_DEV/assets/config/dashboard.json",
    accessRoles: ["org_admin", "cdem_admin"],
    fieldSchemaURL: "assets/projects/_project_config/PROJECT_fieldconfig.json"
  },
  externalConfig: {
    fieldProperties: {},
  },
  cdemGroups: [
    {id: "01c681f4b16e4cffaaa444c0663846ed", cdem: "Auckland CDEM", title: "Auckland CDEM Admin Group", short: "AUK"},
    {id: "8549597e25914b298e72475ccd39f7c5", cdem: "Bay of Plenty CDEM", title: "Bay of Plenty CDEM User Group", short: "BOP"},
    {id: "ec2e14a30c2b4587abfa3450930c17c1", cdem: "Canterbury CDEM", title: "Canterbury CDEM User Group", short: "CAN"},
    {id: "bb20c9c3969c4f42be9b3fd49dd33155", cdem: "Chatham Islands CDEM", title: "Chatham Islands CDEM User Group", short: "CIT"},
    {id: "0871b2d9d5f04fb9addea38f7e9e3179", cdem: "Hawke's Bay CDEM", title: "Hawke's Bay CDEM User Group", short: "HKB"},
    {id: "e9005779eb654c1cbfade677e67a8c77", cdem: "Manawatu Wanganui CDEM", title: "Manawatu Wanganui CDEM User Group", short: "MWT"},
    {id: "d06015de3a9e48418efdcae0e9e32c11", cdem: "Marlborough CDEM", title: "Marlborough CDEM User Group", short: "MBH"},
    {id: "97a3540a29c14ed48394562064723122", cdem: "Nelson Tasman CDEM", title: "Nelson Tasman CDEM User Group", short: "NSN-TAS"},
    {id: "c91490fbdcd645fd9b5dd3a41b8bde19", cdem: "Northland CDEM", title: "Northland CDEM User Group", short: "NTL"},
    {id: "baf06a46dc4342988d3e54734256c29d", cdem: "Otago CDEM", title: "Otago CDEM User Group", short: "OTA"},
    {id: "cc815ac4569344e3a7195455c0335385", cdem: "Southland CDEM", title: "Southland CDEM User Group", short: "STL"},
    {id: "09401bdd282a45e9b4ff475676f5a9f3", cdem: "Tairāwhiti CDEM", title: "Tairāwhiti CDEM User Group", short: "TAI"},
    {id: "f4c6879985f549e29e2fe104d942c3a7", cdem: "Taranaki CDEM", title: "Taranaki CDEM User Group", short: "TKI"},
    {id: "fa4426ecfa5f4ed7b6cb44be0a6203f5", cdem: "Waikato CDEM", title: "Waikato CDEM User Group", short: "WKO"},
    {id: "a56baba1d3984db892f91edae8e68a88", cdem: "Wellington CDEM", title: "Wellington CDEM User Group", short: "WGN"},
    {id: "1986fe01482c491fb8543f74a02caa5c", cdem: "West Coast CDEM", title: "West Coast CDEM User Group", short: "WTC"},
    {id: "db107b372cd94baeaa78e38c6d16ac34", cdem: "TEST CDEM", title: "Wh", short: "TEST"}
  ],
  ui: {
  },
  domElems: {
    signIn: $("#sign-in"),
    signOut: $("#sign-out"),
    loadingBar: $("#loading-bar"),
    loadingMask: $("#loading-mask"),
    mainTable: $("#main-table"),
    htmlBody: $("#body"),
    progressBarHold: $(".progress-bar-hold"),
    // Loading indicator for form id field in deployment form
    s123Loading: $("#survey123-forms-loading"),
    // Button to deploy awhina system
    formButton: $("#generate-modal-button"),
    // Button to refresh survey123 form list
    survey123FormsRefreshBtn: $("#refresh-survey123-forms"),
    // Form ID field - autofilled if Form selected, but manually updated by user if enter manually selected
    s123FormID: $("#survey123-form-id"),
    // The above field group hides or shows based on if enter manually is showed - auto filled if form selected.
    s123FormIDGroup: $("#survey123-form-id-group"),
    // Clone of deployment form
    cloneDepForm: $("#generate-modal").clone(),
    // Clone of edit field form
    cloneEditFieldForm: $("#edit-field-form").clone(),
    // Clone of delete field form
    cloneDelCheckModal: $("#delete-check-modal").clone(),
    logging: {
      // Log elements
      logContainer: $("#log-container"),
      logFileDiv: $("#log-file-div"),
      textLog: $("#log-text-area"),
      logHeading: $("#log-heading"),
      issueLog: $("#issue-text-area"),
      closeLogBtn: $("#close-log-btn")
    },
    deploymentFields: {
      text: $("#dep-field-text"),
      container: $("#deployment-field-div")
    }
  },
  // Signed in user variables
  user: {
    token: "",
    username: "",
    fullName: "",
    role: "",
    email: "",
    groups: [],
    cdemUserGroups: [],
    folders: []
  },
  table: {
    properties: [{
      value: "objectid",
      label: "Object ID",
      table: {
        visible: false,
        sortable: true,
      }
      },
      {
      value: "project",
      label: "Project",
      table: {
        visible: true,
        sortable: true,
      }
      },
      {
      value: "cdemgroups",
      label: "CDEM Group(s)",
      table: {
        visible: true,
        sortable: true,
      }
      },
      {
      value: "cdemgroupsfull",
      label: "CDEM Group(s) Fullname",
      table: {
        visible: false,
        sortable: true,
      }
      },
      {
      value: "cdemUserRestrictions",
      label: "CDEM User Restrictions",
      table: {
        visible: false,
        sortable: true,
      }
      },
      {
      value: "welfareneeds",
      label: "Welfare Need(s)",
      table: {
        visible: true,
        sortable: true,
      }
      },
      {
        value: "createdat",
        label: "Created",
        formatter: dateFormatter,
        table: {
          visible: true,
          sortable: true,
        }
      },
      {
        value: "editedat",
        label: "Last Edited",
        formatter: dateFormatter,
        table: {
          visible: true,
          sortable: true,
        }
      },
      {
        value: "surveyitemid",
        label: "Survey Item ID",
        formatter: formatterURL,
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "featureservice",
        label: "Feature service",
        formatter: formatterURL,
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "systemFolder",
        label: "System Folder",
        formatter: formatterURL,
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "awhinadeploymenturl",
        label: "Portal Website",
        formatter: formatterURL,
        table: {
          visible: true,
          sortable: false,
        }
      },
      {
        value: "portalconfig",
        label: "Portal Config",
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "layerviews",
        label: "Layer Views",
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "dashboard",
        label: "Dashboard",
        table: {
          visible: false,
          sortable: false,
        }
      },
      {
        value: "status",
        label: "Status",
        width: "140px",
        formatter: statusFormatter,
        table: {
          visible: true,
          sortable: true,
        }
      },
      {
      value: "email",
      label: "Admin Email",
      table: {
        visible: false,
        sortable: true,
      }
      },
      {
        value: "initialconfig",
        label: "Initial Config",
        table: {
          visible: false,
          sortable: false,
        }
      }
    ],
    data: [],
  },
  deployment: {
    config: {
      project: "",
      cdemgroupsshort: "",
      cdemgroupsfull: "",
      cdemUserRestrictions: "",
      welfareneeds: "",
      createdat: Date,
      editedat: Date,
      created_user: "",
      last_edited_user: "",
      created_date: Date,
      last_edited_date: Date,
      status: "",
      email: "",
      surveyformid: "",
      featureservice: {
        id: "",
        url: "",
        title: "",
        servicename: "",
      },
      systemFolder: "",
      awhinadeploymenturl: "",
      esrigroups: [],
      layerviews: [],
      welfaregroups: [],
      portalconfig: {},
      dashboards: [],
      itemstomove: [],
      definedFields: []
    },
    domains: {
      // TODO implement the domain functionality
      // The region and district domains auto generated by the survey123 process will
      // include all of them, the below are used to update the domain values to only contain
      // those included in the CDEMs selected for deployment.
      regions: {
        "Auckland CDEM": "Auckland_CDEM",
        "Bay of Plenty CDEM": "Bay_of_Plenty_CDEM",
        "Canterbury CDEM": "Canterbury_CDEM",
        "Chatham Islands CDEM": "Chatham_Islands_CDEM",
        "Hawke's Bay CDEM": "Hawkes_Bay_CDEM",
        "Manawatu Wanganui CDEM": "Manawatu_Wanganui_CDEM",
        "Marlborough CDEM": "Marlborough_CDEM",
        "Nelson Tasman CDEM": "Nelson_Tasman_CDEM",
        "Northland CDEM": "Northland_CDEM",
        "Otago CDEM": "Otago_CDEM",
        "Southland CDEM": "Southland_CDEM",
        "Tairāwhiti CDEM": "Tairawhiti_CDEM",
        "Taranaki CDEM": "Taranaki_CDEM",
        "Waikato CDEM": "Waikato_CDEM",
        "Wellington CDEM": "Wellington_CDEM",
        "West Coast CDEM": "West_Coast_CDEM",
      },
      districts: {
        "Auckland CDEM": {
          'Unknown': 'Unknown',
          'Albert_Eden_Local_Board': 'Albert-Eden Local Board',
          'Aotea_Great_Barrier_Local_Board': 'Aotea / Great Barrier Local Board',
          'Devonport_Takapuna_Local_Board': 'Devonport-Takapuna Local Board',
          'Franklin_Local_Board': 'Franklin Local Board',
          'Henderson_Massey_Local_Board': 'Henderson-Massey Local Board',
          'Hibiscus_and_Bays_Local_Board': 'Hibiscus and Bays Local Board',
          'Howick_Local_Board': 'Howick Local Board',
          'Kaipatiki_Local_Board': 'Kaipātiki Local Board',
          'Mangere_Otahuhu_Local_Board': 'Māngere-Ōtāhuhu Local Board',
          'Manurewa_Local_Board': 'Manurewa Local Board',
          'Maungakiekie_Tamaki_Local_Board': 'Maungakiekie-Tāmaki Local Board',
          'Otara_Papatoetoe_Local_Board': 'Ōtara-Papatoetoe Local Board',
          'Papakura_Local_Board': 'Papakura Local Board',
          'Puketapapa_Local_Board': 'Puketāpapa Local Board',
          'Rodney_Local_Board': 'Rodney Local Board',
          'Upper_Harbour_Local_Board': 'Upper Harbour Local Board',
          'Waiheke_Local_Board': 'Waiheke Local Board',
          'Waitakere_Ranges_Local_Board': 'Waitākere Ranges Local Board',
          'Waitemata_Local_Board': 'Waitematā Local Board',
          'Whau_Local_Board': 'Whau Local Board'
        },
        "Bay of Plenty CDEM": {
          'Unknown': 'Unknown',
          'Kawerau_District': 'Kawerau District',
          'Opotiki_District': 'Ōpōtiki District',
          'Rotorua_District': 'Rotorua District ',
          'Tauranga_City': 'Tauranga City',
          'Western_Bay_of_Plenty_District': 'Western Bay of Plenty District',
          'Whakatane_District': 'Whakatāne District'
        },
        "Canterbury CDEM": {
          'Unknown': 'Unknown',
          'Ashburton_District': 'Ashburton District',
          'Christchurch_City': 'Christchurch City',
          'Hurunui_District': 'Hurunui District',
          'Kaikoura_District': 'Kaikōura District',
          'Mackenzie_District': 'Mackenzie District',
          'Selwyn_District': 'Selwyn District',
          'Timaru_District': 'Timaru District',
          'Waimakariri_District': 'Waimakariri District',
          'Waimate_District': 'Waimate District'
        },
        "Chatham Islands CDEM": {
          'Unknown': 'Unknown',
          'Chatham_Island': 'Chatham Island',
          'Pitt_Island': 'Pitt Island'
        },
        "Hawke's Bay CDEM": {
          "Unknown": "Unknown",
          "Central_Hawkes_Bay_District": "Central Hawke's Bay District",
          "Hastings_District": "Hastings District",
          "Napier_City": "Napier City",
          "Wairoa_District": "Wairoa District"
        },
        "Manawatu Wanganui CDEM": {
          'Unknown': 'Unknown',
          'Horowhenua_District': 'Horowhenua District',
          'Manawatu_District': 'Manawatu District',
          'Palmerston_North_City': 'Palmerston North City',
          'Rangitikei_District': 'Rangitikei District',
          'Ruapehu_District': 'Ruapehu District',
          'Tararua_District': 'Tararua District',
          'Whanganui_District': 'Whanganui District'
        },
        "Marlborough CDEM": {
          'Unknown': 'Unknown',
          'Blenheim_Ward': 'Blenheim Ward',
          'Marlborough_Sounds_Ward':
          'Marlborough Sounds Ward',
          'Wairau_Awatere_Ward': 'Wairau-Awatere Ward'
        },
        "Nelson Tasman CDEM": {
          'Unknown': 'Unknown',
          'Nelson_City': 'Nelson City',
          'Tasman_District': 'Tasman District'
        },
        "Northland CDEM": {
          'Unknown': 'Unknown',
          'Far_North_District': 'Far North District',
          'Kaipara_District': 'Kaipara District',
          'Whangarei_District': 'Whangarei District'
        },
        "Otago CDEM": {
          'Unknown': 'Unknown',
          'Central_Otago_District': 'Central Otago District',
          'Clutha_District': 'Clutha District',
          'Dunedin_City': 'Dunedin City',
          'Queenstown_Lakes_District': 'Queenstown Lakes District',
          'Waitaki_District': 'Waitaki District '
        },
        "Southland CDEM": {
          'Unknown': 'Unknown',
          'Gore_District': 'Gore District',
          'Invercargill_City': 'Invercargill City',
          'Southland_District': 'Southland District'
        },
        "Tairāwhiti CDEM": {
          'Unknown': 'Unknown',
          'Gisborne_Ward': 'Gisborne Ward',
          'Matakaoa_Waiapu_Ward': 'Matakaoa-Waiapu Ward',
          'Taruheru_Patutahi_Ward': 'Taruheru-Patutahi Ward',
          'Tawhiti_Uawa_Ward': 'Tawhiti-Uawa Ward',
          'Waipaoa_Ward': 'Waipaoa Ward'
        },
        "Taranaki CDEM": {
          'Unknown': 'Unknown',
          'New_Plymouth_District':
          'New Plymouth District',
          'South_Taranaki_District': 'South Taranaki District',
          'Stratford_District': 'Stratford District'
        },
        "Waikato CDEM": {
          'Unknown': 'Unknown',
          'Hamilton_City': 'Hamilton City',
          'Hauraki_District': 'Hauraki District',
          'Matamata_Piako_District': 'Matamata-Piako District',
          'Otorohanga_District': 'Otorohanga District',
          'South_Waikato_District': 'South Waikato District',
          'Taupo_District': 'Taupō District',
          'Thames_Coromandel_District': 'Thames-Coromandel District',
          'Waikato_District': 'Waikato District',
          'Waipa_District': 'Waipa District',
          'Waitomo_District': 'Waitomo District'
        },
        "Wellington CDEM": {
          'Unknown': 'Unknown',
          'Carterton_District': 'Carterton District',
          'Hutt_City': 'Hutt City',
          'Kapiti_Coast_District': 'Kāpiti Coast District',
          'Masterton_District': 'Masterton District',
          'Porirua_City': 'Porirua City',
          'South_Wairarapa_District': 'South Wairarapa District',
          'Upper_Hutt_City': 'Upper Hutt City',
          'Wellington_City': 'Wellington City'
        },
        "West Coast CDEM": {
          'Unknown': 'Unknown',
          'Buller_District': 'Buller District',
          'Grey_District': 'Grey District',
          'Westland_District': 'Westland District'
        },
      }
    },
    // Field properties of template layer
    templateProperties: [],
    // Survey123 Forms owned by user - user selects the one to create the deployment from
    survery123Forms: {},
    // The number of CDEM Groups to iterate over in the creation of feature views.
    // 2 is the most stable number that reduces errors caused by locks on the data layer.
    maxGroupIteration: 2,
  },
  editing: {
    row: {},
    fields: [],
    updatefields: [],
    field: {},
  },
  // For deleting a deployment
  deleting: {
    row: {},
    // For holding all features for export when a deployment is deleted
    extractFeatures: {},
  },
  lookups: {
    welfareNeeds: [
      "Missing Person",
      "Shelter and Accommodation",
      "Household Goods and Services",
      "Animal Welfare",
      "Health or Disability",
      "Financial Assistance",
      "Psychosocial Support"
    ],
    indexMatch: {
      "Missing Person" : "missingperson",
      "Shelter and Accommodation": "shelteraccommodation",
      "Household Goods and Services": "householdgoods", 
      "Animal Welfare": "animalwelfare",
      "Health and Disability": "healthdisability",
      "Financial Assistance": "financialassistance",
      "Psychosocial Support": "psychosocialsupport"
    },
    // Contains the info to match the form name with the welfare type + queries for the feature views
    viewDefMatch: {
      "Missing Person" : "missingpersonreferral = 'Yes'",
      "Shelter and Accommodation": "shelteraccomreferral = 'Yes'",
      "Household Goods and Services": "householdgoodsreferral = 'Yes'",
      "Animal Welfare": "animalwelfarereferral = 'Yes'",
      "Health and Disability": "healthdisabilityreferral = 'Yes'",
      "Financial Assistance": "financialassistreferral = 'Yes'",
      "Psychosocial Support": "psychosocialreferral = 'Yes'"
    },
    subtableMatch: {
      "overview": "Overview",
      "requestor": "Requestor",
      "missingperson": "Missing Person",
      "shelteraccommodation": "Shelter and Accommodation",
      "householdgoods": "Household Goods and Services",
      "animalwelfare": "Animal Welfare",
      "healthdisability": "Health or Disability",
      "financialassistance": "Financial Assistance",
      "psychosocialsupport": "Psychosocial Support",
      "notes": "Notes",
      "system": "System",
      "all": "All",
      "none": "None"
    },
  }
}

/**
 * General error function for failed request.
 * @param {object or string} error contains the resultant error from the api request
 * @param {object} data the config variables used in the deployment being processed - to update the status to failed
 * @param {string} functionName where the error occured.
*/
 function errorReport(error, functionName){
  //  Convert object if type of error is not
  const er = typeof error !== "object" ? JSON.parse(error) : error;
  e(er);
  // Change the colour of the log window to show issue
  adminApp.domElems.logging.logContainer.removeClass('alert-warning').addClass('alert-danger');
  // Add the error into the issue log
  postToLog('ERROR in "' + functionName + '" function:\n' + er + '\n---------------------------------------------\n', 'issue');
  // Set deployment status to failed.
  adminApp.deployment.config.status = 'Failed';
  // Update the deployment record in enterprise.
  updateDeploymentDetails(adminApp.deployment.config);
}

// Sign in and out -----------------------------------------------------------------------------------------------------
/**
 * Sign in and out functionality. Authentication is OAuth 2.0 and uses a token to verify any API calls.
 * The token sits under the user object as user.token. This token lasts for 24 hours.
 * Users are only able to sign in if they have a valid account in the emergencymanagement tenancy Azure AD.
 * They then sign into this app and validate their credentials via SAML - getting taken to the MS account sign in
 * (if not currently in an MZ account) and then once their MS account is validated they get sent to the portal sign in.
 * @param  {} Portal - The portal class returns enterprise portal and user information
                       from the emergencymanagement tenancy.
 * @param  {} OAuthInfo - The authentication class is used to login to the tenancy.
 * @param  {} identityManager - Checks for sign in status and registers the OAuthInfo details.
*/
require(["esri/portal/Portal", "esri/identity/OAuthInfo","esri/identity/IdentityManager"], function(
  Portal, OAuthInfo, identityManager) {
  adminApp.domElems.loadingBar.html('Checking user access...');
  // ArcGIS Online or your portal address
  const info = new OAuthInfo({
  appId: adminApp.config.appID,
  portalUrl: adminApp.config.portalURL,
  popup: false
  });
  identityManager.registerOAuthInfos([info]);
  
  // Send users to login
  adminApp.domElems.loadingBar.click(function(){
    identityManager.getCredential(adminApp.config.portalURL + "/sharing");
  });

  // Once signed in...
  identityManager.checkSignInStatus(adminApp.config.portalURL + "/sharing").then(function() {
    adminApp.domElems.signIn.hide();
    adminApp.domElems.signOut.show();
    const portal = new Portal(adminApp.config.portalURL);
    // Once the portal has loaded, the user is signed in
    portal.load().then(function() {
      adminApp.domElems.loadingBar.html('Signed in...');
      $("#login").html(" " + DOMPurify.sanitize(portal.user.fullName));
      // Fill in the user config
      adminApp.user.token = portal.credential.token;
      adminApp.user.username = portal.user.username;
      adminApp.user.fullName = portal.user.fullName;
      adminApp.user.role = portal.user.role;
      adminApp.user.email = portal.user.email;

      // Get the groups the user is in.
      adminApp.domElems.loadingBar.html('Loading user details...');
      portal.user.fetchGroups().then(function(fetchItemResult){
        for (let i = 0; i < fetchItemResult.length; i++) {
          adminApp.user.groups.push({id: fetchItemResult[i].id, title: fetchItemResult[i].title});
        }
        // Check the groups to see if there are any in the cdem user group list and then add the shorthand id.
        let result = adminApp.cdemGroups.filter(o1 => adminApp.user.groups.some(o2 => o1.id === o2.id));
        adminApp.user.cdemUserGroups = result;
        // Check to see if the user role is high enough and they are in a user group
        // If so access website.
        if (adminApp.config.accessRoles.includes(adminApp.user.role) && adminApp.user.cdemUserGroups.length >= 1){
          adminApp.domElems.loadingBar.html('Loading dataset...');
          loadDataESRI();
          adminApp.domElems.loadingMask.hide();
        }
        // If not, destroy login/user details and redirect to access denied page
        else {
          require(["esri/identity/IdentityManager"], function(identityManager) {
            identityManager.destroyCredentials();
          });
          window.location.replace(adminApp.config.accessDeniedURL+"#"+adminApp.user.username);
        }
      });
    });
  },
  function(error) {
    adminApp.domElems.loadingBar.removeClass();
    adminApp.domElems.loadingBar.addClass('btn btn-info');
    adminApp.domElems.loadingBar.html('CLICK HERE TO SIGN IN');
  });

  // Log out and reload
  adminApp.domElems.signOut.click(function(){
    require(["esri/identity/IdentityManager"], function(identityManager) {
      identityManager.destroyCredentials();
    });
    window.location.reload();
    adminApp.user = [];
    adminApp.domElems.signOut.hide();
    // Sign out of the MS Teams account fully
    location.href = "https://login.windows.net/common/oauth2/logout";
  });
});

// Functionality for log file window -----------------------------------------------------------------------------------

/**
 * Close log window button and reset the deployment form and log.
 * @globals  {HTMLElement} adminApp.domElems.logging.closeLogBtn
 * Used to close the log window.
*/
adminApp.domElems.logging.closeLogBtn.click(function(){
  // Hide the log
  adminApp.domElems.logging.logFileDiv.hide();
  // Reset the form to initial state
  $('#deployment-form')[0].reset();
  // Reset the log
  resetLog();
});

/**
 * Reset log to the default state by updating the HTMLElements.
*/
function resetLog(){
  adminApp.domElems.logging.logHeading.html('<h6 id="log-heading">Log File for Action: <span id="log-heading-text"></span></h6>');
  adminApp.domElems.logging.textLog.html("");
  adminApp.domElems.logging.issueLog.html("");
  // Remove any old success/fail classes and add back the default yellow (bootstrap warning class)
  adminApp.domElems.logging.logContainer.removeClass('alert-danger alert-success').addClass('alert-warning');
}

/**
 * Adds text to the correct log window and scrolls to the bottom (continuous scrolling)
 * @param  {} logText - the text to be appended to the log window
 * @param  {} logType - 'info' or 'issue' - defines what text window to add to. Default is window
*/
function postToLog(logText, logType = 'info'){
  // Make sure log type is set, normal logging if not set to 'issue'
  if(logType){
    // Set the log window dom elem to var
    let log = adminApp.domElems.logging.textLog;
    // If issue type, change it to issue log window
    if (logType == 'issue'){
      log = adminApp.domElems.logging.issueLog;
    }
    // Append the text
    log.append(logText);
    // Scroll to bottom of text
    log.scrollTop(log[0].scrollHeight - log.height());
  }
}

// Deploy new Āwhina Form Functions ------------------------------------------------------------------------------------

/**
 * Functionality to deploy a new Āwhina Welfare System from the web form UI.
 * this is a global (window) event listener.
 * Form actions:
 * - Check for invalid fields that do not have anything in them. If a field is empty warn user and not allow submission.
 * - If validation successful, fill in the deployment config properties for
 *   the new system into the global object adminApp.deployment.config.
 *   This will then be used across the deploy awhina functions.
 * - The last step is to call the first function in the chain to generate the new deployment addDeploymentRecordToTable().
*/
(function() {
  'use strict';
  window.addEventListener('load', function() {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    let forms = $('.needs-validation');
    // Loop over them and prevent submission
    let validation = Array.prototype.filter.call(forms, function(form) {
      form.addEventListener('submit', function(event) {
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
        }
        else {
          event.preventDefault();
          form.classList.add('was-validated');
          // Construct the deployment config from the form values
          adminApp.deployment.config.project = $("#emergencyName").val();
          adminApp.deployment.config.cdemgroupsshort = returnCDEMShortName($("#cdemGroups").val());
          adminApp.deployment.config.cdemgroupsfull = $("#cdemGroups").val().join(", ");
          adminApp.deployment.config.cdemUserRestrictions = $("input[name='CDEM-grouping']:checked").val();
          adminApp.deployment.config.welfareneeds = $("#welfareNeeds").val().join(", ");
          adminApp.deployment.config.createdat = Date.now();
          adminApp.deployment.config.editedat = Date.now();
          adminApp.deployment.config.created_user = adminApp.user.email;
          adminApp.deployment.config.last_edited_user = adminApp.user.email;
          adminApp.deployment.config.created_date = Date.now();
          adminApp.deployment.config.last_edited_date = Date.now();
          adminApp.deployment.config.status = "Creating";
          adminApp.deployment.config.email = adminApp.user.email;
          adminApp.deployment.config.surveyformid = $("#survey123-form-id").val();
          adminApp.deployment.config.systemFolder = encodeURI(adminApp.config.serverURL + "projects/" + $("#emergencyName").val().replace(/\//g, '_'));
          adminApp.deployment.config.awhinadeploymenturl = adminApp.deployment.config.systemFolder + "/awhina_portal.html";
          adminApp.deployment.config.esrigroups = [];
          adminApp.deployment.config.layerviews = [];
          adminApp.deployment.config.portalconfig = {};
          adminApp.deployment.config.featureservice = {id: "", url: "", title: "", servicename: ""};
          adminApp.deployment.config.dashboards = [];
          adminApp.deployment.config.itemstomove = [$("#survey123-form-id").val()];
          postToLog('Deployment details parsed successfully from form.\n');
          // TODO enable when node server is running.
          // Generate the project uniqueID
          // adminApp.deployment.config.uid = getNewDeploymentID();
          // Post the config to enterprise dataset and continue with deployment.
          addDeploymentRecordToTable();
        }
      }, false);
    });
  }, false);
})();

/**
 * Converts the long format names of CDEM Groups into the short format.
 * (ISO 3166 Code).
 * !!! Opposite to the returnCDEMFullName function BUT returns a STRING. !!!
 * @param  {array} cdemGroups - A list of the CDEM Group names
 * @returns  {string} shortGroups - The short hand names for the input groups in a joined string.
*/
function returnCDEMShortName(cdemGroups){
  let shortGroups = [];
  for (let i = 0; i<cdemGroups.length; i++){
    result = adminApp.cdemGroups.filter(cdem => cdem.cdem === cdemGroups[i]);
    if (result[0]){
      shortGroups.push(result[0].short);
    }
  }
  return shortGroups.join(", ") + " CDEM";
}

/**
 * Converts the shorthand names of CDEM Groups into the long format (CIT == Chatham Islands CDEM)
 * !!!  Opposite to the returnCDEMShortName function BUT returns an ARRAY. !!!
 * @param  {array} shortGroups - The list of groups currently in short hand form.
 * @returns  {array} cdemGroups - The list of long names for the input short names.
*/
function returnCDEMFullName(shortGroups){
  let cdemGroups = [];
  for (let i = 0; i<shortGroups.length; i++){
    result = adminApp.cdemGroups.filter(cdem => cdem.short === shortGroups[i]);
    if (result[0]){
      cdemGroups.push(result[0].cdem);
    }
  }
  return cdemGroups;
}

/**
 * In the new awhina deployment, check if multiple CDEMS are selected. If this is the case,
 * show the form elements for grouping CDEM data/groups into one or keeping the CDEM Group 
 * data and accessability seperate.
 * Example: Northland and Auckland CDEM Groups respond to the same emergency - they choose to deploy one
 * Āwhina instance led by Auckland (single S123 form and main dataset [keeps schema and data collected homogenous])
 * While not allowing the users of the system from seeing the others CDEM Group data.
 * The other option would be allowing full access to the data between CDEM's and not creating seperate user groups/data layers,
 * Auckland Āwhina Users could then easily assist their Northland counterparts with responding to welfare requests.
*/
$('#cdemGroups').on('change', function() {
  const $this = $(this);
  if ($this.val().length >= 2) {
    $("#cdem-grouping").show("slow");
    $("#no-CDEM-grouping").prop('checked', true);
  } else {
    $("#cdem-grouping").hide("slow");
    $("#no-CDEM-grouping").prop('checked', false);
    $("#yes-CDEM-grouping").prop('checked', false);
  }
});


/**
 * On click of the "Deploy Āwhina System Button"
 * !!! NOT the submit button in the form - the button on the main table that brings up the from. !!!
 * Search for all Survey123 forms that the user has created in the Enterprise Portal.
 * This allows the user to select the S123 form (and by association the main dataset of 
 * the Āwhina Deployment) and build the rest of the parts of the system around it.
*/
adminApp.domElems.formButton.on('click', function() {
  // Build the list of Survey123 forms the user has in the Enterprise portal
  buildSurvey123FormsList();
});

/**
 * On click of the refresh button in the form, rebuild the survey123 forms list.
*/
 adminApp.domElems.survey123FormsRefreshBtn.on('click', function() {
  buildSurvey123FormsList();
});

/**
 * Searches for existing Survey123 forms owned by the current user.
 * Returns an object (empty if no results) of form title to id.
*/
function buildSurvey123FormsList(){
  // Show loading indicator (if a user closes the form and opens it again this will show it)
  adminApp.domElems.s123Loading.hide();
  // Reset form list to default state.
  $('#survey123-forms').html("<option></option>");
  // Search for the Survey123 forms in the user account (will only show a max of 20, a user can manually add into the list).
  // You could also expand this code to search across >20 survey forms.
  $.ajax({
    url: adminApp.config.portalURL + "/sharing/rest/search/",
    method:"GET",
    data: {
      q: 'owner:"' + adminApp.user.username + '" type:("Form")',
      num: 20,
      start: 1,
      f: "json",
      token: adminApp.user.token,
    }
  })
  .done(function(result){
    // Check for error returned by ESRI
    if (result.error){
      e("Error returned on search for Survey123 Forms", result.error);
    }
    // If successful, parse the information and build the list of survey123 forms.
    else {
      // Remove loading icon in label
      $("#survey123-forms-label").html('<b>Select Survey123 Form:</b>');
      if (result.results.length > 0){
        // Sort on title of survey form
        const surveyList = result.results.sort(function(a, b) {
          return a.title.localeCompare(b.title);
        });
        // Sort the list into alphabetical order
        // Add an option at the top to enter manually
        $('<option/>').val("enter-manually").text("Enter Form ID Manually").appendTo('#survey123-forms');
        // Get the id and name of the survey123 form
        for (let i = 0; i < surveyList.length; i++) {
          let form = surveyList[i];
          // Add to the admin App object to store this info
          adminApp.deployment.survery123Forms[form.title] = form.id;
          // Add the titles to the options list in the form.
          $('<option/>').val(form.id).text(form.title).appendTo('#survey123-forms');
        }
        // Hide loading indicator
        adminApp.domElems.s123Loading.hide();
      }
      else {
        $('<option/>').val("enter-manually").text("No Forms Found, Enter Form ID Manually").appendTo('#survey123-forms');
        // Hide loading indicator
        adminApp.domElems.s123Loading.hide();
      }
    }
  })
  .fail(function(error){
    e("Error returned on search for Survey123 Forms", error);
  });
}

/**
 * Related function to buildSurvey123FormsList(), in the deployment form, the user can choose to manually enter an
 * ID for a S123 form. This could be due to the S123 form sitting under a different account than theirs.
 * The user initiates this by selecting "Enter Manually" in the form.
*/
$('#survey123-forms').on('change', function() {
  const $this = $(this);
  // On enter manually, reset and show the form id field
  if ($this.val() == "enter-manually") {
    adminApp.domElems.s123FormID.val("");
    adminApp.domElems.s123FormIDGroup.show();
  }
  // On auto fill, don't show the field and update the value to the form id.
  else {
    adminApp.domElems.s123FormID.val($this.val());
  }
});

// -----------------------------------------------------------------------------------------
// Deploy the system Functionality
// Functions used when the user hits the submit button on a new Āwhina Deployment form.
// -----------------------------------------------------------------------------------------


/**
 * NON ASYNC function to generate the unique id for a new deployment
 * This is used to create the folder for the deployment files on the server.
 * @returns  {string} result - the unique id.
*/
function generateDeploymentID(){
  $.ajax({
    async: false,
    url: adminApp.config.serverURL + "/generateDeploymentID",
    method:"POST",
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    data: {
      token: adminApp.user.token
    }
  })
  .done(function(result){
    return result;
  })
  .fail(function(error){
    errorReport(error, "generateDeploymentID");
  });
}


/**
 * Post the deployment config to the admin app dataset in the enterprise portal.
 * Then continues on with deployment by initiating the deployAwhina function
*/
function addDeploymentRecordToTable(){
  const postData = JSON.stringify([{"attributes": adminApp.deployment.config}]);
  $.ajax({
    url: adminApp.config.layerURL + "/addFeatures/query?token=" + adminApp.user.token,
    method:"POST",
    data: {
      f: "json",
      features: postData
    }
  })
  .done(function(result){
    if (result.error){
      errorReport(result.error, "Form Submission");
    }
    else {
      // Add OID to depCon
      adminApp.deployment.config.objectid = result.addResults[0].objectId;
      postToLog('Deployment record uploaded to dataset.\n');
      // Refresh table and listen for deployment execution
      loadDataESRI();
      startAwhinaDeployment(adminApp.config, adminApp.user, adminApp.deployment.config);
    }
  })
  .fail(function(error){
    errorReport(error, "Form Submission");
  });
}

/**
 * Starts the deployment of Āwhina by setting up the values from the user form.
*/
function startAwhinaDeployment(){
  postToLog('\n################# Starting deployment process #################\n');
  try {
    // Close the form modal (reset form when the full deployment finishes...)
    $('.modal-backdrop').hide();
    $("#generate-modal").hide();
    // Show the logging window
    adminApp.domElems.logging.logFileDiv.show();
    // Remove any folder and group values of depCon
    adminApp.deployment.config.folder = '';
    adminApp.deployment.config.group = '';
    // Split welfare groups into array and add 'MAIN' - MAIN group will have access to everything for the CDEM Group deployment.
    // Also add the Survey123 group as well.
    adminApp.deployment.config.welfaregroups = adminApp.deployment.config.welfareneeds.split(", ");
    adminApp.deployment.config.welfaregroups.push('MAIN')
    adminApp.deployment.config.welfaregroups.push('Survey123')
    /**
     * Start the cascade of async requests.
     * Some functions that require information returned for sub functions are 
     * set to finish via promise chains before going to the next task.
     * Load up the s123 dataset from the selected S123 ID.
    */
    findDatasetForS123Form(adminApp.deployment.config.surveyformid);
  }
  catch (error) {
    errorReport(error, "deployAwhina");
  }
}


/**
 * Finds the s123 form dataset from the survey123 form id
 * @param  {} id - The s123 form id selected in the deployment form.
 * @returns  {} s123Dataset - The returned value, a successful return
 * will include the id, url and title of the dataset
 * A unsuccessful return will contain {error: true}
*/
 function findDatasetForS123Form(id){
  $.ajax({
    url: adminApp.config.portalURL + "/sharing/rest/content/items/" + id + "/relatedItems",
    method:"GET",
    data: {
      relationshipType: 'Survey2Service',
      direction: 'forward',
      f: "json",
      token: adminApp.user.token,
    }
  })
  .done(function(result){
    // Check for error returned by ESRI
    if (result.error){
      errorReport(result.error, "getS123DatasetFromForm");
    }
    // If succesfull, parse the returned info and pull out the dataset information.
    else {
      if (result.relatedItems.length == 1){
        adminApp.deployment.config.featureservice = {
          id: result.relatedItems[0].id,
          url: result.relatedItems[0].url + "/0",
          title: result.relatedItems[0].title.replace(/ /g,'_'),
          servicename: result.relatedItems[0].name
        };
        // Add the dataset to the list of items to move into the project folder in Enterprise
        adminApp.deployment.config.itemstomove.push(result.relatedItems[0].id);
        // Update the max record count of the main layer
        postToLog('Updating the main layer max record count to 10,000 and max feature views to 160.\n');
        updateMaxRecordViews();
      }
      // If the related search fails by returning more than one related item (it shouldn't ever), return an error value.
      else {
        adminApp.deployment.config.featureservice = {
          id: "",
          url: "",
          title: ""
        };
        errorReport("No related dataset found for the selected Survey123 Form.", "getS123DatasetFromForm");
      }
    }
  })
  .fail(function(error){
    adminApp.deployment.config.featureservice = {
      id: "",
      url: "",
      title: ""
    };
    errorReport(error, "getS123DatasetFromForm");
  });
}

/**
 * Update the main feature service to be able to hold:
 * - 10000 records - this ensures that it is not overloaded
 *   with it's fairly small 1000 record limit. All feature views have this set in their definition update.\
 * - 160 feature views - maximum number that would be required.
*/
function updateMaxRecordViews(){
  try {
    $.ajax({
      url: adminApp.deployment.config.featureservice.url
           .replace(/rest/g, 'rest/admin').replace("/0", "") + "/updateDefinition",
      method:"POST",
      data : {
        f: "json",
        token: adminApp.user.token,
        updateDefinition : '{"maxRecordCount" : 10000, "maxViewsCount" : 160}',
      }
    })
    .done(function(result){
      if(result.error){
        errorReport(result.error, "updateMaxRecCount");
      } else {
        postToLog('Max record count and max feature views of the main layer updated.\n');
        // Proceed with the processing
        buildUpdateFieldConfig(adminApp.config.fieldSchemaURL);
      }
    })
    .fail(function(error){
      errorReport(error, "updateMaxRecCount");
    });
  } catch (error) {
    errorReport(error, "updateMaxRecCount");
  }
}

/**
 * Update the main layer fields to include the information required to set what fields will be added to what feature views.
 * This information is hosted in the description of the field properties in enterprise.
 * This only works for fields that have previously been defined, if a new field is added that is not in the 
 * field configuration list, the admin user will have to use the edit functionality to add it in after deployment to
 * update the fields.
 * @param  {} schemaURL - URL to the file
*/
 function buildUpdateFieldConfig(schemaURL){
  postToLog('\nBuilding the field schema and updating the field descriptions of the main layer.\n');
  let definedFields = [];
  let undefinedFields = [];
  $.ajax({
    dataType: "json",
    url: schemaURL
  })
  .done(function(result){
    // Get the service and check what fields need to be added in.
    getService(false)
    .done(function(serviceResult){
      serviceFields = serviceResult.fields;
      for (let i = 0, len = serviceFields.length; i < len; i++) {
        // For each field in the service, check if it is in the field config schema,
        // If so, define the field in the format required for ESRI Enterprise.
        // If not, mark it for requiring an update by the admin user.
        const serviceField = serviceFields[i];
        if (result[serviceField.name]){
          const schemaField = result[serviceField.name];
          definedFields.push({
            name: serviceField.name,
            alias: schemaField.alias,
            visible: true,
            description: {
              fieldValueType: "",
              value: {
                includeIn: schemaField.includeIn,
                visibleIn: schemaField.visibleIn
              }
            }
          });
        }
        else {
          undefinedFields.push(serviceField);
        }
      }
      l(definedFields);
      l(undefinedFields);
      // If there are undefined fields, alert the admin user and create/open the table for them to update.
      if (undefinedFields.length >= 1){
        adminApp.editing.fields = buildFieldProperties(undefinedFields);
        adminApp.editing.row = adminApp.deployment.config;
        const depFieldText = undefinedFields.length + " field(s) do not have a valid schema.<br>" + 
                            "These will need to be updated in the next step.<br>" + 
                            "This process ensures the fields show up in the correct feature views."
        adminApp.domElems.deploymentFields.text.html(depFieldText);
        // Remove any old update field info
        adminApp.editing.updatefields = [];
        // Show the alert pop up notifying the user to update the fields
        // On click of the button in the popup - start the field update workflow.
        adminApp.domElems.deploymentFields.container.show();
        // Ensure correct buttons show.
        $("#dep-field-edit-form-btn").show();
        $("#dep-field-continue-btn").hide();
        // After updates are completed, user can click on the continue deployment button to continue...
        $("#dep-field-continue-btn").click(function() {
          l(definedFields);
          updateFieldInformation(definedFields);
        });
      }
      // If there are no fields required to update manually by the admin,
      // update the defined fields into the main data layer.
      else {
        updateFieldInformation(definedFields);
      }
    });

  })
  .fail(function(error){
    e(error);
  });
}

/**
 * Upload the schema to the main dataset - now all feature views will contain the proper fields.
 * @param  {array} fieldsList - list of field description properties.
*/
function updateFieldInformation(fieldsList){
  // Hide the popup for undefined fields.
  adminApp.domElems.deploymentFields.container.hide();

  $.ajax({
    url: adminApp.deployment.config.featureservice.url.replace("rest/services", 'rest/admin/services') + "/updateDefinition?token=" + adminApp.user.token,
    method:"POST",
    data: {
      "updateDefinition": JSON.stringify({
        fields: fieldsList
      }),
      f: "json"
    }
  })
  .done(function(result){
    if (result.error){
      l(result.error);
    }
    else {
      postToLog('Field descriptions of main layer updated successfully.\n');
      getService(true);
    }
  })
  .fail(function(error){
    e(error);
  });
}

/**
 * Return the config for the main feature service, then parse the information found
 * in the field descriptions to set up the layers created off of it.
 * if a field has includeIn: ["household goods", "shelter and accommodation"] - the field will only be added to
 * those two feature views.
 * This will then enable the 'portal' view of the system to identify what feature view the fields should be in.
 * After the service config is returned and the field properties are formatted in buildFieldProperties,
 * we check if the featureviews need to be split up under each CDEM Group then start generating the feature views.
 * @param  {} nextStep - if the getService function needs to move onto the next deployment step, set to true.
 * @param  {boolean} editing - is this being used for editing? Pass this value into the next function.
*/
function getService(nextStep, editing=false){
  try {
    if(nextStep){postToLog('\nRequesting main layer configuration from server.\n')};
    return $.ajax({
      url: adminApp.deployment.config.featureservice.url,
      method:"GET",
      data :{
        f: "json",
        token: adminApp.user.token
      }
    })
    .done(function(result) {
      if(result.error){
        errorReport(result.error, "getService");
      }
      else {
        if(nextStep){
          postToLog('Config information received, updating the field properties.\n');
          // Build the field properties
          adminApp.deployment.templateProperties = buildFieldProperties(result.fields);
          // Depending on the CDEM Groups and settings, create welfare need feature views per CDEM or not.
          // Split the SHORTHAND names for the cdem groups and remove the CDEM part at
          // the end "WGN CDEM" => ["WGN"] OR "WGN, AUK CDEM" to ["WGN", "AUK"].
          const cdemGroups = adminApp.deployment.config.cdemgroupsshort.replace(" CDEM", "").split(", ");
          postToLog('\nGenerating feature views for ' + cdemGroups.join(", ") + '\n')
          buildFeatureViews(cdemGroups, editing);
        }
      }
    })
    .fail(function(error){
      errorReport(error, "getService");
    });
  }
  catch (error) {
    errorReport(error, "getService");
  }
}

// Sub functions for getService ---------------------
// (outside of getService function due to also being used in editing workflow)

/**
 * Generate the field properties for the system.
 * @param  {} fields - array of fields from the main S123 dataset used for the application.
*/
function buildFieldProperties(fields){
  try {
    const properties = [];
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      let x = {
        value: field.name,
        subset: setSubset(field),
        alias: field.alias,
        editable: field.editable,
        fieldtype: field.type,
        domain: field.domain,
        defaultval: field.defaultValue,
        length: field.length,
        nullable: field.nullable,
        descriptionInfo: setDescInfo(field)
      }
      properties.push(x)
    }
    postToLog('Field properties have been updated to conform to the Āwhina 2.0 protocol.\n');
    return properties;
  }
  catch (error) {
    errorReport(error, "buildFieldProperties");
  }
}

/**
 * Identifies what feature views the field will be included in.
 * This comes from the field description where a small string of JSON is set.
 * @param  {} field - The single field instance from the S123 dataset properties.
*/
function setSubset(field){
  try {
    let subset = ['all'];
    if (field.description){
      const d = JSON.parse(field.description);
      if (d.value){
        // Try here to get around any issues
        try {
          const description = JSON.parse(d.value);
          if (description.includeIn){
            subset = description.includeIn;
          }
        } catch (error) {
          postToLog("\nError in setting subset of field '" + field.name + "'. Field will show in ALL fields:\n", error + "\n");
        }
      }
    }
    return subset
  }
  catch (error) {
    errorReport(error, "setSubset");
  }
}

/**
 * This carries over the field description contents in the main S123 dataset
 * To the field description in the feature views being created. Ensuring the information held
 * within is not lost.
 * @param  {} field - The single field instance from the S123 dataset properties.
*/
function setDescInfo(field){
  try {
    if (field.description){
      const d = JSON.parse(field.description);
      if (d.value){
        try {
          return JSON.parse(d.value)
        }
        catch (error) {
          postToLog("\nError in setting the description information for field '" + field.name + "'. Field will show in ALL fields:\n", error + "\n");
          return null
        }
      }
    }
    return null
  }
  catch (error) {
    errorReport(error, "setDescInfo");
  }
}

/**
 * Builds the different feature views required for the system.
 * 
 * Main processing steps:
 * 1. Iterates over the number of CDEM Groups by a number defined as the maxGroupIteration.
 *    So if maxGroupIteration = 2 and there are 5 groups it will iterate like this: [1,2], [3,4], [5].
 *    (This is done to ensure the server is able to create the required feature views without returning an error.)
 *    If a single group is iterated over or multiple CDEM Groups that are sharing feature views, then 
 *    it will iterate only once [1].
 *    This processing is synchronous and will wait for batch 1 ([1,2]) to resolve before moving onto batch 2 ([3,4]) etc.
 * 
 * 2. Now iterate over each batch of CDEM groups and start creating the feature views.
 *    The iteration of CDEM Groups is asynchronous and will generate the layerviews for each
 *    batch at the same time. HOWEVER, the actual welfare layers are synchronous (stops server locking of main datalayer).
 *    As an example:
 *      - 1st CDEM Group Household Goods Layer & 2nd CDEM Group Household Goods Layer are created at the same time.
 *        ONCE COMPLETE:
 *      - 1st CDEM Group Accommodation Layer & 2nd CDEM Group Accommodation Layer are created at the same time.
 *        ONCE COMPLETE:
 *      - Looping continues until all required feature views are constructed for that batch.
 * 
 * 3. Once all layers are complete for the batch of CDEM Groups, a promise resolves
 *    and tells the processing to move onto the next batch of CDEM Groups.
 *    Once all CDEM Group batches have resolved the creation of feature views has completed and
 *    the script moves onto the next task.
 * 
 * This is a complex structure with non straight forward sync/async promise chaining and looping (SORRY!).
 * However, it is the only way I have found to iterate over all possible combinations of CDEM Groups and feature views
 * that does not cause the processing to error out due to a lock on the main data layer OR move onto the next step of the 
 * processing before the layers have been created and updated.
 * (Big no no - can cause the deployment to state it is complete before all feature views are created.)
 * 
 * @param  {string} cdemGroups - CDEM Groups in selected deployment.
 * @param  {boolean} editing - is this being used for editing? If not, move onto the next function.
*/
function buildFeatureViews(cdemGroups, editing=false){
  try {
    // Define the layers to be created.
    let layerTypes = adminApp.deployment.config.welfaregroups;
    // Add in registration to layers if not included
    if (!layerTypes.includes("Registration")){
      layerTypes.push("Registration");
    }
    // Remove the Survey123 option from the layer as it should not be generated as a layer.
    layerTypes = layerTypes.filter(item => item !== "Survey123");

    // If the group option is set to grouped or not selected for all CDEM's
    // create single feature views for all groups (1 household goods featureview for everyone to use etc).
    // Otherwise, each group will have a full set of layers, including a 'MAIN' data layer for the CDEM Group.
    if (adminApp.deployment.config.cdemUserRestrictions != "not-grouped"){
      cdemGroups = [cdemGroups.join(",")];
    }

    // maxGroupIteration defines the size of the CDEM Group batches to iterate over.
    const maxGroupIteration = adminApp.deployment.maxGroupIteration;
    if (cdemGroups.length >= 2){
      postToLog("Feature views will be created for " + maxGroupIteration + " CDEM Groups at a time.\n");
    }

    (async function groupLoop() {
      // The array that will hold the promises for each batch. When all promises in this array resolve,
      // move onto the next deployment step.
      const batchPromises = [];
      for (let i = 0, j = cdemGroups.length; i < j; i += maxGroupIteration) {
        batchPromises.push(await new Promise((resolve, reject) => {
          cdemGroupBatch = cdemGroups.slice(i, i + maxGroupIteration);
          postToLog("\nStarting feature creation for: " + cdemGroupBatch.join(", ") + " CDEM Group(s)\n");
          // Create a promise array for the entire chain of events - this sits outside the loop across CDEMs
          // and is the one that must resolve before moving on to the next batch.
          const cdemPromises = [];
          for (let i = 0; i < cdemGroupBatch.length; i++) {
            const cdemGroup = cdemGroupBatch[i];
            cdemPromises.push(new Promise((resolve, reject) => {
              // Now for each welfare need type + registration and the main data layer, await for each loop to
              // complete before moving onto the next.
              (async function layerLoop() {
                // Define the promise array that will hold the promises for each welfare need
                const promises = [];
                // Go through welfare needs per cdemGroup/merged cdemGroups and build the layers
                for (let i = 0; i < layerTypes.length; i++){
                  // Define the layer details
                  const [fName, fDesc, viewDefQ] = defineLayerDetails(cdemGroup, layerTypes[i]);
                  // Please leave as is - this is a complex promise chain.
                  promises.push(await new Promise((resolve, reject) => {
                    let serviceURL = "";
                    // Create the service
                    postToLog('Creating feature view: "' + fName + '"\n');
                    createFeatureView(fName, fDesc, layerTypes[i], cdemGroup).done(function(createFVResult){
                      serviceURL = createFVResult.serviceurl;
                      // Then add the definition to it (creates the link to the main dataset + some other layer configs.)
                      addDefToFeatureView(serviceURL, fName).done(function(addDefResult){
                        // Sometimes this still locks, so try once again.
                        if (addDefResult.error){
                          addDefToFeatureView(serviceURL, fName).done(function(addDefResult2){
                            // If it still fails then the process does not continue.
                            if (addDefResult2.error){
                              errorReport(addDefResult2.error, "addDefToFeatureView: " + fName);
                            }
                            // If it succeeds then the process continues.
                            else {
                              // Set what fields should show in the layer
                              setFieldsDefQView(serviceURL, layerTypes[i], viewDefQ, fName).done(function(setFieldsResult){
                                postToLog('Created feature view: "' + fName + '"\n');
                                // Resolve the promise sitting in the promises array
                                resolve(setFieldsResult);
                              })
                            }
                          })
                        }
                        // If it succeeds first try, the process continues.
                        else {
                          // Set what fields should show in the layer
                          setFieldsDefQView(serviceURL, layerTypes[i], viewDefQ, fName).done(function(setFieldsResult){
                            postToLog('Created feature view: "' + fName + '"\n');
                            // Resolve the promise sitting in the promises array
                            resolve(setFieldsResult);
                          })
                        }
                      })
                    })
                  }));
                }
                // When the feature views for the CDEM Group batch are completed,
                // resolve the promise for that loop of the views and move onto the next loop of views.
                $.when.apply($, promises).done(function(){
                  resolve()
                });
              })();
            }));
          }
          // When all required views for that batch of CDEM Groups have been created,
          // move onto the next batch of CDEM Groups.
          $.when.apply($, cdemPromises).done(function(){
            resolve();
          })
        }));
      }
      // When all CDEM Groups batches have completed, move onto the next processing step.
      $.when.apply($, batchPromises).done(function(){
        // After the layers have been created, build the required dashboards
        // If this is not for editing and being deployed, move on to building dashboards
        if (!editing){
          buildDashboards();
        }
        else {
          // If this is for an edit to an existing deployment, resolve the promise.
          return {success: true};
        }
      })
    })();
  }
  catch (error) {
    errorReport(error, "buildFeatureViews");
  }
}

// ------------------------------------------------------------------------------
// Sub Functions for buildFeatureViews 
// ------------------------------------------------------------------------------
/**
 * Create the name, description and view definition query for the layer to be created
 * @param  {string} cdemGroup - the CDEM Group for the layer
 * @param  {string} layerType - the type of layer to be created.
 * @returns  {array} fName, fDesc, viewDefQ - feature name, description and definition query
*/
function defineLayerDetails(cdemGroup, layerType){
  const fName = adminApp.deployment.config.project + " " + cdemGroup + " " + layerType;
  const fDesc = "Āwhina Welfare Deployment " + layerType + " Group for the event: " +
              adminApp.deployment.config.project + ". Under CDEM Group(s): " + cdemGroup;
  const fullCDEMNames = returnCDEMFullName([cdemGroup]);
  let viewDefQ = "";
  // Define the definition query for the layer
  if (layerType != 'Registration' && layerType != 'MAIN'){
    viewDefQ = adminApp.lookups.viewDefMatch[layerType] + " AND cdemgroup IN ('" + fullCDEMNames.join('','') + "')";
  } else {
    viewDefQ = "cdemgroup IN ('" + fullCDEMNames.join('','') + "')";
  }
  return [fName, fDesc, viewDefQ];
}

/**
 * Create an empty feature view
 * Once done, push the layer information into the deployment config.
 * @param  {string} fName - layer name.
 * @param  {string} fDesc - layer description.
 * @param  {string} layerType - the type of layer to be created.
 * @param  {string} cdemGroup - the CDEM Group for the layer
 * @returns  {$} ajax - returns a deferred ajax query.
*/
function createFeatureView(fName, fDesc, layerType, cdemGroup){
  try {
    // Create the feature views required for the new system.
    const cParams = JSON.stringify({
      name: fName.replace(/[^a-z0-9]/gi, '_'),
      serviceDescription: "",
      description: fDesc,
      summary: "Āwhina Welfare System Layer.",
      maxRecordCount: 10000,
      supportedQueryFormats: "JSON",
      hasStaticData: false,
      capabilities: "Create,Editing,Query,Update,Uploads,Delete,Sync,Extract",
      allowGeometryUpdates: true
    });
    return $.ajax({
      url: adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/createService",
      method:"POST",
      data :{
        token: adminApp.user.token,
        createParameters: cParams,
        isView: true,
        outputType: "featureService",
        f: "json"
      }
    })
    .done(function(result){
      if(result.error){
        errorReport(result.error, "createFeatureView");
      }
      else {
        const x = {"welfareType": layerType, "group": cdemGroup, "itemId": result.itemId, "serviceurl" : result.serviceurl+"/0"};
        adminApp.deployment.config.layerviews.push(x);
        // Add the layer ids to the list of items to move
        adminApp.deployment.config.itemstomove.push(result.itemId);
        // Update the feature view to contain the fields, data and query
      }
    })
    .fail(function(error){
      errorReport(error, "createFeatureView");
    });
  }
  catch (error) {
    errorReport(error, "createFeatureView");
  }
}
/**
 * Add the definition to the created feature view and link it to the main dataset.
 * @param  {string} serviceURL - url to the feature view previously created.
 * @param  {string} fName - the name of the feature view.
 * @returns  {$} ajax - returns a deferred ajax query.
*/
function addDefToFeatureView(serviceURL, fName){
  try {
    // Build the rest of the layer details for the addToDefinition params
    const addParams = {
      layers: [
        {
          id:0,
          name: adminApp.deployment.config.featureservice.title.replace(/ /g,'_'),
          type: "Feature Layer",
          displayField: "names",
          capabilities: "Create,Editing,Query,Update,Uploads,Delete,Sync,Extract",
          supportsApplyEditsWithGlobalIds: true,
          serviceItemId: adminApp.deployment.config.featureservice.id,
          sourceSchemaChangesAllowed: true,
          isUpdatableView: true,
          url: adminApp.deployment.config.featureservice.url,
          adminLayerInfo:{
            viewLayerDefinition:{
              sourceServiceName: adminApp.deployment.config.featureservice.servicename,
              sourceLayerId: 0,
              sourceLayerFields: "*",
            }
          }
        }
      ]
    };

    return $.ajax({
      url: serviceURL.replace("rest/services", 'rest/admin/services') + "/addToDefinition",
      method:"POST",
      data: {
        addToDefinition: JSON.stringify(addParams),
        f: "json",
        token: adminApp.user.token
      }
    })
    .fail(function(error){
      errorReport(error, "addDefToFeatureView: " + fName);
    });
  }
  catch (error) {
    errorReport(error, "addDefToFeatureView: " + fName);
  }
}
/**
 * Update the view with the fields it will contain and the definition query.
 * Fields are chosen from the main feature layer.
 * Each field description in the main feature layer contains the information
 * on what fields should be added to each feature view.
 * @param  {string} serviceURL - the layer URL.
 * @param  {string} layerType - type of layer being updated.
 * @param  {string} viewDefQ - Definition query of the layer (filter what data it will contain).
 * @param  {string} fName - layer name.
 * @returns  {$} ajax - returns a deferred ajax query.
*/
function setFieldsDefQView(serviceURL, layerType, viewDefQ, fName){
  try {
    // Set if the fields are added to the feature views there alias and if visible in the feature views.
    // Pull the required fields from the main layer that will be included for the type of welfare need being generated.
    let fvFields = [];
    $.each(adminApp.deployment.templateProperties, function(index, value){
      // Need this here as registration is not a table view in the portal.
      if (layerType == "Registration"){
        if (value.subset && value.subset.some(r=> ["overview", "requestor", "notes", "all", "system"].includes(r))){
          fvFields.push({name: value.value, visible: true, description:{fieldValueType:"", value: value.descriptionInfo}, domain: value.domain});
        }
        else {
          fvFields.push({name: value.value, visible: false});
        }
      }
      else if (layerType == "MAIN"){
        fvFields.push({name: value.value, visible: true, description:{fieldValueType:"", value: value.descriptionInfo}, domain: value.domain});
      }
      else {
        // Now do the welfare types - add the fields that also are defined as "all" too.
        if (value.subset && value.subset.some(r=> [adminApp.lookups.indexMatch[layerType], "all"].includes(r))){
          fvFields.push({name: value.value, visible: true, description:{fieldValueType:"", value: value.descriptionInfo}, domain: value.domain});
        } else {
          fvFields.push({name: value.value, visible: false});
        }
      }
    });
    
    return $.ajax({
      url: serviceURL.replace("rest/services", 'rest/admin/services') + "/0/updateDefinition",
      method:"POST",
      data: {
        "updateDefinition": JSON.stringify({
          viewDefinitionQuery: viewDefQ,
          fields: fvFields
        }),
        f: "json",
        token: adminApp.user.token
      },
      dataType: "json",
    })
    .done(function(result){
      if(result.error){
        errorReport(result.error, "setFieldsFeatureView: " + fName);
      }
    })
    .fail(function(error){
      errorReport(error, "setFieldsFeatureView: " + fName);
    });
  } catch (error) {
    errorReport(error, "setFieldsFeatureView: " + fName);
  }
}

// ------------------------------------------------------------------------------
// END OF Sub Functions for buildFeatureViews 
// ------------------------------------------------------------------------------

/**
 * Gets the dashboard template under getDashboard() and then from the returned JSON,
 * create ESRI dashboards for either each CDEM or the grouped CDEMs.
*/
function buildDashboards(){
  try {
    postToLog('\nLoading ESRI dashboard config\n');
    // Load ESRI dashboard config file
    getDashboard()
    .done(function(result){
      // See what CDEM Groups need dashboards created for them.
      let cdemGroups = adminApp.deployment.config.cdemgroupsshort.replace(" CDEM", "").split(", ");
      if (adminApp.deployment.config.cdemUserRestrictions != "not-grouped"){
        cdemGroups = [cdemGroups.join(",")];
      }
      // We want all dashboards to be created before continuing to the next process.
      let promises = [];
      for (let i = 0; i < cdemGroups.length; i++) {
        promises.push(new Promise((resolve, reject) => {
          postDashboard(result, cdemGroups[i])
          .done(function(postResult){
            resolve(postResult);
          });
        }));
      }
      // When all dashboards are created:
      $.when.apply($, promises).done(function(){
        deployFolderInEnt();
      });
    })
  }
  catch (error) {
    errorReport(error, "buildDashboards");
  }
}
/**
 * Get the dashboard JSON file that comprises how the dashboard should be setup
 * and return it.
*/
function getDashboard(){
  return $.ajax({
    url: adminApp.config.dashboardJSON,
    dataType: "json",
  })
  .done(function(result){
    postToLog('Dashboard config loaded.\n');
  })
  .fail(function(result){
    errorReport(result, "buildDashboards")
  });
}
/**
 * Create the dashboard for the input CDEM Group or merged groups.
 * @param  {jsonObject} dashboard - JSON containing the configuration for the dashboard.
 * @param  {string} cdemGroup - CDEM Group to create the dashboard for.
 * @param  {boolean} editing = false - if this is an editing update process, skip the dashboard creation.
 * @returns  {promise} - returns either a resolved promise if editing is true, or a deferred promise that resolves
 *                      on creation of the dashboard.
*/
function postDashboard(dashboard, cdemGroup, editing=false){
  try {
    // If editing is true, then an update to the deployment is occuring and this should be skipped.
    if (!editing){
      // Determine the layer to link to the dashboard:
      const layers = adminApp.deployment.config.layerviews;
      let dashboardLayer = '';
      layers.forEach(layer => {
        if (layer.welfareType == 'Registration' && layer.group == cdemGroup){
          dashboardLayer = layer.serviceURL;
        }
      })
      // Update title, convert the dashboard JSON to text and update the feature layer id to the
      // registration layer for that CDEM Group
      dashboard.headerPanel.title = adminApp.deployment.config.project + " - Āwhina Welfare Needs Assessment Dashboard";
      dashboard = JSON.stringify(dashboard);
      dashboard.replace(/FEATURESOURCE/g, dashboardLayer);
      let dashTitle = adminApp.deployment.config.project + " - " + cdemGroup + " Āwhina Dashboard";
      // Post it
      return $.ajax({
        url: adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/addItem",
        method:"POST",
        data : {
          type: "Dashboard",
          title: dashTitle,
          description: "Operations Dashboard for " + adminApp.deployment.config.project,
          typeKeywords:"Dashboard,Operations Dashboard",
          text: dashboard,
          tags: "Āwhina," + adminApp.deployment.config.project,
          commentsEnabled: false,
          f: "json",
          token: adminApp.user.token,
        },
        dataType: "json"
      })
      .done(function(result){
        if(result.error){
          errorReport(result.error, "postDashboard");
        }
        else {
          postToLog('Dashboard created for CDEM Group: "' + cdemGroup + '"\n');
          // Add the config
          adminApp.deployment.config.dashboards.push({"group": cdemGroup, "id": result.id, "title": dashTitle});
          // Add the dashboard id to the list of items to move
          adminApp.deployment.config.itemstomove.push(result.id);
        }
      })
      .fail(function(error){
        errorReport(error, "postDashboard");
      });
    }
    // If this is an update, the creation of the dashboard should be skipped - return a resolved promise
    return {success: true};
  }
  catch (error) {
    errorReport(error, "postDashboard");
  }
}

/**
 * Creates a single folder to store the dataset, feature views, dashboards and S123 form in Enterprise.
 * If a user has selected multi CDEM Group deployment with CDEM Groups NOT sharing data, all data is
 * STILL held in one single folder.
 * Since the folder can already exist, it will first check for it, then if not found create it.
 * If it does exist, it will add the folder item id into the deployment config and use it for the rest
 * of the processing.
*/
 function deployFolderInEnt(){
  try {
    const uri = adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username);
    $.ajax({
      method: "GET",
      url: uri,
      data: {
        f: "json",
        token: adminApp.user.token,
      },
      dataType: "json"
    })
    .done(function(result){
      if(result.error){
        errorReport(result.error, "returnFolders");
      }
      else {
        folderResults = result.folders
        // See if any returned folders match the one we wanted to create.
        reqResult = folderResults.filter(folderResult => folderResult.title === adminApp.deployment.config.project + " - Āwhina Welfare - " + adminApp.deployment.config.cdemgroupsshort);
        // If so, use the folder id for the deployment process and continue deployment.
        if(reqResult[0]){
          adminApp.deployment.config.folder = reqResult[0];
          postToLog('\nExisting folder found for deployment - all data items will be moved into it.\n');
          moveESRIItems();
        }
        // If not, create the folder in enterprise.
        else {
          postToLog('\nNo existing folder found - creating new folder.\n');
          createFolder();
        }
      }
    })
    .fail(function(error){
      errorReport(error, "returnFolders");
    });
  }
  catch (error) {
    errorReport(error, "returnFolders");
  }
}

/**
 * Generate the folder in the enterprise environment.
*/
function createFolder(){
  $.ajax({
    method: "POST",
    url: adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/createFolder",
    data: {
      f: "json",
      title: adminApp.deployment.config.project + " - Āwhina Welfare - " + adminApp.deployment.config.cdemgroupsshort,
      description: "Āwhina Welfare Deployment folder for the event: " + adminApp.deployment.config.project + ". Under CDEM Groups: " + adminApp.deployment.config.cdemgroupsshort,
      tags: "Āwhina, Welfare",
      token: adminApp.user.token,
    },
    dataType: "json"
  })
  .done(function(result){
    if(result.error){
      errorReport(result.error, "createFolder");
    }
    else {
      adminApp.deployment.config.folder = result.folder;
      postToLog('New folder in emergencymanagement portal created.\n');
      // Continue to the next process.
      moveESRIItems();
    }
  })
  .fail(function(error){
    errorReport(error, "createFolder");
  });
}

/**
 * Move all created items (including the Survey123 and Main data layer)
 * to the created folder.
 * A promise array is used to ensure that all items are moved
 * before continuing with the next processing step.
*/
function moveESRIItems(){
  try {
    postToLog('\nMoving all created items in Enterprise to the Deployment Folder\n');
    let promises = [];
    let itemArr = adminApp.deployment.config.itemstomove;
    // Move the survey, feature layer, views and dashboard into the project folder
    for (let i = 0; i<itemArr.length; i++){
      const request = $.ajax({
        url: adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/items/" + itemArr[i] + "/move",
        method:"POST",
        data : {
          folder: adminApp.deployment.config.folder.id,
          f: "json",
          token: adminApp.user.token,
        }
      })
      .done(function(result){
        if(result.error){
          errorReport(result.error, "moveESRIItems");
        }
      })
      .fail(function(error){
        errorReport(error, "moveESRIItems");
      });
      promises.push(request);
    }
    // When all items moved to folder...
    $.when.apply(null, promises).done(function(){
      postToLog('Items moved into folder.\n\n');
      createGroups();
    })
  } catch (error) {
    errorReport(error, "moveESRIItems");
  }
}

/**
 * Create all required groups in the enterprise environment.
 * Depending on what settings were chosen, this can be one set of groups per CDEM Group
 * OR one set of groups for all CDEM Groups (combined).
 * promises are used to ensure all groups are created (under generateGroup function).
 * before moving onto the next process updateItemSharing().
*/
function createGroups(){
  let promises = [];
  try {
    // If only single CDEM group or if CDEM User Restrictions set to all viewable, just create one set of groups.
    // Else create a main group for each CDEM Group (Plus one for for the main dataset) and then split the welfare needs by CDEM.
    const cdemGFull = adminApp.deployment.config.cdemgroupsfull.split(", ")
    const welfareGroups = adminApp.deployment.config.welfaregroups;
    let cdemGroups = [];
    if (cdemGFull.length >= 2 && adminApp.deployment.config.cdemUserRestrictions == "not-grouped"){
      cdemGroups = adminApp.deployment.config.cdemgroupsshort.replace(" CDEM", "").split(", ");
    }
    else {
      cdemGroups = [adminApp.deployment.config.cdemgroupsshort];
    }
    for (let i = 0; i < cdemGroups.length; i++) {
      promises.push(generateGroups(welfareGroups, cdemGroups[i]));
    }
    $.when.apply(null, promises).done(function(){
      // When all groups created and items that need to be shared to them identified
      // Proceed with the next step.
      updateItemSharing(adminApp.deployment.config.esrigroups);
    })
  } catch (error) {
    errorReport(error, "createGroups");
  }
}

/**
 * For each CDEM Group (or all CDEM Groups as one), create the required groups in enterprise.
 * Two promises are used:
 *  1. Return the promise that signifies all layers have been created for that CDEM Group.
 *     The createGroups() function will then move onto the next CDEM Group.
 *  2. A sub promise array that ensures all the layers have been created before firing the resolve for promise 1.
 * When a group is created, a sub function is called (connectLayersToGroups)
 * That creates a link between the group and all items relevant to that group to it.
 * The next step in the processing shares the items to the groups.
 * @param  {array} welfareGroups - The list of groups to be created for each CDEM
 * @param  {string} cdemGroup = "" - The related CDEM Group for the enterprise groups.
*/
function generateGroups(welfareGroups, cdemGroup){
  // Return the promise to the main createGroups() function then resolve it when all enterprise
  // groups are created. Telling the main func to continue with next group.
  return new Promise((resolve, reject) => {
    let gDesc = "";
    const promises = [];
    for (i=0; i<welfareGroups.length; i++){
      let welfareGroup = welfareGroups[i];
      gName = adminApp.deployment.config.project + " - " + cdemGroup + " - " + welfareGroup;
      gDesc = "Āwhina Welfare Deployment " + welfareGroup + " Group for the event: " + adminApp.deployment.config.project + ". Under CDEM Group: " + cdemGroup

      // Promise for each enterprise group being created.
      promises.push(new Promise((resolve, reject) => {
        // If group already exists, no need to create it!
        existingGroup = adminApp.user.groups.filter(userGroup => userGroup.title === gName);
        if (existingGroup[0]){
          adminApp.deployment.config.esrigroups.push({id: existingGroup[0].id, title: existingGroup[0].title});
          postToLog('Enterprise Group already exists: "' + existingGroup[0].title + '"\n')
          // Resolve the inner promise here.
          resolve();
        }
        // If group does not already exist, create it.
        else {
          $.ajax({
            method: "POST",
            url: adminApp.config.portalURL + "/sharing/rest/community/createGroup",
            data: {
              f: "json",
              title: gName,
              description: gDesc,
              isInvitationOnly: true,
              tags: "Āwhina, Welfare, " + welfareGroup + ", " + adminApp.deployment.config.cdemgroupsshort,
              token: adminApp.user.token,
              access: "private"
            },
            dataType: "json"
          })
          .done(function(result){
            if(result.error){
              errorReport(result.error, "generateGroups");
            }
            else {
              postToLog('Created Enterprise Group: "' + result.group.title + '"\n');
              // Link the correct layers to the group generated - for sharing in updateItemSharing function.
              const groupItems = connectLayersToGroups(welfareGroup, cdemGroup);
              // Add the config information for this group
              adminApp.deployment.config.esrigroups.push({id: result.group.id, title: result.group.title, items: groupItems});
              // Add to user groups as well or issue arises if they redeploy in same session.
              adminApp.user.groups.push({id: result.group.id, title: result.group.title});
              resolve();
            }
          })
          .fail(function(error){
            errorReport(error, "generateGroups");
            reject();
          });
        }
      }));
    }
    // When all layers have been created for the CDEM Group
    $.when.apply(null, promises).done(function(){
      resolve();
    })
  })
}

/**
 * Creates the items that need to be shared to the input group.
 * @param  {string} welfareGroup - The created enterprise group type.
 * @param  {string} cdemGroup - The CDEM Group the layer is created under.
 * @returns  {array} - an array of enterprise item id's to be moved.
*/
function connectLayersToGroups(welfareGroup, cdemGroup){
  let layers = adminApp.deployment.config.layerviews;
  let groupItems = [];
  // Check what items need to be moved into the current group generated.
  for (i=0; i<layers.length; i++){
    let layer = layers[i];
    // For the 'MAIN' Enterprise Group for the CDEM, add all layers to it.
    if (welfareGroup == 'MAIN' && layer.group == cdemGroup.replace(" CDEM").replace(" ")){
      groupItems.push(layer.itemId);
    }
    else if (layer.welfareType == welfareGroup && layer.group == cdemGroup.replace(" CDEM").replace(" ")){
      groupItems.push(layer.itemId);
    }
  }
  // If the group is for the survey123 form, add the survey form (no matter what CDEM Group).
  if (["Survey123", "MAIN"].includes(welfareGroup)){
    groupItems.push(adminApp.deployment.config.surveyformid);
  }
  // If the group is registration add the dashboard
  let dashboards = adminApp.deployment.config.dashboards;
  for (i=0; i<dashboards.length; i++){
    if (["Registration", "MAIN"].includes(welfareGroup) && dashboards[i].group == cdemGroup.replace(" CDEM").replace(" ")){
      groupItems.push(dashboards[i].id);
    }
  }
  // Return the item id's
  return groupItems;
}

/**
 * Update sharing of layer, form and dashboard to the correct enterprise groups.
 * A promise array is used to ensure that all items are created before the next processing step.
 * @param  {array} entGroups - the enterprise groups, each group contains the id of the group
 *                             and an array of the items to share to it.
*/
function updateItemSharing(entGroups){
  try {
    postToLog("\nSharing items to ESRI Groups\n");
    const promises = [];
    // For each group, share the items to the group in enterprise.
    for (i=0; i<entGroups.length; i++){
      const groupID = entGroups[i].id;
      const groupItems = entGroups[i].items.join(",");

      const request = $.ajax({
        url: adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/shareItems",
        method:"POST",
        data : {
          everyone: false,
          items: groupItems,
          groups: groupID,
          f: "json",
          token: adminApp.user.token,
        },
        dataType: "json",
      })
      .done(function(result){
        if(result.error){
          errorReport(result.error, "updateItemSharing");
        }
      })
      .fail(function(error){
        errorReport(error, "updateItemSharing");
      });
      promises.push(request);
    }

    // Once all items are shared, move onto the next step
    $.when.apply(null, promises).done(function(){
      postToLog("All items shared to the correct groups.\n");
      // Create the config file for this deployment.
      generateProjectPortalConfig(adminApp.deployment.config, editing=false);
    })
  }
  catch (error) {
    errorReport(error, "updateItemSharing");
  }
}

// Create the json file used to setup the Āwhina portal
// TODO: change the config cdemGroup field to only be the CDEM Group it is actually under - currently has all CDEM Groups in it.
// TODO: Issue with layer urls not being for the correct cdem group - tied into issue above.
/**
 * Create the config file (.JSON) for the deployment currently being generated.
 * This will sit on the server in the deployment project folder and links to the deployment portal
 * to ensure the deployment portal functions correctly.
 * This is also used in the update process when things can change. This file will then write over itself in
 * the upload config process.
 * This file contains information that is unique to the deployment:
 * - Emergency Event Name
 * - Welfare Needs
 * - URL to the awhina deployment portal
 * - URL to the Survey123
 * - The CDEM Groups for the deployment and the layer URLS that sit under each CDEM.
 *   - Household Goods Layer URL.
 *   - Accommodation Layer URL etc.
 *   - Dashboard URL.
 * @param  {object} config - The deployment configuration
 *                     contains all information related to the deployment being created
*/
function generateProjectPortalConfig(config){
  let welfareNeeds = config.welfareneeds.split(", ");
  let layerViews = config.layerviews;

    // Define the config variables that do not change based on the CDEM Group settings
  let configInstance = {
    emergencyName: config.project,
    title: " Āwhina Welfare System - ",
    welfareNeeds: welfareNeeds,
    awhinaDeploymentURL: config.awhinadeploymenturl,
    portalURL: "https://awhina.emergencymanagement.govt.nz/portal",
    survey123URL: "https://survey123.arcgis.com/share/" + config.surveyitemid + "?portalUrl=https://awhina.emergencymanagement.govt.nz/portal",
    cdemGroups: {}
  }

  // For each CDEM group, identify the layers and dashboard that need to be in the config.
  let cdemGroups = adminApp.deployment.config.cdemgroupsshort.replace(" CDEM", "").split(", ");
  if (adminApp.deployment.config.cdemUserRestrictions != "not-grouped"){
    cdemGroups = [cdemGroups.join(",")];
  }
  for (let i = 0; i < cdemGroups.length; i++){
    const cdemDetails = constructCDEMDetails(cdemGroups[i], layerViews, config.dashboards)
    configInstance.cdemGroups[cdemDetails[0]] = cdemDetails[1];
  }
  // Set the configInstance to the deployment object.
  adminApp.deployment.config.portalconfig = configInstance;
  l(adminApp.deployment.config.portalconfig);
  // Update the record information in the dataset (this is the next processing step)
  // Leave as failed if an error has produced a failed result, otherwise set it to created.
  adminApp.deployment.config.status != "Failed" ? adminApp.deployment.config.status = "Created": "";
  updateDeploymentDetails(adminApp.deployment.config)
  // Once done complete the deployment.
  // TODO change to uploadConfig when able to test node.js server
  // .done(uploadConfig(configInstance));
  .done(completeDeployment());
  
}

/**
 * Construct the configuration for the layers and dashboards under each CDEM Group (or joined CDEM Groups).
 * @param  {string} cdemGroup - The CDEM Group that the details will be constructed for.
 * @param  {array} layerViews - the layer views for the deployment.
 * @param  {array} dashboards - the dasboards for the deployment.
 * @returns  {array} [cdemFullName, cdemDetails] - the setup configuration for the CDEM Group.
*/
function constructCDEMDetails(cdemGroup, layerViews, dashboards){
  // Construct the CDEM object with the layer urls object partially complete. We will fill these out with 
  // The registration layer urls (or the full dataset for 'all'). The welfare needs layers will be input in the next step.
  cdemFullName = returnCDEMFullName([cdemGroup]);
  let cdemDetails = {
    layerURLs: {},
    dashboardURL: "",
    cdemGroup: cdemFullName
  }

  // Get the group layers and put into an object
  for (let i = 0; i < layerViews.length; i++) {
    if (layerViews[i].group == cdemGroup){
      // Add in the main layer
      if (layerViews[i].welfareType == "MAIN"){
        cdemDetails.layerURLs.all = layerViews[i].serviceurl;
      }
      // Add in the layers that will use the registration layer
      else if (layerViews[i].welfareType == "Registration"){
        cdemDetails.layerURLs.overview = layerViews[i].serviceurl;
        cdemDetails.layerURLs.requestor = layerViews[i].serviceurl;
        cdemDetails.layerURLs.notes = layerViews[i].serviceurl;
        cdemDetails.layerURLs.system = layerViews[i].serviceurl;
      }
      // Now add in the welfare need layers, first match the welfareType
      // in the layer object to the key that will be used in the output
      else {
        const wType = Object.keys(adminApp.lookups.subtableMatch)
        .find(key => adminApp.lookups.subtableMatch[key] === layerViews[i].welfareType);
        cdemDetails.layerURLs[wType] = layerViews[i].serviceurl;
      }
    }
  }

  // Add the dashboard
  for (let i=0; i < dashboards.length; i++){
    if (dashboards[i].group == cdemGroup.replace(" CDEM").replace(" ")){
      cdemDetails["dashboardURL"] = "https://awhina.emergencymanagement.govt.nz/portal/apps/opsdashboard/index.html#/" + dashboards[i].id;
    }
  }
  return [cdemFullName, cdemDetails];
}

/**
 * Upload the config file to the deployment folder via the NON ESRI Enterprise REST API
 * (the custom node.js one).
 * This upload will overwrite any existing config file (such as for an update).
 * @param  {} config - deployment config information
*/
function uploadConfig(config){
  return $.ajax({
    url: adminApp.config.serverURL + "/createConfig",
    method:"POST",
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    data: {
      token: adminApp.user.token,
      projectName: encodeURI(config.project.replace(/\//g, '_')),
      config: config
    }
  })
  .done(function(result){
    if(result.error){
      errorReport(result.error, "uploadConfig");
    }
    else {
      l("Config uploaded");
      // createServerFiles();
    }
  })
  .fail(function(error){
    errorReport(error, "uploadConfig");
  });
}

// 
/**
 * Copies the template folder to create the files for the new deployment.
 * portal.html, portal.js, portal-worker.js
 * This is the custom node.js REST API
*/
function createServerFiles(){
  return $.ajax({
    url: adminApp.config.serverURL + "/createDeployment",
    method:"POST",
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    data: {
      token: adminApp.user.token,
      projectName: encodeURI(adminApp.deployment.config.project.replace(/\//g, '_'))
    }
  })
  .done(function(result){
    if(result.error){
      errorReport(result.error, "createServerFiles");
    }
    else{
      l("Server files created");
      completeDeployment();
    }
  })
  .fail(function(error){
    errorReport(error, "createServerFiles");
  });
}

/**
 * Complete the deployment by notifying the user via the log window.
*/
function completeDeployment(){
  // Change log colour to green
  adminApp.domElems.logging.logContainer.removeClass('alert-warning').addClass('alert-success');
  postToLog('\n\n-------------------------------------------------\n');
  postToLog('CREATION OF SYSTEM COMPLETE');
  postToLog('\n-------------------------------------------------\n');
}

/**
 * Updates the record held in the Awhina Administration data table in ESRI Enterprise.
 * This usually occurs on the following actions: Deployment (creating, success or fail) or editing.
 * Once complete, reload the admin table data from enterprise and refresh the bootstrap table.
 * @param  {object} config - the current deployment being updated. This may be a deployment being created or edited.
*/
 function updateDeploymentDetails(config){
  try {
    // Set the cdem groups to the field name in the admin table
    config.cdemgroups = config.cdemgroupsshort
    // If initial config does not exist create it.
    if(!config.initialconfig){
      config.initialconfig = JSON.stringify(config);
    }
    // Delete the duplicate initconfig
    let data = JSON.stringify(config);
    const postData = '[{"attributes":' + data + '}]';
    return $.ajax({
      url: adminApp.config.layerURL + "/updateFeatures/query?token="+adminApp.user.token,
      method:"POST",
      data: {
        f: "json",
        objectid: data.objectid,
        features: postData
      },
      dataType: "json"
    })
    .done(function(result){
      if(result.error){
        errorReport(result.error, "updateDeploymentDetails");
      }
      else if (result.updateResults[0].success){
        // Load the data in the table.
        loadDataESRI();
        // Now the deployment has completed, clear the form data
        $('#deployment-form')[0].reset();
        $('#generate-modal').hide();
        $('.modal-backdrop').hide();
      }
      else {
        errorReport(result.updateResults[0].error, "updateDeploymentDetails");
      }
    })
    .fail(function(error){
      errorReport(error, "updateDeploymentDetails");
    });
  }
  catch (error) {
    errorReport(error, "updateDeploymentDetails");
  }
}

// EDIT an Āwhina System -----------------------------------------------------------------------------------------------------

/**
 * PLEASE NOTE
 * DEVELOPMENT HAS STOPPED ON THE EDITING AND DELETING FUNCTIONALITY OF THE ADMIN APP
 * This was done to ensure all documentation was completed before the end of my contract.
 * Most of the editing functionality will need to be reviewed thouroghly and and require further testing
 * / coding changes to get working.
*/

// Update Field schema ---------------------------------------------------------------------------------

/**
 * Pull field information from main layer, then format into table to be manipulated.
 * User can update alias, what welfare need the field is visible under
 * and if it displays in the portal view of a welfare need
 * @param  {object} row - the selected row in the bootstrap table.
*/
function updateFieldSchemas(row){
  l(row);
  let fs = row.featureservice;
  // Return the fields from the dataset
  $.ajax({
    url: fs.url,
    method:"GET",
    data: {
      f: "json",
      token: adminApp.user.token,
    }
  })
  .done(function(result){
    if(result.error){
      errorReport(result.error, "updateFieldSchemas");
    }
    else {
      // Build the field properties
      adminApp.editing.fields = buildFieldProperties(result.fields);
      // Remove any old update field info
      adminApp.editing.updatefields =[];
      // Set the upload field button to disabled.
      $("#submit-field-edits-form").prop("disabled", true);
      // Create the field schema (buttons containing the field names) to be shown in the field editor
      buildUpdateFieldSchemaHTML(adminApp.editing.fields);
    }
  })
  .fail(function(error){
    errorReport(error, "updateFieldSchemas");
  });
}

/**
 * Creates a list of buttons with the field names as the text.
 * Used as part of the edit field function
 * @param  {array} fields - array of fields from the selected deployment.
*/
function buildUpdateFieldSchemaHTML(fields){
  let fieldUL = $("#edit-field-list");
  // Reset the ul to nothing
  fieldUL.html("");
  for (let i = 0; i < fields.length; i++) {
    const liElem = fields[i].value + "-li";
    // Create list element store attributes in script tag for easy access in next sections of workflow.
    const li = '<button class="btn btn-light edit-list-group-item" id="' + liElem + '" name="' + fields[i].value + '">' + fields[i].alias +'<script type="text/json">' + JSON.stringify(fields[i]) + '</script></button>';
    fieldUL.append(li);
  }
  $("#edit-layer-schema-modal").modal("show");
}

/**
 * On click of button (see func in button section) generate the field update form
 * @param  {string} fieldName - pulled from the button list.
*/
function buildEditFieldForm(fieldName){
  // Reset the field form to ensure no issues with select options
  $("#edit-field-form").replaceWith(adminApp.domElems.cloneEditFieldForm.clone());
  // Pull attribute info from the edit fields
  let attr = filterByName(adminApp.editing.fields, fieldName);
  // Now build the form, select default values and show it.
  $("#edit-field-form-container").show();
  $("#edit-form-field-name").text(attr.value);
  $("#edit-alias").val(attr.alias);
  // Add the welfare needs to the form select options currently in the system
  const startArray = ["Overview", "Requestor"];
  const welfareArr = adminApp.editing.row.welfareneeds.split(", ");
  const endArr = ["Notes", "System", "All", "None"];
  // Merge the array's together into one.
  const optionsArray = startArray.concat(welfareArr, endArr);

  for (let i = 0; i < optionsArray.length; i++) {
    const value = Object.keys(adminApp.lookups.subtableMatch).find(key => adminApp.lookups.subtableMatch[key] === optionsArray[i]);
    $('<option/>').val(value).text(optionsArray[i]).appendTo('#include-in-welfare-needs');
    $('<option/>').val(value).text(optionsArray[i]).appendTo('#visible-in-welfare-needs');
  }
  
  // Iterate through the include and visible form fields and select current options
  if (attr.descriptionInfo && attr.descriptionInfo.includeIn){
    for (let i = 0; i < attr.descriptionInfo.includeIn.length; i++) {
      $('#include-in-welfare-needs').val(attr.descriptionInfo.includeIn[i]).change();
    }
  }
  if (attr.descriptionInfo && attr.descriptionInfo.visibleIn){
    for (let i = 0; i < attr.descriptionInfo.visibleIn.length; i++) {
      $('#visible-in-welfare-needs').val(attr.descriptionInfo.visibleIn[i]).change();
    }
  }
}

/**
 * Submit the changes to the selected edit field.
 * This function does not submit the change to the dataset (see submitFieldChanges)
 * But saves the change in an array called adminApp.editing.updatefields for upload.
 * Part of the edit field function
*/
function saveFieldChange(){
  const fieldAttr = filterByName(adminApp.editing.fields, adminApp.editing.field);
  let editDesc = {fieldValueType:"", value: {includeIn: "", visibleIn: ""}};
  const alias = $("#edit-alias").val();
  const includeInVals = $("#include-in-welfare-needs").val();
  const visibleInVals = $("#visible-in-welfare-needs").val();
  // Set the visible and include in values to the description of the field.
  if (includeInVals && includeInVals.length > 0){
    editDesc.value.includeIn = includeInVals;
  }
  if (visibleInVals && visibleInVals.length > 0){
    editDesc.value.visibleIn = visibleInVals;
  }
  // Build the data json object
  const fieldDef = {
        "name": fieldAttr.value,
        "alias": alias,
        "description": editDesc
      };
  // Add the include in and visible in, to the editing row in memory
  // (so if a user goes back to the field the changes show).
  objIndex = adminApp.editing.fields.findIndex((obj => obj.value == adminApp.editing.field));
  adminApp.editing.fields[objIndex].descriptionInfo = {includeIn: includeInVals, visibleIn: visibleInVals};
  // Update any alias change to the field in the list on the right side of the screen
  $("#"+fieldAttr.value+"-li").text(alias);
  // Push the updated field information to the list of fields to update.
  adminApp.editing.updatefields.push(fieldDef);
}

/**
 * Submit the changes to the fields updated by the user.
 * This function will look for all layers that need to be updated for that field.
 * i.e. if a new field 'X' is included in household goods and missing persons the function
 * will update it into the main dataset and the household goods and missing persons layers.
 * @param  {array} fields - array of all fields that need to be updated in the datasets/layers.
*/
function submitFieldChanges(fields){
  $("#update-field-alert-loading").show();
  // Get the feature service and layer views
  let promises = [];
  let e = false;
  let errorMessage = "";
  const layers = [];
  layers.push({
    url: adminApp.editing.row.featureservice.url,
    type: 'FS'
  });

  // If there are existing layer views, add them in the array to update
  if (adminApp.editing.row.layerviews){
    let layerViews = adminApp.editing.row.layerviews;
    for (let i = 0; i < layerViews.length; i++) {
      layers.push({
        url: layerViews[i].serviceurl,
        type: layerViews[i].welfareType
      });
    }
  }
  // For each layer to update, get the fields that related to that layer and post the updateDefinition
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    layerFields = getUpdateFieldsForLayers(layer, fields);
    l(layer.type, layerFields);
    if (layerFields.length >= 1){
      promises.push($.ajax({
        url: layer.url.replace("rest/services", 'rest/admin/services') + "/updateDefinition?token=" + adminApp.user.token,
        method:"POST",
        data: {
          "updateDefinition": JSON.stringify({
            fields: layerFields
          }),
          f: "json"
        },
        dataType: "json"
      })
      .done(function(result){
        if (result.error){
          e = true;
          errorMessage = JSON.stringify(result.error);
        }
      })
      .fail(function(error){
        e = true;
        errorMessage = JSON.stringify(error);
      }));
    }
  }

  // When all layers have updated
  $.when.apply(null, promises).done(function(){
    $("#update-field-alert-loading").hide();
    // If no errors, show success
    if (!e){
      $("#update-field-alert-success").show();
      
    }
    // If error, show edit error
    else {
      editError(errorMessage);
    }
  })
}

/**
 * From the array of fields to update, only return the fields that
 * should be included in the layer.
 * @param {string} layer - the layer currently being iterated over and updated.
 * @param  {array} fields - the fields selected by the user to be updated.
 */
function getUpdateFieldsForLayers(layer, fields){
  const layerFields = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    // Any options under "overview", "requestor", "notes", "system" are held in the registration layer HOWEVER,
    // the field description still tells the portal view what table to show it in.
    const registrationTypes = ["overview", "requestor", "notes", "system"];
    // Reverse match the layer type to get the layer type in the same format as in the field
    const layerType = Object.keys(adminApp.lookups.subtableMatch).find(
      key => adminApp.lookups.subtableMatch[key] == layer.type);
    // Make sure the value exists first, incase of any errors
    if (field.description.value.includeIn){
      // Check if layerType is in the includeIn array or if it is the feature service or MAIN layers
      if (field.description.value.includeIn.includes(layerType) || ['FS', 'MAIN'].includes(layer.type)){
        // If so, put the field in the layerFields array
        layerFields.push(field);
      }
      // Different logic for the registration layer as multiple types selected tie to it.
      if (field.description.value.includeIn.some(type => registrationTypes.includes(type)) && layer.type == 'Registration'){
        layerFields.push(field);
      }
    }
  }
  return layerFields;
}

/**
 * Returns the object for a specific field from an array of fields.
 * Since the fieldname is not set as a key for the object, we must search each object in the array
 * and find the field where the key called 'value' has the value of field name.
 * @param  {array} fields - the array of field objects
 * @param  {string} fieldName - the field name for what field object we want to return.
 */
function filterByName(fields, fieldName){
  return fields.filter(function(field){
    return (field['value'] == fieldName);
  })[0];
}

// Add additional welfare needs ---------------------------------------------------------------------------------
/**
 * Pull the information of what Welfare Needs currently exist and generate a form to add additional needs
 */
function generateAddWelfareNeedsForm(){
  // Set title of form
  $("#edit-add-welfare-needs-title").text("Add Welfare Needs to: " + adminApp.editing.row.project);
  // Add welfare needs not already in system.
  const existingArr = adminApp.editing.row.welfareneeds.split(", ");
  // Find unique values between the existing welfare needs and all welfare need types
  const welfareArr = adminApp.lookups.welfareNeeds.filter(function(obj){
    return existingArr.indexOf(obj) == -1;
  });

  // Add the options into the array
  for (let i = 0; i < welfareArr.length; i++) {
    const value = Object.keys(adminApp.lookups.subtableMatch).find(key => adminApp.lookups.subtableMatch[key] === welfareArr[i]);
    $('<option/>').val(value).text(welfareArr[i]).appendTo('#edit-welfareNeeds');
  }
  // Show the form
  $("#edit-add-welfare-needs-modal").modal("show");
}

/**
 * On submit of addition of welfare needs form, process the addtion(s).
 */
function addNewWelfareNeeds(){
  // Generate the depCon config from existing information and what is required
  // Convert welfare need values to readable format.
  const welfareVals = $("#edit-welfareNeeds").val();
  let welfareArr = [];
  for (let i = 0; i < welfareVals.length; i++) {
    welfareArr.push(adminApp.lookups.subtableMatch[welfareVals[i]]);
  }
  l("EDIT ROW", adminApp.editing.row);
  adminApp.deployment.config = adminApp.editing.row;
  adminApp.deployment.config.cdemgroupsshort = adminApp.deployment.config.cdemgroups;
  adminApp.deployment.config.welfareneeds = welfareArr.join(", "),
  adminApp.deployment.config.welfaregroups = adminApp.deployment.config.welfareneeds.split(", ");
  adminApp.deployment.config.editedat = Date.now();
  adminApp.deployment.config.last_edited_user = adminApp.user.email;
  adminApp.deployment.config.last_edited_date = Date.now();
  adminApp.deployment.config.status = "Updating";
  adminApp.deployment.config.email = adminApp.user.email;
  adminApp.deployment.config.layerviews = [];
  adminApp.deployment.config.itemstomove = [];
  l("UPDATE ROW", adminApp.deployment.config);

  // Now perform the generation of the additional welfare needs
  // TODO Need to continue with this piece of work.
  // Create feature views (start with getService) => Move the new items => create the new groups.
  // getService(true, true).done(function(result){
  //   l(result);
  // })
  // At the end, ensure the updates are merged with the original values.
  adminApp.deployment.config.welfareneeds += ", " + adminApp.editing.row.welfareneeds;
  adminApp.deployment.config.status = "Created";
  adminApp.deployment.config.layerviews = adminApp.deployment.config.layerviews.concat(adminApp.editing.row.layerviews);
}

/**
 * Error return for failure of editing Āwhina Deployment
 * @param  {} error
 */
function editError(error){
  const er = typeof features !== "object" ? JSON.parse(error) : error;
  $("#errorEditMessageText").html(er);
  $("#edit-alert").show();
}

// TODO add edit option for changing deployment name.
// This includes folders, groups and data sets /layer views


// DELETE an Āwhina System -----------------------------------------------------------------------------------------------------

/**
 * Deletes all items related to the selected deployment.
 * This is initiated after the option for exporting the dataset is shown to the use.
 * Initiation is done by button click: "delete-row-delete" - find it under the button section
 * Related download data button click functions can also be found under the button section.
 * @param  {object} row - the table row containing the deployment information
 */
function deleteESRIItems(row){
  // Get the initial config information of the deployment
  let config = JSON.parse(row.initialconfig);
  
  // After the data has been downloaded (if req.), hide the delete popup, show that it is deleting
  $("#delete-row-alert").hide();
  $("#delete-progress-alert").show();
  // Go through variables and Identify the already created items and delete them
  let e = false;
  let promises = [];
  let deleteArr = [];
  // Main Survey123 Layer
  deleteArr.push(config.portalURL + "/sharing/rest/content/users/" + encodeURI(user.username) + "/items/" + d.surveyitemid + "/delete");
  // Survey123 Form
  deleteArr.push(config.portalURL + "/sharing/rest/content/users/" + encodeURI(user.username) + "/items/" + d.surveyconfig.serviceItemId + "/delete");
  // ESRI Groups
  for (i=0; i<config.esrigroups.length; i++){
    deleteArr.push(adminApp.config.portalURL + "/sharing/rest/community/groups/" + encodeURI(config.esrigroups[i].id) + "/delete");
  }
  // Dashboard
  for (i=0; i<config.dashboard.length; i++){
    deleteArr.push(adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/items/" + config.dashboard[i].id + "/delete");
  }
  // Layer Views
  for (i=0; i<config.layerviews.length; i++){
    deleteArr.push(adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/items/" + config.layerviews[i].itemId + "/delete");
  }
  // ESRI Folder
  deleteArr.push(adminApp.config.portalURL + "/sharing/rest/content/users/" + encodeURI(adminApp.user.username) + "/" + encodeURI(config.folder.id) + "/delete");

  for (let i = 0; i<deleteArr.length; i++){
    promises.push($.ajax({
      url: deleteArr[i],
      method:"POST",
      data: {
        token: adminApp.user.token,
        f: "json"
      },
      dataType: "json"
    })
    .done(function(result){
      if (!e){
        e = errorCheck(result);
      }
    })
    .fail(function(error){
      e = true;
      deleteError(error, config);
    }));
  }
  $.when.apply(null, promises).done(function(){
    // Delete the deployment record from the system if no errors
    if (!e && config.objectid){
      $.ajax({
        url: adminApp.config.layerURL + "/deleteFeatures",
        method:"POST",
        data: {
          token: adminApp.user.token,
          f: "json",
          objectIds: config.objectid
        },
        dataType: "json"
      })
      .done(function(result){
        if (result.error){
          e(result.error);
          deleteError(result.error, config);
        }
        else {
          // Delete the folder and files on the server (NON ESRI)
          deleteProjectFolder(config)
          $("#delete-progress-alert").hide();
          // Refresh table
          loadDataESRI();
        }
      })
      .fail(function(error){
        e(error);
        deleteError(error, config);
      });
    }
    else {
      deleteError("Failed to delete system.", config);
    }
  })
}
/**
 * Deletes the deployment folder and all files inside it from the server
 * This is not the ESRI items but the actual .html, .js etc files.
 * @param  {object} config - the config for the deployment, retrieved from the row in the table.
 */
function deleteProjectFolder(config){
  $.ajax({
    url: adminApp.config.serverURL + "/deleteDeployment",
    method:"DELETE",
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    data: {
      token: adminApp.user.token,
      projectName: encodeURI(config.project.replace(/\//g, '_')),
    }
  })
  .done(function(result){
    l("Deployment project removed from server");
  })
  .fail(function(error){
    errorReport(error, "deleteProjectFolder");
  });
}

/**
 * Error return for failure of deleting Āwhina Deployment
 * @param  {object/string} error - returned error information from api call
 * @param  {object} config - the awhina config being deleted
 */
 function deleteError(error, config){
  // Check if error is an object, if not convert it.
  const er = typeof features !== "object" ? JSON.parse(error) : error;
  config.status = 'Deletion Failed';
  updateDeploymentDetails(config);
  // General error function for failed request.
  er(error);
  $("#errorDeleteMessageText").html(er);
  $("#delete-alert").show();
}

/**
 * Check the success result in the delete function for any error returns
 * @param  {} result
 */
function errorCheck(result){
  // Don't set as error for when an item cannot be found - it has already been deleted.
  if (result.error && result.code && result.code != 400){
    return true;
  }
  else return false;
}

/**
 * Allow the user to export the data from the deployment before deleting it.
 * @param  {boolean} filterData - true if user selected filter data option, false if full export.
 * Filtered data allows the user to remove personal information.
 * @param  {object} config - the deployment config pulled from the table row
 */
function exportDataset(filterData, config){
  let fields = {};
  // Get the full data from the dataset.
  let queryDef = "/query?where=1%3D1&units=esriSRUnit_Meter&outSR=4326&outFields=*"
  $.ajax({
    url: config.featureservice.url + queryDef,
    method:"GET",
    data: {
      f: "json",
      token: adminApp.user.token,
    }
  }).done(function(result){
    // User has access to portal but not to the layer!
    if (result.error){
      if (result.error.code == 403){
        editError("You do not have access to the feature dataset.");
      }
      else {
        editError(result.error);
      }
    }
    // If no error get the data
    else {
      adminApp.deleting.extractFeatures = result.features;
      fields = result.fields;
      // If exporting full dataset convert to CSV and download
      if (!filterData){
        if (adminApp.deleting.extractFeatures){
          ConvertToCSV(adminApp.deleting.extractFeatures, config.project);
        }
      }
      if (filterData){
        if (adminApp.deleting.extractFeatures && fields){
          // If exporting filtered data, build the check modal and display it.
          buildDelCheckForm(fields);
        }
      }
    }
  })
  .fail(function(error){
    editError(error);
  });
}

/**
 * Convert the feature object to csv format.
 * @param  {object} features - features to be added into the CSV file
 * @param  {string} filename - csv filename
 * @param  {array} uncheckedItems - fields not to include in the export (filters the features)
 */
function ConvertToCSV(features, filename, uncheckedItems = []) {
  // Check if features is an object, if not convert it.
  let rows = typeof features !== "object" ? JSON.parse(features) : features;
  // Iterate over keys and create header.
  let header = "";
  Object.keys(rows[0].attributes).map(function(column) {
    if (!uncheckedItems.includes(column)){
      header += column + ","
    }
  });
  // Format rows. and append data into the lines.
  let str2 = "";
  rows.forEach(rowFull => {
    const row = rowFull.attributes;
    let line = "";
    for (const [key, value] of Object.entries(row)){
      if (!uncheckedItems.includes(key)){
        if (line !== "") {
          line += ",";
        }
        if (typeof value === "object") {
          line += JSON.stringify(value);
        } else {
          line += value;
        }
        
      }
    }
    str2 += line + "\r\n";
  });
  // Create the CSV Data in blob - gets around URI limit issue
  csvData = new Blob([header + "\r\n" + str2], {
    type: "data:application/vnd.ms-excel;charset=utf-8,\uFEFF"
  });
  // Download the CSV file
  l(header + "\r\n" + str2);
  downloadCSV(csvData, filename);
}

/**
 * Downloads the CSV File...
 */
function downloadCSV(csvData, filename){
  // Convert to a URL
  const csvUrl = URL.createObjectURL(csvData);
  // Create HTML Element and then download automatically
  let a = document.createElement("a");
  a.href = csvUrl;
  a.setAttribute("download", filename + ".csv");
  document.body.appendChild(a);
  a.click();
}

/**
 * Create a list of string fields found in the dataset and display it
 * users can deselect fields they do not want to download.
 * @param  {array} fields - fields that will show in the display for the user to check
 * if they do not want them included in the output dataset.
 */
function buildDelCheckForm(fields){
  let checkList = $("#delete-check-list");
  for (let i = 0; i < fields.length; i++) {
    if(fields[i].type == "esriFieldTypeString"){
      const input =     '<input type="checkbox" checked="true" id="' + fields[i].name + '-checkbox">';
      const label = '<label class="del-checklist-margins" for="' + fields[i].name + '-checkbox">  ' + fields[i].alias + '</label>';
      const liElem = "#" + fields[i].name + "-li";
      const li = '<li class="list-group-item" id="' + liElem + '" name="' + fields[i].name + '">' + input + label +'</li>';
      checkList.append(li);
    }
  }
  // hide loading symbol, enable download button
  $("#downloading-data-loading").hide();
  $('#download-filtered-data').prop('disabled', false);
}

/**
 * Get fields that are not checked (to remove in the csv output process)
 */
function parseCheckedFields(){
  let uncheckedItems = [];
  const listItems = $("#delete-check-list li");
  listItems.each(function(idx, li) {
    const liElem = $(li);
    if(liElem.find(":checkbox").prop('checked') == false){
      uncheckedItems.push(liElem.attr("name"));
    }
  });
  return uncheckedItems;
}

// Layer Functions -----------------------------------------------------------------------------------------------------
/**
 * Main function to load data from ESRI Enterprise into the app. Is run on initialisation of the
 * admin app, when the table view is refreshed or when a create/update/delete action is performed.
*/
function loadDataESRI(){
  // build a query definition to ensure only the records created by the cdem group or user are returned
  let where = encodeURI("created_user = '" + adminApp.user.username + "' OR (" + adminApp.user.cdemUserGroups.map(({short}) => "cdemgroups LIKE '%"+ short + "%'").join(" OR ")+")");
  
  queryDef = "/query?where=" + where + "&units=esriSRUnit_Meter&outFields=*"
  $.ajax({
    url: adminApp.config.layerURL + queryDef,
    method:"GET",
    data: {
      f: "json",
      token: adminApp.user.token,
    }
  }).done(function(result){
    // User has access to portal but not to the layer!
    if (result.error){
      if (result.error.code == 403){
        require(["esri/identity/IdentityManager"], function(identityManager) {
            identityManager.destroyCredentials();
          });
        window.location.replace(adminApp.config.accessDeniedURL+"#"+adminApp.user.username);
      }
    } else {
      buildTableConfig();
      adminApp.table.data = [];
      result.features.forEach(function(feature){
        adminApp.table.data.push(feature.attributes);
      });
      $("#table").bootstrapTable("load", adminApp.table.data);
    }
  })
  .fail(function(error){
    e(error);
  });
}

// Build Table -----------------------------------------------------------------------------------------------------
/**
 * Setup the configuration of the table - define its properties and actions.
*/
function buildTableConfig() {
  // Add the Welfare Needs Icon field in.
  table = [{
    field: "action",
    title: "",
    align: "left",
    valign: "middle",
    width: "70px",
    cardVisible: false,
    switchable: false,
    formatter: actionFormatter,
    events: {
      "click .edit-row": function (e, value, row, index) {
        $("#edit-check-modal").show();
        adminApp.editing.row = row;
        // Convert applicable text fields to json
        adminApp.editing.row.esrigroups = JSON.parse(adminApp.editing.row.esrigroups);
        adminApp.editing.row.featureservice = JSON.parse(adminApp.editing.row.featureservice);
        adminApp.editing.row.initialconfig = JSON.parse(adminApp.editing.row.initialconfig);
        adminApp.editing.row.layerviews = JSON.parse(adminApp.editing.row.layerviews);
        adminApp.editing.row.portalconfig = JSON.parse(adminApp.editing.row.portalconfig);
      },
      "click .delete-row": function (e, value, row, index) {
        $("#delete-row-alert").show();
        adminApp.deleting.row = row;
        // Convert applicable text fields to json
        adminApp.deleting.row.esrigroups = JSON.parse(adminApp.deleting.row.esrigroups);
        adminApp.deleting.row.featureservice = JSON.parse(adminApp.deleting.row.featureservice);
        adminApp.deleting.row.initialconfig = JSON.parse(adminApp.deleting.row.initialconfig);
        adminApp.deleting.row.layerviews = JSON.parse(adminApp.deleting.row.layerviews);
        adminApp.deleting.row.portalconfig = JSON.parse(adminApp.deleting.row.portalconfig);
      },
    }
  }];
  $.each(adminApp.table.properties, function(index, value){
    // Push the columns into the table config based on their properties.
    if(!value.formatter){
      value.formatter = null;
    }
    if(!value.width){
      value.width = null;
    }
    // Table config
    if (value.table) {
      table.push({
      field: value.value,
      title: value.label,
      formatter: value.formatter,
      width: value.width
      });
      $.each(value.table, function(key, val) {
      if (table[index+1]) {
        table[index+1][key] = val;
      }
      });
    }
  })
  buildTable();
}

/**
 * Build the table, using the configuration defined in buildTableConfig()
 * and the config types below.
*/
function buildTable() {
  $("#table").bootstrapTable({
    cache: false,
    height: ($("#body").height() - $("#navbar").outerHeight(true)) - 100,
    // pagination: true,
    // paginationParts: ['pageSize', 'pageList'],
    undefinedText: "",
    striped: false,
    toggle: true,
    minimumCountColumns: 1,
    toolbar: "#toolbar",
    search: true,
    uniqueId: "objectid",
    trimOnSearch: false,
    showColumns: true,
    showToggle: false,
    showRefresh: true,
    showExport: true,
    sortName: "editedat",
    sortOrder: "desc",
    exportDataType: 'all',
    exportTypes: ['csv', 'excel', 'txt', 'pdf'],
    columns: table,
    onRefresh: function(params){
      loadDataESRI();
    }
  });
}

// Table Functions -----------------------------------------------------------------------------------------------------

/**
 * Each row in the table has a dropdown box on the left hand side of the record (in the action field).
 * The function uses arrays containing string declerations of html elements as this is how it needs to be ingested
 * by the table.
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
*/
function actionFormatter(value, row, index){
  return ['<div class="btn-group" style="vertical-align: 0.9px;">',
  '<div class="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">&nbsp;&nbsp;&nbsp;<i class="fas fa-bars action-menu"></i></div>',
  '<ul class="dropdown-menu">',
    '<li class="dropdown-item btn btn-secondary edit-row" href="javascript:void(0)" id="edit-btn"><i class="far fa-edit"></i> Edit Deployment</li>',
    '<li class="dropdown-item btn btn-secondary delete-row" style="color: red;" href="javascript:void(0)" id="delete-row-btn"><i class="far fa-trash-alt"></i> Delete Deployment</li>',
  '</ul>',
  '</div>'].join("");
}

/**
 * Format a date fields values into date type.
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
*/
function dateFormatter(value, row, index){
  if (value){
    return new Date(eval(value)).toLocaleString();
  }
}

/**
 * Determines what icon to set in the status field from the status value. 
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
*/
function statusFormatter(value, row, index){
  if (value == 'Pending'){
    return '<h5><span class="badge badge-warning">Pending</span></h5>'
  }
  else if (value == 'Creating'){
    return '<h5><span class="badge badge-info">Creating</span>   <i class="fa fa-spinner fa-spin text-info fa-sm" id="waiting_9" style="position: inline;"></i></h5>'
  }
  else if (value == 'Updating'){
    return '<h5><span class="badge badge-info">Updating</span>   <i class="fa fa-spinner fa-spin text-info fa-sm" id="waiting_9" style="position: inline;"></i></h5>'
  }
  else if (value == 'Created'){
    return '<h5><span class="badge badge-success">Created</span></h5>'
  }
  else if (value == 'Failed'){
    return '<div><h5><span class="badge badge-danger">Failed</span></h5></span>'
  }
  else if (value == 'Deletion Failed'){
    return '<div><h5><span class="badge badge-danger">Deletion Failed</span></h5></span>'
  }
}

/**
 * Add link and icon to survey form field in table.
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
*/
function formatterURL(value, row, index){
  if (value && typeof value == "string") {
    return '<a href="'+value+'" target="_blank"><i class="fas fa-pager"></i> Portal</a>';
  }
}

// Button Actions ----------------------------------------------------

// Deployment ------------------------------

// Form error message
$('.form-error-ok').click(function() {
  $(this).parent().hide();
});

// Deployment form
$('#btn-discard-deployment-form').click(function() {
  $("#generate-modal").replaceWith(adminApp.domElems.cloneDepForm.clone());
  $('#generate-modal').modal('hide');
  $('.modal-backdrop').hide();
});

// NOT IN USE - TODO add option to attempt redeployment on failure
$(document).on('click', '#redeploy-system', function(){
  alert("Resubmitted");
});

/**
 * If fields are found that do not have a common field schema, they need to be updated
 * as part of the deployment process.
 * @param  {} "#update-layer-schemas-btn" - button in the alert
 *            notifying them of the issue
*/
$("#dep-field-edit-form-btn").click(function() {
  // Set the upload field button to disabled.
  $("#submit-field-edits-form").prop("disabled", true);
  buildUpdateFieldSchemaHTML(adminApp.editing.fields);
  // Hide the button and show the continue button
  $("#dep-field-edit-form-btn").hide();
  $("#dep-field-continue-btn").show();
});


// Editing ------------------------------

// Update the fields of the system
$("#update-layer-schemas-btn").click(function() {
  updateFieldSchemas(adminApp.editing.row);
});

// On click of a field to update
$(document).on("click", "#edit-field-list > button", function(){
  // Hide the update/success alerts if visible from prev field change
  $("#update-field-alert-loading").hide();
  $("#update-field-alert-success").hide();
  adminApp.editing.field = $(this).attr("name");
  buildEditFieldForm(adminApp.editing.field);
});

// On save of update field, submit changes to dataset and reload the field information to show changes.
$("#save-field-edit-form").on("click", function(e){
  // Set the field colour to green in the list
  $("#" + adminApp.editing.field + "-li").removeClass("btn-light").addClass("btn-success");
  // If one of the fields has been saved (as in this process) enable the update button.
  $("#submit-field-edits-form").prop("disabled", false);
  // Save the change to the config.
  saveFieldChange();
});

// ------------------------------------------------
// Editing list buttons

$("#change-deployment-name-btn").click(function() {

})

// On submit of field changes, upload to main layer and featureviews (if any)
// then reload the field information to show changes.
$("#submit-field-edits-form").on("click", function(e){
  submitFieldChanges(adminApp.editing.updatefields);
});

// Select edit function additional welfare needs
$("#add-welfare-needs-btn").click(function() {
  generateAddWelfareNeedsForm();
});
// On submission of additional welfare needs
$("#submit-welfare-need-edit-form").click(function() {
  addNewWelfareNeeds();
});

$("#redifine-def-queries-btn").click(function() {
  
});

$("#update-portal-config-btn").click(function() {
  
});

$("#close-edit-check-modal").click(function() {
  $("#edit-check-modal").hide();
});

$("#close-edit-fields-modal").click(function() {
  adminApp.editing.field = "";
  $("#edit-layer-schema-modal").hide();
});

$("#update-bidfood-form-fields-btn").click(function() {

})


// Deleting ------------------------------

// Delete deployment row modal buttons
$('.delete-row-discard').click(function() {
  adminApp.deleting.row = new Object();
  $("#delete-row-alert").hide();
});

// Delete table row
$('.delete-row-delete').on({
  mousedown: function() {
    adminApp.domElems.progressBarHold.css('width', '100%');
    $(this).data('timer', setTimeout(function() {
      $(this).parent().hide();
      // Reset features in case of incorrect data carried over.
      let extractFeatures = {};
      deleteESRIItems(adminApp.deleting.row);
    }, 2000));
  },
  mouseup: function() {
    clearTimeout($(this).data('timer'));
    adminApp.domElems.progressBarHold.css('width', '0%');
  },
  mouseout: function() {
    clearTimeout($(this).data('timer'));
    adminApp.domElems.progressBarHold.css('width', '0%');
  }
});

// Download Data Filtered/Unfiltered
$('#ExportFilteredData').click(function() {
  $("#delete-check-modal").show();
  exportDataset(true, adminApp.deleting.row.initialconfig);
});
// In delete check form
$('#download-filtered-data').click(function() {
  let uncheckedItems = parseCheckedFields();
  ConvertToCSV(adminApp.deleting.extractFeatures, adminApp.deleting.row.project + "_Filtered", uncheckedItems)
});

$('#ExportFullData').click(function() {
  // Cache the original html into the data attr
  $(this).data('html',$(this).html()).html('');
  exportDataset(false, adminApp.deleting.row.initialconfig);
  // Revert back to original state after download of data
  $(this).html($(this).data('html'));
});

// In delete check form
// TODO fix issue with this only working once, after reloading of delete workflow the modal does not hide the second time
// The list of fields also is doubled.
$('#close-delete-check-modal').click(function() {
  const replaceModal = adminApp.domElems.cloneDelCheckModal.clone()
  $("#delete-check-modal").replaceWith(replaceModal);
  $("#delete-check-modal").hide();
});



// PURELY FOR TESTING SERVER SIDE VALIDATION

// function checkClientCredentials(clientID, projectName, existingDeployment = true){
//   // Contains the names and id's of the Āwhina Administration Groups in the Enterprise Portal.
//   // Clients must be in one of the groups to proceed with any API functionality.
//   const adminGroups = 
//   {
//     "01c681f4b16e4cffaaa444c0663846ed": "Auckland CDEM",
//     "c693cdaec3274f93a73714266353886b": "Bay of Plenty CDEM",
//     "66f94b7bcfd14754b96463733f8cacca": "Canterbury CDEM",
//     "9b44bb67ab4b49e8a4d4d44c077f24c3": "Chatham Islands CDEM",
//     "569de6350b544d5da295bb01b4a69f80": "Hawke's Bay CDEM",
//     "57763cb58a4d422ba7f028ada7d108a7": "Manawatu Wanganui CDEM",
//     "e6329f6242e9413d9100bf4a4332ad35": "Marlborough CDEM",
//     "c9d1d4af7c9b47468d7c3a16474ee669": "Nelson Tasman CDEM",
//     "ae3fba7cc36e4dca8cef3260d0a40b81": "Northland CDEM",
//     "1ea17d1d14974cbd982a9e783e1f280e": "Otago CDEM",
//     "c5d8b77f17ab436aac4ac43197cdae9d": "Southland CDEM",
//     "b1c9be3943a84650ab7a86ec0df547a4": "Tairāwhiti CDEM",
//     "a3b0e9ef93274413a3b18293528ccce4": "Taranaki CDEM",
//     "b00d5a9c65ef4071838d6abfd7518fd8": "Waikato CDEM",
//     "f28f20622e6d47bc85119393d0ac8633": "Wellington CDEM",
//     "b3dcf7aa55244833a14918392e235236": "West Coast CDEM"
//   };
//   // URL for REST call
//   const portalURL = "https://awhina.emergencymanagement.govt.nz/portal/sharing/rest/community/groups?";

//   // Generate the filter from id's of the CDEM Groups
//   let groupList = Object.keys(adminGroups); // interim list to hold the ids

//   // String of groups for filter
//   let groupIds = groupList.join(" OR id: ");

//   // Perform the request
//   return fetch(portalURL + new URLSearchParams({
//     token: clientID,
//     q: 'id: ' + groupIds,
//     num: 100,
//     searchUserAccess: "groupMember",
//     f: 'json'
//   }), {
//     method: 'GET',
//   })
//   .then(response => {
//     // On valid response start admin group matching
//     if (response.ok) { // res.status >= 200 && res.status < 300
//       // Convert the resolved response to json
//       return response.json().then(body => {
//         // The admin group values are returned by cheking the group id (stops users being in a fake admin group with the correct name).
//         const userGroups = body.results;
//         let userAdminGroups = [];
//         const adminKeys = Object.keys(adminGroups);
//         for (let i = 0; i < userGroups.length; i++) {
//           if (adminKeys.includes(userGroups[i]['id'])){
//             userAdminGroups.push(userGroups[i]['title'])
//           }
//         }
//         if (existingDeployment){
//           // Grab the config file if it is for an existing deployment to check if user has access to the CDEM Groups it is for.
//           let configFile = getConfig('/awhinaDeployments/' + projectName);
//           // If at least one of the CDEM groups in the configFile matches the cdem admin groups of the user
//           Object.keys(configFile).forEach(function(key) {
//             // Now check if any one of the config file CDEM Groups match with the admin groups the user is in.
//             // Only one match is needed - as the admin user will have privileges over any multi CDEM group deployment
//             // That is their CDEM Group is part of.
//             if (userAdminGroups.includes(key)){
//               return {validuser: true, message: 'User validation successful.', error: false};
//             }
//           });
//           // If the return action was not initiated above then the user is not in an admin CDEM group.
//           return {validuser: false, message: 'User does not have the correct permissions to perform this action.', error: false};
//         }
//         // If this is a new deployment, there is no need to check against the config file.
//         // Just that the user is in one of the correct admin groups.
//         else if (!existingDeployment) {
//           if (userAdminGroups.length >= 1){
//             return {validuser: true, message: 'User validation successful.', error: false};
//           }
//           else {
//             return {validuser: false, message: 'User does not have the correct permissions to perform this action.', error: false}
//           }
//         }
//         else {
//           return {validuser: false, message: 'Server side error.', error: true};
//         }
//       });
//     }
//     // For invalid responses
//     else {
//       l(response.statusText);
//       return {validuser: false, message: response.statusText, error: true};
//     }
//   })
//   .catch(err => {
//     l(err);
//     return {validuser: false, message: err, error: true};
//   });
// }

// $("#about-btn").click(function(){
//   checkClientCredentials(user.token, "Portal Testing 2.0", existingDeployment = false).then(response => {
//     l(response);
//   });
// });