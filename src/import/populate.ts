import { Driver } from "neo4j-driver";

import videos from "./data/videos.json";
import watched from "./data/watched.json";

import { cleanText } from "./nlp";
import { Neo4jDriver } from "../driver";

const main = async () => {
  const driver = await Neo4jDriver();

  await populateWatched(driver);
  await populateVideos(driver);

  await driver.close();
};

main();

/**
 * Create users, videos and watched relationships
 */
const populateWatched = async (driver: Driver) => {
  const time = new Date().getTime();
  const session = driver.session();
  for (const row of watched) {
    const { userId, videoId } = row;
    try {
      await session.run(
        `
            MERGE (u:User {id: $userId})
            MERGE (v:Video {id: $videoId})
            MERGE (u)-[:WATCHED]->(v)
            RETURN u, v
          `,
        { userId, videoId }
      );
    } catch (e: any) {
      console.error(e);
    }
  }
  await session.close();
  console.log(
    `Created ${watched.length} "watched" relationships in ${
      new Date().getTime() - time
    }ms`
  );
};

/**
 * Create keywords (and relationships) from cleaned videos titles and descriptions
 */
const populateVideos = async (driver: Driver) => {
  const time = new Date().getTime();
  const session = driver.session();
  let wordCount = 0;
  for (const row of videos) {
    const { id, description, title } = row;
    const keywords = cleanText(`${title} ${description}`).split(" ");
    wordCount += keywords.length;
    for (const keyword of keywords) {
      try {
        await session.run(
          `
              MERGE (v:Video {id: $id})
              MERGE (k:Keyword {keyword: $keyword})
              MERGE (v)-[r:HAS_KEYWORD]->(k)
              ON CREATE SET r.count = 1
              ON MATCH SET r.count = r.count + 1
              RETURN v, k
            `,
          { id, keyword }
        );
      } catch (e: any) {
        console.error(e);
      }
    }
  }
  await session.close();
  console.log(
    `Created ${wordCount} "keyword" relationships in ${
      new Date().getTime() - time
    }ms`
  );
};
