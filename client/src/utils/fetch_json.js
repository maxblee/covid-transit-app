const axios = require("axios");
var SERVER_URL = "http://localhost:5000";

const validAgencies = function(region) {
    const url = `${SERVER_URL}/api/sf/agencies`;
    return axios.get(url); 
}

const agencyLines = function(agencyId) {
    const url = `http://localhost:5000/api/sf/lines?agency=${agencyId}`;
    return axios.get(url);
}

const agencyLineSchedule = function(agencyId, lineId) {
    const url = `http://localhost:5000/api/sf/schedules?agency=${agencyId}&line=${lineId}`;
    return axios.get(url);
}

module.exports = {
    agencyLines,
    agencyLineSchedule,
    validAgencies
}