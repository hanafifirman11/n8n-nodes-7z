import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, sep } from 'path';
import { add, extractFull } from 'node-7z';
import sevenBin from '7zip-bin';

export class SevenZ implements INodeType {
	description: INodeTypeDescription = {
		displayName: '7z Archive',
		name: 'sevenZ',
		icon: 'file:7z.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract or compress 7z archives',
		defaults: {
			name: '7z Archive',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract',
						value: 'extract',
						description: 'Extract files from 7z archive',
						action: 'Extract files from 7z archive',
					},
					{
						name: 'Compress',
						value: 'compress',
						description: 'Create 7z archive from files',
						action: 'Create 7z archive from files',
					},
				],
				default: 'extract',
			},
			{
				displayName: 'Input Data Property',
				name: 'inputDataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['extract'],
					},
				},
				description: 'Name of the binary property that contains the 7z archive data',
			},
			{
				displayName: 'Output Property Name',
				name: 'outputPropertyName',
				type: 'string',
				default: 'extractedFiles',
				required: true,
				displayOptions: {
					show: {
						operation: ['extract'],
					},
				},
				description: 'Name of the property to store extracted files',
			},
			{
				displayName: 'Output Mode',
				name: 'outputMode',
				type: 'options',
				options: [
					{
						name: 'Single Item (All files in one output)',
						value: 'single',
						description: 'Put all extracted files into one output item',
					},
					{
						name: 'Separate Items (One per file)',
						value: 'separate',
						description: 'Return one output item per extracted file',
					},
				],
				default: 'single',
				displayOptions: {
					show: {
						operation: ['extract'],
					},
				},
				description: 'How the extracted files should be returned',
			},
			{
				displayName: 'Output Binary Property',
				name: 'outputBinaryProperty',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['extract'],
					},
				},
				description: 'Binary property name to store extracted file(s)',
			},
			{
				displayName: 'Files to Compress',
				name: 'filesToCompress',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['compress'],
					},
				},
				default: {},
				options: [
					{
						name: 'files',
						displayName: 'Files',
						values: [
							{
								displayName: 'File Name',
								name: 'fileName',
								type: 'string',
								default: '',
								description: 'Name of the file in the archive',
							},
							{
								displayName: 'Data Property',
								name: 'dataProperty',
								type: 'string',
								default: 'data',
								description: 'Property containing the file data',
							},
						],
					},
				],
			},
			{
				displayName: 'Archive Name',
				name: 'archiveName',
				type: 'string',
				default: 'archive.7z',
				displayOptions: {
					show: {
						operation: ['compress'],
					},
				},
				description: 'Name of the output 7z archive',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'Password for the archive (optional)',
			},
			{
				displayName: 'Custom 7z Binary Path',
				name: 'custom7zPath',
				type: 'string',
				default: '',
				description: 'Optional: override 7z binary path if default path is not executable in your environment',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'extract') {
					const extractedData = await extractArchive.call(this, i);
					if (Array.isArray(extractedData)) {
						returnData.push(...extractedData);
					} else {
						returnData.push(extractedData);
					}
				} else if (operation === 'compress') {
					const compressedData = await compressFiles.call(this, i);
					returnData.push(compressedData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
					});
					continue;
				}
				const errorMessage = (error as Error).message ?? String(error);
				throw new Error(`Item ${i}: ${errorMessage}`);
			}
		}

		return this.prepareOutputData(returnData);
	}
}

