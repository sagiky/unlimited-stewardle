const axios = require("axios")
const _ = require("lodash")
const fs = require("fs")
const schedule = require("node-schedule")
const express = require("express")
const favicon = require("serve-favicon")
const morgan = require("morgan")
const dayjs = require("dayjs")
const process = require("process")

const driversPath = "./assets/drivers.json"
const statsPath = "./assets/stats.json"

// --- FLAG MAP ---
const flag = {
    "British": "gb","Spanish": "es","Polish": "pl","Japanese": "jp","Mexican": "mx","Australian": "au",
    "Russian": "ru","Dutch": "nl","Belgian": "be","Canadian": "ca","New Zealander": "nz","Thai": "th",
    "Finnish": "fi","Brazilian": "br","German": "de","French": "fr","Venezuelan": "ve","Danish": "dk",
    "Swedish": "se","American": "us","Indonesian": "id","Italian": "it","Monegasque": "mc","Chinese": "cn",
    "Argentine": "ar","Andorran": "ad","Emirati": "ae","Afghan": "af","Antiguan": "ag","Anguillan": "ai",
    "Albanian": "al","Armenian": "am","Angolan": "ao","Azerbaijani": "az","Austrian": "at","Bahamian": "bs",
    "Bangladeshi": "bd","Barbadian": "bb","Beninese": "bj","Bhutanese": "bt","Botswanan": "bw","Bulgarian": "bg",
    "Burkinabé": "bf","Burundian": "bi","Cambodian": "kh","Cameroonian": "cm","Cape Verdean": "cv","Chadian": "td",
    "Chilean": "cl","Colombian": "co","Costa Rican": "cr","Croatian": "hr","Cuban": "cu","Cypriot": "cy",
    "Czech": "cz","Dominican": "do","Ecuadorian": "ec","Egyptian": "eg","Salvadoran": "sv","Equatorial Guinean": "gq",
    "Eritrean": "er","Estonian": "ee","Ethiopian": "et","Fijian": "fj","Gabonese": "ga","Gambian": "gm",
    "Georgian": "ge","Ghanaian": "gh","Gibraltarian": "gi","Greek": "gr","Grenadian": "gd","Guatemalan": "gt",
    "Guinean": "gn","Guyanese": "gy","Haitian": "ht","Honduran": "hn","Hong Konger": "hk","Hungarian": "hu",
    "Icelandic": "is","Indian": "in","Iranian": "ir","Iraqi": "iq","Israeli": "il","Jamaican": "jm",
    "Jordanian": "jo","Kazakh": "kz","Kenyan": "ke","North Korean": "kp","South Korean": "kr","Kuwaiti": "kw",
    "Kyrgyz": "kg","Laotian": "la","Latvian": "lv","Lebanese": "lb","Liberian": "lr","Libyan": "ly",
    "Liechtensteiner": "li","Lithuanian": "lt","Luxembourgish": "lu","Macedonian": "mk","Malagasy": "mg",
    "Malawian": "mw","Malaysian": "my","Malian": "ml","Maltese": "mt","Marshallese": "mh","Mauritanian": "mr",
    "Mauritian": "mu","Micronesian": "fm","Moldovan": "md","Mongolian": "mn","Montenegrin": "me","Moroccan": "ma",
    "Mozambican": "mz","Namibian": "na","Nepalese": "np","Nicaraguan": "ni","Nigerien": "ne","Nigerian": "ng",
    "Norwegian": "no","Omani": "om","Pakistani": "pk","Palauan": "pw","Panamanian": "pa","Papua New Guinean": "pg",
    "Paraguayan": "py","Peruvian": "pe","Filipino": "ph","Portuguese": "pt","Qatari": "qa","Romanian": "ro",
    "Rwandan": "rw","Saint Lucian": "lc","Saint Vincentian": "vc","Samoan": "ws","San Marinese": "sm",
    "Saudi": "sa","Senegalese": "sn","Serbian": "rs","Seychellois": "sc","Sierra Leonean": "sl","Singaporean": "sg",
    "Slovak": "sk","Slovenian": "si","Solomon Islander": "sb","Somali": "so","South African": "za",
    "South Sudanese": "ss","Sri Lankan": "lk","Sudanese": "sd","Surinamese": "sr","Syrian": "sy","Taiwanese": "tw",
    "Tajikistani": "tj","Tanzanian": "tz","Togolese": "tg","Tongan": "to","Trinidadian": "tt","Tunisian": "tn",
    "Turkish": "tr","Turkmen": "tm","Tuvaluan": "tv","Ugandan": "ug","Ukrainian": "ua","Uruguayan": "uy",
    "Uzbekistani": "uz","Vanuatuan": "vu","Vietnamese": "vn","Yemeni": "ye","Zambian": "zm","Zimbabwean": "zw"
}

