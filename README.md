# Polyflix recommendation system - Content-based (Item similarity) with Neo4j

This repository contains the code for a [Polyflix](https://github.com/polyflix) recommendation system. It is a content-based recommendation system, based on the similarity between videos. It uses the [Neo4j](https://neo4j.com/) graph database.

The URL of the deployed server is available on the [GitHub repository](https://github.com/jlabatut/recommendation-item-similarity-neo4j) description.

## Set up a local environment

> Requirements
>
> - [Docker Compose](https://docs.docker.com/compose/)
> - [Node.js](https://nodejs.org/en/)

Start the server and the Neo4j database :

```bash
docker compose up -d
```

Create a `.env` file at the root of the project with the following content :

```bash
# .env
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
PORT=3000
```

Populate the database :

```bash
npm install
npm run build
npm run populate
```

The server is now running on `http://localhost:3000`. User recommendations are available at [http://localhost:3000/recommendations/:userId?limit=5](http://localhost:3000/recommendations/<userId>?limit=<limit>) (update the `userId` and the `limit` parameters according to your needs).

---

## Data extraction

### Get the videos data (id, title, description)

```sql
SELECT "id", "title", "description" FROM video
WHERE "draft" = false
  AND "visibility" = 'public';
```

### Get the list of videos that users watched (at least the half of the video) :

```sql
SELECT "userId", "videoId"
FROM watchtime
WHERE "watchedPercent" >= 0.5;
```

In order to get the data as JSON, we use the `json_agg` function :

```sql
SELECT json_agg(items)
FROM (/* query here */) as items;
```

The JSON files are exported in the [src/import/data](./src/import/data/) folder.

## Data import

User and video IDs are imported in the database as `User` and `Video` nodes. The `WATCHED` relationship is created between a `User` and a `Video` node :

```cypher
MERGE (u:User {id: $userId})
MERGE (v:Video {id: $videoId})
MERGE (u)-[:WATCHED]->(v)
RETURN u, v
```

Since Polyflix has no such thing as "categories" or "tags", we need to extract the keywords from the videos description and title. Using a naive [NLP library](./src/import/nlp/index.ts), we remove punctuation, stop words, etc. and we create a `Keyword` node for each word. (if the content has the same word multiple times, we increment the `count` property of the relationship between the `Video` and the `Keyword` node, even if this is not currently used) :

```cypher
MERGE (v:Video {id: $id})
MERGE (k:Keyword {keyword: $keyword})
MERGE (v)-[r:HAS_KEYWORD]->(k)
ON CREATE SET r.count = 1
ON MATCH SET r.count = r.count + 1
RETURN v, k
```

## Generate recommendations

The recommendation system is based on the [Jaccard similarity](https://en.wikipedia.org/wiki/Jaccard_index) between videos. We first get the list of videos that the user watched, and for each video, we get the list of videos that have at least one keyword in common with the current video. We then remove the videos that the user already watched, and we calculate the Jaccard similarity between the current video and the videos that have at least one keyword in common with it. We then sort the videos by their similarity score and we return the top 5 videos (or the number of videos specified in the `limit` parameter) :

```cypher
MATCH(u:User {id: $userId})-[:WATCHED]->(v1:Video)-[:HAS_KEYWORD]->(k:Keyword)<-[:HAS_KEYWORD]-(v2:Video)
WHERE NOT EXISTS ((u)-[:WATCHED]->(v2))
WITH v1, v2, COUNT(k) AS intersection
MATCH (v1)-[:HAS_KEYWORD]->(v1k:Keyword)
WITH v1, v2, intersection, COLLECT(v1k.keyword) AS s1
MATCH (v2)-[:HAS_KEYWORD]->(v2k:Keyword)
WITH v1, v2, s1, intersection, COLLECT(v2k.keyword) AS s2
UNWIND s1+s2 as x
WITH v1, v2, intersection, COLLECT(DISTINCT x) as union
RETURN v1.id as userVideo, v2.id as recommendationVideo, ROUND(((1.0*intersection)/SIZE(union)), 3) AS score ORDER BY score DESC LIMIT 5
```

> Query inspired by [this Gist](https://gist.github.com/LeonardoMarrancone/c38eaa0fdbc4d5e409386dd4305af1d9)
