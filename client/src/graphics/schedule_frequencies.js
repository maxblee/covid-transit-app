// needed for d3.attrs calls
const axios = require("axios");
const d3 = require("d3");
const moment = require("moment");
require("d3-selection-multi");
require("d3-ease");

var darkMode;
window.matchMedia("(prefers-color-scheme: dark)").addListener(e => {
    if (e.matches) {
        darkMode = true;
    } else {
        darkMode = false;
    }
})

const getData = function(lineId) {
    const scheduleUrl = `http://localhost:5000/api/sf/schedules`;
    const sched = axios.get(scheduleUrl, {
        params: {
            agency: 44,
            line: lineId
        },
        responseType: "json"
    })
    .then(response => response.data)
    .catch(err => {console.error(err);});
    return sched;
}

const groupBySum = (func, arr, property, initial) => {
    return arr.reduce((accum, obj) => {
        // adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
        let key = obj[property];
        if (!accum[key]) {
            accum[key] = initial;
        }
        accum[key] = func(accum[key], obj);
        return accum
    }, {});
}

const updateSim = async function(lineId) {
    let simGroup = d3.select("#simulation_graphic");
    simGroup.select("g").selectAll("*").remove();
    const data = await getData(lineId);
    const preCovidStops = data.schedules.filter(schedule => schedule.schedule_type === "weekday" && schedule.pre_covid === true);
    const postCovidStops = data.schedules.filter(schedule => schedule.schedule_type === "weekday" && schedule.pre_covid !== true);
    const sumDepartures = (accum, nextItem) => accum + nextItem.stops.reduce((a, b) => a + b.num_departures, 0);
    const preCovidData = groupBySum(sumDepartures, preCovidStops, "log_time", 0);
    const postCovidData = groupBySum(sumDepartures, postCovidStops, "log_time", 0);
    const preCovidDate = Object.keys(preCovidData).sort()[0];
    const postCovidDate = Object.keys(postCovidData).sort()[0];
    const preCovidCount = preCovidData[preCovidDate];
    const postCovidCount = postCovidData[postCovidDate];
    const graphicDesc = `On ${moment(preCovidDate).format("MMMM DD")}, before the shelter-in-place orders, there were ${preCovidCount.toLocaleString()} departures on the ${data.line_name} on peak weekdays. As of ${moment(postCovidDate).format("MMMM DD")}, that number was down to ${postCovidCount.toLocaleString()}.`
    d3.select("#simulation_graphic-description").text(graphicDesc);
    const boundingRect = simGroup.node().getBoundingClientRect();
    const width = boundingRect.width;
    const height = boundingRect.height;
    const radius = 3;
    const centerWidth = width/2;
    const centerHeight = height/2;
    const spreadWidth = width/10;
    const spreadHeight = height/10;

    const boxMullerTransform = () => {
        // definition from https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
        const unifRandomX = Math.random();
        const unifRandomY = Math.random();
        const randomFactor = Math.sqrt(-2.0 * Math.log(unifRandomX));
        const cosFactor = 2.0 * Math.PI * unifRandomY;
        const normRandomX =  randomFactor * Math.cos(cosFactor);
        const normRandomY = randomFactor * Math.sin(cosFactor);
        return [normRandomX, normRandomY];
    }

    const getGaussianCoords = () => {
        const [normX, normY] = boxMullerTransform();
        const gaussianWidth = centerWidth + (normX * spreadWidth);
        const gaussianHeight = centerHeight + (normY * spreadHeight);
        return [gaussianWidth, gaussianHeight];
    }

    const circles = simGroup.select("g")
        .selectAll("circle")
        .data(d3.range(preCovidCount))
        .enter()
        .append("circle")
        .attrs(() => {
            const [xPos, yPos] = getGaussianCoords();
            return {
                cx: xPos,
                cy: yPos,
                r: radius,
                fill: darkMode && data.route_color ? "#" + data.route_color : "currentColor"
            }
        });
    circles.filter((_, i) => i <=  preCovidCount - postCovidCount).transition()
        .ease(d3.easeLinear)
        .duration(2000)
        .delay(3000)
        .style("opacity", 0);
}

module.exports = {
    updateSim
}