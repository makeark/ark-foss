import AsyncWriter from "@mongosh/async-rewriter2";
import {
	Mongo,
	Database,
	ShellInstanceState,
	Cursor,
	ShellApi,
	ReplicaSet,
	Shard,
} from "@mongosh/shell-api";
import { bson } from "@mongosh/service-provider-core";
import { CliServiceProvider, MongoClientOptions } from "@mongosh/service-provider-server";
import { EventEmitter } from "stream";
import { exportData, MongoExportOptions } from "../../modules/exports";

import { _evaluate } from "./_eval";
import { MemoryStore } from "../stores/memory";
import { MemEntry } from "../../modules/ipc";
import { ERRORS } from "../../utils/constants";

export interface EvalResult {
	result?: Buffer;
	err?: Error;
}

export interface Evaluator {
	evaluate(code: string, database: string, connectionId: string): Promise<Ark.AnyObject>;
	disconnect(): Promise<void>;
	export(
		code: string,
		database: string,
		connectionId: string,
		options: Ark.ExportCsvOptions | Ark.ExportNdjsonOptions,
	): Promise<void>;
}

interface CreateEvaluatorOptions {
	uri: string;
	mongoOptions: MongoClientOptions;
	connectionStore?: MemoryStore<MemEntry>
}

export async function createEvaluator(
	options: CreateEvaluatorOptions
): Promise<Evaluator> {
	const { uri, mongoOptions, connectionStore } = options;

	const provider = await createServiceProvider(uri, mongoOptions);

	const evaluator: Evaluator = {
		export: (code, database, connectionId,  options) => {
			return evaluate(
				code,
				provider,
				{
					mode: "export",
					params: { database, connectionId, ...options },
				},
				connectionStore
			);
		},
		evaluate: (code, database, connectionId) => {
			return evaluate(code, provider, { mode: "query", params: { database, connectionId } }, connectionStore);
		},
		disconnect: async () => {
			await provider.close(true);
		},
	};

	return evaluator;
}

async function createServiceProvider(uri: string, driverOpts: MongoClientOptions = {}) {
	const provider = await CliServiceProvider.connect(uri, driverOpts, {}, new EventEmitter());
	return provider
}

function paginateCursor(cursor: Cursor, page: number) {
	return cursor.limit(50).skip((page - 1) * 50);
}

interface MongoEvalOptions {
	database: string;
	page?: number;
	connectionId: string;
}
interface MongoQueryOptions {
	mode: "query";
	params: MongoEvalOptions;
}

async function evaluate(
	code: string,
	serviceProvider: CliServiceProvider,
	options: MongoQueryOptions | MongoExportOptions<MongoEvalOptions>,
	connectionStore?: MemoryStore<MemEntry>
) {
	const { database, page, connectionId } = options.params;

	const connection = connectionStore?.get(connectionId);

	if (!connection) {
		throw new Error(ERRORS.AR601);
	} else if (connection && connection.server && !connection.server.listening) {
		throw new Error(ERRORS.AR600);
	}

	const internalState = new ShellInstanceState(serviceProvider);

	const mongo = new Mongo(
		internalState,
		undefined,
		undefined,
		undefined,
		serviceProvider
	);

	const db = new Database(mongo, database);

	const rs = new ReplicaSet(db);

	const sh = new Shard(db);

	const shellApi = new ShellApi(internalState);

	const transpiledCodeString = new AsyncWriter().process(code);

	let result = await _evaluate(
		transpiledCodeString,
		db,
		rs,
		sh,
		shellApi,
		bson
	);

	if (result instanceof Cursor) {
		if (options.mode === "export") {
			return await exportData(result, options);
		} else {
			result = await paginateCursor(result, page || 1).toArray();
		}
	}

	return result;
}
