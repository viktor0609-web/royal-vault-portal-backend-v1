import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";

// === CONFIG ===
const CSV_FILE = "./users.csv"; // path to your CSV file

// === FUNCTION TO READ CSV ===
async function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (err) => reject(err));
    });
}

async function createUser(user) {
    const newUser = await User.create(
        [
            {
                firstName: user["First Name"],
                lastName: user["Last Name"],
                email: user.email,
                phone: "123213",
                password: await bcrypt.hash("123456", 10),
                role: 'user',
                isVerified: false
            },
        ]
    );
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect("mongodb+srv://Viktor:Viktor@viktorclientportal.dxcos6d.mongodb.net/?retryWrites=true&w=majority&appName=ViktorClientPortal");
        console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
};

export async function migrateUsers() {
    await connectDB();
    const users = await readCSV(CSV_FILE);
    console.log(`Read ${users.length} users from CSV`);
    console.log(users[0]);
    for (const user of users) {
        try {
            await createUser(user);
        } catch (error) {
            console.error("❌ Error creating user:", error.message);
        }
    }
    console.log("Users migrated successfully");
}

migrateUsers().catch(console.error);