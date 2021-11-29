/**
 * Filename: portal-worker.js
 * Purpose: Contains the javascript code to load the dataset currently in use by the portal application.
   This is done by a simple set interval of 15 seconds. 15 seconds is a good balance for any slow connections
   and the size of the dataset. If the time to download the data takes over 15 seconds, it continues to work.
   This worker sits on a seperate CPU thread so does not interfere with the speed of the application.
 * Author: Dion Fabbro - dion.fabbro@nema.govt.nz, dionfabbro@gmail.com
 * Version: 0.91
*/

/**
 * Looks for the starting signal from the main portal.js file.
 * This is sent on first load of data and when the dataset being viewed changes.
 * @function  returnUpdatedData(e) - Runs this function every 15 seconds.
*/
onmessage = function(e) {
  setInterval(function() {
    returnUpdatedData(e);
  }, 15000);
}

/**
 * Sends the API call to recieve the dataset (not JQuery like in the main portal.js as it
 * does not work here). Once the dataset is recieved, it is parsed into the appropriate finished state to be used in the app.
*/
function returnUpdatedData(e){
  let geoFeatures = [];
  const dToday = new Date();
  const icons = e.data.icons;
  const welfareNeeds = e.data.welfareNeeds;
  const subtableMatch = e.data.subtableMatch;
  // Construct Query and then Query layer server side.
  queryDef = "/query?where=1%3D1&units=esriSRUnit_Meter&outSR=4326&outFields=*"
  url= e.data.activeViewURL + queryDef + "&f=pjson&token=" + e.data.user.token;
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", url, false);
  xmlhttp.send();
  let result = JSON.parse(xmlhttp.responseText);
  if (result.features && result.features.length >=1){
    for (let key in result.features){
      // Fill in Alert field with the row class - has to be here due to filtering + it's faster than in the set class of the table
      [result.features[key].attributes.welfareicons, result.features[key].attributes.alert] = welfareNeedsFormatter(result.features[key].attributes, dToday, welfareNeeds, icons, subtableMatch);
      // Construct a GeoJSON from the returned json
      let fgeoJSON = {
        type: 'Feature',
        properties: result.features[key].attributes,
        geometry: {
          type: 'Point',
          coordinates: [result.features[key].geometry.x, result.features[key].geometry.y]
        }
      }
      geoFeatures.push(fgeoJSON);
    }
    postMessage({type: 'FeatureCollection', features: geoFeatures});
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
  let welfareArray = [];
  let statusPriorityArray = [];
  let welfareNeedsResult = '';
  if (row.welfareneedslist){
    for (let i = 0, len = welfareNeeds.length; i < len; i++) {
      let welfareNeed = welfareNeeds[i];
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
    } else{
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
  let classRows = [];
  for (let i = 0, len = statusPriorityArray.length; i < len; i++) {
    let statPriorCheck = statusPriorityArray[i];
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