const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
app.use(express.json());
// require("dotenv").config();

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDatabaseAndServer();

const convertingObjectStateObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertingObjectDistrictObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//authenticate API
const authenticateKey = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// Register API
app.post("/register/", async (request, response) => {
  const { username, password } = request.body;

  // Check if the username already exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password must be at least 6 characters long");
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user into the database
      const createUserQuery = `
        INSERT INTO user (username, password) 
        VALUES ('${username}', '${hashedPassword}');
      `;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  }
});

//login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//1
app.get("/states/", authenticateKey, async (request, response) => {
  const getstateDetailsQuery = `
        SELECT 
        * 
        FROM 
        state;
    `;
  const stateArray = await db.all(getstateDetailsQuery);
  response.send(
    stateArray.map((eachState) => convertingObjectStateObject(eachState))
  );
});
//2
app.get("/states/:stateId/", authenticateKey, async (request, response) => {
  const { stateId } = request.params;
  const gettingState = `
    SELECT 
    *
    FROM 
    state 
    WHERE 
    state_id=${stateId};
    `;
  const getState = await db.get(gettingState);
  response.send(convertingObjectStateObject(getState));
});
//3
app.post("/districts/", authenticateKey, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postingNewDistrict = `
    INSERT 
    INTO 
    district (district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
    `;
  await db.run(postingNewDistrict);
  response.send("District Successfully Added");
});
//4
app.get(
  "/districts/:districtId/",
  authenticateKey,
  async (request, response) => {
    const { districtId } = request.params;
    const gettingDistrict = `
    SELECT 
    *
    FROM 
    district 
    WHERE 
    district_id=${districtId};
    `;
    const districtRequested = await db.get(gettingDistrict);
    response.send(convertingObjectDistrictObject(districtRequested));
  }
);
//5
app.delete(
  "/districts/:districtId/",
  authenticateKey,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE 
    FROM district 
    WHERE district_id=${districtId};
    `;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);
//6
app.put(
  "/districts/:districtId/",
  authenticateKey,
  async (request, response) => {
    const { districtId } = request.params;
    const { districtName, stateId, cases, cured, active, deaths } =
      request.body;
    const updateDistrict = `
    UPDATE 
    district 
    SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths};
    `;
    const updatedDetails = await db.run(updateDistrict);
    response.send("District Details Updated");
  }
);
//7
app.get(
  "/states/:stateId/stats/",
  authenticateKey,
  async (request, response) => {
    const { stateId } = request.params;
    const gettingStats = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district 
    WHERE state_id=${stateId};
    `;
    const stats = await db.get(gettingStats);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cur    ed)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);

module.exports = app;
