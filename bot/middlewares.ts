import express from "express";
import type { Application } from "express-serve-static-core";

const Middlewares = (app: Application): void => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set("trust proxy", true);
};

export default Middlewares;
