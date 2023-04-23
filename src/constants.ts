import dotenv from "dotenv";
dotenv.config();

export const NEO4J_URL = process.env.NEO4J_URL || "neo4j://localhost:7687";
export const NEO4J_USERNAME = process.env.NEO4J_USERNAME || "neo4j";
export const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "neo4j";

export const PORT = parseInt(process.env.PORT || "3000");
