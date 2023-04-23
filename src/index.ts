import express from "express";

import { Neo4jDriver } from "./driver";
import { PORT } from "./constants";

const main = async () => {
  const app = express();
  const driver = await Neo4jDriver();

  /**
   * Finds <limit> recommendations for a <userId>, using Jaccard similarity
   * Outputs a list of recommended videos with a score between 0 and 1
   * Since this is a content-based recommendation, there is also an `originalVideoId` field (can be used to display "Because you watched X...")
   */
  app.get("/recommendations/:userId", async (req, res) => {
    const limit = req.query.limit || 5;
    console.log(
      `Finding ${limit} recommendations for user ${req.params.userId}`
    );
    try {
      const session = driver.session();
      const recommendations = await session.run(
        `
        MATCH(u:User {id: $userId})-[:WATCHED]->(v1:Video)-[:HAS_KEYWORD]->(k:Keyword)<-[:HAS_KEYWORD]-(v2:Video)
        WHERE NOT EXISTS ((u)-[:WATCHED]->(v2))
        WITH v1, v2, COUNT(k) AS intersection
        MATCH (v1)-[:HAS_KEYWORD]->(v1k:Keyword)
        WITH v1, v2, intersection, COLLECT(v1k.keyword) AS s1
        MATCH (v2)-[:HAS_KEYWORD]->(v2k:Keyword)
        WITH v1, v2, s1, intersection, COLLECT(v2k.keyword) AS s2
        UNWIND s1+s2 as x
        WITH v1, v2, intersection, COLLECT(DISTINCT x) as union
        RETURN v1.id as userVideo, v2.id as recommendationVideo, ROUND(((1.0*intersection)/SIZE(union)), 3) AS score ORDER BY score DESC LIMIT ${limit}
        `,
        { userId: req.params.userId }
      );
      await session.close();

      res.json(
        recommendations.records.map((record) => {
          const { userVideo, recommendationVideo, score } = record.toObject();
          return {
            id: recommendationVideo,
            score,
            originalVideoId: userVideo,
          };
        })
      );
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || e });
    }
  });

  app.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);
  });
};

main();
