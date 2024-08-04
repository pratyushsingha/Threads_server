import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { User } from "./models/user.model.js";
import { Tweet } from "./models/tweet.model.js";
import { Like } from "./models/like.model.js";
import { Follow } from "./models/follow.model.js";
import connectDB from "./src/db/index.js";

await connectDB();

const seedUsers = async (num) => {
  const users = [];
  for (let i = 0; i < num; i++) {
    const password = await bcrypt.hash("password", 10);
    users.push({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      password: password,
    });
  }
  await User.insertMany(users);
  console.log(`${num} users seeded`);
};

const seedTweets = async (num) => {
  const tweets = [];
  const users = await User.find();
  for (let i = 0; i < num; i++) {
    tweets.push({
      content: faker.lorem.sentence(),
      owner: users[Math.floor(Math.random() * users.length)]._id,
      createdAt: faker.date.past(),
      isTweet: true,
    });
  }
  await Tweet.insertMany(tweets);
  console.log(`${num} tweets seeded`);
};

const seedReplies = async (num) => {
  const tweets = [];
  const users = await User.find();
  const mainTweets = await Tweet.find({ isTweet: true });
  for (let i = 0; i < num; i++) {
    tweets.push({
      content: faker.lorem.sentence(),
      owner: users[Math.floor(Math.random() * users.length)]._id,
      createdAt: faker.date.past(),
      isTweet: false,
      tweetId: mainTweets[Math.floor(Math.random() * mainTweets.length)]._id,
    });
  }
  await Tweet.insertMany(tweets);
  console.log(`${num} tweets seeded`);
};

const seedLikes = async (num) => {
  const likes = [];
  const tweets = await Tweet.find();
  const users = await User.find();
  for (let i = 0; i < num; i++) {
    likes.push({
      tweetId: tweets[Math.floor(Math.random() * tweets.length)]._id,
      userId: users[Math.floor(Math.random() * users.length)]._id,
      createdAt: faker.date.past(),
    });
  }
  await Like.insertMany(likes);
  console.log(`${num} likes seeded`);
};

const seedFollows = async (num) => {
  const follows = [];
  const users = await User.find();
  for (let i = 0; i < num; i++) {
    follows.push({
      followerId: users[Math.floor(Math.random() * users.length)]._id,
      followedBy: users[Math.floor(Math.random() * users.length)]._id,
      createdAt: faker.date.past(),
    });
  }
  await Follow.insertMany(follows);
  console.log(`${num} follows seeded`);
};

const seedDatabase = async () => {
  // await User.deleteMany({});
  // await Tweet.deleteMany({});
  // await Like.deleteMany({});
  // await Follow.deleteMany({});
  await seedUsers(100);
  await seedTweets(100);
  await seedLikes(100);
  await seedFollows(100);
  await seedReplies(100);
  mongoose.connection.close();
};

seedDatabase().catch((err) => {
  console.error(err);
  mongoose.connection.close();
});
