import mssql = require("mssql");

// https://www.npmjs.com/package/mssql

let pool: mssql.ConnectionPool;

export async function init(poolConfig: mssql.config): Promise<void> {
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

export interface SqlTransactionInterface {
	/**
	 * Raw transaction object.
	 */
	get mssqlTransaction(): mssql.Transaction | null;

	/**
	 * Begins (opens) the database transaction.
	 */
	begin(isolationLevel?: mssql.IIsolationLevel): Promise<SqlTransactionInterface>;

	/**
	 * Commits the current open database transaction.
	 */
	commit(): Promise<void>;

	/**
	 * Rolls back the current open database transaction.
	 * 
	 * No exceptions are thrown if `rollback()` is called while no open transaction exists.
	 */
	rollback(): Promise<void>;

	/**
	 * Creates a new database request using a connection from the connection pool.
	 * 
	 * The request is automatically bound to the current open database transaction.
	 */
	request(): mssql.Request;
}

export class SqlTransaction implements SqlTransactionInterface {
	private transaction: mssql.Transaction | null;
	private open: boolean;

	public constructor(mssqlTransaction: mssql.Transaction) {
		this.transaction = mssqlTransaction;
		this.open = false;
	}

	public get mssqlTransaction(): mssql.Transaction | null {
		return this.transaction;
	}

	public async begin(isolationLevel?: mssql.IIsolationLevel): Promise<SqlTransactionInterface> {
		if (!this.transaction)
			throw new Error("Impossible to restart an already terminated transaction");

		if (this.open)
			throw new Error("Impossible to restart an ongoing transaction");

		await this.transaction.begin(isolationLevel);

		this.open = true;

		return this;
	}

	public async commit(): Promise<void> {
		if (!this.transaction)
			throw new Error("Impossible to commit an already terminated transaction");

		if (!this.open)
			throw new Error("Impossible to commit a transaction that has not yet started");

		await this.transaction.commit();

		this.transaction = null;
	}

	public async rollback(): Promise<void> {
		if (!this.transaction)
			return;

		await this.transaction.rollback();

		this.transaction = null;
	}

	public request(): mssql.Request {
		if (!this.transaction)
			throw new Error("Impossible to send a request through an already terminated transaction");

		if (!this.open)
			throw new Error("Impossible to send a request through a transaction that has not yet started");

		return this.transaction.request();
	}
}

export interface SqlPoolInterface {
	/**
	 * Creates a new database request using a connection from the connection pool.
	 */
	request(): mssql.Request;

	/**
	 * Creates a database transaction.
	 * 
	 * `begin()` must be called before the first statement is executed.
	 * 
	 * `commit()` must be called after the last statement is executed in order to actually commit to the database all the changes made by the previous statements.
	 * 
	 * If an unhandled exception occurs, and there is an open transaction, `rollback()` is automatically called.
	 */
	transaction<T>(callback: (transaction: SqlTransactionInterface) => Promise<T>): Promise<T>;
}

export class SqlPool implements SqlPoolInterface {
	public request(): mssql.Request {
		return pool.request();
	}

	public async transaction<T>(callback: (transaction: SqlTransactionInterface) => Promise<T>): Promise<T> {
		const transaction = new SqlTransaction(pool.transaction());
		try {
			return await callback(transaction);
		} finally {
			await transaction.rollback();
		}
	}
}

export const sqlPool = new SqlPool();
