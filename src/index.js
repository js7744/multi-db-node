import dotenv from "dotenv";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import * as cron from "node-cron";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { handleError, ErrorHandler } from "./config/ErrorHandler.js";
import Sequelize from "sequelize";
const Schema = mongoose.Schema;

dotenv.config();
const app = express();
app.server = http.createServer(app);
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// logger
app.use(morgan("dev"));

// body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Todo Serve Images
app.use("/tech", express.static(__dirname + "/uploads"));

// to avoid 304
app.disable("etag");

// MYSQL connection
const sequelize = new Sequelize(
  process.env.SQL_DB,
  process.env.SQL_USER,
  process.env.SQL_PASSWORD,
  {
    host: process.env.SQL_HOST,
    dialect: process.env.SQL_dialect,
    operatorsAliases: false,
    define: {
      timestamps: false,
      freezeTableName: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);
const MYSQLdb = {};

MYSQLdb.Sequelize = Sequelize;
MYSQLdb.sequelize = sequelize;
MYSQLdb.sequelize
  .sync()
  .then(function () {
    console.log("MYSQL db looks fine!");
  })
  .catch((err) => {
    console.log("MYSQL DB err", err);
  });

// Actor table model MYSQL
const Actor = sequelize.define("actor", {
  actor_id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  first_name: { type: Sequelize.STRING, allowNull: false },
  last_name: { type: Sequelize.STRING, allowNull: false },
  last_update: { type: Sequelize.DATE },
});
MYSQLdb.actor = Actor;

// User table model MYSQL
const Users = sequelize.define("user", {
  user_id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: { type: Sequelize.STRING, allowNull: false },
  email: { type: Sequelize.STRING, allowNull: false },
  last_update: { type: Sequelize.DATE },
});

// Actor table model MongoDB
const ActorSchema = new Schema({
  first_name: { type: String },
  last_name: { type: String },
});

const Actors = mongoose.model("Actors", ActorSchema);

// Fetch user details from mongodb
app.get("/", async (req, res, next) => {
  res.send("Welcome to the Multi DB Application.");
});

const dbURI = process.env.DATABASE_URI;

// Mongodb connection
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

let db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Mongo DB connected succefully...");
});

// Fetch user details from mongodb
app.get("/mongodb/mysql/users", async (req, res, next) => {
  db.collection("users")
    .find()
    .toArray((err1, collection) => {
      if (err1) throw new Error("Cannot retrieve users data from MONGO DB");
      storeDataToMYSQL(res, collection, Users);
      // db.close();
    });
});

// Fetch actors details from MYSQL
app.get("/mysql/mongodb/actors", async (req, res, next) => {
  Actor.findAll({
    raw: true,
  })
    .then((data) => {
      storeDataToMongoDB(res, data, Actors);
    })
    .catch((err) => {
      res.status(500).send({
        code: 1,
        data: null,
        message: err.message || "Some error occurred while retrieving bank.",
      });
    });
});

// Store data to MYSQL
async function storeDataToMYSQL(res, details, table) {
  await details.map(async (item, index) => {
    await table
      .findAll({
        where: { email: item.email },
      })
      .then(async (isData) => {
        if (!isData.length) {
          await table.create(item);
        }
      });
    if (index == details.length - 1) {
      res.send("Data insert successfully to MYSQL Database!");
    }
  });
}

// Store data to MONGODB
async function storeDataToMongoDB(res, details, table) {
  await details.map(async (item, index) => {
    await table.find({ email: item.email }).then(async (isData) => {
      if (!isData.length) {
        await table.create(item);
      }
    });
    if (index == details.length - 1) {
      res.send("Data insert successfully to MONGO Database!");
    }
  });
}

// Cron job to do the job on pecific at 11:59 PM every day
cron.default.schedule("59 23 * * *", function () {
  console.log("running a task every minute");
});

app.use((req, res, next) => {
  throw new ErrorHandler(404, "Not found!");
});

app.use((err, req, res, next) => {
  console.log("errr", err);
  handleError(err, res);
});

const PORT = process.env.PORT || 5000;
app.server.listen(PORT, () => {
  console.log(`you are running server on port: ${app.server.address().port}`);
});