// --- INITIAL STATS ---
let stats = { "visits": 0, "guesses": 0 }
let drivers = {}
let driver
let year = new Date().getFullYear()

// --- HELPER FUNCTIONS ---
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function getRandomProperty(obj) { return Object.keys(obj)[Math.floor(Math.random() * Object.keys(obj).length)]; }
function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

// --- NEW DRIVER SELECTION ---
function new_driver() {
    console.log("Selecting New Driver...");
    let date = dayjs().format("YYYY-MM-DD");
    let pastDrivers = [];
    if (fs.existsSync(statsPath)) {
        let statsFile = JSON.parse(fs.readFileSync(statsPath));
        pastDrivers = Object.values(statsFile).map(x => x.driver).filter(x => typeof x === "string");
    }
    let newDriver = getRandomProperty(drivers);
    while (pastDrivers.slice(-14).includes(newDriver)) newDriver = getRandomProperty(drivers);
    driver = newDriver;
    stats = { "visits": 0, "guesses": 0, "driver": driver };
    processStats(true);
    console.log(`New Driver is ${driver}!`);
    console.log(drivers[driver]);
}

// --- TEAM FUNCTION ---
function team(teamName, year) {
    switch(teamName) {
        case "McLaren": return "mclaren";
        case "Alpine F1 Team": return "alpine";
        case "Mercedes": return "mercedes";
        case "Sauber": return year < 2024 ? "sauber" : "kick";
        case "Haas F1 Team": return "haas";
        case "Lotus F1": return "lotus";
        case "Marussia": case "Manor Marussia": return "marussia";
        case "Renault": return "renault";
        case "Alfa Romeo": return "alfa";
        case "Williams": return "williams";
        case "Aston Martin": return "aston";
        case "Caterham": return "caterham";
        case "Red Bull": return "red";
        case "Toro Rosso": return "toro";
        case "AlphaTauri": return "alpha";
        case "Ferrari": return "ferrari";
        case "RB F1 Team": return "rb";
    }
}

// --- DOTD FUNCTION ---
function dotd() {
    console.log("Selecting Driver of the Day...");
    let date = dayjs().format("YYYY-MM-DD");
    let pastDrivers = [];
    if (fs.existsSync(statsPath)) {
        let statsFile = JSON.parse(fs.readFileSync(statsPath));
        pastDrivers = Object.values(statsFile).map(x => x.driver).filter(x => typeof x === "string");
    }
    if (pastDrivers.length > 0 && pastDrivers.slice(-1)[0] === date) driver = pastDrivers.slice(-1)[0];
    else {
        let newDriver = getRandomProperty(drivers);
        while (pastDrivers.slice(-14).includes(newDriver)) newDriver = getRandomProperty(drivers);
        driver = newDriver;
    }
    stats = { "visits": 0, "guesses": 0, "driver": driver };
    processStats(true);
    console.log(`Driver of the Day is ${driver}!`);
    console.log(drivers[driver]);
}

