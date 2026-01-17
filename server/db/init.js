import { migrate } from "./migrate.js";

async function initializeDatabase() {
	console.log("Initializing database via migrations...");
	await migrate();
	console.log("Database initialized successfully!");
}

initializeDatabase().catch(console.error);

export { initializeDatabase };
