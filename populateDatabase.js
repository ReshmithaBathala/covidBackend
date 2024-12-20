const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const dbpath = path.join(__dirname, "covid19IndiaPortal.db");

const initializeDatabase = async () => {
  try {
    const db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });

    // Insert sample data
    await db.exec(`
      INSERT INTO user (username, password) VALUES 
      ('admin', '${await require("bcrypt").hash("admin123", 10)}');
      
      INSERT INTO state (state_name, population) VALUES 
      ('Karnataka', 61095297),
      ('Andhra Pradesh', 49577103),
      ('Tamil Nadu', 72147030);

      INSERT INTO district (district_name, state_id, cases, cured, active, deaths) VALUES 
      ('Bangalore Urban', 1, 50000, 45000, 4000, 1000),
      ('Chittoor', 2, 20000, 18000, 1500, 500),
      ('Chennai', 3, 30000, 27000, 2000, 1000);
      
    `);

    console.log("Database populated successfully");

    // Close the database
    await db.close();
  } catch (error) {
    console.error("Error populating database:", error.message);
  }
};

initializeDatabase();
