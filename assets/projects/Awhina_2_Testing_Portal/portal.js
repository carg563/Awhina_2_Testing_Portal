/**
 * Filename: portal.js
 * Purpose: Contains the javascript code that implements the functionality for the Awhina Welfare System Portal.
   Each system is generated per emergency response and is comprised of a html page (portal.html),
   two javascript files (portal.js, portal-worker.js) and a json config file (portalconfig.json).
   These files are kept in a project folder on the server and are generated per emergency response using
   the Awhina Welfare System Administration Tool. All datasets, the survey123 form and group/users are
   hosted on the ESRI Enterprise emergencymanagement tenancy. REST API Calls are used for interacting with
   these features.
   A custom CSS file is hosted in a main folder on the server used by all portal instances.
   Further information can be found in the documentation for the Awhina Welfare System.
   Please note: Due to the constraints on software available at NEMA, this system has been built on vanilla JS.
   Future enhancements could update this to TypeScript. JQuery is required due to the dependencies within bootstrap 4,
   bootstrap table and boostrap tour.
 * Author: Dion Fabbro - dion.fabbro@nema.govt.nz, dionfabbro@gmail.com
 * Version: 0.91
*/


/**
 * Destructured rename declaration of console.log and console.error.
 * You can now use l("Log comment here"); and e("Error comment here"); in the code
*/
const {log:l} = console;
const {error:e} = console;

