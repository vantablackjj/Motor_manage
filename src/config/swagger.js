const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0", // <<== QUAN TRỌNG
    info: {
      title: "Warehouse Management API",
      version: "1.0.0",
      description: "API documentation for warehouse management system",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
  },

  // Scan toàn bộ routes & controllers
  apis: ["./src/routes/*.js", "./src/routes/**/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi,
};
