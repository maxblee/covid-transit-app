import React from "react";
import  DataSelection from "./selections";

const transitGraphics = require("../graphics/schedule_frequencies");


// url for bart
const linesUrl = `http://localhost:5000/api/sf/lines?agency=44`;
const lineMapping = (data) => {
    return data.lines.map(line => {
        return {
            name: line.line_name,
            value: line.line_id
        }
    })
}

class ScheduleApp extends React.Component {

    componentDidMount() {

    }

    render() {
        return (
        <div className="article__gfx__container" id="scheduler-container">
            <DataSelection 
                itemId={"schedule-selection"} 
                description={"Select a BART Line"} 
                dataUrl={linesUrl} 
                dataFunc={lineMapping}
                changeFunc={transitGraphics.updateSim}>
                
                <p className="article__graf__lead" id="simulation_graphic-description"></p>
            </DataSelection>
            <div className="article__gfx__items">
                <div id="simulation_graphic-div">
                    <svg id="simulation_graphic" role="img">
                        <g></g>
                    </svg>
                </div>
            </div>
        </div>
        )
    }
}

export default ScheduleApp;