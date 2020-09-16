import htm from "https://unpkg.com/htm?module";
import React from "https://cdn.skypack.dev/react";
import ReactDOM from "https://cdn.skypack.dev/react-dom";
const html = htm.bind(React.createElement);

import { AutoSizer, List } from "https://cdn.skypack.dev/react-virtualized";

class App extends React.Component {
  state = {
    entries: [],
  };

  async componentDidMount() {
    const resp = await fetch("./db.json");
    const db = await resp.json();

    const entries = Object.entries(db.users);
    entries.sort(([idA, userA], [idB, userB]) => {
      return userA.name.localeCompare(userB.name);
    });

    let earliestTimestamp = Number.MAX_VALUE;
    let latestTimestamp = Number.MIN_VALUE;
    for (const [id, user] of entries) {
      earliestTimestamp = Math.min(user.seen[0][0], earliestTimestamp);
      latestTimestamp = Math.max(
        user.seen[user.seen.length - 1][0],
        latestTimestamp
      );
    }

    console.log(earliestTimestamp, latestTimestamp);

    for (const [id, user] of entries) {
      const seen = user.seen;
      if (user.seen[0][0] !== earliestTimestamp) {
        user.seen.splice(0, 0, [earliestTimestamp, false]);
      }

      let lastActive = null;
      for (let i = 0; i < seen.length; i++) {
        const [timestamp, active] = seen[i];
        if (lastActive === active) {
          seen.splice(i, 1);
          i--;
        }
        lastActive = active;
      }
    }

    this.setState({
      entries,
      recorded: db.recorded,
      earliestTimestamp,
      latestTimestamp,
    });
  }

  rowRenderer = ({
    key, // Unique key within array of rows
    index, // Index of row within collection
    style, // Style object to be applied to row (to position it)
  }) => {
    const [id, user] = this.state.entries[index];
    const earliestDate = new Date(this.state.earliestTimestamp);
    const latestDate = new Date(this.state.latestTimestamp);
    return html`
      <div key=${id} className="p-2 row" style="${style}">
        <div>
          <!--className="max-w-screen-md mx-auto"-->
          <div className="font-bold">${user.name}</div>
          <div className="relative overflow-hidden active-block-container">
            ${user.seen.map(([timestamp, active]) => {
              const color = active ? "green" : "#e2e8f0";
              const left =
                ((timestamp - this.state.earliestTimestamp) /
                  (this.state.latestTimestamp - this.state.earliestTimestamp)) *
                100;
              return html`
                <div
                  className="absolute active-block"
                  style=${{ backgroundColor: color, left: left + "%" }}
                ></div>
              `;
            })}
            ${this.state.recorded.map(([start, end], i) => {
              const color = "#fff";

              const leftTs = end;
              const rightTs =
                i < this.state.recorded.length - 1
                  ? this.state.recorded[i + 1][0]
                  : this.state.latestTimestamp;

              const left =
                ((leftTs - this.state.earliestTimestamp) /
                  (this.state.latestTimestamp - this.state.earliestTimestamp)) *
                100;
              const right =
                ((this.state.latestTimestamp - rightTs) /
                  (this.state.latestTimestamp - this.state.earliestTimestamp)) *
                100;
              return html`
                <div
                  className="absolute active-block"
                  style=${{
                    backgroundColor: color,
                    left: left + "%",
                    right: right + "%",
                    width: "unset",
                    zIndex: 5,
                  }}
                ></div>
              `;
            })}
          </div>
          <div className="flex">
            <div className="date-label inline-block text-left">
              ${earliestDate.toLocaleDateString() +
              " " +
              earliestDate.toLocaleTimeString()}
            </div>
            <div className="flex-1"></div>
            <div className="date-label inline-block text-right">
              ${latestDate.toLocaleDateString() +
              " " +
              latestDate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  render() {
    return html`
      <div className="h-full app">
        <${AutoSizer}>
          ${({ height, width }) => html`
            <${List}
              height="${height}"
              rowCount="${this.state.entries.length}"
              rowHeight="${84}"
              rowRenderer="${this.rowRenderer}"
              width="${width}"
              overscanRowCount="${30}"
            />
          `}
        </${AutoSizer}>
      </div>
    `;
  }
}

ReactDOM.render(html`<${App} />`, document.body);