async function extractArchive(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData | INodeExecutionData[]> {
	const inputPropertyName = this.getNodeParameter('inputDataPropertyName', itemIndex) as string;
	const outputPropertyName = this.getNodeParameter('outputPropertyName', itemIndex) as string;
	const outputMode = this.getNodeParameter('outputMode', itemIndex, 'single') as string;
	const outputBinaryProperty = this.getNodeParameter('outputBinaryProperty', itemIndex, 'data') as string;
	const password = this.getNodeParameter('password', itemIndex) as string;
	const custom7zPath = ((this.getNodeParameter('custom7zPath', itemIndex, '') as string) || '').trim();

	const item = this.getInputData()[itemIndex];

	if (!item.binary || !item.binary[inputPropertyName]) {
		throw new Error(`No binary data found in property "${inputPropertyName}"`);
	}

	const archiveBuffer = await getBinaryBuffer.call(this, itemIndex, inputPropertyName);

	const tempDir = mkdtempSync(join(tmpdir(), '7z-extract-'));
	const archivePath = join(tempDir, 'archive.7z');
	const extractDir = join(tempDir, 'extracted');

	try {
		writeFileSync(archivePath, archiveBuffer);
		mkdirSync(extractDir, { recursive: true });

		const binCandidates = build7zCandidates(custom7zPath);

		const runExtract = (binPath: string) =>
			new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('7z extraction timeout after 30 seconds')), 30000);
				const stream = extractFull(archivePath, extractDir, {
					$bin: binPath,
					password: password || undefined,
					outputDir: extractDir,
				});
				stream.on('end', () => {
					clearTimeout(timeout);
					resolve();
				});
				stream.on('error', (err) => {
					clearTimeout(timeout);
					reject(err);
				});
			});

		let lastError: Error | undefined;
		for (const bin of binCandidates) {
			try {
				await runExtract(bin);
				lastError = undefined;
				break;
			} catch (err) {
				lastError = err as Error;
			}
		}
		if (lastError) {
			throw lastError;
		}

		const files: Array<{ relativePath: string; data: Buffer; size: number }> = [];
		const readDirectory = (dir: string, basePath: string = '') => {
			const entries = readdirSync(dir);
			for (const entry of entries) {
				const fullPath = join(dir, entry);
				const relativePath = join(basePath, entry);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					readDirectory(fullPath, relativePath);
				} else {
					const fileData = readFileSync(fullPath);
					files.push({ relativePath, data: fileData, size: stat.size });
				}
			}
		};

		readDirectory(extractDir);

		if (outputMode === 'separate') {
			const results: INodeExecutionData[] = [];
			for (const file of files) {
				const prepared = await this.helpers.prepareBinaryData(
					file.data,
					file.relativePath,
					getMimeType(file.relativePath),
				);
				results.push({
					json: {
						[outputPropertyName]: file.relativePath,
						fileName: file.relativePath,
						fileSize: file.size,
						mimeType: prepared.mimeType,
					},
					binary: {
						[outputBinaryProperty]: prepared,
					},
				});
			}
			return results as any;
		} else {
			const binary: { [key: string]: any } = {};
			const jsonFiles: { [key: string]: any } = {};

			for (let idx = 0; idx < files.length; idx++) {
				const file = files[idx];
				const prepared = await this.helpers.prepareBinaryData(
					file.data,
					file.relativePath,
					getMimeType(file.relativePath),
				);

				const propName =
					files.length === 1 && outputBinaryProperty
						? outputBinaryProperty
						: file.relativePath;

				binary[propName] = prepared;
				jsonFiles[propName] = {
					fileName: file.relativePath,
					fileSize: file.size,
					mimeType: prepared.mimeType,
				};
			}

			return {
				json: {
					[outputPropertyName]: Object.keys(jsonFiles),
					extractedCount: files.length,
					files: jsonFiles,
				},
				binary,
			};
		}
	} catch (error) {
		throw new Error(`Failed to extract 7z archive: ${(error as Error).message}`);
	} finally {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	}
}

