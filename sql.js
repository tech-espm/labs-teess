"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlPool = exports.SqlPool = exports.SqlTransaction = exports.init = void 0;
const mssql = require("mssql");
// https://www.npmjs.com/package/mssql
let pool;
async function init(poolConfig) {
	if (!poolConfig)
		throw new Error("Missing poolConfig");
	if (!pool) {
		if (!poolConfig.pool)
			poolConfig.pool = {
				max: 30,
				min: 0,
				idleTimeoutMillis: 30000
			};
		if (!("requestTimeout" in poolConfig))
			poolConfig.requestTimeout = 30000;
		pool = await mssql.connect(poolConfig);
	}
}
exports.init = init;
class SqlTransaction {
	constructor(mssqlTransaction) {
		this.transaction = mssqlTransaction;
		this.open = false;
	}
	get mssqlTransaction() {
		return this.transaction;
	}
	async begin(isolationLevel) {
		if (!this.transaction)
			throw new Error("Impossible to restart an already terminated transaction");
		if (this.open)
			throw new Error("Impossible to restart an ongoing transaction");
		await this.transaction.begin(isolationLevel);
		this.open = true;
		return this;
	}
	async commit() {
		if (!this.transaction)
			throw new Error("Impossible to commit an already terminated transaction");
		if (!this.open)
			throw new Error("Impossible to commit a transaction that has not yet started");
		await this.transaction.commit();
		this.transaction = null;
	}
	async rollback() {
		if (!this.transaction)
			return;
		await this.transaction.rollback();
		this.transaction = null;
	}
	request() {
		if (!this.transaction)
			throw new Error("Impossible to send a request through an already terminated transaction");
		if (!this.open)
			throw new Error("Impossible to send a request through a transaction that has not yet started");
		return this.transaction.request();
	}
}
exports.SqlTransaction = SqlTransaction;
class SqlPool {
	request() {
		return pool.request();
	}
	async transaction(callback) {
		const transaction = new SqlTransaction(pool.transaction());
		try {
			return await callback(transaction);
		}
		finally {
			await transaction.rollback();
		}
	}
}
exports.SqlPool = SqlPool;
exports.sqlPool = new SqlPool();
