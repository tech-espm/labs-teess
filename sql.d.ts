import mssql = require("mssql");
export declare function init(poolConfig: mssql.config): Promise<void>;
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
export declare class SqlTransaction implements SqlTransactionInterface {
	private transaction;
	private open;
	constructor(mssqlTransaction: mssql.Transaction);
	get mssqlTransaction(): mssql.Transaction | null;
	begin(isolationLevel?: mssql.IIsolationLevel): Promise<SqlTransactionInterface>;
	commit(): Promise<void>;
	rollback(): Promise<void>;
	request(): mssql.Request;
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
export declare class SqlPool implements SqlPoolInterface {
	request(): mssql.Request;
	transaction<T>(callback: (transaction: SqlTransactionInterface) => Promise<T>): Promise<T>;
}
export declare const sqlPool: SqlPool;