async function compressFiles(this: IExecuteFunctions, itemIndex: number): Promise<INodeExecutionData> {
	const filesToCompress = this.getNodeParameter('filesToCompress.files', itemIndex, []) as Array<{
		fileName: string;
		dataProperty: string;
	}>;
	const archiveName = this.getNodeParameter('archiveName', itemIndex) as string;
	const password = this.getNodeParameter('password', itemIndex) as string;
	const custom7zPath = ((this.getNodeParameter('custom7zPath', itemIndex, '') as string) || '').trim();

	const item = this.getInputData()[itemIndex];

	if (!filesToCompress.length) {
		throw new Error('No files specified for compression');
	}

	const tempDir = mkdtempSync(join(tmpdir(), '7z-compress-'));
	const archivePath = join(tempDir, archiveName);
	const filesDir = join(tempDir, 'files');

	try {
		mkdirSync(filesDir, { recursive: true });

		for (const fileConfig of filesToCompress) {
			const { fileName, dataProperty } = fileConfig;

			let fileData: Buffer;

			if (item.binary && item.binary[dataProperty]) {
				fileData = await getBinaryBuffer.call(this, itemIndex, dataProperty);
			} else if (item.json && item.json[dataProperty]) {
				fileData = Buffer.from(item.json[dataProperty] as string, 'utf8');
			} else {
				throw new Error(`No data found in property "${dataProperty}"`);
			}

			const filePath = join(filesDir, fileName);
			const fileDir = dirname(filePath);

			if (fileDir !== filesDir) {
				mkdirSync(fileDir, { recursive: true });
			}

			writeFileSync(filePath, fileData);
		}

		const binCandidates = build7zCandidates(custom7zPath);

		const runAdd = (binPath: string) =>
			new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('7z compression timeout after 30 seconds')), 30000);
				const stream = add(archivePath, `${filesDir}${sep}*`, {
					$bin: binPath,
					password: password || undefined,
				});
				stream.on('end', () => {
					clearTimeout(timeout);
					resolve();
				});
				stream.on('error', (err) => {
					clearTimeout(timeout);
					reject(err);
				});
			});

		let lastError: Error | undefined;
		for (const bin of binCandidates) {
			try {
				await runAdd(bin);
				lastError = undefined;
				break;
			} catch (err) {
				lastError = err as Error;
			}
		}
		if (lastError) {
			throw lastError;
		}

		const compressedData = readFileSync(archivePath);
		const preparedBinary = await this.helpers.prepareBinaryData(
			compressedData,
			archiveName,
			'application/x-7z-compressed',
		);

		return {
			json: {
				archiveName,
				compressedSize: compressedData.length,
				fileCount: filesToCompress.length,
			},
			binary: {
				[archiveName]: preparedBinary,
			},
		};
	} catch (error) {
		throw new Error(`Failed to create 7z archive: ${(error as Error).message}`);
	} finally {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	}
}

function getMimeType(fileName: string): string {
	const extension = fileName.split('.').pop()?.toLowerCase();
	const mimeTypes: { [key: string]: string } = {
		'txt': 'text/plain',
		'json': 'application/json',
		'xml': 'application/xml',
		'html': 'text/html',
		'css': 'text/css',
		'js': 'application/javascript',
		'pdf': 'application/pdf',
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'png': 'image/png',
		'gif': 'image/gif',
		'zip': 'application/zip',
		'7z': 'application/x-7z-compressed',
	};

	return mimeTypes[extension] || 'application/octet-stream';
}

function build7zCandidates(customPath?: string): string[] {
	const candidates = [
		customPath || '',
		sevenBin.path7za,
		'7z',
		'/usr/bin/7z',
		'/usr/bin/7za',
	].filter(Boolean);

	return Array.from(new Set(candidates));
}

async function getBinaryBuffer(
	this: IExecuteFunctions,
	itemIndex: number,
	propertyName: string,
): Promise<Buffer> {
	try {
		return await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
	} catch (error) {
		const item = this.getInputData()[itemIndex];
		const binaryData = item.binary?.[propertyName] as { data?: unknown } | undefined;
		if (typeof binaryData?.data === 'string') {
			return Buffer.from(binaryData.data, 'base64');
		}
		throw new Error(
			`Unable to read binary data from property "${propertyName}": ${(error as Error).message}`,
		);
	}
}
