/**
 * Unit of Work Pattern
 * Manages transactions across multiple repositories
 */

const { pool } = require("../config/database");
const logger = require("../ultils/logger");

// Import repositories
const HangHoaRepository = require("./HangHoaRepository");
const DoiTacRepository = require("./DoiTacRepository");
const KhoRepository = require("./KhoRepository");

class UnitOfWork {
  constructor() {
    this.client = null;
    this.isActive = false;
  }

  /**
   * Begin transaction
   */
  async begin() {
    if (this.isActive) {
      throw new Error("Transaction already active");
    }

    this.client = await pool.connect();
    await this.client.query("BEGIN");
    this.isActive = true;

    logger.debug("Transaction started");
  }

  /**
   * Commit transaction
   */
  async commit() {
    if (!this.isActive) {
      throw new Error("No active transaction");
    }

    try {
      await this.client.query("COMMIT");
      logger.debug("Transaction committed");
    } finally {
      this.client.release();
      this.client = null;
      this.isActive = false;
    }
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    if (!this.isActive) {
      throw new Error("No active transaction");
    }

    try {
      await this.client.query("ROLLBACK");
      logger.debug("Transaction rolled back");
    } finally {
      this.client.release();
      this.client = null;
      this.isActive = false;
    }
  }

  /**
   * Execute function within transaction
   */
  async execute(callback) {
    try {
      await this.begin();
      const result = await callback(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get repository instances with transaction client
   */
  get repositories() {
    if (!this.isActive) {
      throw new Error("No active transaction");
    }

    return {
      hangHoa: this._wrapRepository(HangHoaRepository),
      doiTac: this._wrapRepository(DoiTacRepository),
      kho: this._wrapRepository(KhoRepository),
      // Add more repositories as needed
    };
  }

  /**
   * Wrap repository methods to use transaction client
   */
  _wrapRepository(repository) {
    const wrapped = {};
    const client = this.client;

    // Wrap all methods to inject client
    for (const method of Object.getOwnPropertyNames(
      Object.getPrototypeOf(repository),
    )) {
      if (
        method !== "constructor" &&
        typeof repository[method] === "function"
      ) {
        wrapped[method] = (...args) => {
          // Inject client as last argument if not provided
          const lastArg = args[args.length - 1];
          if (lastArg !== client) {
            args.push(client);
          }
          return repository[method](...args);
        };
      }
    }

    return wrapped;
  }

  /**
   * Execute raw query within transaction
   */
  async query(sql, params = []) {
    if (!this.isActive) {
      throw new Error("No active transaction");
    }

    const result = await this.client.query(sql, params);
    return result.rows;
  }
}

module.exports = UnitOfWork;
