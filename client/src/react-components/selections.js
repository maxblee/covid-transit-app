import React from "react";
import ReactDOM from "react-dom";

const schedules = require("../utils/fetch_json");

const Option = (props) => {
    return (
        <option className="selection__item" value={props.itemValue}>{props.name}</option>
    )
}

class AjaxSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = { data: [] };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        const newEvent = event.target.value;
        this.props.changeFunc(newEvent);
    }

    render() {
        const options = this.props.options.map((item) => {
            return <Option itemValue={item.value} name={item.name} key={item.value}></Option>
        });
        return (
            <div className="selection__wrapper">
                <label className="article__graf__lead" htmlFor={this.props.itemId}>{this.props.description}</label>
                <select className="article__graf" id={this.props.itemId} onChange={this.handleChange}>
                    <option value=""></option>
                    {options}
                </select>
                {this.props.children}
            </div>
        )
    }

}

class DataSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = { data: [] };
    }

    componentDidMount() {
        fetch(this.props.dataUrl)
            .then(res => res.json())
            .then(result => this.setState({data: this.props.dataFunc(result)}));
    }

    render() {
        return <AjaxSelection 
            itemId={this.props.itemId} 
            description={this.props.description} 
            options={this.state.data}
            changeFunc={this.props.changeFunc}>
                {this.props.children}
            </AjaxSelection>
    }
}

export default DataSelection;