import React from "react";
import ReactDOM from "react-dom";
import "./css/styles.css";

import ScheduleApp from "./react-components/graphics";

function Main(props) {
    return (
        <main id="main-content">{props.children}</main>
    )
}

function HeroTitle(props) {
    return (
        <h1>{props.name}</h1>
    )
}

function Article(props) {
    return (
        <article>{props.children}</article>
    )
}

function ByLine(props) {
    const authors = props.authors.map((author, idx) => {
        var sepItem = "";
        // if it's not the last item
        if (idx < (props.authors.length - 1)) {
            if (props.authors.length > 2) {
                sepItem += ",";
            }
        }
        if (idx === (props.authors.length - 2)) {
            sepItem += " and";
        }
        return <ByLineAuthor name={author} separator={sepItem} key={idx}></ByLineAuthor>;
    });
    return (
        <div className="byline-time">
            <div className="byline-container">
                By
                <div className="byline__author-container">
                    {authors}
                </div>
            </div>
            <time className="article__timestamp">{props.timestamp}</time>
        </div>
    )
}

function ByLineAuthor(props) {
    return (
        <div className="byline__author">
            {props.name}<span className="byline__author__separator">{props.separator}</span>
        </div>
    )
}

function ArticleParagraph(props) {
    let propsClass = "article__graf";
    if (props.lead) {
        propsClass += " article__graf__lead";
    }
    return (
        <p className={propsClass}>{props.children}</p>
    )
}

function App(props) {
    return (
    <Main>
        <HeroTitle name="Accessing Public Transit During a Pandemic" />
        <Article>
            <ByLine timestamp={"May 17, 2020"} authors={["Irena Fischer-Hwang", "Won-Gi Jung", "Max Lee"]}>
            </ByLine>
            <ArticleParagraph lead={true}>During the weekday, BART trains are showing up less than twice as often during the pandemic as they were before it &mdash; from over 15,000 departures per day to less than 7,500.</ArticleParagraph>
            <ArticleParagraph lead={true}>Explore what BART's COVID schedules have meant for your line.</ArticleParagraph>
            <ScheduleApp></ScheduleApp>
        </Article>
    </Main>
    )
}


ReactDOM.render(
    <App />,
    document.getElementById("root")
);