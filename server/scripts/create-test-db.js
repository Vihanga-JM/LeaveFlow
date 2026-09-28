require("dotenv").config();

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query("CREATE DATABASE leaveflow_test");
    console.log("Test database created successfully.");
  } catch (err) {
    if (err.code === "42P04") {
      console.log("Test database already exists.");
    } else {
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});