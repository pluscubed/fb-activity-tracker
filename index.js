const { JSDOM } = require("jsdom");
const FormData = require("form-data");
const nodeFetch = require("node-fetch");
const fetch = require("fetch-cookie/node-fetch")(nodeFetch);
const fs = require("fs");
const nodeCleanup = require("node-cleanup");
const cred = require("./cred.json");

const DB_FILE = "./viewer/db.json";

if (!Array.prototype.last) {
  Array.prototype.last = function () {
    return this[this.length - 1];
  };
}

const db = fs.existsSync(DB_FILE)
  ? JSON.parse(fs.readFileSync(DB_FILE))
  : { recorded: [], users: {} };

const startTime = new Date().getTime();
db.recorded.push([startTime, Number.MAX_VALUE]);

const onExit = () => {
  console.log("saving...");
  db.recorded.last()[1] = new Date().getTime();
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
};

nodeCleanup(onExit);

async function main() {
  const options = {
    //timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
    encoding: null,
  };
  const loginFormData = new FormData();
  loginFormData.append("email", cred.email);
  loginFormData.append("pass", cred.pass);
  console.log("login sent");
  const resp = await fetch(
    "https://mbasic.facebook.com/login/device-based/regular/login/",
    {
      ...options,
      method: "POST",
      body: loginFormData,
    }
  );
  //console.log(resp);
  console.log("logged in");
  await sleep(4000);

  // const frontPage = await fetch("https://mbasic.facebook.com/", options);
  // const frontPageHtml = await frontPage.text();
  // console.log(frontPageHtml)

  while (true) {
    const date = new Date();
    console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    const logTime = date.getTime();

    const buddyList = await fetch("https://mbasic.facebook.com/buddylist.php");
    const buddyListHtml = await buddyList.text();
    //console.log(buddyListHtml);
    const { document } = new JSDOM(buddyListHtml, {
      pretendToBeVisual: true,
    }).window;

    fs.writeFileSync("debug.html", buddyListHtml);

    const rows = document.querySelectorAll("table");
    const seenThisTime = [];
    for (const row of rows) {
      //console.log("processing");
      if (row.classList.length !== 3) {
        continue;
      }
      const link = row.querySelector("a");
      const img = row.querySelector("img");
      if (!link || !img) {
        continue;
      }

      const fbId = /fbid=(\d+)/.exec(link.href)[1];
      const name = link.textContent;
      if (!(fbId in db.users)) {
        db.users[fbId] = { name, seen: [] };
      }
      db.users[fbId].name = name;

      const active =
        img.src ===
        "https://static.xx.fbcdn.net/rsrc.php/v3/yU/r/gATt-jY8pG8.png"; //img.ariaLabel === "Active Now";

      if (active) {
        const lastLog = db.users[fbId].seen.last();
        if (!lastLog || lastLog[1] !== true) {
          db.users[fbId].seen.push([logTime, true]);
        }
        seenThisTime.push(fbId);
        console.log("   " + name);
      }
    }
    for (const fbId of Object.keys(db.users)) {
      if (!seenThisTime.includes(fbId)) {
        // console.log(db.users);
        const lastLog = db.users[fbId].seen.last();
        if (!lastLog || lastLog[1] !== false) {
          db.users[fbId].seen.push([logTime, false]);
        }
      }
    }

    console.log("saving...");
    fs.writeFileSync(DB_FILE, JSON.stringify(db));

    const sleepTime = 60000 + Math.random() * 120000;
    console.log(`sleeping ${sleepTime / 1000}s`);
    await sleep(sleepTime);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main()
  .then(() => {
    console.log("complete");
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(() => {
    onExit();
  });
