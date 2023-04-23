import neo4j from "neo4j-driver";
import { NEO4J_PASSWORD, NEO4J_URL, NEO4J_USERNAME } from "./constants";

/**
 * Connects to Neo4j using environment variables `NEO4J_URL`, `NEO4J_USERNAME` and `NEO4J_PASSWORD`.
 * @returns A Neo4j driver
 */
export const Neo4jDriver = async () => {
  console.log(`Connecting to Neo4j: ${NEO4J_URL}`);
  const driver = neo4j.driver(
    NEO4J_URL,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    {
      disableLosslessIntegers: true,
    }
  );

  const info = await driver.getServerInfo();
  console.log(`Connected to Neo4j on ${info.address}`);

  return driver;
};