/*
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

Assign all the variables for the script that are used between functions and any global functions.
This includes empty variables (on init) that just have their type defined.

++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
App variables - holds the globally required variables and some lookup objects that may need to be updated in the future.
*/
const awhina = {
  // General application config information for all instances of a portal app.
  appConfig: {
    version: "2.0.10",
    portalURL: "https://awhina.emergencymanagement.govt.nz/portal",
    portalCDEMGroup: "", // The current active CDEM Group
    accessDeniedURL: "Awhina_DEV/403.html",
    popupURL: "../../../oauth-callback.html",
    appID: "0AKMXvgZlpajuyyg",
  },
  // The specific deployment instance information, contains data links, event name and cdem groups etc.
  // Held in a JSON in the project folder.
  instance: {
    configURI: "portalconfig.json",
    config: {}, // config holds items such as the layer urls and what CDEM the portal is in. It consists of one CDEM only.
    fullConfig: {} // full config is used on init and contains all data so the user can select the relevant CDEM Group from it.
  },
  // user variable contains the information related to the signed in user.
  user: {
    token: "",
    username: "",
    fullname: "",
    role: "",
    groups: []
  },
  data: {
    // Holds the records returned from the dataset in esri enterprise. Used across the application.
    // The raw json data is used by leaflet and converted into features.
    dataset: {},
    // Define worker that controls the auto refresh of data every 15 seconds.
    worker: {},
    // Holds the checked records in the table view with the objectid as the key for fast lookup.
    checkedRowsMap: {},
    // Creates an object of features with the objectid as the key for fast lookup and processing.
    featureMap: {},
    // The currently selected record id
    selectedID: 0,
    // Field properties for the selected dataset - used across the table, map and attribute popups.
    fieldProperties: [],
    activeView: {
      // The currently set view of data - used to switch table views and what url should be selected/
      name: 'overview',
      // Active URL for what feature view is selected
      url: ''
    }
  },
  table: {
    // Refresh table data when the map-table size is changed
    resizeTime: 250, //Has to be outside observer function, sets the refresh time in ms
    resizeElement: {}, // Is the map container
    resizeObserver: {}, // Observes the state change of the resize element
    // Table sorting
    sortProperty: "objectid",
    sortOrder: "desc",
    // Static portal field properties (always needed in the tables)
    staticProperties: [
      {
        value: "alert",
        subset: ["overview"],
        label: "Row Alert",
        table: {
          visible: false,
          sortable: true,
        },
        filter: {
          type: "string",
          input: "checkbox",
          vertical: true,
          multiple: true,
          operators: ["contains", "not_contains"],
          values: []
        }
      }
    ],
    // Only needed on the overview table view.
    welfareIconProperties: [
      {
        value: "welfareicons",
        subset: ["overview"],
        label: "Welfare Needs",
        editable: false,
        table: {
          visible: true,
          sortable: false
        }
      }
    ],
    // Matches the subtable to the welfare need.
    subtableMatch: {
      "missingperson" : "Missing Person",
      "shelteraccommodation": "Shelter and Accommodation",
      "householdgoods": "Household Goods and Services", 
      "animalwelfare": "Animal Welfare",
      "healthdisability": "Health or Disability",
      "financialassistance": "Financial Assistance",
      "psychosocialsupport": "Psychosocial Support"
    },
    // The html div elements that enable a user to perform actions on a table row
    rowActionItems: [
      '<div class="btn-group" style="vertical-align: 0.9px;">',
      '<div class="dropdown-toggle fa-sm row-dropdown" data-toggle="dropdown">&nbsp;&nbsp;&nbsp;<i class="fas fa-bars fa-sm action-menu"></i></div>',
      '<ul class="dropdown-menu">',
      '<li class="dropdown-item btn btn-secondary zoom" href="javascript:void(0)" id="zoom-btn"><i class="fa fa-search-plus"></i> Zoom</li>',
      '<li class="dropdown-item btn btn-secondary identify" href="javascript:void(0)" id="identify-btn"><i class="fa fa-info-circle"></i> Identify</li>',
      '<li class="dropdown-item btn btn-secondary edit" href="javascript:void(0)" id="edit-action-btn"><i class="far fa-edit"></i> Edit</li>',
      '<li class="dropdown-item btn btn-secondary delete-row" style="color: red;" href="javascript:void(0)" id="delete-row-btn"><i class="far fa-trash-alt"></i> Delete Row</li>',
      '</ul>',
      '</div>'
    ],
    rowActionItemsIncBidfood: [
      '<div class="btn-group" style="vertical-align: 0.9px;">',
      '<div class="dropdown-toggle fa-sm row-dropdown" data-toggle="dropdown">&nbsp;&nbsp;&nbsp;<i class="fas fa-bars fa-sm action-menu"></i></div>',
      '<ul class="dropdown-menu">',
      '<li class="dropdown-item btn btn-secondary zoom" href="javascript:void(0)" id="zoom-btn"><i class="fa fa-search-plus"></i> Zoom</li>',
      '<li class="dropdown-item btn btn-secondary identify" href="javascript:void(0)" id="identify-btn"><i class="fa fa-info-circle"></i> Identify</li>',
      '<li class="dropdown-item btn btn-secondary bidfood" href="javascript:void(0)" id="bidfood-btn"><i class="fab fa-wpforms"></i> Create Bidfood Order</li>',
      '<li class="dropdown-item btn btn-secondary edit" href="javascript:void(0)" id="edit-action-btn"><i class="far fa-edit"></i> Edit</li>',
      '<li class="dropdown-item btn btn-secondary delete-row" style="color: red;" href="javascript:void(0)" id="delete-row-btn"><i class="far fa-trash-alt"></i> Delete Row</li>',
      '</ul>',
      '</div>'
    ],
  },
  map: {
    // All entries are defined under the map section of the script
    map: {},
    featureLayer: {}, // The leaflet point layer - this is the main layer that all processing occurs on
    clusterLayer: {}, // The cluster layer is generated off the featurelayer. No processing occurs on it.
    baseLayers: {},
    overlayLayers: {}, // Container for the feature/cluster layers.
    layerControl: {}, // Table of contents
    hoverProperty: "names", // The field to show when hovering
    legendControlState: true, // Legend open or closed
    legend: {},
    legendStatusOptions: ["New", "Acknowledged_by_Agency", "Referred_Within_CDC", "Actioned", "Withdrawn"],
    searchControl: {},
    geocodeService: {}, // Uses ESRI reverse geocoding
    info: {},
    baseMap: {
      osm: {}, // Open Street Map
      night: {}, // Dark Mode map
      satellite: {} // Satellite imagery
    },
    // Feature style for selected points in map
    selectedStyle: {
      radius: 6.2,
      stroke: 3,
      color: '#000000',
      fillColor: '#00d2ff'
    },
  },
  processing: {
    // For getStatusField function - set here as it stops it being defined multiple times in a complex function and is easier to maintain if changes are needed.
    welfNeeds2Status: {
      "Household Goods and Services" : "householdgoodsreferralstatus",
      "Shelter and Accommodation" : "shelteraccomreferralstatus",
      "Animal Welfare" : "animalreferralstatus",
      "Health or Disability" : "healthdisabilityreferralstatus",
      "Financial Assistance" : "financialassistreferralstatus",
      "Psychosocial Support" : "psychosocialreferralstatus",
      "Missing Person" : "missingpersonreferralstatus"
    },
  },
  // Filtering options across application. There are two types of filtering; "quick" for a selection of premade filters and
  // "normal" for fully custom sql based filtering 
  filtering: {
    // Filter config
    filters: [],
    // Filtering on or off?
    filterBool: false,
    quickFilterBool: true,
    // Filter SQL expressions
    filterSQL: '',
    quickSQL: '',
    // Quickfilter option selected
    quickFilterSelection: '',
    // For the quickfilter feature
    subtableProps: {
      "overview": {
        cssOverdue: "overdue",
        cssDueTomorrow: "due-tomorrow",
        reset: "",
        overdue: "(properties->alert LIKE '%overdue%')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow%')",
        urgent: "(properties->missingpersonpriority = 'Urgent' AND properties->missingpersonreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->householdgoodspriority = 'Urgent' AND properties->householdgoodsreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->shelteraccompriority = 'Urgent' AND properties->shelteraccomreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->animalpriority = 'Urgent' AND properties->animalreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->healthdisabilitypriority = 'Urgent' AND properties->healthdisabilityreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->financialassistpriority = 'Urgent' AND properties->financialassistreferralstatus NOT IN('Actioned', 'Withdrawn')) OR (properties->psychosocialpriority = 'Urgent' AND properties->psychosocialreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->missingpersonreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->householdgoodsreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->shelteraccomreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->animalreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->healthdisabilityreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->financialassistreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency')) OR (properties->psychosocialreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "missingperson": {
        cssOverdue: "overdue-missingperson",
        cssDueTomorrow: "due-tomorrow-missingperson",
        reset: "(properties->missingpersonreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-missingperson%' AND properties->missingpersonreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow-missingperson%' AND properties->missingpersonreferral = 'Yes')",
        urgent: "(properties->missingpersonpriority = 'Urgent' AND properties->missingpersonreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->missingpersonreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "householdgoods": {
        cssOverdue: "overdue-householdgoods",
        cssDueTomorrow: "due-tomorrow-householdgoods",
        reset: "(properties->householdgoodsreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-householdgoods%' AND properties->householdgoodsreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%tomorrow-householdgoods%' AND properties->householdgoodsreferral = 'Yes')",
        urgent: "(properties->householdgoodspriority = 'Urgent' AND properties->householdgoodsreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->householdgoodsreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "shelteraccommodation": {
        cssOverdue: "overdue-shelteraccommodation",
        cssDueTomorrow: ".due-tomorrow-shelteraccommodation",
        reset: "(properties->shelteraccomreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-shelteraccommodation%' AND properties->shelteraccomreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%.due-tomorrow-shelteraccommodation%' AND properties->shelteraccomreferral = 'Yes')", urgent : "(properties->shelteraccompriority = 'Urgent' AND properties->shelteraccomreferralstatus NOT IN('Actioned', 'Withdrawn'))", unactioned : "(properties->shelteraccomreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "animalwelfare": {
        cssOverdue: "overdue-animalwelfare",
        cssDueTomorrow: "due-tomorrow-animalwelfare",
        reset: "(properties->animalreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-animalwelfare%' AND properties->animalreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow-animalwelfare%' AND properties->animalreferral = 'Yes')",
        urgent: "(properties->animalpriority = 'Urgent' AND properties->animalreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->animalreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "healthdisability": {
        cssOverdue: "overdue-healthdisability",
        cssDueTomorrow: "due-tomorrow-healthdisability",
        reset: "(properties->healthdisabilityreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-healthdisability%' AND properties->healthdisabilityreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow-healthdisability%' AND properties->healthdisabilityreferral = 'Yes')", 
        urgent: "(properties->healthdisabilitypriority = 'Urgent' AND properties->healthdisabilityreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->healthdisabilityreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      },
      "financialassistance": {
        cssOverdue: "overdue-financialassistance",
        cssDueTomorrow: "due-tomorrow-financialassistance",
        reset: "(properties->financialassistreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-financialassistance%' AND properties->financialassistreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow-financialassistance%' AND properties->financialassistreferral = 'Yes')",
        urgent: "(properties->financialassistpriority = 'Urgent' AND properties->financialassistreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->financialassistreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
    },
      "psychosocialsupport": {
        cssOverdue: "overdue-psychosocialsupport",
        cssDueTomorrow: "due-tomorrow-psychosocialsupport",
        reset: "(properties->psychosocialreferral = 'Yes')",
        overdue: "(properties->alert LIKE '%overdue-psychosocialsupport%' AND properties->psychosocialreferral = 'Yes')",
        dueTomorrow: "(properties->alert LIKE '%due-tomorrow-psychosocialsupport%' AND properties->psychosocialreferral = 'Yes')",
        urgent: "(properties->psychosocialpriority = 'Urgent' AND properties->psychosocialreferralstatus NOT IN('Actioned', 'Withdrawn'))",
        unactioned: "(properties->psychosocialreferralstatus IN ('New', 'Referred_Within_CDC', 'Referred within CDC', 'Acknowledged_by_Agency', 'Acknowledged by Agency'))"
      }
    },
  },
  ui: {
    // Icons used for table views/welfare need types
    icons: {
      overview: '<i class="far fa-caret-square-down"></i>',
      requestor: '<i class="far fa-user"></i>',
      missing: '<i class="far fa-address-card"></i>',
      house: '<i class="fas fa-utensils"></i>',
      shelter: '<i class="fas fa-house-user"></i>',
      animal: '<i class="fas fa-paw"></i>',
      health: '<i class="fas fa-notes-medical"></i>',
      financial: '<i class="fas fa-money-check-alt"></i>',
      psychosocial: '<i class="fas fa-heart"></i>',
      notes: '<i class="far fa-sticky-note"></i>',
      system: '<i class="fas fa-info-circle"></i>',
      full: '<i class="fas fa-expand"></i>'
    },
    // css classes to welfare needs
    welfareClassesCSS: {
      'missing-person': 'Missing Person',
      'household-goods': 'Household Goods and Services',
      'accommodation-shelter': 'Shelter and Accommodation',
      'animal-welfare': 'Animal Welfare',
      'health-disability': 'Health or Disability',
      'financial-assistance' : 'Financial Assistance',
      'psychosocial-support' : 'Psychosocial Support'
    }
  },
  domElems: {
    /*
    Set DOM elements to variables
    If a dom el. is not set as a variable below, it is due to it causing an error when set as variable on page init
    OR it is only used once inside a workflow (not needed to be loaded into memory for performance).
    */
    aboutBtn: $("#about-btn"),
    aboutModal: $("#about-modal"),
    batchEditFooter: $("#batch-edit-footer"),
    batchEditModal: $("#batch-edit-modal"),
    batchEditSubmit: $("#batch-submit"),
    batchEditTab: $("#batch-edit-tab"),
    batchEditWarning: $("#batch-edit-warning"),
    batchEditWarningText: $("#batch-edit-warning-text"),
    batchUpdateGroup: $(".batch-update-group"),
    bidfoodButton: $("#bidfood-checked"),
    cdemSelectButton: $("#cdem-select-button-group"),
    closeFeatureBtn: $("#close-feature-btn"),
    continueToApp: $("#continue-to-app"),
    delBottomArea: $("#delete-bottom-area"),
    delRowAlert: $("#delete-row-alert"),
    delWarning: $("#batch-delete-warning"),
    documentHTML: $(document),
    editButton: $('#edit-button'),
    editGroup: $('#edit-group'),
    extentBtn: $("#extent-btn"),
    featureCount: $("#feature-count"),
    featureInfo: $('#feature-info'),
    featureLink: $('.feature-link'),
    featureModal: $("#feature-modal"),
    featureTabs: $('#feature-tabs'),
    filterBtn: $("#filter-btn"),
    fixedTableContainer: $(".fixed-table-container"),
    htmlBody: $("#body"),
    leafletPopupClose: $(".leaflet-popup-close-button"),
    loadingAjaxHTML: $("#loading-ajax"),
    loadingMask: $("#loading-mask"),
    mainDelAlertText: $("#main-delete-alert-text"),
    table: $("#main-table"),
    mapContainer: $("#map-container"),
    navbar: $("#navbar"),
    navbarCollapseIn: $(".navbar-collapse.in"),
    progressBarHold: $(".progress-bar-hold"),
    progressBarHold5sec: $(".progress-bar-hold-5-sec"),
    queryBuilder: $("#query-builder"),
    quickFilterHTML: $("#quick-filters"),
    saveBtn: $('#btn-save'),
    selectCDEMList: $(".select-cdem-list"),
    signIn: $("#sign-in"),
    signOut: $("#sign-out"),
    signOutMSBtn: $("#sign-out-ms-acc"),
    splashContainer: $("#splash-container"),
    splashTitle: $("#splash-title"),
    tableContainer: $("#table-container"),
    tableView: $("#table-view"),
    viewHTML: $("#view"),
    windowHTML: $(window)
  },
  identify: {
    featureAttributes: [],
    featureFields: [],
    // The tab that opens when a record is double clicked/identified - opens to relevant subtable view.
    idTabView: 'overview',
    // Set subtable to info tab match
    tabLookup: {
      "overview": "#overview-tab",
      "requestor": "#requestor-tab",
      "missingperson": "#missing-person-tab",
      "householdgoods": "#household-tab",
      "shelteraccommodation": "#accommodation-tab",
      "animalwelfare": "#animal-welfare-tab",
      "healthdisability": "#health-disability-tab",
      "financialassistance": "#financial-assistance-tab",
      "psychosocialsupport": "#psychosocial-support-tab",
      "notes": "#notes-tab",
      "system": "#system-tab"
    }
  },
  editing: {
    // Build the field domains in the batch edit form.
    fieldLookup: {
      "cdemgroup": "#cdem-groups",
      "district": "#cdem-district",
      "missingpersonpriority": "#missing-person-priority",
      "missingpersonreferralstatus": "#missing-person-status",
      "householdgoodspriority": "#household-goods-priority",
      "householdgoodsreferralstatus": "#household-goods-status",
      "shelteraccompriority": "#accommodation-shelter-priority",
      "shelteraccomreferralstatus": "#accommodation-shelter-status",
      "animalpriority": "#animal-welfare-priority",
      "animalreferralstatus": "#animal-welfare-status",
      "healthdisabilitypriority": "#health-disability-priority",
      "healthdisabilityreferralstatus": "#health-disability-status",
      "financialassistpriority": "#financial-assistance-priority",
      "financialassistreferralstatus": "#financial-assistance-status",
      "psychosocialpriority": "#psychosocial-support-priority",
      "psychosocialreferralstatus": "#psychosocial-support-status",
    },
  },
  delete: {
    // Object IDs for record delete function
    oIDs: [],
  },
  bidfood: {
    // Bidfood form iterator, holds what page is currently being processed.
    iterator: 0,
    // Fields to be used in the bidfood form and their respective dom element name (the key)
    fieldToDom: {
      "name": "names_",
      "street-address-l1": ["stayingpropertyname","stayingflatnumber", "stayingstreetnumber", "stayingstreet"],
      "street-address-l2": "stayingsuburb",
      "city": "stayingcitytown",
      "region": "cdemgroup",
      "postcode": "stayingpostcode",
      "delivery-eta": "householdgoodspriority",
      "cd-contact-person": "",
      "regional-acc-num": "",
      "cd-contact-number": "",
      "general-qty": "foodnodietaryreq",
      "vegetarian-qty": "foodvegetarianreq",
      "vegan-qty": "foodveganreq",
      "dairy-free-qty": "fooddairyfreereq",
      "gluten-free-qty": "foodglutenfreereq",
      "cat-qty": "foodcatfoodreq",
      "dog-qty": "fooddogfoodreq",
      "bathroom-qty": "cdemnonfoodpacka",
      "household-free-qty": "cdemnonfoodpackb",
      "masculine-qty": "cdemnonfoodpackc",
      "feminine-qty": "cdemnonfoodpackc"
    }
  },
  // The tour is opened on the first time the user accesses the system. It provides them with an interactive view of what the
  // Tool can do and how to use it.
  tour: {
    instance: {},
    steps: [
      {
        element: "#about-btn",
        placement: "bottom",
        title: "About this app",
        content: "View information relating to this Awhina Deployment.<ul><li>User/Help Guides.</li><li>FeatureLayer Sources.</li><li>Version information.</ul>"
      },
      {
        element: "#extent-btn",
        placement: "bottom",
        title: "Zoom to full extent",
        content: "Show the entire dataset in the map and table views."
      },
      {
        element: "#survey123-btn",
        placement: "bottom",
        title: "View Survey123",
        content: "Access the Survey123 Form from your computer.<br>Used to collect new referrals."
      },
      {
        element: "#dashboard-btn",
        placement: "bottom",
        title: "View Dashboard",
        content: "Contains summary statistics of the Awhina Deployment.<br>How many household goods referrals, total referrals actioned etc."
      },
      {
        element: "#nav-button-group",
        placement: "bottom",
        title: "Change View",
        content: "Choose how to view the data:<ul><li>Map view only.</li><li>Table only.</li><li>Map/Table together (Split).</li></ul>"
      },
      {
        element: "#sign-button-group",
        placement: "bottom",
        title: "User Sign out",
        content: "Sign out of this account."
      },
      {
        element: "#map",
        placement: "right",
        onShown: function(){
          $(".popover").css("margin-left", "125px")
        },
        title: "Map View - Data",
        content: "Shows the current locations of all Awhina Referrals you have access to.<ul><li>Data is merged together into pie charts for easy viewing at higher zoom levels.</li><li>Hover over a pie charts colour section to view the number of referral totals by status.</li><li>Click on the pie charts to zoom in quickly to that area.</li><li>Zooming in closer will expand the pie charts to the individual points.</li></ul>"
      },
      {
        element: "#map",
        placement: "right",
        onShown: function(){
          $(".popover").css("margin-left", "125px")
        },
        title: "Map View",
        content: "<ul><li>Hover over an individual point to quickly view name and referall status's.</li><li>Double click on a point to bring up its feature information/edit it.</li></ul>"
      },
      {
        element: "#map",
        placement: "right",
        onShown: function(){
          $(".popover").css("margin-left", "125px")
        },
        title: "Map View",
        content: "<ul><li>Right click on the map to show the address.</li><li>Search for an address using the search icon on the left.</li><li>Change the basemap and layer view (either pie charts or individual points) in the table of contents.</li></ul>"
      },
      {
        element: "#filter-btn-1",
        placement: "top",
        title: "Filter the data",
        content: "Highly customisable filtering options allow you to drill down to the exact referrals you need."
      },
      {
        element: "#quick-filters",
        placement: "top",
        title: "Quick Filter",
        content: "Quickly filter the data with the most common options."
      },
      {
        element: "#table-views",
        placement: "top",
        title: "Table views",
        content: "Change the information you want to view in the map and table.<br>Household Goods, Shelter and Accommodation..."
      },
      {
        element: ".search-input",
        placement: "top",
        title: "Search",
        content: "Quickly search through the referrals."
      },
      {
        element: ".columns-right",
        placement: "top",
        title: "Table toolbar",
        content: "<ul><li>Toggle the table view between rows and cards (useful if there are a large amount of columns in the table).</li><li>Turn off and on fields.</li><li>Export the data to your desktop.</li></ul>"
      },
      {
        element: "#main-table",
        placement: "bottom",
        onShown: function(){
          $(".popover").css("margin-right", "125px")
        },
        title: "Table features",
        content: "Double click a record to open the feature information."
      },
      {
        element: 'input[name="btSelectAll"]:first',
        placement: "top",
        title: "Check records",
        content: "Check multiple records to open the batch tools:<ul><li>Batch Editing.</li><li>Batch Bidfood Orders (Household Goods view only).</li><li>Batch Delete.</li></ul>"
      },
      {
        element: '.row-dropdown:first',
        placement: "right",
        title: "Action record",
        content: "Click on the dropdown option next to the check boxes for individual tools:<ul><li>Zoom.</li><li>Identify (Feature Information),</li><li>Edit Record.</li><li>Create Bidfood Form</li><li>Delete Record</li></ul>"
      }
    ]
  }
}

// Location of - updates on creation of project
// PROD_TODO: Project config json file location needs to change to the prod location - most likely as below
// const projectConfigSource = "portalconfig.json";

// Global functions/prototypes --------------------------------------------------------

/**
 * Removes an element from an array.
 * Note there is only one input parameter, the second one is generated in the function.
 * You can see how this works by looking at its implementation in the code.
 * @param  {array} array  - The array to remove the elements from
 * @returns  {array} array - The array object is returned with the elements removed.
 */
function removeFromArray(array) {
  let element;
  let argLen = arguments.length;
  let ax;
  while (argLen > 1 && array.length) {
    element = arguments[--argLen];
    while (ax = array.includes(element)) {
      array.splice(ax, 1);
    }
  }
  return array;
}

/*
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Load the config as the first thing. This holds all the custom variables for the deployment.
Then initiate the sign in section on success. On success of the sign in function it enables the user to proceed to the app
and then initiates the first data call, it then starts the worker for refreshing data.

After this is complete the document loads the function that starts looking for Ajax calls being used
by the app and brings up the loading mask and bar
(this helps the user not use the system when data is being updated/loaded)

++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

/**
 * Get the custom config variables from the hosted file
 * @global  {object} awhina.instance.configURI - The uri to the file in the project folder.
 * Source json config file URI found in the project folder on the server.
 */
fetch(awhina.instance.configURI)
  .then(response => response.json())
  .then(result => {
    // Set the title of the app
    awhina.domElems.splashTitle.text(result.emergencyName);
    // Hide spinner on select CDEM button
    awhina.domElems.cdemSelectButton.prop("disabled", false);
    awhina.domElems.cdemSelectButton.html("SELECT CDEM ");
    awhina.domElems.cdemSelectButton.addClass('shake-bottom');
    let keys = Object.keys(result.cdemGroups);
    // If this is for a single CDEM deployment, auto set the details automatically.
    if (keys.length == 1){
      awhina.instance.config = result.cdemGroups[keys[0]];
      // Add in all the items that will not change to the instance config
      awhina.instance.config.title = result.title
      awhina.instance.config.emergencyName = result.emergencyName
      awhina.instance.config.welfareNeeds = result.welfareNeeds
      awhina.instance.config.awhinaDeploymentURL = result.awhinaDeploymentURL
      awhina.instance.config.portalURL = result.portalURL
      awhina.instance.config.survey123URL = result.survey123URL
      // Set up any initialisation functions that need to use the config information
      awhina.data.activeView.url = awhina.instance.config.layerURLs[awhina.data.activeView.name];
      awhina.appConfig.portalCDEMGroup = awhina.instance.config.cdemGroup;
      // Set CDEM Group in button
      $(".cdem-select-button-group").text(awhina.appConfig.portalCDEMGroup);
      // Set the about modal details
      setAboutModalDetails();
      // Load UI Params and Start the sign in and out functionality
      awhina.domElems.signIn.prop('disabled', false);
      awhina.domElems.signIn.addClass('shake-bottom');
      // Build the user interface with the custom info for this portal instance.
      initPortalUI();
      // Load sign in and out functionality
      signInAndOut();
    }
    /*
    If there are multiple CDEM Groups that cannot see each others data,
    Give the user the option to select which CDEM they will access - actual data availability
    is based off permissions in enterprise - NOT this app. If a user selects a dataset they do not
    have access to, no data is returned.
    Portal continues to init after user selects CDEM
    */
    else if (keys.length >= 2){
      awhina.instance.fullConfig = result;
      l(result);
      let buttonUL = awhina.domElems.selectCDEMList;
      for (let i = 0, len = keys.length; i < len; i++) {
        const cdemGroup = Object.keys(result.cdemGroups).find(key => result.cdemGroups[key] === result.cdemGroups[keys[i]]);
        // Create list element store attributes in script tag for easy access in next sections of workflow.
        const li =' <li class="dropdown-item btn btn-light" href="#" data-toggle="collapse" data-target=".navbar-collapse.in">' + cdemGroup + '</li>'
        buttonUL.append(li);
      }
      $("#select-cdem-list-container").show();
    }
  });


/**
 * If multiple CDEM datasets, let user select one. This is passed through into what info is pulled from
 * the config file.
 */
$(document).on("click", "#select-cdem-list > li", function(){
  awhina.appConfig.portalCDEMGroup = $(this).text();
  $(".cdem-select-button-group").text(awhina.appConfig.portalCDEMGroup);
  awhina.instance.config = awhina.instance.fullConfig.cdemGroups[awhina.appConfig.portalCDEMGroup];
  // Add in all the items that will not change to the instance config
  awhina.instance.config.title = awhina.instance.fullConfig.title
  awhina.instance.config.emergencyName = awhina.instance.fullConfig.emergencyName
  awhina.instance.config.welfareNeeds = awhina.instance.fullConfig.welfareNeeds
  awhina.instance.config.awhinaDeploymentURL = awhina.instance.fullConfig.awhinaDeploymentURL
  awhina.instance.config.portalURL = awhina.instance.fullConfig.portalURL
  awhina.instance.config.survey123URL = awhina.instance.fullConfig.survey123URL
  awhina.data.activeView.url = awhina.instance.config.layerURLs[awhina.data.activeView.name];
  // Set the about modal details
  setAboutModalDetails();
  // Load UI Params and Start the sign in and out functionality
  awhina.domElems.signIn.prop('disabled', false);
  awhina.domElems.signIn.addClass('shake-bottom');
  // Load sign in and out functionality
  signInAndOut();
  // Initiate the portal user interface customisations (navbar title and welfare groups used)
  initPortalUI();
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/**
 * Allows user to change the CDEM Group in app (under the about button).
 * Changing the CDEM Group resets the app in a similar way as to when it first initialises.
 * Data is loaded again and the worker is restarted.
 */
$(document).on("click", "#change-cdem-group > li", function(){
  // Set the app details to the new group.
  awhina.appConfig.portalCDEMGroup = $(this).text();
  awhina.instance.config = fullConfig[awhina.appConfig.portalCDEMGroup];
  awhina.data.activeView.url = awhina.instance.config.layerURLs[awhina.data.activeView.name];
  // Set the about modal details to the new group
  setAboutModalDetails();
  // Initiate the portal user interface customisations (navbar title and welfare groups used)
  initPortalUI();
  // Load the data (for first time of new CDEM Group)
  loadDataESRI(false);
  // re-load the web worker with new config values
  try {
    if (awhina.data.worker){
      awhina.data.worker.terminate();
    }
  } catch (error) {
    alert("Error changing CDEM Group  - Please refresh the website.");
  }
  // Restart the worker for the new datasets
  refreshListener();
});

/**
 * The about button in the navbar contains a set of links to the dataset urls - this updates them
 * with the urls found in the config.
 */
function setAboutModalDetails() {
  $("#awhina-version span").html(awhina.appConfig.version);
  $("#about-fullLayer a").attr("href", awhina.instance.config.layerURLs.fullLayer);
  $("#about-overview a").attr("href", awhina.instance.config.layerURLs["overview"]);
  $("#about-missingperson a").attr("href", awhina.instance.config.layerURLs["missingperson"]);
  $("#about-householdgoods a").attr("href", awhina.instance.config.layerURLs["householdgoods"]);
  $("#about-shelteraccommodation a").attr("href", awhina.instance.config.layerURLs["shelteraccommodation"]);
  $("#about-animalwelfare a").attr("href", awhina.instance.config.layerURLs["animalwelfare"]);
  $("#about-healthdisability a").attr("href", awhina.instance.config.layerURLs["healthdisability"]);
  $("#about-financialassistance a").attr("href", awhina.instance.config.layerURLs["financialassistance"]);
  $("#about-psychosocialsupport a").attr("href", awhina.instance.config.layerURLs["psychosocialsupport"]);
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * Displays a loading bar for any REST API Calls, has to be here or it jams the above first function.
 * Includes some logic to stop it showing up if the splash page is visible.
 */
awhina.domElems.documentHTML.ajaxStart(function() {
  if(awhina.domElems.splashContainer.is(":hidden")){
    awhina.domElems.loadingAjaxHTML.show();
  }
});
awhina.domElems.documentHTML.ajaxStop(function() {
  awhina.domElems.loadingAjaxHTML.hide();
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Initiate functions that run at page load:
- Customise the UI.
- Add an event listener to detect if app is offline.
- Build the tour.
that shows users around the system (only runs once unless cookies deleted or using private browsing).
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * Builds the user interface with the custom details of the awhina deployment:
 * What CDEM group is being used, the name of the event an the welfare types used in the system.
 */
function initPortalUI() {
  // Set HTML elements
  $(".navbar-title").html(awhina.appConfig.portalCDEMGroup + awhina.instance.config.title + awhina.instance.config.emergencyName);
  // Check what Welfare Types are in config and hide others
  Object.entries(awhina.ui.welfareClassesCSS).forEach((entry) => {
    if (!awhina.instance.config.welfareNeeds.includes(entry[1])){
      $("." + entry[0]).hide();
    }
  })
  // Depending on how the app is opened or refreshed - set the layout.
  if (location.hash == "#split") {
    awhina.domElems.filterBtn.hide();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Feature Extent');
    switchView("split");
  } else if (location.hash == "#map") {
    awhina.domElems.filterBtn.show();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Feature Extent');
    switchView("map");
  } else if (location.hash == "#table") {
    awhina.domElems.filterBtn.hide();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Show all records');
    switchView("table");
  }
}

/**
 * Detect offline status - and show message if offline.
 */
window.addEventListener('offline', function(event){
  alert("You are offline, changes you make will not be saved. Please go online to edit/make changes and view new data.");
});


/**
 * Build tour and show on first use of the system.
 * Tour session information is stored in a cookie and won't run again unless the cookie is deleted or expires.
 * (Note: a deprecated "":first" jquery selector is used for a few steps due to the .first()
 * jquery method not working with bootstrap tour).
 */
awhina.tour.instance = new Tour({
  framework: 'bootstrap4',
  showProgressBar: false,
  showProgressText: false,
  steps: awhina.tour.steps
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to loading Data
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

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
function signInAndOut(){
  require(["esri/portal/Portal","esri/identity/OAuthInfo","esri/identity/IdentityManager"], function(Portal, OAuthInfo, identityManager) {
    // create oAuth information payload
    const info = new OAuthInfo({
      appId: awhina.appConfig.appID,
      portalUrl: awhina.appConfig.portalURL,
      popup: true,
      popupCallbackUrl: awhina.appConfig.popupURL
    });
    // Register it...
    identityManager.registerOAuthInfos([info]);
    /**
     * Sign in functionality - will only fire the 'then' condition when the sign in occurs.
     * The catch will run on first init when the user is not signed in. Both lead to the same load portal function.
    */
    identityManager.checkSignInStatus(awhina.appConfig.portalURL + "/sharing").then(function() {
      loadPortal();
    }).catch(() => {
      loadPortal();
    });

    /**
     * After authentication, this loads the portal information and fills in the app user details.
     * Also sets some UI information.
     */
    function loadPortal(){
      const portal = new Portal(awhina.appConfig.portalURL);
      // Once the portal has loaded, the user is signed in
      portal.authMode = "immediate";
      portal.load().then(() => {
        // Fill in the user config
        awhina.user.token = portal.credential.token;
        awhina.user.username = portal.user.username;
        awhina.user.fullname = portal.user.fullName;
        awhina.user.role = portal.user.role;
        // Add the uesrname to the bidfood dom map
        awhina.bidfood.fieldToDom["cd-contact-person"] = portal.user.username;
        // Set the names throughout the app
        awhina.domElems.signIn.text(awhina.user.username);
        awhina.domElems.signIn.prop('disabled', false);
        $("#login").text(" " + awhina.user.fullname);
        // Enable button to continue to the app
        awhina.domElems.continueToApp.prop('disabled', false);
        awhina.domElems.continueToApp.addClass('shake-bottom');
      });
    }

    // On clicking the sign in button, this will attempt to get the stored credentials,
    // Negating the need for signing in all the time (expires in 24hours).
    document.getElementById("sign-in").addEventListener("click", () => {
      // Checks if valid credential exists and if not directs user to OAuth Sign In page
      identityManager.getCredential(awhina.appConfig.portalURL + "/sharing");
    });
    
    // Log out and reload to default state
    awhina.domElems.signOut.click(function(){
      // Load id manager and then destroy it.
      require(["esri/identity/IdentityManager"], function(identityManager) {
          identityManager.destroyCredentials();
        });
      window.location.reload();
      // Make sure the user details are empty.
      awhina.user = {};
    });
  });
}

/**
 * Button click functionality that must sit outside of the signinout function.
 */
awhina.domElems.signIn.click(function() {
  // Disable button
  awhina.domElems.signIn.prop('disabled', true);
  // Set the button to a loading spinner
  awhina.domElems.signIn.html('<div class="spinner-border spinner-border-sm" role="status"></div>');
});

/**
 * Button click for signing out of MS Account - redirects user to the logout page.
 */
awhina.domElems.signOutMSBtn.click(function() {
  try {
    // Attempt to sign out of awhina if user signed in.
    // Load id manager and then destroy it.
    require(["esri/identity/IdentityManager"], function(identityManager) {
      identityManager.destroyCredentials();
    });
    window.location.reload();
    // Make sure the user details are empty.
    awhina.user = {};
  }
  catch{
    l("Did not destroy user Awhina credentials - most likely user was not signed in.")
  }
  // Redirect to sign out page.
  // Tried using an invisible iframe to keep user on page - there are major issues with that method.
  // It does not return a result to indicate sign out action completed. So keep this method instead.
  location.href = "https://login.windows.net/common/oauth2/logout";
})

/**
 * Clicking the continue to app button will:
   - Hide the loading 'splash' screen.
   - Load the data for the first time.
   - Setup the web worker that updates the data every 15 seconds.
   - Shows the map container.
   - Starts the tour if this is the first time the app ahs been opened by the user.
 */
awhina.domElems.continueToApp.click(function() {
  $("#splash-background").hide();
  $("#splash-container").hide();
  // Load the data (for first time)
  loadDataESRI(false);
  // Load the web worker to check for updates
  refreshListener();
  // Show map container
  awhina.domElems.mapContainer.show();
  // Start the tour
  awhina.tour.instance.start();
  // Uncomment for testing tour functionality (will load it on every page load.)
  awhina.tour.instance.restart();
})

/**
 * Pulls the current layer information from enterprise and parses it into the proper format via buildFieldProperties().
 * This includes adding extra static/app only data fields to the fields already in the dataset.
 */
function buildLayerConfig(){
  $.ajax({
    url: awhina.data.activeView.url,
    method:"GET",
    data: {
      f: "json",
      token: awhina.user.token,
    }
  })
  .done(function(result){
    // Build the field properties (global var)
    awhina.data.fieldProperties = buildFieldProperties(result.fields, awhina.data.activeView.name)
    // Add in the welfare icon field if it is overview
    if (awhina.data.activeView.name == "overview"){
      awhina.data.fieldProperties = awhina.data.fieldProperties.concat(awhina.table.welfareIconProperties);
    }
    // Add the other static fields to the field properties
    awhina.data.fieldProperties = awhina.data.fieldProperties.concat(awhina.table.staticProperties);
  });
}

/**
 * Generate the field properties for the system.
 * @param  {array} fields - Contains the list of fields to update
 * @returns {array} properties - Contains the porperties of each field (in an object)
 *                               This is then parsed by the table into the correct format.
 */
function buildFieldProperties(fields, view){
  const properties = [];
  for (let i = 0, len = fields.length; i < len; i++) {
    const field = fields[i];
    const subset = fieldIncludedInViews(field);
    let x = {
      value: field.name,
      subset: subset,
      label: field.alias,
      editable: field.editable,
      fieldtype: field.type,
      domain: returnDomainValues(field),
      table: {
        visible:  fieldVisibleInViews(field, view),
        sortable: true,
      },
      filter: {
        values: []
      }
    }
    // Any fields in date format are parsed into human readible output.
    if (field.type == "esriFieldTypeDate"){
      x.formatter = dateFormatter;
      x.table.sorter = dateSorter;
    }
    properties.push(x)
  }
  return properties;
}

/**
 * Subfunction for buildFieldProperties - Gets the domain values from the layer configuration.
 * @param  {object} field - The properties being defined in the primary function
 * @returns {array} fieldDomains - The returned array that contains the formatted domain values. 
 */
function returnDomainValues(field){
  if (field.domain && field.domain.codedValues){
    const fieldDomains = [];
    for (let i = 0; i < field.domain.codedValues.length; i++) {
      fieldDomains.push(field.domain.codedValues[i].code);
    }
    return fieldDomains;
  }
}


/**
 * Subfunction for buildFieldProperties - Returns the table views the field will show up in.
 * The information that holds what views the field appears in is taken from the field description
 * That is stored in the active layer configuration information.
 * This function works in tandem with the feature view defined fields. - i.e. The household goods feature view 
 * only includes the relevant fields in it, however even some of those fields may not be needed to be included in the
 * table view (object id, created by as examples).
 * The layer configuration information is pulled fromt the ESRI Enterprise.
 * @param  {object} field - The current field parsed into the function.
 * @returns  {array} views - The views the field will be included in.
 */
function fieldIncludedInViews(field){
  let views = ['all'];
  if (field.description){
    const d = JSON.parse(field.description);
    if (d.value){
      // Try here to get around any issues
      try {
        const description = JSON.parse(d.value);
        if (description.includeIn){
          views = description.includeIn;
        }
      } catch (error) {
        e("Error in setting subset of field " + field.name + ". Defaulted to ALL fields: ", error);
      }
    }
  }
  return views
}

/**
 * Subfunction for buildFieldProperties - Returns true/false if field should be visible in the current table.
 * The visibleIn properties hosted in the field descriptions of the feature layer in ESRI enterprise define this.
 * @param  {object} field - The current field parsed into the function.
 * @returns {boolean} visible - boolean if it is visible in the table.
 */
function fieldVisibleInViews(field, view){
  let visible = false;
  if (field.description) {
    const d = JSON.parse(field.description);
    if (d.value){
      try {
        const description = JSON.parse(d.value);
        if (description.visibleIn.some(r=> [view, "all"].includes(r))){
          visible = true;
        }
        // If it is visible in any view, then ensure it shows up in the fulltable view.
        if (view == "fulltable" && description.visibleIn.length >= 1){
          visible = true;
        }
      } catch (error) {
        e("Error in setting visibility of field " + field.name + ": ", error);
      }
    }
  }
  return visible
}

/**
 * Main function to load data from ESRI Enterprise into the portal. Is run on initialisation of the
 * portal view and when the table view is changed (this changes what layer is loaded into the system).
 * Applies filtering if any is currently set by the user.
 * Automatic data refreshes are handled by the web worker initialised by the refreshListener function.
 * @global {object} awhina.data.dataset - The main dataset this function loads data into - used across the app.
 * @global {object} awhina.data.featurelayer - The main featurelayer for the map view - used across the app.
 * @global {object} awhina.data.clusterlayer - The cluster layer for the map view.
 */
function loadDataESRI(){
  // Set the active feature view url from the config
  awhina.data.activeView.url = awhina.instance.config.layerURLs[awhina.data.activeView.name];
  // Pull in the layer details of the layer to build datasets, filtering and edit form.
  buildLayerConfig();
  // Fetch the Awhina dataset and convert to GeoJSON (Way faster than loading the geojson from esri)
  const geoFeatures = [];
  const dToday = new Date();
  // Construct Query and then Query layer server side.
  // If portal created for all users to access all data OR if set to only allow access to users CDEM Group data.
  const queryDef = "/query?where=1%3D1&units=esriSRUnit_Meter&outSR=4326&outFields=*"
  $.ajax({
    url: awhina.data.activeView.url + queryDef,
    method:"GET",
    data: {
      f: "json",
      token: awhina.user.token,
    }
  }).done(function(result){
    // User has access to portal but not to the layer!
    if (result.error){
      if (result.error.code == 403){
        require(["esri/identity/IdentityManager"], function(identityManager) {
            identityManager.destroyCredentials();
          });
        window.location.replace(awhina.appConfig.accessDeniedURL);
      }
    }
    // If there are features, proceed
    if (result.features && result.features.length > 0){
      // Define the welfareneeds and icons locally for faster perfromance when iterating over the dataset
      const welfareNeeds = awhina.instance.config.welfareNeeds;
      const icons = awhina.ui.icons;
      const subtableMatch = awhina.table.subtableMatch;
      for (let key in result.features){
        // Fill in Alert field with the row class - has to be here due to filtering + it's faster than in the set class of the table
        [result.features[key].attributes.welfareicons, result.features[key].attributes.alert] = welfareNeedsFormatter(result.features[key].attributes, dToday, welfareNeeds, icons, subtableMatch);
        // Construct a GeoJSON from the returned json
        const fgeoJSON = {
          type: 'Feature',
          properties: result.features[key].attributes,
          geometry: {
            type: 'Point',
            coordinates: [result.features[key].geometry.x, result.features[key].geometry.y]
          }
        }
        geoFeatures.push(fgeoJSON);
      }
      awhina.data.dataset = {type : 'FeatureCollection', features : geoFeatures};
      // Build the map data and table
      // Depending on if filters are applied, resync with filtering.
      if (!awhina.filtering.quickFilterBool && awhina.filtering.filterBool){
        applyFilter(awhina.data.dataset, true);
      }
      else if (awhina.filtering.quickFilterBool && !awhina.filtering.filterBool){
        quickFilter(awhina.filtering.quickSQL);
      }
      else if (awhina.filtering.quickFilterBool && awhina.filtering.filterBool){
        // Only need one filter as the quickSQL will be picked up in it.
        applyFilter(awhina.data.dataset, true);
      }
      else {
        awhina.map.featureLayer.clearLayers();
        awhina.map.featureLayer.addData(awhina.data.dataset);
        awhina.map.clusterLayer.clearLayers();
        awhina.map.clusterLayer.addLayer(awhina.map.featureLayer);
      }
      buildTableConfig(awhina.data.activeView.name);
      // On very slow connections the table does not show after loading - this fixes it.
      awhina.domElems.tableContainer.show();
    }
    // Else show no data found
    else {
      awhina.domElems.table.html('<h4 id="no-data" class="no-data">No Features In Dataset</h4>');
      awhina.domElems.loadingMask.hide();
      awhina.domElems.table.show();
    }
    syncTable()
  });
}

/**
 * Refresh table on a set interval. Updates the data and resets the filtering on the data
 * if any is currently selected.
 * @global  {worker} worker - The web worker used in the auto refresh of data.
 * @global {object} awhina.data.dataset - The main dataset this function loads data into - used across the app.
 * @global {object} awhina.data.featurelayer - The main featurelayer for the map view - used across the app.
 * @global {object} awhina.data.clusterlayer - The cluster layer for the map view.
 */
function refreshListener(){
  // Add web worker to listen for deployment status changes
  if (typeof(Worker) !== "undefined") {
    // Create a new web worker
    awhina.data.worker = new Worker("portal-worker.js");
    // Send variables to worker
    awhina.data.worker.postMessage({welfareNeeds: awhina.instance.config.welfareNeeds, icons: awhina.ui.icons, subtableMatch: awhina.table.subtableMatch, user: awhina.user, activeViewURL: awhina.data.activeView.url});
    // Fire onMessage event handler - update rows
    awhina.data.worker.onmessage = function(event) {
      // Reset the feature map (otherwise it doesn't update the table correctly)
      awhina.data.featureMap = {};
      awhina.data.dataset = event.data;
      // Depending on if filters are applied, resync with filtering.
      if (!awhina.filtering.quickFilterBool && awhina.filtering.filterBool){
        applyFilter(event.data, true);
      }
      else if (awhina.filtering.quickFilterBool && !awhina.filtering.filterBool){
        quickFilter(awhina.filtering.quickSQL);
      }
      else if (awhina.filtering.quickFilterBool && awhina.filtering.filterBool){
        // Only need one filter as the quickSQL will be picked up in it.
        applyFilter(event.data, true);
      }
      else {
        // Construct the layers and update the table
        awhina.map.featureLayer.clearLayers();
        awhina.map.featureLayer.addData(event.data);
        awhina.map.clusterLayer.clearLayers();
        awhina.map.clusterLayer.addLayer(awhina.map.featureLayer);
        if (location.hash != '#table'){
          syncTable();
        } else {
          syncTable(refreshMapBounds=false);
        }
      }
    };
  } else {
    $("#web-worker-alert").show();
  }
}


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Editing controls for the app and related buttons. Includes both single editing and batch editing.
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * Add editing control via a form into the portal view app.
 * @param  {number} objectId - The id used by ESRI Enterprise to associate the edits to the record in the dataset.
 */
function editingControl(objectId){
  // Show the loading symbol
  awhina.domElems.loadingAjaxHTML.show();
  // Need to clean the form, otherwise the rows from previous edits display.
  try {$(".esri-feature-form__form").html("");} catch (error){}
  // Load the required dependencies from ESRI js
  require(["esri/widgets/FeatureForm", "esri/layers/FeatureLayer"], function(FeatureForm, FeatureLayer) {
    // Load the feature layer config
    featureLayerConfig = new FeatureLayer({
      url: awhina.instance.config.layerURLs[awhina.identify.idTabView],
      token: awhina.user.token
    });
    // Define the editFeature properties
    let editFeature = {};
    // After the feature layer that will be edited has been loaded get the attributes for the record
    // (So it pulls the most uptodate info about the record.)
    featureLayerConfig.load().then(function() {
      // Hide the loading symbol
      awhina.domElems.loadingAjaxHTML.hide();
      // editButton.prop("disabled", false);
      featureLayerConfig.queryFeatures({
        objectIds: [objectId],
        outFields: ["*"],
        returnGeometry: true
      }).then(function(results) {
        if (results.features.length > 0) {
          editFeature = results.features[0];
          // display the attributes of selected feature in the form
          form.feature = editFeature;
          // Remove the HTML Form elements that should not be shown (non editable and ones set to non-visible in the layer)
          setFormElements();
        }
      });
    });

    // Add a new feature form (this is what is used by the user to update values.)
    const form = new FeatureForm({
      container: "form",
      layer: featureLayerConfig,
    });

    // Listen to the feature form's submit event to upload the changes.
    form.on("submit", function() {
      if (editFeature) {
        // Grab updated attributes from the form.
        const updated = form.getValues();
        // Loop through updated attributes and assign
        // the updated values to feature attributes.
        Object.keys(updated).forEach(function(name) {
          editFeature.attributes[name] = updated[name];
        });
        // Setup the applyEdits parameter with updates.
        const edits = {
          updateFeatures: [editFeature]
        };
        applyAttributeUpdates(edits)
      }
    });

    /**
     * Call FeatureLayer.applyEdits() with specified params and applies the edits.
     * After edits are applied, updates the bootstrap table with the new attributes.
     * @param  {object} params - holds the updated attribute information in the specific format for upload.
     */
    function applyAttributeUpdates(params) {
      const dToday = new Date();
      document.getElementById("btn-save").style.cursor = "progress";
      featureLayerConfig.applyEdits(params).then(function(editsResult) {
        // Get the objectId of the newly added feature.
        if (editsResult.updateFeatureResults.length > 0) {
          // Update the data in the table (just locally right now but will update properly with the 15 second listener event)
          [params.updateFeatures[0].attributes.welfareicons, params.updateFeatures[0].attributes.alert] = welfareNeedsFormatter(params.updateFeatures[0].attributes, dToday, awhina.instance.config.welfareNeeds, awhina.ui.icons, awhina.table.subtableMatch);
          awhina.domElems.table.bootstrapTable('updateByUniqueId', {
            id: params.updateFeatures[0].attributes.objectid,
            row: params.updateFeatures[0].attributes
          });
        }
        document.getElementById("btn-save").style.cursor = "pointer";
      })
      .catch(function(error) {
        alert("Failed to apply edits: "+ JSON.stringify(error.message));
        document.getElementById("btn-save").style.cursor = "pointer";
      });
    }
    
    // Fires feature form's submit event.
    awhina.domElems.saveBtn.click(function() {
      form.submit();
    });
  });
}

/**
 * Some form elements that would show up in the editing form do not need to be there.
 * This function hides these form values that should not be shown (non-editable, non-visible).
 * @param  {array} hElems - The list of HTML elements in the form.
 * @param  {array} fieldProperties - The field properties containing the include in and visibility options.
 */
function setFormElements(){
  // Build the field properties for the returned data
  const fieldProperties = buildFieldProperties(awhina.identify.featureFields, awhina.identify.idTabView)
  const hElems = [];
  // Identify the fields not required
  Object.values(fieldProperties).forEach((field) => {
    if (field.editable === false){
      hElems.push(field.value);
      hElems.push(field.label);
    }
    if (field.table.visible === false){
      hElems.push(field.value);
      hElems.push(field.label);
    }
  });
  // Remove any duplicates in the array above
  const hiddenElems = [...new Set(hElems)];
  // Iterate through the form labels and hide any that should not be shown.
  let labelElems = $("label.esri-feature-form__label");
  for (let i = 0, len = labelElems.length; i < len; i++){
    if (hiddenElems.includes($(labelElems[i]).text())){
      $(labelElems[i]).hide();
    }
  }
}

/**
 * On click of edit button, load the editing control
 */
$('.edit').click(function() {
  editingControl(awhina.data.selectedID)
  awhina.domElems.featureInfo.hide();
  $('#update').show();
  $(this).hide();
  $(this).siblings('.edit-group').show();
});

/**
 * Goes through the related html elements and shows/hides them.
 */
 awhina.domElems.saveBtn.click(function() {
  // FORM SUBMIT FUNCTION SITS UNDER THE FORM GENERATION FOR THE BUTTON CLICK.
  $('#update').hide();
  awhina.domElems.featureInfo.show();
  awhina.domElems.editGroup.hide();
  awhina.domElems.editButton.show();
});

/**
 * On discard of edit form, show/hide related html elements
 */
$('#btn-discard').click(function() {
  $('#update').hide();
  awhina.domElems.featureInfo.show();
  $(this).closest('.edit-container').find('.edit').show();
  $(this).parent('.edit-group').hide();
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Batch Editing
/**
 * Define the batch edit form - include the relevant fields (we don't want a missing person field if this welfare need is not
 * used in the portal view) and update the domains in the form. Then show the form.
 */
function batchEditForm() {
  // Only show the relevant welfare needs.
  for (let key in awhina.data.fieldProperties){
    // Go through the fields in the dataset and if they exist in the editing.feidlLookup, get the domain values for
    // that field from the field properties and add it to the options in the batch edit form.
    // Simplified - show the domain values of the batch edit fields in the batch edit form.
    awhina.editing.fieldLookup[awhina.data.fieldProperties[key].value] ? $(awhina.editing.fieldLookup[awhina.data.fieldProperties[key].value]).html(generateDomainHTML(awhina.data.fieldProperties[key].domain)) : '';
  }
  // Add the warning text with the count of checked records
  awhina.domElems.batchEditWarningText.html("<strong>Warning</strong><br>Changes input below will update <h4 style='color: tomato; display: inline-block;'>" + 
  Object.keys(awhina.data.checkedRowsMap).length + "</h4> checked records.<br>Ensure that only correct records are checked as previous values will be lost.");

  awhina.domElems.batchEditWarning.addClass("alert-warning").removeClass("alert-danger");
  awhina.domElems.batchEditTab.show();
  awhina.domElems.batchEditFooter.show();
  awhina.domElems.batchEditModal.modal("show");
}

/**
 * Build the domain values for the dropdowns in the batch edit form
 * An empty html list option is always added to the top so the list do
 * not default to the first option
 * @param  {array} domain - the domain values to be parsed into html option elems
 * @returns {array} optionValues - the constructed option elements to be inserted into the
 * drop down.
 */
 function generateDomainHTML(domain) {
  const optionValues = ["<option></option>"];
  if (domain && domain != null){
    for (let i = 0, len = domain.length; i < len; i++) {
      optionValues.push("<option>" + domain[i] + "</option>");
    }
  }
  return optionValues
}

/**
 * Initialise the form on button click
 */
$('.edit-checked').click(function() {
  batchEditForm();
});

/**
 * If the form is closed, reset it to its initial state and hide it.
 */
$(".batch-discard").click(function() {
  $('#batch-edit-form').trigger("reset");
  $('#batch-edit-modal').modal('toggle');
});

/**
 * Process to update the selected batch edit records into the dataset in ESRI Enterprise.
 * @global  {object} awhina.data.checkedRowsMap - The rows checked in the table to be updated.
 * @global  {string} awhina.data.activeView.url  The dataset url to upload the edits to.
 * @param  {object} editValues - The values that will be used for each field to update the records.
 * @param  {array} updateIDs - The list of ids to update.
 * @param {array} postData - The editing data formatted correctly to be updated in ESRI Enterprise.
 */
function batchEditUpload() {
  let editValues = {};
  let updateIDs = [];
  let postData = [];
  // Get values from form
  editValues.cdemgroup =  $("#cdem-groups").val();
  editValues.district = $("#cdem-district").val();
  editValues.missingpersonpriority = $("#missing-person-priority").val();
  editValues.missingpersonreferralstatus =  $("#missing-person-status").val();
  editValues.householdgoodspriority =  $("#household-goods-priority").val();
  editValues.householdgoodsreferralstatus =  $("#household-goods-status").val();
  editValues.shelteraccompriority =  $("#accommodation-shelter-priority").val();
  editValues.shelteraccomreferralstatus =  $("#accommodation-shelter-status").val();
  editValues.animalpriority =  $("#animal-welfare-priority").val();
  editValues.animalreferralstatus =  $("#animal-welfare-status").val();
  editValues.healthdisabilitypriority =  $("#health-disability-priority").val();
  editValues.healthdisabilityreferralstatus =  $("#health-disability-status").val();
  editValues.financialassistpriority =  $("#financial-assistance-priority").val();
  editValues.financialassistreferralstatus =  $("#financial-assistance-status").val();
  editValues.psychosocialpriority =  $("#psychosocial-support-priority").val();
  editValues.psychosocialreferralstatus =  $("#psychosocial-support-status").val();

  // Delete all empty fields that are not being updated.
  Object.keys(editValues).forEach(k => (!editValues[k] && editValues[k] !== undefined) && delete editValues[k]);

  // Build the dataset for updating via rest
  Object.keys(awhina.data.checkedRowsMap).forEach(k => {
    editValues.objectid = awhina.data.checkedRowsMap[k].objectid;
    updateIDs.push(awhina.data.checkedRowsMap[k].objectid);
    postData.push({attributes: JSON.parse(JSON.stringify(editValues))}); // Horrible, but needed to create a static object clone.
  });
  // Post the data to the dataset
  $.ajax({
    url: awhina.data.activeView.url + "/applyEdits/query?token=" + awhina.user.token,
    method:"POST",
    data: {
      f: "pjson",
      updates: DOMPurify.sanitize(JSON.stringify(postData))
    },
    dataType: "json"
  })
  .done(function(result){
    if (result.error){
      // Display error information to user
      awhina.domElems.batchEditTab.hide();
      awhina.domElems.batchEditFooter.hide();
      awhina.domElems.batchEditWarningText.html(JSON.stringify(result.error));
      awhina.domElems.loadingAjaxHTML.hide();
    }
    if (result.updateResults && result.updateResults.length > 0){
    // Now for the update results, iterate through them and update them in the table
    // These are auto updated on refresh, but not immediatly by themselves.
    for (let i = 0, len = result.updateResults.length; i < len; i++){
      if (result.updateResults[i].success == true){
        awhina.domElems.table.bootstrapTable('updateByUniqueId', {
          id: result.updateResults[i].objectId,
          row: postData.find(x => x.attributes.objectid === result.updateResults[i].objectId).attributes
        });
        // If the record has been updated, remove it from array (for use below in fail check).
        removeFromArray(updateIDs, result.updateResults[i].objectId);
      }
    }
    // If any records failed to be updated, put it in the message box.
    if (updateIDs.length >= 1){
      awhina.domElems.batchEditTab.hide();
      awhina.domElems.batchEditFooter.hide();
      awhina.domElems.batchEditWarning.removeClass("alert-warning").addClass("alert-danger");
      awhina.domElems.batchEditWarningText.html("Failed to update the following records:<br>Object ID(s) " + updateIDs.join(", ")
      + "<br>Please email the Awhina GIS admin with the above Object ID's stating that the update function failed and they need to be manually updated.");
    }
    // If all is well, close the update modal.
    else {
      awhina.domElems.batchEditModal.modal("hide");
    }
    updateIDs = []
    }
  })
  .fail(function(error){
    awhina.domElems.batchEditTab.hide();
    awhina.domElems.batchEditFooter.hide();
    awhina.domElems.batchEditWarningText.html(error);
    awhina.domElems.loadingAjaxHTML.hide();
  });
};

/**
 * User must click on the submit button for two seconds to ensure multiple records
 * are not accidently updated.
 */
awhina.domElems.batchEditSubmit.on({
  mousedown: function() {
    awhina.domElems.progressBarHold.css('width', '100%');
    $(this).data('timer', setTimeout(function() {
      batchEditUpload();
    }, 2000));
  },
  mouseup: function() {
    clearTimeout($(this).data('timer'));
    awhina.domElems.progressBarHold.css('width', '0%');
  },
  mouseout: function() {
    clearTimeout($(this).data('timer'));
    awhina.domElems.progressBarHold.css('width', '0%');
  }
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to building the data tables and parsing it into the table itself.
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * Setup the configuration of the table - define its properties and actions.
 * @param  {string} subtable the currently selected view. Example: overview
 * The subtable defines what fields and field properties to include in the table.
 */
function buildTableConfig(subtable) {
  // Reset the filter config to be regenerated with any new values.
  awhina.filtering.filters = [];
  // If the all rows table is selected, set to cardview - much easier to see data.
  const cardBool = (subtable == 'all') ? true : false;
  // Add the action drop down field found on the left hand side of the table (in all views).
  let table = [{
    field: "action",
    checkbox: true,
    title: "",
    align: "left",
    valign: "middle",
    width: "58px",
    cardVisible: false,
    switchable: false,
    formatter: actionFormatter,
    // Define the events for the action dropdown.
    events: {
      "click .zoom": function (e, value, row, index) {
        awhina.map.map.setView(awhina.data.featureMap[row.objectid]._latlng, 18);
      },
      "click .identify": function (e, value, row, index) {
        identifyFeature(row, subtable);
      },
      "click .edit": function (e, value, row, index) {
        awhina.identify.idTabView = subtable;
        editingControl(row.objectid);
        awhina.domElems.editButton.hide();
        $('#edit-group').show();
        awhina.domElems.featureModal.modal("show");
        awhina.domElems.featureInfo.hide();
        $('#update').show();

      },
      "click .bidfood": function (e, value, row, index) {
        let actionRow = {};
        awhina.bidfood.iterator=0;
        actionRow[row.objectid] = row;
        iterateBidFoodForms(actionRow);
        $("#bidfood-modal").modal("show");
        // Set date
        $("#date-input").text(new Date().toLocaleDateString('en-GB'));
      },
      "click .delete-row": function (e, value, row, index) {
        awhina.delete.oIDs = [row.objectid];
        awhina.domElems.mainDelAlertText.html("<b>Warning</b><br>Are you sure you want to <b>permanently delete</b> this record?");
        awhina.domElems.delRowAlert.modal("show");
        awhina.domElems.delBottomArea.show();
      }
    }
  }];

  // Push the columns into the table config based on their properties -----------------------
  // First fill in any undefined values with an empty string
  $.each(awhina.data.fieldProperties, function(index, value){
    if(!value.formatter){
      value.formatter = '';
    }
    if(!value.width){
      value.width = '';
    }
    if(!value.table.sorter){
      value.sorter = '';
    }
    // Table config
    // If the subtable is one of the ones related to the overview layer, only show the relevant information
      if (value.subset.some(r=> [subtable, "all"].includes(r))){
        if (value.table) {
          table.push({
            field: value.value,
            title: value.label,
            formatter: value.formatter,
            width: value.width,
            sorter: value.table.sorter,
            sortable: value.table.sortable,
            visible: value.table.visible
          });
        }
      }
  });
  // Now construct the table and the alasql filtering
  buildTable(table, cardBool);
  buildFilters();
  awhina.domElems.loadingMask.hide();
}

/**
 * Build the table, using the configuration defined in buildTableConfig().
 * Sets the custom functionality of the table such as double clicking a row
 * or checking/unchecking records.
 * @param  {} table - the table config containing what fields should be included and their properties.
 * @param  {} cardBool - Determines if the table should show rows (default/false) or a card view
 * for each record (true). Card view makes it easier to view large datasets with lots of fields.
 */
 function buildTable(table, cardBool=false) {
  // Generate table height - depends on if the table view is used. Must be here due to subtable changes.
  const tableHeight = getTableHeight(location.hash);
  // Destroy the table before building it to ensure that the change of table view works.
  awhina.domElems.table.bootstrapTable('destroy');
  // Define the table
  awhina.domElems.table.bootstrapTable({
    cache: false,
    cardView: cardBool,
    classes: "table table-bordered table-hover table-sm",
    height: tableHeight,
    undefinedText: "",
    uniqueId: "objectid",
    striped: false,
    showToggle: true,
    toggle: true,
    pagination: true,
    paginationParts: ['pageSize', 'pageList'],
    showPaginationSwitch: false,
    minimumCountColumns: 1,
    sortName: awhina.table.sortProperty,
    sortOrder: awhina.table.sortOrder,
    sortReset: true,
    toolbar: "#toolbar",
    search: true,
    showColumnsSearch: true,
    showColumnsToggleAll: true,
    trimOnSearch: false,
    showColumns: true,
    showRefresh: false,
    showExport: true,
    exportDataType: 'all',
    exportTypes: ['csv', 'excel', 'txt', 'pdf'],
    columns: table,
    onDblClickRow: function (row){
      identifyFeature(row, awhina.data.activeView.name);
    },
    onCheck: function(row, $element){
      awhina.data.checkedRowsMap[row.objectid] = row;
      awhina.data.featureMap[row.objectid].setStyle(awhina.map.selectedStyle);
      awhina.data.featureMap[row.objectid].bringToFront();
      if (awhina.data.checkedRowsMap){
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s) | " + Object.keys(awhina.data.checkedRowsMap).length + " selected");
        if (Object.keys(awhina.data.checkedRowsMap).length >= 2){
          // Only show the bidfood form if they are in the household goods table
          if (awhina.data.activeView.name == 'householdgoods'){
            showHideBidfoodButton();
            awhina.domElems.batchUpdateGroup.show();
          }
          else {
            awhina.domElems.batchUpdateGroup.show();
          }
        }
      }
      // Add button to remove all checked.
      removeCheckedButton();
    },
    onCheckAll: function(rowsAfter){
      for (let i = 0, len = rowsAfter.length; i < len; i++) {
        awhina.data.checkedRowsMap[rowsAfter[i].objectid] = rowsAfter[i];
        awhina.data.featureMap[rowsAfter[i].objectid].setStyle(awhina.map.selectedStyle);
        awhina.data.featureMap[rowsAfter[i].objectid].bringToFront();
      }
      if (awhina.data.checkedRowsMap){
        awhina.domElems.batchUpdateGroup.show();
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s) | " + Object.keys(awhina.data.checkedRowsMap).length + " selected");
        if (Object.keys(awhina.data.checkedRowsMap).length >= 2){
          // Only show the bidfood form if they are in the household goods table
          if (awhina.data.activeView.name == 'householdgoods'){
            showHideBidfoodButton();
            awhina.domElems.batchUpdateGroup.show();
          }
          else {
            awhina.domElems.batchUpdateGroup.show();
          }
        }
      }
      // Add button to remove all checked.
      removeCheckedButton();
    },
    onUncheck: function(row){
      delete awhina.data.checkedRowsMap[row.objectid];
      awhina.data.featureMap[row.objectid].setStyle({radius: 4.2, fillColor: getColour(awhina.data.featureMap[row.objectid].feature)});
      const checkedRowsLength = Object.keys(awhina.data.checkedRowsMap).length;
      if (!checkedRowsLength){
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s)");
        // Remove button to remove all checked.
        $("#remove-checked").remove();
      } else {
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s) | " + checkedRowsLength + " selected");
      }
      if (checkedRowsLength <= 1){
        awhina.domElems.batchUpdateGroup.hide();
        awhina.domElems.bidfoodButton.hide();
      }
    },
    onUncheckAll: function(rowsAfter, rowsBefore){
      for (let i = 0, len = rowsBefore.length; i < len; i++) {
        awhina.data.featureMap[rowsBefore[i].objectid].setStyle({radius: 4.2, fillColor: getColour(awhina.data.featureMap[rowsBefore[i].objectid].feature)});
        delete awhina.data.checkedRowsMap[rowsBefore[i].objectid];
      }
      const checkedRowsLength = Object.keys(awhina.data.checkedRowsMap).length;
      if (!checkedRowsLength){
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s)");
        // Remove button to remove all checked.
        $("#remove-checked").remove();
      } else {
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s) | " + checkedRowsLength + " selected");
      }
      if (checkedRowsLength <= 1){
        awhina.domElems.batchUpdateGroup.hide();
        awhina.domElems.bidfoodButton.hide();
      }
    },
    onPageChange: function(number, size){
      // Set the checkall box
      const checkedRowsLength = Object.keys(awhina.data.checkedRowsMap).length;
      if (!checkedRowsLength){
        $('input[name="btSelectAll"]').prop('checked', false);
      }
      else {
        $('input[name="btSelectAll"]').prop('indeterminate', true);
      }
    },
    onPostBody: function(data){
      // Update the table row information.
      const checkedRows = Object.keys(awhina.data.checkedRowsMap).map(Number);
      const checkedRowsLength = checkedRows.length;
      if (checkedRowsLength){
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s) | " + checkedRowsLength + " selected");
      } else{
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s)");
      }
      if (checkedRowsLength > 1){
        $('input[name="btSelectAll"]').prop('checked', false);
      }
      // Check/Uncheck the table rows.
      awhina.domElems.table.bootstrapTable('uncheckAll');
      awhina.domElems.table.bootstrapTable('checkBy', {field: 'objectid', values: checkedRows});
    },
    // Set the row css styling
    rowStyle: function(row, index){
      // Check to see if subtablematch includes values for the cssOverdue (determines if this will run on a welfare need, not a different subtable)
      if (row.alert){
        if (awhina.filtering.subtableProps[awhina.data.activeView.name] && awhina.filtering.subtableProps[awhina.data.activeView.name].cssOverdue){
          if (row.alert.includes(awhina.filtering.subtableProps[awhina.data.activeView.name].cssOverdue)){
            return {classes: awhina.filtering.subtableProps[awhina.data.activeView.name].cssOverdue};
          }
          else if (row.alert.includes(awhina.filtering.subtableProps[awhina.data.activeView.name].cssDueTomorrow)){
            return {classes: awhina.filtering.subtableProps[awhina.data.activeView.name].cssDueTomorrow};
          }
          else {
            return {classes: ''};
          }
        }
        else {
          return {classes: row.alert};
        }
      } else {
        row.alert = 'default';
        return {classes: ''};
      }
    }
  });
  // Change of webpage window (has to be here at the bottom)
  awhina.domElems.windowHTML.resize(function () {
    const tableHeight = getTableHeight(location.hash);
    awhina.domElems.table.bootstrapTable("resetView", {
      height: tableHeight
    });
  });
}
// Table formatters ----------------------------------------------------------------------------------
/**
 * Format a URL in a record field value.
 * This is currently not used in the app.
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
 */
function urlFormatter(value, row, index){
  if (typeof value == "string" && (value.includes("http") || value.includes("https"))) {
    return "<a href='"+value+"' target='_blank' rel='noreferrer'>"+value+"</a>";
  }
}
/**
 * Format a date fields values into date type.
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
 */
function dateFormatter(value, row, index){
  if (value){
    return new Date(eval(value)).toLocaleString('en-GB');
  }
}

// Sort dates
/**
 * Sort dates to get the table to descend by date created
 * @param  {date} a - the first date to be compared against.
 * @param  {date} b - the second date to be compared against.
 */
function dateSorter(a, b) {
  if (a < b){
    return -1;
  } 
  else if (a > b){
    return 1;
  }
  return 0;
}

/**
 * Each row in the table has a dropdown box on the left hand side of the record (in the action field).
 * This dropdown box has a default setting (awhina.table.rowActionItems) unless the current view is household goods.
 * Then an extra option is included to create a bidfood order.
 * The function uses arrays containing string declerations of html elements as this is how it needs to be ingested
 * by the table.
 * @global {array} awhina.table.rowActionItems - The default html elements
 * @global {array} awhina.table.rowActionItemsIncBidfood - The default html elements + the bidfood element
 * @param  {string} value  - record field value in table properties
 * @param  {object} row - record row in table properties
 * @param  {number} index - record index in table properties
 */
function actionFormatter(value, row, index){
  if (awhina.data.activeView.name == "householdgoods"){
    return awhina.table.rowActionItemsIncBidfood.join("");
  } else {
    return awhina.table.rowActionItems.join("");
  }
}

/**
 * Builds the icons in the last column based on the row welfare need status and priority.
 * A CSS class is assigned based on the welfare need and priority that can be used for filtering
 * and showing as a different colour to the user in the UI.
 * !!! This is a semi complex function run over every row so performance is top priority. !!!
 * @param  {object} row - The current table row this function will run against
 * @param  {date} dToday - The current date/time. Not set in this function as it is run over every row
 * @param  {array} welfareNeeds - The welfare needs for this instance pulled from the awhina.instance.config
 * @param  {object} icons - A lookup of welfare need to applicable html icon.
 * @param  {object} subtableMatch - A lookup for getting css names from the welfare need name.
 * @property  {array} welfareArray - Contains the generated welfareneed html buttons
 * @property  {array} statusPriorityArray - Holds the status, priority and welfareneed for each welfareneed in a row
 * This is then sent to the assign assignRowClass subfunction to set the highest value priority to the welfareneed.
 * I.e. if there is an overdue household goods record, a css class is defined overdue-household goods. This can then be
 * used for filtering quickly and has it's own colour defined in the ui. 
 * @property  {string} welfareNeedsResult - The final html element output of the welfare needs.
 * @property  {string} classDef - Defines the css class of the welfare need button
 * @property  {string} status - The rows status value for the welfare need (defined by data collector or edited by user in portal)
 * @param  {string} priority - The rows priority value for the welfare need (defined by data collector or edited by user in portal)
 * @param  {string} icon - The correct icon html for the current welfare need being processed.
 * @returns {array} [welfareNeedsResult, customClassRow || 'default'] - Returns the list of current welfareneeds in an html button format
 * with applicable css styling depending on their status and priority. 
 */
function welfareNeedsFormatter(row, dToday, welfareNeeds, icons, subtableMatch){
  // Generate buttons for each unique welfare need available
  const welfareArray = [];
  const statusPriorityArray = [];
  let welfareNeedsResult = '';
  if (row.welfareneedslist){
    for (let i = 0, len = welfareNeeds.length; i < len; i++) {
      const welfareNeed = welfareNeeds[i];
      let classDef = '';
      let status = '';
      let priority = '';
      let icon = '';
      // Go through welfare types and determine if they are in record and assign button with styling
      switch (welfareNeed){
        case "Household Goods and Services":
          status = row.householdgoodsreferralstatus;
          priority = row.householdgoodspriority;
          icon = icons.house;
          break;
        case "Shelter and Accommodation":
          status = row.shelteraccomreferralstatus;
          priority = row.shelteraccompriority;
          icon = icons.shelter;
          break;
        case "Animal Welfare":
          status = row.animalreferralstatus;
          priority = row.animalpriority;
          icon = icons.animal;
          break;
        case "Health or Disability":
          status = row.healthdisabilityreferralstatus;
          priority = row.healthdisabilitypriority;
          icon = icons.health;
          break;
        case "Financial Assistance":
          status = row.financialassistreferralstatus;
          priority = row.financialassistpriority;
          icon = icons.financial;
          break;
        case "Psychosocial Support":
          status = row.psychosocialreferralstatus;
          priority = row.psychosocialpriority;
          icon = icons.psychosocial;
          break;
        case "Missing Person":
          status = row.missingpersonreferralstatus;
          priority = row.missingpersonpriority;
          icon = icons.missing;
          break;
      }

      switch(status){
        case 'New':
          classDef = 'class="btn New btn-sm"';
          break;
        case 'Actioned':
          classDef = 'class="btn Actioned btn-sm"';
          break;
        case '':
          classDef = 'class="btn btn-secondary button-disabled btn-sm"';
          break;
        case 'Acknowledged_by_Agency':
        case 'Acknowledged by Agency':
          classDef = 'class="btn Acknowledged_by_Agency btn-sm"';
          break;
        case 'Referred_Within_CDC':
        case 'Referred within CDC':
          classDef = 'class="btn Referred_Within_CDC btn-sm"';
          break;
        case 'Withdrawn':
          classDef = 'class="btn Withdrawn btn-sm"';
          break;
        default:
          classDef = 'class="btn btn-secondary button-disabled btn-sm"'
          break;
      }
      // Leave this here - better to check for undefined status and priority than automatically sending
      // To the assignRowClass with a length not zero.
      if (status && priority){
        statusPriorityArray.push({rstatus: status, rpriority: priority, rwelfareneed: welfareNeed});
      }
      const button = '<button ' + classDef + ' title="' + welfareNeed + ' ' + status + '">' + icon + '</button>';
      // Put the button into array that will be the button list
      welfareArray.push(button);
    }
    welfareNeedsResult = '<div style="pointer-events: none" tabindex="-1" class="btn-group d-flex justify-content-center" role="group">' + welfareArray.join('') + '</div>';

    // If there is an overdue/near due referral set the custom class of the row
    const dateDifference = (dToday - row.assessmentdatetime) / 86400000;
    if (dateDifference >= 0){
      let customClassRow = assignRowClass(statusPriorityArray, dateDifference, subtableMatch);
      return [welfareNeedsResult, customClassRow];
    }
    else{
      return [welfareNeedsResult, 'default'];
    }
  }
  else {
    welfareNeedsResult =  '<button class="btn btn-secondary button-disabled btn-sm" style="width: 100%;" title="No Welfare Needs">None</button>';
    return [welfareNeedsResult, 'default'];
  }
};

/**
 * For each welfare need in the system, assign colour class on rows based on if it is overdue or close to being overdue.
 * @param  {array} statusPriorityArray - contains the status, priority and welfare need to be executed by this function
 * @param  {number} dateDifference - difference in days between now and the time the record was created (i.e. is it overdue or due tomorrow)
 * @param  {object} subtableMatch - lookup for the welfare need to css class name
 * @returns  {array} classRows - the css classes for each welfareneed
 */
function assignRowClass(statusPriorityArray, dateDifference, subtableMatch){
  const classRows = [];
  for (let i = 0, len = statusPriorityArray.length; i < len; i++) {
    const statPriorCheck = statusPriorityArray[i];
    if (statPriorCheck.rstatus != 'Actioned' && statPriorCheck.rstatus != 'Withdrawn'){
      // Get the subtable value from the welfare needs (reverse map lookup)
      let welfareNeed = Object.keys(subtableMatch).find(key => subtableMatch[key] === statPriorCheck.rwelfareneed);
      // The below order makes sure that we only have to check dDiff against one value not two, for checking if it is due tomorrow. (dDiff >= 3 && dDiff <= 4)
      if (dateDifference >= 4 && statPriorCheck.rpriority == 'Medium'){
        classRows.push('overdue-'+ welfareNeed);
      } else if (dateDifference >= 3 && statPriorCheck.rpriority == 'Medium'){
        classRows.push('due-tomorrow-'+ welfareNeed);
      } else if (dateDifference >= 2 && statPriorCheck.rpriority == 'High'){
        classRows.push('overdue-'+ welfareNeed);
      } else if (dateDifference >= 1 && statPriorCheck.rpriority == 'High'){
        classRows.push('due-tomorrow-'+ welfareNeed);
      } else if (dateDifference >= 1 && statPriorCheck.rpriority == 'Urgent'){
        classRows.push('overdue-'+ welfareNeed);
      } else if (dateDifference < 1 && statPriorCheck.rpriority == 'Urgent'){
        classRows.push('due-tomorrow-'+ welfareNeed);
      } else {
        classRows.push('');
      }
    }
  }
  return classRows.join(' ');
};


/**
 * Show or hide the bidfood button depending if it is visible or not.
 */
function showHideBidfoodButton(){
  const x = document.getElementById("bidfood-checked");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}

/**
 * Adds a button to remove all checked records to the header of the action row.
 */
function removeCheckedButton(){
  if (!$("#remove-checked").length){
    $(".bs-checkbox").children(".th-inner").append('<span id="remove-checked" class="remove-checked">&nbsp;&nbsp;<i class="far fa-times-circle fa-sm"></i></span>');
  }
}

/**
 * Get the table height in pixels
 * @param  {string} hash - Defines what view is currently selected: map, table, split.
 * @returns {number} tableHeight - The height of the table in pixels.
 */
function getTableHeight(hash){
  let tableHeight = 0;
  if (hash != "#table"){
    tableHeight = awhina.domElems.htmlBody.height() - (awhina.domElems.mapContainer.height() + awhina.domElems.navbar.outerHeight(true));
  } else {
    tableHeight = awhina.domElems.htmlBody.height() - awhina.domElems.navbar.outerHeight(true);
  }
  return tableHeight;
}

/**
 * Sync the table on changes to the map area or any data update.
 * @param  {boolean} refreshMapBounds - default is true - if an update is done to the date, update the view extent of the 
 * map bounds to include all data i.e. on init of the app, map extent goes to the full bounds of the dataset.
 */
function syncTable(refreshMapBounds=true) {
  // If map view is used, update the boundary.
  let mapBounds = {};
  if (refreshMapBounds){
    mapBounds = awhina.map.map.getBounds();
  }
  let tableFeatures = [];
  // If not in table view, only show records in the map extent
  // For each record, check if it is in the map extent and if so add it to the table.
  for (let key in awhina.data.featureMap){
    if (mapBounds.contains(awhina.data.featureMap[key]._latlng)) {
      tableFeatures.push(awhina.data.featureMap[key].feature.properties);
      // If the row was checked set point in map as selected (checking on table occurs under onPostBody).
      if(awhina.data.checkedRowsMap[key]){
        awhina.data.featureMap[key].setStyle(awhina.map.selectedStyle);
        awhina.data.featureMap[key].bringToFront();
      }
    }
    // If table view, show all records 
    else {
      if(awhina.data.checkedRowsMap[key]){
        // Reset style and delete it from the awhina.data.checkedRowsMap
        awhina.data.featureMap[key].setStyle({radius: 4.2, fillColor: getColour(awhina.data.featureMap[key].feature)});
        delete awhina.data.checkedRowsMap[key];
      }
    }
  }
  // Remove any checked rows not found in the dataset (this ensures records selected
  // in a feature view (shelter etc) cannot be deleted from household goods if it doesn't exist in the household goods)
  for (let key in awhina.data.checkedRowsMap){
    if(!awhina.data.featureMap.hasOwnProperty(key)){
      delete awhina.data.checkedRowsMap[key];
    }
  }

  if (location.hash != "#map"){
    // Get current scroll position
    const currentPos = awhina.domElems.table.bootstrapTable('getScrollPosition');
    // Load the data
    awhina.domElems.table.bootstrapTable("load", tableFeatures);
    // Set scroll pos after table loads
    awhina.domElems.table.bootstrapTable('scrollTo', currentPos)
  }
}
/**
 * Observer for the any changes to the map size (i.e. user changes window size)
 * Resizes the table and syncs the data again.
 */
awhina.table.resizeObserver = new MutationObserver(function(mutations) {
  if (location.hash != "#table" && location.hash != "#map"){
    awhina.domElems.fixedTableContainer.removeClass("fixed-height");
    awhina.domElems.fixedTableContainer.css("height", "");
    clearTimeout(awhina.table.resizeTime);
    awhina.table.resizeTime = setTimeout(function(){
      awhina.map.map.invalidateSize();
      awhina.domElems.windowHTML.resize();
      awhina.domElems.table.bootstrapTable("resetView", {
        height: awhina.domElems.htmlBody.height() - (awhina.domElems.mapContainer.height() + awhina.domElems.navbar.outerHeight(true))
      });
      syncTable();
    }, 250);
  }
});
awhina.table.resizeElement = document.querySelector('#map-container');
awhina.table.resizeObserver.observe(awhina.table.resizeElement, {attributeFilter: ["style"]});

/**
 * Switch of view mode (split [table and map], map or table)
 * Defines the size of the table and map, or hides them if they are not
 * included in the current view i.e. map hidden in table view.
 * Makes sure the nav bar still fits in with the views.
 * @param  {string} view - the current view.
 */
function switchView(view) {
  if (view == "split") {
    awhina.domElems.viewHTML.html(" Split View");
    location.hash = "#split";
    awhina.domElems.mapContainer.show();
    awhina.domElems.mapContainer.css("height", "45%");
    awhina.domElems.tableContainer.show();
    awhina.domElems.tableContainer.outerHeight(awhina.domElems.htmlBody.height() - (awhina.domElems.mapContainer.outerHeight(true) + awhina.domElems.navbar.outerHeight(true)), true);
    awhina.domElems.windowHTML.resize();
    if (awhina.map.map) {
      awhina.map.map.invalidateSize();
    }
  } else if (view == "map") {
    awhina.domElems.viewHTML.html(" Map View");
    location.hash = "#map";
    awhina.domElems.mapContainer.show();
    awhina.domElems.mapContainer.outerHeight(awhina.domElems.htmlBody.height() - awhina.domElems.navbar.outerHeight(true), true);
    awhina.domElems.tableContainer.hide();
    if (awhina.map.map) {
      awhina.map.map.invalidateSize();
    }
  } else if (view == "table") {
    awhina.domElems.viewHTML.html(" Table View");
    location.hash = "#table";
    awhina.domElems.tableContainer.show();
    awhina.domElems.tableContainer.outerHeight(awhina.domElems.htmlBody.height() - awhina.domElems.navbar.outerHeight(true), true);
    awhina.domElems.mapContainer.hide();
    awhina.domElems.windowHTML.resize();
  }
}

/**
 * On switch of table view (e.g. overview -> household goods):
 * Update dataset and load it all again.
 * Change button icon.
 * Set the table using the selected feature view.
 * Reload the web worker with the new feature view.
 * Set any applied filtering on the new view.
 */
$("[name='table-view']").click(function() {
  // Get page size
  const pageSizeNum = awhina.domElems.table.bootstrapTable('getOptions').pageSize;
  $(".in,.open").removeClass("in open");
  awhina.domElems.tableView.html($(this).html());
  // Set subtable name
  awhina.data.activeView.name = this.id.replace(/-btn-table/g,'');
  // Set the catergoryTab as it is used for showing the correct editing layer
  awhina.identify.idTabView = awhina.data.activeView.name;
  // Clear the featuremap...
  awhina.data.featureMap = {};
  // Load the data into map and table...
  loadDataESRI(mapRefresh=false);
  // Close the old web worker and start it again with the new layer loaded.
  try {
    if (awhina.data.worker){
      awhina.data.worker.terminate();
    }
  } catch (error) {
    e("Could not close previous webworker:", error);
  }
  refreshListener();
  // Set pageSize
  if (pageSizeNum != 10){
    awhina.domElems.table.bootstrapTable('refreshOptions', {'pageSize': pageSizeNum});
  }
  // Apply filtering of map/table records when welfare need view selected
  // Check if quickfiltering is applied, if so keep the query.
  // If not, query to welfare need only.
  if (awhina.filtering.subtableProps[awhina.data.activeView.name]){
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[awhina.data.activeView.name][awhina.filtering.quickFilterSelection] ? awhina.filtering.subtableProps[awhina.data.activeView.name][awhina.filtering.quickFilterSelection] : awhina.filtering.subtableProps[awhina.data.activeView.name]['reset'];
    quickFilter(awhina.filtering.quickSQL);
  } else {
    awhina.filtering.quickSQL = awhina.filtering.subtableProps['overview'][awhina.filtering.quickFilterSelection] ? awhina.filtering.subtableProps['overview'][awhina.filtering.quickFilterSelection] : awhina.filtering.subtableProps['overview']['reset'];
    quickFilter(awhina.filtering.quickSQL);
  }
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Table functionality such as identifying a feature, batch deleting.
Generating bidfood forms etc.
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Identify feature

/**
 * Users can select a single record and bring up a modal of the records attributes.
 * This is split into tabs for each feature view. Users can click between tabs to see specific data in a 
 * different view compared to the table (easier for large records and helps keep track of the record 
 * they are looking at). They can also edit a record from here.
 * On identifying the feature this builds an attribute table (of the current feature view) and puts it into the modal.
 * @param  {object} featureProperties - the properties of the slected feature
 * @param  {string} currentView - the current feature view
 */
function identifyFeature(featureProperties, currentView) {
  // Return record data from all featureviews available to user so they can switch tabs
  // Selected id is parsed into the edit form (must be the object id)
  awhina.data.selectedID = featureProperties.objectid;
  // Even though it is set in the identifyTableBuilder the line below must be here to activate the tab on first opening.
  awhina.identify.idTabView = currentView;
  const tab = awhina.identify.tabLookup[currentView];
  // Remove the old table in the tab before opening
  $("#idTable").remove();
  // Show the tab with table
  awhina.domElems.featureLink.removeClass('active');
  awhina.domElems.featureTabs.find('a[href="' + tab + '"]').addClass('active');
  awhina.domElems.featureModal.modal("show");
  identifyTableBuilder(awhina.data.selectedID, currentView, tab);
}

// 
/**
 * Table builder for the identifyFeature function.
 * Returns dataset configuration via ajax request and then constructs the field properties.
 * Sends this to the function that will then build the identify table out of this information.
 * @param  {number} selectedID - the object id of the record being identified
 * @param  {string} currentView - the current feature view
 * @param  {HTMLElement} tab - the html tab element inside the info modal the table will be placed in.
 */
function identifyTableBuilder(selectedID, currentView = "", tab = ""){
  // Set category to subtable if empty - used for functions
  currentView = (currentView == "") ? awhina.data.activeView.name : currentView;
  const url = awhina.instance.config.layerURLs[currentView];
  // Get the fields from the selected feature view and build up the table settings.
  // Get the attributes for the selected feature from the feature view.
  $.when(
    getIDFeatureAttributes(selectedID, url),
    getIDFieldAttributes(url)
  ).then(function(){
    buildInfoTable(awhina.identify.featureAttributes, awhina.identify.featureFields, tab, currentView);
  })
}

/**
 * Queries the layer the user has selected in the id modal and returns the identified records attributes.
 * This is not pulled from the table due to the user could be looking at the overview table while in the
 * househould goods tab in the id modal - so need to pull the data again.
 * @param  {number} id - object id of the record being identified
 * @param  {string} url - url of the layer for the current tab of the id modal
 * @global  {object} awhina.identify.featureAttributes - The record attributes
 */
function getIDFeatureAttributes(id, url){
  // Get the data from server
  queryDef = "/query?where=&objectIds=" + id +"&units=esriSRUnit_Meter&outSR=4326&outFields=*"
  return $.ajax({
    url: url + queryDef,
    method:"GET",
    data: {
      f: "json",
      token: awhina.user.token,
    }
  })
  .done(function(result){
    // User does not have access to the layer
    if (result.error){
      e("Error returned on query of record", result.error);
    }
    // If data is returned parse it
    else if (result.features && result.features.length == 1){
      // set global variables so identifyTableBuilder can be used with the editing functions.
      awhina.identify.featureAttributes = result.features[0].attributes;
    }
  })
  .fail(function(error){
    e("Error returned on query of record", error);
  });
}

/**
 * Queries the layer config and formats the result into a dataset usable for the id table.
 * @param  {string} url - url for request
 * @global  {object} awhina.identify.featureFields - formatted field dataset for using in the id table
 */
function getIDFieldAttributes(url){
  return $.ajax({
    url: url,
    method:"GET",
    data: {
      f: "json",
      token: awhina.user.token,
    }
  })
  .done(function(result){
    const fields = buildFieldProperties(result.fields, awhina.identify.idTabView);
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      awhina.identify.featureFields[field.value] = field;
    }
  });
}

/**
 * Construct the HTML table for the currently selected category in the identify feature modal.
 * This table goes down the y axis rather than accross the x axis:
 * | ObjectID                 | 12345 |
 * | Household Goods Status   | New   |
 * | Household Goods Priority | High  |
 * @param  {object} featureAttributes - The selected feature attributes
 * @param  {object} fieldsInfoDataset - The field properties to be included in the table
 * @param  {HTMLElement} tab - the html tab element inside the info modal the table will be placed in.
 */
function buildInfoTable(featureAttributes, fieldsInfoDataset, tab, currentView){
  // Remove old table from the html
  $("#idTable").remove();
  let content = "<table class='table table-striped table-bordered table-condensed' id='idTable' style='table-layout: fixed; width: 100%'>";
  $.each(featureAttributes, function(key, value) {
    // Check if it should be visible in the table
    if(fieldsInfoDataset[key]){
      if (fieldsInfoDataset[key]["table"]["visible"] && fieldsInfoDataset[key]["subset"].some(r=> [currentView, "all"].includes(r))){
        // Null values convert to empty string
        if (!value) {
          value = "";
        }
        // Hyperlinks
        if (typeof value == "string" && (value.includes("http") || value.includes("https"))) {
          value = "<a href='" + value + "' target='_blank' rel='noreferrer'>" + value + "</a>";
        }
        // Config date fields
        if (fieldsInfoDataset[key]["fieldtype"] == "esriFieldTypeDate"){
          value = dateFormatter(value);
        }
        content += '<tr><th style="word-wrap: break-word">' + fieldsInfoDataset[key]["label"] + '</th><td style="word-wrap: break-word">' + value + "</td></tr>";
      }
    }
  });
  // Finish the table
  content += "<table>";
  // Insert the new table into the tab element
  $(tab).html(content);
  // Show it.
  $(tab).show();
}

/**
 * Build identify feature table when the feature tabs in the modal are switched.
 */
$("#feature-info").tabs({
  beforeActivate: function (event, ui) {
    awhina.identify.idTabView = Object.keys(awhina.identify.tabLookup).find(key => awhina.identify.tabLookup[key] === "#" + ui.newPanel.attr('id'));
    identifyTableBuilder(awhina.data.selectedID, awhina.identify.idTabView, awhina.identify.tabLookup[awhina.identify.idTabView]);
  }
})

/**
 * Build identify feature table when the feature tabs in the modal are switched.
 */
awhina.domElems.closeFeatureBtn.click(function() {
  $('#update').hide();
  awhina.domElems.featureInfo.show();
  awhina.domElems.editGroup.hide();
  awhina.domElems.editButton.show();
});

/**
 * Close the identify feature modal.
 */
$("#close-feature-btn-modal").click(function() {
  $('#update').hide();
  awhina.domElems.featureInfo.show();
  awhina.domElems.editGroup.hide();
  awhina.domElems.editButton.show();
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Remove checked rows
/**
 * Ensures the uncheck all functionality works across page changes. This works in tandem with the 
 * code found in the table config.
 */
$(document).on('click', '#remove-checked', function(){ 
  awhina.domElems.table.bootstrapTable('uncheckAll');
  // The below gets fired by the table uncheckAll function, but must also be done here due to it not working on page changes otherwise.
  for (let key in awhina.data.checkedRowsMap){
    awhina.data.featureMap[key].setStyle({radius: 4.2, fillColor: getColour(awhina.data.featureMap[key].feature)});
  }
  $("#remove-checked").remove();
  awhina.data.checkedRowsMap = {};
  awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s)");
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Delete Records
/**
 * Function to delete an array of records.
 * Calls the delete record function API submitting the object ids of the records.
 * On success remove the records from the table view, the map view will update
 * within 15 seconds (this is stated to the user in the ui).
 * On failure of deleting a record a html alert will appear to the user notifying them of this
 * with instructions of next steps.
 * @global {array} awhina.delete.oIDs - The selected records ids to be deleted.
 */
function deleteRecords(){
  $.ajax({
    url: awhina.data.activeView.url + "/deleteFeatures",
    method:"POST",
    data: {
      token: awhina.user.token,
      f: "pjson",
      objectIds: awhina.delete.oIDs.toString()
    },
    dataType: "json"
  })
  .done(function(result){
    if (result.error){
      awhina.domElems.mainDelAlertText.html("Failed to delete the following records:<br>Object ID(s) " + awhina.delete.oIDs.join(", ")
      + "<br>Please email the Awhina GIS admin with the above Object ID's stating that the delete function failed and they need to be manually deleted.");
    }
    else {
      // Now for the delete results, iterate through them and remove them from the table
      // These are auto removed on refresh, but not immediatly by themselves.
      for (let i = 0, len = result.deleteResults.length; i < len; i++){
        if (result.deleteResults[i].success == true){
          awhina.domElems.table.bootstrapTable('removeByUniqueId', result.deleteResults[i].objectId);
          // If the deleteOID has been deleted, remove it from array (for use below in fail check).
          removeFromArray(awhina.delete.oIDs, result.deleteResults[i].objectId);
        }
      }
      // If any records failed to be deleted, put it in the message box.
      if (awhina.delete.oIDs.length >= 1){
        awhina.domElems.delBottomArea.hide();
        awhina.domElems.mainDelAlertText.html("Failed to delete the following records:<br>Object ID(s) " + awhina.delete.oIDs.join(", ")
        + "<br>Please email the Awhina GIS admin with the above Object ID's stating that the delete function failed and they need to be manually deleted.");
      }
      // If all is well, close the delete modal.
      else {
        awhina.domElems.delRowAlert.modal("hide");
        awhina.domElems.htmlBody.removeClass('modal-open');
        $('.modal-backdrop').remove();
        // Reset checked rows map
        awhina.data.checkedRowsMap = {};
        awhina.domElems.featureCount.html(awhina.domElems.table.bootstrapTable('getOptions').totalRows + " feature(s)");
      }
      awhina.domElems.batchUpdateGroup.modal("hide");
      awhina.delete.oIDs = []
    }
  })
  // If there is a general request error display it.
  .fail(function(error){
    awhina.domElems.delBottomArea.hide();
    awhina.domElems.mainDelAlertText.html(JSON.stringify(error));
  });
}

// Batch Delete
/**
 * On selecting the batch delete button, set the html alert that appears to contain information about the batch delete.
 * "Are you sure you want to permanently delete 10 records". If more than ten records are selected, stop the user
 * from deleting records.
 */
$('.delete-checked').click(function() {
  awhina.delete.oIDs = Object.keys(awhina.data.checkedRowsMap).map(Number);
  if (awhina.delete.oIDs.length <= 10){
    awhina.domElems.mainDelAlertText.html("<b>Warning</b><br>Are you sure you want to <b> permanently delete </b><h4 style='color: tomato; display: inline-block;'>" + awhina.delete.oIDs.length + "</h4> records?<br>Please note that you may not see all current checked records in the table due to changing the map view.");
    awhina.domElems.delWarning.show();
    awhina.domElems.delRowAlert.modal("show");
    awhina.domElems.delBottomArea.show();
  }
  else {
    awhina.delete.oIDs = [];
    awhina.domElems.mainDelAlertText.html("Only 10 or less records can be deleted at one time. Select less or ask the GIS Admin to batch delete the required records.");
    awhina.domElems.delWarning.hide();
    awhina.domElems.delRowAlert.modal("show");
    awhina.domElems.delBottomArea.hide();
  }
});

/**
 * On discarding the delete function, hide the delete alert.
 */
$('.delete-row-discard').click(function() {
  awhina.domElems.delRowAlert.modal("hide");
  $('body').removeClass('modal-open');
  $('.modal-backdrop').remove();
});

/**
 * On closing the delete function, hide the delete alert.
 */
$('.delete-row-close').click(function() {
  awhina.domElems.delRowAlert.modal("hide");
  $('body').removeClass('modal-open');
  $('.modal-backdrop').remove();
});

/**
 * Set the confirm delete button to be pressed for 2 seconds before activating
 * the delete record function.
 */
$('.delete-row-delete').on({
  mousedown: function() {
    awhina.domElems.progressBarHold.css('width', '100%');
    $(this).data('timer', setTimeout(function() {
      deleteRecords();
    }, 2000));
  },
  mouseup: function() {
    clearTimeout($(this).data('timer'));
    awhina.domElems.progressBarHold.css('width', '0%');
  },
  mouseout: function() {
    clearTimeout($(this).data('timer'));
    awhina.domElems.progressBarHold.css('width', '0%');
  }
});
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Bidfood Forms

/**
 * Generates the bidfood order forms by filling in the feature attribute information into the correct fields
 * in the html form.
 * @global {object} awhina.bidfood.fieldToDom - Contains the html elements in the bidfood form.
 * The below code matches these elements against the field names in the attributes of the record.
 */
function generateBidFoodForms(record){
  // Map of DOM element to field - for bidfood forms
  // This controls what fields are in the bidfood forms, uses the global vairable so it is easier to find if changes need to be made.
  const bidfoodDomMap = awhina.bidfood.fieldToDom;
  // Load HTML into bidfood form
  // For each record, fill the data in the order form (if it exists)
  for (let k in bidfoodDomMap){
    let val = '';
    // Need to build up the first street name row.
    if (k == "street-address-l1"){
      for (let y = 0, len = bidfoodDomMap[k].length; y < len; y++){
        if (record[bidfoodDomMap[k][y]] && record[bidfoodDomMap[k][y]].length > 0){
          if (bidfoodDomMap[k][y] == "stayingpropertyname"){
            val += (record[bidfoodDomMap[k][y]] +", ")
          } else if (bidfoodDomMap[k][y] == "stayingflatnumber"){
            val += (record[bidfoodDomMap[k][y]] +"/")
          } else if (bidfoodDomMap[k][y] == "stayingstreetnumber"){
            val += (record[bidfoodDomMap[k][y]] +", ")
          } else if (bidfoodDomMap[k][y] == "stayingstreet"){
            val += (record[bidfoodDomMap[k][y]])
          }
        }
      }
    }
    else if (k == "name"){
      // Possibly multiple names comma seperated - get the first (main name of referral)
      const n = record[bidfoodDomMap[k]].split(', ');
      val = n[0];
    }
    else if (k == "delivery-eta"){
      if (record[bidfoodDomMap[k]] == "Urgent"){
        val = "2 Days";
      } else {
        val = "3 Days";
      }
    }
    // Then format the CDEM group to region...
    else if (k == "region"){
      val = record[bidfoodDomMap[k]].replace(" CDEM", "");
    }
    else if (k == "cd-contact-person"){
      val = bidfoodDomMap[k];
    }
    // Regional account number and phone number are pulled from session storage if they exist.
    else if (k == "regional-acc-num"){
      const regAcc = sessionStorage.getItem("reg-acc");
      if (regAcc && regAcc.length > 0){
        val = regAcc;
      }
    }
    else if (k == "cd-contact-number"){
      const phoneNo = sessionStorage.getItem("phone-num");
      if (phoneNo && phoneNo.length > 0){
        val = phoneNo;
      }
    }
    // Any other value goes into val
    else {
      val = record[bidfoodDomMap[k]];
    }
    // If val exists, add it to the form
    if (val){
      // .change updates the select values!
      $('#' + k).val(val).change();
      
    } else {
      // Set as dash
      $('#' + k).val("-").change();
    }
  }
}
/**
 * Iterates through the bidfood forms on user input. Maintains it's position via the bidfoodIter value
 * @param  {object} rows - The full list of features that are being processed into bidfood forms
 * @param  {number} bidfoodIter - Maintains what feature is currently being processed in generateBidFoodForms()
 */
function iterateBidFoodForms(rows, bidfoodIter=0){
  // Reset form
  $('#bidfood-form').trigger("reset");
  // Create iterator.
  const recordKeys = Object.keys(rows);
  const rLength = recordKeys.length;
  // Start generating the form(s)
  if (rLength > 1 && bidfoodIter < rLength){
    $("#bidfood-submit").html("Create Order " + (bidfoodIter + 1) + "/" + rLength);
    generateBidFoodForms(rows[recordKeys[bidfoodIter]]);
  } else if (rLength >= 1 && bidfoodIter == rLength){
    $("#bidfood-modal").modal("hide");
  } else if (rLength == 0) {
    $("#bidfood-modal").modal("hide");
  }
  else {
    $("#bidfood-submit").html("Create Order");
    generateBidFoodForms(rows[recordKeys[0]]);
  }
}

/**
 * Batch bidfood button - Starts the bidfood form process.
 */
awhina.domElems.bidfoodButton.click(function(){
  awhina.bidfood.iterator = 0;
  iterateBidFoodForms(awhina.data.checkedRowsMap);
  $("#bidfood-modal").modal("show");
  // Set date
  $("#date-input").text(new Date().toLocaleDateString('en-GB'));
});

/**
 * Confirmation check box in bidfood form
 */
$('#bidfood-validation').change(function(){
  if($(this).is(':checked')){
    $('#bidfood-submit').prop('disabled', false);
  } else {
    $('#bidfood-submit').prop('disabled', true);
  }
});

/**
 * Create the pdf of the bidfood form and downloads it after user checks/updates the auto generated bidfood form.
 * (Fills in missing information, updates any details that need to be in the html form).
 */
$("#bidfood-submit").click(function(){
  // If the acc number and phone number are filled in, save into session storage
  const regAcc = $("#regional-acc-num").val();
  const phoneNo = $("#cd-contact-number").val();
  // Any selects need to be set as variables due to issues with the selected option not flowing through the clone function
  const region = $("#region").val();
  const delivETA = $("#delivery-eta").val();

  // Pull out of storage
  if (regAcc && regAcc.length > 0){
    sessionStorage.setItem("reg-acc", regAcc);
  }
  if (phoneNo && phoneNo.length > 0){
    sessionStorage.setItem("phone-num", phoneNo);
  }
  // Create the file name
  let pdfName = $("#name").val();
  if (pdfName && pdfName.length > 0){
    pdfName = pdfName.replace(/[^a-z0-9]/gi, '_') + "_bidfood_form.pdf"
  } else {
    pdfName = "UNNAMED_bidfood_form.pdf"
  }
  // Reset the check validation (need to disable button here as not triggered under change func)
  $('#bidfood-validation').prop('checked', false);
  $('#bidfood-submit').prop('disabled', true);

  // Create and download form
  // Start loading and remove the form input outlines.
  awhina.domElems.loadingMask.show();
  $(".order-table-input, .order-form-input").addClass("bidfood-remove-borders");
  // Clone the form so we don't mess with the orignal when setting values
  let element = $("#bidfood-form").clone().get(0);
  // Get all inputs/text fields
  function updateElems(elems){
    // Must flatten array, for some reason half of inputs are not in main array
    elems = [].concat.apply([], elems);
    for (let i = 0; i < elems.length; i++) {
      if (elems[i].id == "region"){
        elems[i].outerHTML = "<div style='font-size: 12pt;'>" + region + "</div>";
      } else if (elems[i].id == "delivery-eta"){
        elems[i].outerHTML = "<div style='font-size: 12pt;'>" + delivETA + "</div>";
      } else {
        // All others can use the input value
        elems[i].outerHTML = "<div style='font-size: 12pt;'>" + elems[i].value + "</div>";
      }
    }
  }
  // Update the fields for input and textarea types
  updateElems(element.getElementsByTagName("input"));
  updateElems(element.getElementsByTagName("select"));
  updateElems(element.getElementsByTagName("textarea"));
  
  // Page break class is manually set in the html
  const opt = {
    margin: [10, 0, 0, 0],
    pagebreak: {mode: "css", after: ".page-break"},
    filename: pdfName,
    image: {type: 'jpeg', quality: 0.88},
    html2canvas: {scale: 3, letterRendering: true},
    jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}
  };
  html2pdf().set(opt).from(element).save().then(function() {
    // Add back the outlines and remove loading after pdf created.
    $(".order-table-input, .order-form-input").removeClass("bidfood-remove-borders");
    awhina.domElems.loadingMask.hide();
    // Scroll to top of bidfood form
    $("#bidfood-modal").scrollTop(0);
  });  
  // Go to the next form.
  awhina.bidfood.iterator += 1;
  iterateBidFoodForms(awhina.data.checkedRowsMap, awhina.bidfood.iterator)
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to building the map view:
Basemap assignments
Layer building, symbolisation and custom functionality
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

// Basemap Layers, don't use d subdomain - doesn't work well
/**
 * Add the open street map basemap to the basemap object, this is then loaded into the map
 * on initialisation.
 */
awhina.map.baseMap.osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  subdomains: ["a", "b", "c"],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
/**
 * Add the dark mode/night mode basemap to the basemap object, this is then loaded into the map
 * on initialisation.
 */
awhina.map.baseMap.night = L.tileLayer("https://2.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/reduced.night/{z}/{x}/{y}/512/png8?apiKey=3zHkMa0lF3eRJ2k08O-2OcpZi_dFpvxrW_LYTjWegNg&ppi=320", {
  subdomains: ["a", "b", "c"],
  attribution: '&copy; HERE 2020'
});
/**
 * Add the satellite/aerial imagery basemap to the basemap object, this is then loaded into the map
 * on initialisation.
 */
awhina.map.baseMap.sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  subdomains: ["a", "b", "c"],
  attribution: '&copy; Esri - Source: Esri, i-cubed, USDA...'
});

/**
 * The main point layer - functions and table reference this, even when the map is hidden (user selects table view in ui).
 * Converts the formatted geoJSON from the dataset into the feature layer.
 * Adds interaction properties when a marker is selected on the map.
 * NOTE: markers are used to heavily increase performance do not change to just a point layer.
 * @property circleMarker - defines the visible features of the layer - note the fill colour is overridden with the
 * status of the currently selected welfare need OR the highest priority of all welfare needs in the getColour()
 * function if the view is on a non welfare need (i.e. overview, notes, all).
 * @global {object} awhina.data.featureMap - used to parse data into the feature layer
 */
awhina.map.featureLayer = L.geoJson(null, {
  pointToLayer: function (feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 4.2,
      stroke: true,
      weight: 0.7,
      fillColor: "#f600f6",
      color: '#000000',
      opacity: 1,
      fillOpacity: 1
    });
  },
  onEachFeature: function (feature, layer) {
    awhina.data.featureMap[feature.properties.objectid] = layer;
    layer.setStyle({fillColor: getColour(feature)})
    layer.on({
      click: function (e) {
        // Close geocoding popups
        if (awhina.domElems.leafletPopupClose.length == 0){
          try {awhina.domElems.leafletPopupClose[0].click();} catch (error) {}
        }
      },
      dblclick: function (e) {
        identifyFeature(layer.feature.properties, awhina.data.activeView.name);
        // Close geocoding popups
        if (awhina.domElems.leafletPopupClose.length == 0){
          try {awhina.domElems.leafletPopupClose[0].click();} catch (error) {}
        }
      },
      mouseover: function (e) {
        layer.setStyle(awhina.map.selectedStyle);
        layer.bringToFront();
        if (awhina.map.hoverProperty) {
          $(".info-control").addClass(feature.properties.alert);
          $(".info-control").html(feature.properties[awhina.map.hoverProperty] + "<br><br>" + feature.properties.welfareicons);
          $(".info-control").show();
        }
      },
      mouseout: function (e) {
        // Only reset colour if it has not been checked in table view
        if (!awhina.data.checkedRowsMap[feature.properties.objectid]){
          layer.setStyle({radius: 4.2, fillColor: getColour(feature)});
        }
        // layer.bringToBack();
        $(".info-control").removeClass(feature.properties.alert);
        $(".info-control").hide();
      }
    });
  }
});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
// Symbolisation

/**
 * Symbolise marker colour function using a hireachy - the most important status is used to define the feature.
 * i.e New > Acknlow... > Referr... > Actioned > Withdrawn
 * If the user is on a single feature view, only the status relating to that feature view will be used
 * in the function.
 * @param  {object} feature - the current feature being defined
 */
function getColour(feature){
  let status = '';
  let colourSet = new Set();
  // // If the user is on a single welfare need view, only that welfare need will be used for the process.
  // // Get all status's from welfare needs and add to set
  // let welfareLength = awhina.instance.config.welfareNeeds.length;
  // let welfareNeedsSym = awhina.instance.config.welfareNeeds;
  // // If the user is on a single welfare need view, then the length of the welfare needs is only 1.
  // if (awhina.table.subtableMatch[awhina.data.activeView.name]){
  //   welfareLength = 1;
  //   welfareNeedsSym = [awhina.table.subtableMatch[awhina.data.activeView.name]];
  // }
  const welfareNeedsSym = (awhina.table.subtableMatch[awhina.data.activeView.name]) ? [awhina.table.subtableMatch[awhina.data.activeView.name]] : awhina.instance.config.welfareNeeds;
  for (let i = 0, len = welfareNeedsSym; i < len; i++) {
    status = getStatusField(welfareNeedsSym[i], feature);
    switch (status){
      case 'New':
        return '#f600f6';
      case 'Acknowledged_by_Agency':
      case 'Acknowledged by Agency':
        colourSet.add('#FA0');
        break;
      case 'Referred_Within_CDC':
      case 'Referred Within CDC':
        colourSet.add('#FF3');
        break;
      case 'Actioned':
        colourSet.add('#BFB');
        break;
      case 'Withdrawn':
        colourSet.add('#9DF');
        break;
    }
  }
  // Go through status types in record and assign symbology based on hirachy
  // This is done so it does not just return 'Acknowledged by Agency' if it still has
  // to go through two more welfare needs where one might be 'New' and override it.
  if (colourSet.has('#FA0')){
    return '#FA0';
  } else if (colourSet.has('#FF3')){
    return '#FF3';
  } else if (colourSet.has('#BFB')){
    return '#BFB';
  } else {
    return "#9DF";
  }
}

/**
 * Return the status field value ONLY if it exists - stops error with generating undefined values in the pie chart if loading
 * a welfare need into the config.welfareNeeds var that does not have the welfare need status field in it.
 * @param  {string} welfareNeed - The current welfare need for the function
 * @param  {object} feature - the feature
 */
function getStatusField(welfareNeed, feature){
  let lookup = awhina.processing.welfNeeds2Status[welfareNeed]
  return lookup ? feature.properties[lookup] : '';
}

/**
 * Build the cluster marker layer, used for show only - all functions and table run off the main point data
 * Symbology defined in defineClusterIcon()
 */
awhina.map.clusterLayer = L.markerClusterGroup({
  spiderfyOnMaxZoom: true,
  removeOutsideVisibleBounds: true,
  disableClusteringAtZoom: 15,
  maxClusterRadius: 2*30,
  iconCreateFunction: defineClusterIcon,
  polygonOptions: {
    fillColor: '#1b2557',
    color: '#1b2557',
    weight: 0.5,
    opacity: 1,
    fillOpacity: 0.5
    }
});

/**
 * Produce the cluster icon donut charts. Creates a donut style pie chart based on the total
 * welfare needs in that cluster. If a user is in a single welfare need view, only that welfare need
 * is used to define the icons.
 * If it is in a multi welfare need view, this will include all welfare needs in the icon.
 * This results in the following example, 4 records, but each have 3 welfare needs - hovering over the icon will
 * show 8 'New', 2 'Actioned'... etc as there are more status's than records themselves.
 * Specific style sets exist in the css for each welfare status 'New', 'Acknowledged_by_Agency'...
 * These css styles define what colour the markers will be and are the same as the point icon colours.
 * If a new status value is added, the css styles will need to be updated.
 * !!! PLEASE DO NOT CHANGE THIS CODE !!! Unless you really need to (due to the complexity it is not advised)
 * @param  {object} cluster - the cluster properties to be defined
 * @returns {sting} myIcon - the html element for that cluster icon with baked in svg.
 */
function defineClusterIcon(cluster) {
  const children = cluster.getAllChildMarkers(); // return all markers that will be included in the cluster
  const n = children.length; // Get number of markers in cluster
  const strokeWidth = 1; // Set clusterpie stroke width
  const r = 30-2*strokeWidth-(n<10?12:n<100?8:n<1000?4:0); // Calculate clusterpie radius
  const iconDim = (r+strokeWidth)*2; // Calculate divIcon dimensions (leaflet really wants to know the size)
  const dataArray = []; // contains the sum of all welfare need and status's for the cluster markers.
  // Check to see if we are building all welfare needs or just one based on table view.
  let welfareLength = awhina.instance.config.welfareNeeds.length; // Set this here as it will change.
  let welfareNeedsSVG = awhina.instance.config.welfareNeeds;
  // If the icons are being made for a welfare need (not overview)
  if (awhina.table.subtableMatch[awhina.data.activeView.name]){
    welfareLength = 1;
    welfareNeedsSVG = [awhina.table.subtableMatch[awhina.data.activeView.name]];
  }
  // Do not change the below for loop - array length changes so caching length does not work.
  for (let i = 0; i < welfareLength; i++) {
    sum = d3.nest().key(function(d) {
      return getStatusField(welfareNeedsSVG[i], d.feature);
    }).entries(children);
    for (let y = 0, len = sum.length; y < len; y++) {
      // Remove empty values - need both conditions here
      if (sum[y]["key"] && sum[y]["key"] != "null" && sum[y]["key"] != "undefined"){
        dataArray.push(sum[y]);
      }
    }
  }
  // Reduce the array of all into a summary with totals (5 new, 12 actioned etc)
  const datax = dataArray.reduce(function(resultObject, currentObject) {
    const x = resultObject[currentObject["key"]] || []
    x.push(currentObject["values"]);
    resultObject[currentObject["key"]] = [].concat.apply([], x);
    return resultObject;
  }, {});
  
  // Null values in the status fields cause issues with the icons showing them as black bars.
  // This can be due to the survey123 form/dataset including a welfare need that is not collected,
  // causing these fields to be blank.
  const data = Object.keys(datax).map(function(currentNeed) {
    // Remove any null values
    if (currentNeed != null){
      return {key: currentNeed, values: datax[currentNeed]};
    }
  });
  
  // Create the SVG markup used for the UI
  const html = createPieSVG({data: data,
    valueFunc: function(d){return d.values.length;},
    strokeWidth: strokeWidth,
    outerRadius: r,
    innerRadius: r-6.5,
    pieClass: 'cluster-pie',
    pieLabel: n,
    pieLabelClass: 'marker-cluster-pie-label',
    pathClassFunc: function(d){
      return d.data.key;
    },
    pathTitleFunc: function(d){
      return d.data.key.replace(/_/g,' ') + ': ' + d.data.values.length;
    }
  });
  //Create a new divIcon and assign the svg markup to the html property
  const myIcon = new L.DivIcon({
    html: html,
    className: 'marker-cluster', 
    iconSize: new L.Point(iconDim, iconDim)
  });
  return myIcon;
}

/**
 * Function that generates svg markup for the pie chart
 * Leave as is - if you are having issues with data not appearing correctly in the cluster icons it is not due to
 * this code. Most likely due to the status values not being included in the css.
 * @param  {object} options - the input data and value function
 */
function createPieSVG(options) {
  /*data and valueFunc are required*/
  if (!options.data || !options.valueFunc) {
    return '';
  }
  const data = options.data;
  const valueFunc = options.valueFunc;
  const r = options.outerRadius ? options.outerRadius : 28; // Default outer radius = 28px
  const rInner = options.innerRadius?options.innerRadius:r-10; // Default inner radius = r-10
  const strokeWidth = options.strokeWidth?options.strokeWidth:1; // Default stroke is 1
  const pathClassFunc = options.pathClassFunc?options.pathClassFunc:function(){return '';}; // Class for each path
  const pathTitleFunc = options.pathTitleFunc?options.pathTitleFunc:function(){return '';}; // Title for each path
  const pieClass = options.pieClass?options.pieClass:'marker-cluster-pie'; // Class for the whole pie
  const pieLabel = options.pieLabel?options.pieLabel:d3.sum(data,valueFunc); // Label for the whole pie
  const pieLabelClass = options.pieLabelClass?options.pieLabelClass:'marker-cluster-pie-label'; // Class for the pie label
  const origo = r; // Center coordinate
  const w = (origo+strokeWidth+2)*2; // width and height of the svg element
  const h = w; // Height is same as width
  // Create the donut and set the arc of it.
  const donut = d3.pie();
  const arc = d3.arc().innerRadius(rInner).outerRadius(r);
      
  //Create an svg element
  const svg = document.createElementNS(d3.namespaces.svg, 'svg');
  //Create the pie chart
  const vis = d3.select(svg)
    .data([data])
    .attr('class', pieClass)
    .attr('width', w)
    .attr('height', h);
      
  const arcs = vis.selectAll('g.arc')
    .data(donut.value(valueFunc))
    .enter().append('svg:g')
    .attr('class', 'arc')
    .attr('transform', 'translate(' + origo + ',' + origo + ')');
  
  arcs.append('svg:path')
    .attr('class', pathClassFunc)
    .attr('stroke-width', strokeWidth)
    .attr('d', arc)
    .append('svg:title')
    .text(pathTitleFunc);
              
  vis.append('text')
    .attr('x',origo)
    .attr('y',origo)
    .attr('class', pieLabelClass)
    .attr('text-anchor', 'middle')
    //.attr('dominant-baseline', 'central')
    /*IE doesn't seem to support dominant-baseline, but setting dy to .3em does the trick*/
    .attr('dy','.3em')
    .text(pieLabel);
  //Return the svg-markup rather than the actual element
  return serializeXmlNode(svg);
}

/**
 * Converts the html element into XML.
 * @param  {HTMLElement} xmlNode - the element to be serialised.
 */
function serializeXmlNode(xmlNode) {
  if (typeof window.XMLSerializer != "undefined") {
    return (new window.XMLSerializer()).serializeToString(xmlNode);
  } else if (typeof xmlNode.xml != "undefined") {
    return xmlNode.xml;
  }
  return "";
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
// Generate the map functions

/**
 * Create the acutal map, add the base layers and the cluster layer
 * The feature layer is auto included into the map as the main layer.
 * Set bounds to that of NZ
 */
awhina.map.map = L.map("map", {
  attributionControl: false,
  preferCanvas: true,
  layers: [awhina.map.baseMap.osm, awhina.map.clusterLayer],
  minZoom: 3,
  maxZoom: 18
}).fitBounds([[-32.193, 162.877],[-51.207, 179.754]]);

/**
 * Set the attribution box in the bottom left.
 * Must be included due to licensing.
 */
L.control.attribution({
  position: 'bottomleft'
}).addTo(awhina.map.map);

/**
 * Add the ESRI geocoder, set bounds to NZ only
 */
awhina.map.searchControl = L.esri.Geocoding.geosearch({
  searchBounds: [[-32.193, 162.877],[-51.207, 179.754]]
}).addTo(awhina.map.map);

/**
 * On clicking the map, a reverse geocode search is done, this will
 * display a popup window with the address found. A marker must be created on
 * the clicked point (leaflet limitation), so create an invisible one.
 */
awhina.map.searchControl.on('results', function (data){
  for (let i = data.results.length - 1; i >= 0; i--) {
    L.circleMarker(data.results[i].latlng, {
      radius: 0,
      stroke: false,
      weight: 0,
      opacity: 0,
      fillOpacity: 0
    }).addTo(awhina.map.map).bindPopup(data.results[i].properties.Match_addr).openPopup();
  }
});

/**
 * Load the ESRI reverse geocoding service into the map
 */
awhina.map.geocodeService = L.esri.Geocoding.geocodeService();

/**
 * The little box that appears when you hover over a marker.
 * It is defined in another section but includes the name, priority and
 * welfare needs (inc status) for that point.
 * A quick way to check a record.
 */
awhina.map.info = L.control({
  position: "bottomleft"
});

/**
 * Create the legend object and its position.
 */
awhina.map.legend = L.control({position: 'bottomright'});

/**
 * Define the legend with button control to collapse/expand it.
 */
function legendGenerator() {
  let div = L.DomUtil.create('div', 'info legend legend-box');
  const status = awhina.map.legendStatusOptions;
  div.innerHTML += '<button type="button" class="btn btn-sm btn-light btn-block padding-0-all" id="legend-control-button">Legend <i class="fas fa-caret-up"></i></button>';
  // loop through our density intervals and generate a label with a colored square for each interval
  for (let i = 0, len = status.length; i < len; i++) {
    div.innerHTML += '<span class="legend-list"><i class="' + status[i] + '"></i> ' + status[i].replace(/_/g,' ') + '<br></span>';
  }
  return div;
};

/**
 * Add the legend to the map.
 */
awhina.map.legend.onAdd = legendGenerator;
awhina.map.legend.addTo(awhina.map.map);

/**
 * Workflow for opening and closing the legend.
 */
$("#legend-control-button").click(function() {
  if (awhina.map.legendControlState){
    $("#legend-control-button").html('<button type="button" class="btn btn-sm btn-light btn-block padding-0-all" id="legend-control-button">Legend <i class="fas fa-caret-down"></i></button>')
    $(".legend-list").hide()
    awhina.map.legendControlState = false;
  } else {
    $("#legend-control-button").html('<button type="button" class="btn btn-sm btn-light btn-block padding-0-all" id="legend-control-button">Legend <i class="fas fa-caret-up"></i></button>')
    $(".legend-list").show()
    awhina.map.legendControlState = true;
  }
});

/**
 * Create the custom info hover control box
 */
awhina.map.info.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "info-control");
  this.update();
  return this._div;
};
/**
 * Reset it between uses
 */
awhina.map.info.update = function (props) {
  this._div.innerHTML = "";
};
/**
 * Add the info control to the map.
 * Then hide it on initialisation
 */
awhina.map.info.addTo(awhina.map.map);
$(".info-control").hide();

/**
 * Collapse the map layers if map size under 767px
 */
if (document.body.clientWidth <= 767) {
  isCollapsed = true;
} else {
  isCollapsed = false;
}

/**
 * Add the basemaps to the map
 */
awhina.map.baseLayers = {
  "Street Map": awhina.map.baseMap.osm,
  "Dark Map": awhina.map.baseMap.night,
  "Aerial Imagery": awhina.map.baseMap.sat
};

/**
 * Add the cluster layer and feature layer to the map
 */
awhina.map.overlayLayers = {
  "<span id='cluster-layer-name'>Āwhina Cluster Layer</span>": awhina.map.clusterLayer,
  "<span id='layer-name'>Āwhina Point Layer</span>": awhina.map.featureLayer
};

/**
 * Update the layer control box to contain the layers and basemaps
 */
awhina.map.layerControl = L.control.layers(awhina.map.baseLayers, awhina.map.overlayLayers, {
  collapsed: isCollapsed
}).addTo(awhina.map.map);

/**
 * Filter table to only show features in current map bounds - uses a time delay to stop loading when panning/zooming
 */
awhina.map.map.on("zoomend", function (e) {
  syncTable();
});

/**
 * Sync the table after dragging it.
 */
awhina.map.map.on("dragend", function (e) {
  syncTable();
});

/**
 * On right click in map, geocode the click location and add as a pop up, this will
 * display a popup window with the address found. A marker must be created on
 * the clicked point (leaflet limitation), so create an invisible one.
 */
awhina.map.map.on("contextmenu", function(e) {
  awhina.map.geocodeService.reverse().latlng(e.latlng).run(function (error, result) {
    L.circleMarker(result.latlng, {
      radius: 0,
      stroke: false,
      weight: 0,
      opacity: 0,
      fillOpacity: 0
    }).addTo(awhina.map.map).bindPopup(result.address.Match_addr).openPopup();
  });
})


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to filtering of the data
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * Builds the filter configuration.
 * Goes through the fields properties and defines what types they are (string, number,date) formats them if
 * required (dates) and what filter operators the fields should have ['between', 'less',...].
 * If a field includes the option to select unique values, the unique values are created here and added to the filter.
 * The filter regens on creation of the table, so new values are added regularly.
 * @param  {object} value - Contains the field properties of the dataset.
 * @param  {object} data - Contains the attributes of the dataset.
 * @property  {object} filter - The filter options for a single field.
 * @global  {array} awhina.filtering.filters - The final configuration containing filter options for each field.
 */
function buildFilterConfig(value, data){
  let filter = {};
  if(value.subset){
    if (value.subset.some(r=> awhina.data.activeView.name.includes(r)) ||  value.subset.some(r=> ["all"].includes(r))){
      let id = '';
      if (value.fieldtype == "esriFieldTypeInteger") {
        id = "cast(properties->"+ value.value +" as integer)";
        filter.type = "integer";
        filter.input = "number";
      }
      else if (value.fieldtype == "esriFieldTypeDouble") {
        id = "cast(properties->"+ value.value +" as double)";
        filter.type = "double";
        filter.input = "number";
      }
      else if (value.fieldtype == "esriFieldTypeDate") {
        id = "properties->"+ value.value;
        filter.type = "date";
        filter.input = "text";
        filter.operators = ['between', 'less', 'less_or_equal', 'greater', 'greater_or_equal'];
        filter.plugin = 'datepicker';
        filter.plugin_config = {
          format: 'dd/mm/yyyy',
          todayBtn: 'linked',
          todayHighlight: true,
          autoclose: true
        };
      }
      else {
        id = "properties->" + value.value;
        filter.type = "string";
      }
      filter.id = id;
      filter.label = value.label;
      
      if (value.filter) {
        // If values array is empty, fetch all distinct values
        if (value.filter.values.length == 0) {
          let distinctValues = [];
          alasql("SELECT DISTINCT(properties->"+value.value+") AS field FROM ? ORDER BY field ASC", [data.features], function(results){
            for (let key in results){
              distinctValues.push(results[key].field);
            }
            if (!filter.operators){
              filter.operators = ["in", "not_in", "equal", "not_equal", "contains", "not_contains"];
            }
            // If there are less than 20 options, always set to select or if the field is districts (can be over 20).
            if (distinctValues.length <= 20 || value.value == 'district'){
              filter.input = 'checkbox';
              filter.vertical = true;
              filter.multiple = true;
            }
          });
          // value.filter.values = distinctValues
          filter.values = distinctValues;
        } else {
          filter.values = value.filter.values;
        }
        // Don't change this to returning the filter and adding it to a local array in buildFilters()
        // It doesn't work.
        awhina.filtering.filters.push(filter);
      }
    }
  }
}

/**
 * Build the alasql filter, pass in the filter values created
 */
function buildFilters(){
  // Destroy the filter on rebuild.
  awhina.domElems.queryBuilder.queryBuilder("destroy");
  // Generate the filter config
  $.each(awhina.data.fieldProperties, function(index, value){
    buildFilterConfig(value, awhina.data.dataset)
  });
  // Build the filtering
  awhina.domElems.queryBuilder.queryBuilder({
    allow_empty: true,
    filters: awhina.filtering.filters
  });
}

/**
 * Applies the filter on the dataset by only inserting the filtered data into the data layers:
 * featurelayer, clusterlayer, featuremap (done in sync table, just cleared here).
 * Syncs the table to get the data to show throughout the app.
 * @param  {object} data - the data of the app.
 * @param  {boolean} keepSQLValue - should the filter be reset? default is no,
 */
function applyFilter(data, keepSQLValue=false) {
  let query = "SELECT * FROM ?";
  awhina.filtering.filterBool = false;
  // Only reset the filter when you want to apply a new filter, changing layers and loading data will not change the SQL value
  if (!keepSQLValue){
    awhina.filtering.filterSQL = awhina.domElems.queryBuilder.queryBuilder("getSQL", false, false).sql;
  }
  // If any dates are in filter, replace it with unix timestamp
  const datesFound = awhina.filtering.filterSQL.match(/(\d\d?)\/(\d\d??)\/(\d\d\d\d)/g);
  if (datesFound && datesFound.length > 0) {
    for (let i = 0, len = datesFound.length; i < len; i++) {
      // Convert date to date object
      let dateParts = datesFound[i].split("/");
      const d = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
      // Then to epoch (remove UTC diff)
      const u = d.getTime()- 43200000;
      awhina.filtering.filterSQL = awhina.filtering.filterSQL.replace(datesFound[i], u);
    }
  }
  if (awhina.filtering.filterSQL.length > 0) {
    query += " WHERE (" + awhina.filtering.filterSQL + ")";
    awhina.filtering.filterBool = true;
    if (awhina.filtering.quickSQL){
      query += " AND " + awhina.filtering.quickSQL;
    }
  } else {
    if (awhina.filtering.quickSQL){
      query += " WHERE " + awhina.filtering.quickSQL;
    }
  }
  alasql(query, [data.features], function(features){
    awhina.data.featureMap = {};
    awhina.map.featureLayer.clearLayers();
    awhina.map.featureLayer.addData(features);
    awhina.map.clusterLayer.clearLayers();
    awhina.map.clusterLayer.addLayer(awhina.map.featureLayer);
    syncTable();
  });
}

/**
 * Apply a quick filter to the data.
 * The quick filters are predefined sql code that the user can select in the quick filter
 * dropdown. Acts in the same way as the main filtering but the sql is always one of the defined options.
 * @param  {string} sql - the filter SQl to be applied
 */
function quickFilter(sql){
  let query = '';
  if (sql){
    query = "SELECT * FROM ? WHERE " + sql;
    if (awhina.filtering.filterSQL){
      query += " AND (" + awhina.filtering.filterSQL + ")";
    }
  }
  else {
    query = "SELECT * FROM ?";
    if (awhina.filtering.filterSQL){
      query += " WHERE (" + awhina.filtering.filterSQL + ")";
    }
  }
  alasql(query, [awhina.data.dataset.features], function(features){
    awhina.data.featureMap = {};
    awhina.map.featureLayer.clearLayers();
    awhina.map.featureLayer.addData(features);
    awhina.map.clusterLayer.clearLayers();
    awhina.map.clusterLayer.addLayer(awhina.map.featureLayer);
    syncTable();
  });
}

/**
 * Quick filter buttons.
 * When a user selects a quick filter option, set the UI to show it is active and load the filtering of the data.
 */
$("[name='quick-filter-buttons']").click(function() {
  let tempSubtable = 'overview';
  // Sets the non welfare views to overview category
  if (awhina.filtering.subtableProps[awhina.data.activeView.name]){
    tempSubtable = awhina.data.activeView.name;
  }
  $(".show").removeClass("show"); //Hide the open list
  awhina.filtering.quickFilterBool = true;
  
  if (this.id === "reset-rows") {
    awhina.filtering.quickFilterSelection = 'reset';
    awhina.domElems.quickFilterHTML.html('<i class="fas fa-bolt"></i> Quick Filter <span class="caret"></span>');
    awhina.domElems.quickFilterHTML.removeClass();
    awhina.domElems.quickFilterHTML.addClass('btn btn-secondary dropdown-toggle'); 
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[tempSubtable].reset;
    if (!awhina.filtering.quickSQL){
      awhina.filtering.quickFilterBool = false;
    }
    quickFilter(awhina.filtering.quickSQL)
    return false;
  } else if (this.id === "overdue-rows") {
    awhina.filtering.quickFilterSelection = 'overdue';
    awhina.domElems.quickFilterHTML.html('<i class="fas fa-bolt"></i> Overdue <span class="caret"></span>');
    awhina.domElems.quickFilterHTML.removeClass();
    awhina.domElems.quickFilterHTML.addClass('btn btn-secondary dropdown-toggle overdue');
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[tempSubtable].overdue;
    quickFilter(awhina.filtering.quickSQL);
    return false;
  } else if (this.id === "due-tomorrow-rows") {
    awhina.filtering.quickFilterSelection = 'dueTomorrow';
    awhina.domElems.quickFilterHTML.html('<i class="fas fa-bolt"></i> Due Tomorrow <span class="caret"></span>');
    awhina.domElems.quickFilterHTML.removeClass();
    awhina.domElems.quickFilterHTML.addClass('btn btn-secondary dropdown-toggle due-tomorrow');
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[tempSubtable].dueTomorrow;
    quickFilter(awhina.filtering.quickSQL);
    return false;
  } else if (this.id === "urgent-rows") {
    awhina.filtering.quickFilterSelection = 'urgent';
    awhina.domElems.quickFilterHTML.html('<i class="fas fa-bolt"></i> Urgent Priority <span class="caret"></span>');
    awhina.domElems.quickFilterHTML.removeClass();
    awhina.domElems.quickFilterHTML.addClass('btn btn-secondary dropdown-toggle btn-danger');
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[tempSubtable].urgent;
    quickFilter(awhina.filtering.quickSQL);
    return false;
  } else if (this.id === "unactioned-rows") {
    awhina.filtering.quickFilterSelection = 'unactioned';
    awhina.domElems.quickFilterHTML.html('<i class="fas fa-bolt"></i> Unactioned <span class="caret"></span>');
    awhina.domElems.quickFilterHTML.removeClass();
    awhina.domElems.quickFilterHTML.addClass('btn btn-secondary dropdown-toggle btn-success');
    awhina.filtering.quickSQL = awhina.filtering.subtableProps[tempSubtable].unactioned;
    quickFilter(awhina.filtering.quickSQL);
    return false;
  }
});

/**
 * A button in the filter modal window allows the user to view the raw sql for the filter.
 * Useful if they need to replicate the query in another piece of software.
 */
$("#view-sql-btn").click(function() {
  alert(awhina.domElems.queryBuilder.queryBuilder("getSQL", false, false).sql);
});

/**
 * On clicking apply filter, apply it...
 */
$("#apply-filter-btn").click(function() {
  applyFilter(awhina.data.dataset);
  if (awhina.filtering.filterSQL){
    $('.filter-btn').addClass('filter-on');
  } else {
    $('.filter-btn').removeClass('filter-on');
  }
});

/**
 * Reset filter on click...
 * Apply filter still runs, but query sql is blank
 */
$("#reset-filter-btn").click(function() {
  awhina.domElems.queryBuilder.queryBuilder("reset");
  applyFilter(awhina.data.dataset);
  $('.filter-btn').removeClass('filter-on');
  $("#filter-modal").modal('hide');
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to the navigation bar
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

/**
 * The user can switch the view between map, table and both.
 * This controls the ui actions.
 */
$("[name='view']").click(function() {
  $(".in,.open").removeClass("in open");
  if (this.id === "map-table") {
    awhina.domElems.filterBtn.hide();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Feature Extent');
    switchView("split");
    return false;
  } else if (this.id === "map-only") {
    awhina.domElems.filterBtn.show();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Feature Extent');
    switchView("map");
    return false;
  } else if (this.id === "table-only") {
    awhina.domElems.filterBtn.hide();
    awhina.domElems.extentBtn.html('<i class="fas fa-expand-arrows-alt"></i> Show all records');
    switchView("table");
    return false;
  }
});

/**
 * A special filter button is added to the nav bar when in map mode (to allow filtering still).
 * Clicking this opens the filtering modal.
 */
awhina.domElems.filterBtn.click(function() {
  $("#filter-modal").modal("show");
  awhina.domElems.navbarCollapseIn.collapse("hide");
});

/**
 * Hyperlink to the dashboard for this awhina instance, opens in new tab.
 * Dashboard URL is included in the project config file.
 */
$('#dashboard-btn').click(function() {
  window.open(awhina.instance.config.dashboardURL[awhina.instance.config.cdemGroup]);
});

/**
 * Hyperlink to the survey123 for this awhina instance, opens in new tab.
 * survey123 URL is included in the project config file.
 */
$('#survey123-btn').click(function() {
  window.open(awhina.instance.config.survey123URL + "&token=" + awhina.user.token);
});

/**
 * Show the full extent fo the data in the map view.
 */
awhina.domElems.extentBtn.click(function() {
  awhina.map.map.fitBounds(awhina.map.featureLayer.getBounds());
  awhina.domElems.navbarCollapseIn.collapse("hide");
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/*
Functions and button actions related to the about section
*/
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
/**
 * Open the about dropdown in the navbar.
 */
awhina.domElems.aboutBtn.click(function() {
  awhina.domElems.aboutModal.modal("show");
  awhina.domElems.navbarCollapseIn.collapse("hide");
});

/**
 * Restart the tour (this button sits under the about section.)
 */
$("#restart-tour").click(function() {
  awhina.tour.instance.restart();
});