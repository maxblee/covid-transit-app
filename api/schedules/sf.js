require("../utils/config").setUpEnvironment();
const axios = require("axios");
const moment = require("moment");
const knex = require("../utils/config").db();
const { addGTFSSchedules } = require("./common");

const OPERATORS_ENDPOINT = "http://api.511.org/transit/gtfsoperators";
const GTFS_ENDPOINT = "http://api.511.org/transit/datafeeds";

var SF = {
    abbr: "sf",
    name: "San Francisco",
    description: "Data for San Francisco transportation. All of the data comes from the Open 511 API.\
    Currently only includes support for BART, MUNI, and Caltrain.",
    notes: "Due to COVID-19, it's not yet clear how accurate the schedules reported on 511's database are.",
    region_tz: "America/Los_Angeles"
};

var agencyInfo = async function() {
    var operatorsUrl = OPERATORS_ENDPOINT;
    var agencies = await axios.get(operatorsUrl, {
        params: {
            api_key: process.env.SF_511_API,
            format: "json"
        }
    })
    .catch((error) => {
        console.error(error);
    })
    .then((response) => {
        // this removes BOM in a pretty hacky way (JSON responds in utf-8 with bom)
        var operators = JSON.parse(response.data.slice(1));
        // RG is the regional version, which I'm ignoring
        // because it's hard to parse the lines as relating to particular agencies otherwise
        return operators.filter(operator => operator.Id !== "RG").map(operator => {
            return {
                agency_abbr: operator.Id,
                log_time: moment(operator.LastGenerated, "M/D/YYYY h:mm:ss A")
            };
        })
    })
    .catch((error) => {
        console.error(error);
    });
    return agencies;
}

const add = async () => {
    var agencies = await agencyInfo();
    await knex("regions").insert(SF)
        .returning("id")
        .then(async (id) => {
            await Promise.all(agencies)
                .then(allAgencies => {
                    allAgencies.forEach(agency => {
                        var scheduleParams =  {
                            operator_id: agency.agency_abbr, 
                            api_key: process.env.SF_511_API
                        };
                        return addGTFSSchedules(
                            id[0], 
                            agency.agency_abbr,
                            GTFS_ENDPOINT,
                            scheduleParams,
                            agency.log_time
                        );
                    });                    
                })
                .catch(err => {console.error(err);})
        })
        .catch(err => {console.error(err);})
        .finally(() => {knex.destroy();})
}

module.exports = {
    add
}