import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// MongoDB User model
import User from "../models/User.js";

const {
    BUBBLE_APP_NAME,
    BUBBLE_API_TOKEN,
    MONGO_URI
} = process.env;

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

const headers = { Authorization: `Bearer ${BUBBLE_API_TOKEN}` };
const PAGE_LIMIT = 100; // Bubble API limit per request

// Transform Bubble user to Mongo user
function transformUser(bubbleUser) {
    return {
        firstName: bubbleUser.firstName || "",
        lastName: bubbleUser.lastName || "",
        email: bubbleUser.email || "",
        phone: bubbleUser.phone || "",
        // All other fields will use Mongoose defaults
    };
}

// Fetch Bubble users in pages
async function fetchBubbleUsers(cursor = 0) {
    console.log(`Fetching Bubble users ${cursor}`);
    const url = `https://${BUBBLE_APP_NAME}.bubbleapps.io/api/1.1/obj/User`;
    console.log(url);
    const params = { cursor, limit: PAGE_LIMIT };
    const res = await axios.get(url, { headers, params });
    return res.data.response.results;
}

// Migrate all users
async function migrateUsers() {
    let cursor = 0;
    let totalMigrated = 0;

    while (true) {
        const users = await fetchBubbleUsers(cursor);
        if (!users || users.length === 0) break;
        console.log(users);

        // const mongoUsers = users.map(transformUser);
        // await User.insertMany(mongoUsers, { ordered: false });
        // totalMigrated += mongoUsers.length;

        // console.log(`✅ Migrated ${totalMigrated} users so far...`);
        // cursor += users.length;
    }

    console.log(`🎉 Migration complete. Total users migrated: ${totalMigrated}`);
    mongoose.disconnect();
}

migrateUsers().catch(err => {
    console.error("Migration error:", err);
    mongoose.disconnect();
});