// --- STATS FUNCTION ---
function processStats(dotd = false) {
    const date = dayjs().format("YYYY-MM-DD");
    let statsFile = {};
    if (fs.existsSync(statsPath)) statsFile = JSON.parse(fs.readFileSync(statsPath));
    if (statsFile.hasOwnProperty(date)) {
        statsFile[date].visits = Math.max(statsFile[date].visits, stats.visits);
        statsFile[date].guesses = Math.max(statsFile[date].guesses, stats.guesses);
    } else if (dotd) statsFile[date] = { "driver": stats.driver };
    else return;
    fs.writeFileSync(statsPath, JSON.stringify(statsFile));
}

// --- SERVER FUNCTION ---
function server() {
    const app = express();
    app.enable("trust proxy");
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static("assets", {
        setHeaders: (res) => {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }));
    app.use(favicon('assets/favicon.ico'));
    app.use(morgan("combined"));
    app.set("views", "views");
    app.set("view engine", "ejs");

    app.get("/", (req, res) => { res.render("index"); stats.visits++; });
    app.get("/reload", (req, res) => { new_driver(); res.redirect("/"); });
    app.get("/winner", (req, res) => {
        if (req.headers.authorization !== "Bearer kRyX3RYMRY$&yEc8") return res.end();
        res.json({ "winner": drivers[driver].firstName + " " + drivers[driver].lastName });
    });
    app.get("/driver", (req, res) => {
        if (!req.query.driver) return res.sendStatus(400);
        let search = false;
        let response = [];
        for (let query in drivers) {
            if (req.query.driver === drivers[query].firstName + " " + drivers[query].lastName) {
                search = true;
                let guess = drivers[query];
                let actual = drivers[driver];
                response.push(guess.nationality === actual.nationality ? 1 : 3);
                if (guess.constructors[guess.constructors.length - 1] === actual.constructors[actual.constructors.length - 1]) response.push(1);
                else if (actual.constructors.includes(guess.constructors[guess.constructors.length - 1])) response.push(4);
                else response.push(3);
                response.push(parseInt(guess.permanentNumber) > parseInt(actual.permanentNumber) ? 0 : parseInt(guess.permanentNumber) === parseInt(actual.permanentNumber) ? 1 : 2);
                response.push(parseInt(guess.age) > parseInt(actual.age) ? 0 : parseInt(guess.age) === parseInt(actual.age) ? 1 : 2);
                response.push(parseInt(guess.firstYear) > parseInt(actual.firstYear) ? 0 : parseInt(guess.firstYear) === parseInt(actual.firstYear) ? 1 : 2);
                response.push(parseInt(guess.wins) > parseInt(actual.wins) ? 0 : parseInt(guess.wins) === parseInt(actual.wins) ? 1 : 2);
            }
        }
        if (!search) return res.sendStatus(400);
        res.json({
            "nationality": response[0],
            "constructor": response[1],
            "permanentNumber": response[2],
            "age": response[3],
            "firstYear": response[4],
            "wins": response[5]
        });
        stats.guesses++;
    });

    const port = 3000;
    app.listen(port, () => console.log(`Listening on port ${port}!`));
}

// --- AXIOS & SCHEDULE ---
axios.get("https://api.jolpi.ca/ergast/f1/1950/driverStandings.json?limit=1000")
    .then(async () => await updateDrivers())
    .catch(() => {
        console.log("API unreachable! Using cached drivers...");
        if (fs.existsSync(driversPath)) drivers = JSON.parse(fs.readFileSync(driversPath));
        else throw "No cache available.";
    })
    .then(() => { dotd(); server(); });

schedule.scheduleJob("59 23 * * *", async () => {
    try { await updateDrivers(); } catch { drivers = JSON.parse(fs.readFileSync(driversPath)); }
});
schedule.scheduleJob("0 0 * * *", () => dotd());
schedule.scheduleJob("* * * * *", () => processStats());

// --- UPDATE DRIVERS ---
async function updateDrivers() {
    let newDrivers = {};
    for (let i = 2000; i <= year; i++) {
        console.log(`Scraping F1 ${i} Season...`);
        try