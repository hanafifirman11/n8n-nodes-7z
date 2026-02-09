"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SevenZ = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const node_7z_1 = require("node-7z");
const _7zip_bin_1 = __importDefault(require("7zip-bin"));
class SevenZ {
    constructor() {
        this.description = {
            displayName: '7z Archive',
            name: 'sevenZ',
            icon: 'file:7z.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Extract or compress 7z archives in memory',
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'extract') {
                    const extractedData = await extractArchive.call(this, i);
                    returnData.push(extractedData);
                }
                else if (operation === 'compress') {
                    const compressedData = await compressFiles.call(this, i);
                    returnData.push(compressedData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                    });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error.message, { itemIndex: i });
            }
        }
        return this.prepareOutputData(returnData);
    }
}
exports.SevenZ = SevenZ;
async function extractArchive(itemIndex) {
    const inputPropertyName = this.getNodeParameter('inputDataPropertyName', itemIndex);
    const outputPropertyName = this.getNodeParameter('outputPropertyName', itemIndex);
    const outputMode = this.getNodeParameter('outputMode', itemIndex, 'single');
    const outputBinaryProperty = this.getNodeParameter('outputBinaryProperty', itemIndex, 'data');
    const password = this.getNodeParameter('password', itemIndex);
    const custom7zPath = (this.getNodeParameter('custom7zPath', itemIndex, '') || '').trim();
    const item = this.getInputData()[itemIndex];
    if (!item.binary || !item.binary[inputPropertyName]) {
        throw new Error(`No binary data found in property "${inputPropertyName}"`);
    }
    const archiveBuffer = Buffer.from(item.binary[inputPropertyName].data, 'base64');
    const tempDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), '7z-extract-'));
    const archivePath = (0, path_1.join)(tempDir, 'archive.7z');
    const extractDir = (0, path_1.join)(tempDir, 'extracted');
    try {
        (0, fs_1.writeFileSync)(archivePath, archiveBuffer);
        (0, fs_1.mkdirSync)(extractDir, { recursive: true });
        const binCandidates = build7zCandidates(custom7zPath);
        const runExtract = (binPath) => new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('7z extraction timeout after 30 seconds')), 30000);
            const stream = (0, node_7z_1.extractFull)(archivePath, extractDir, {
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
        let lastError;
        for (const bin of binCandidates) {
            try {
                await runExtract(bin);
                lastError = undefined;
                break;
            }
            catch (err) {
                lastError = err;
            }
        }
        if (lastError) {
            throw lastError;
        }
        const files = [];
        const readDirectory = (dir, basePath = '') => {
            const entries = (0, fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(dir, entry);
                const relativePath = (0, path_1.join)(basePath, entry);
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory()) {
                    readDirectory(fullPath, relativePath);
                }
                else {
                    const fileData = (0, fs_1.readFileSync)(fullPath);
                    files.push({ relativePath, data: fileData, size: stat.size });
                }
            }
        };
        readDirectory(extractDir);
        if (outputMode === 'separate') {
            const results = [];
            for (const file of files) {
                const prepared = await this.helpers.prepareBinaryData(file.data, file.relativePath, getMimeType(file.relativePath));
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
            return results;
        }
        else {
            const binary = {};
            const jsonFiles = {};
            for (let idx = 0; idx < files.length; idx++) {
                const file = files[idx];
                const prepared = await this.helpers.prepareBinaryData(file.data, file.relativePath, getMimeType(file.relativePath));
                const propName = files.length === 1 && outputBinaryProperty
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
    }
    catch (error) {
        throw new Error(`Failed to extract 7z archive: ${error.message}`);
    }
    finally {
        try {
            (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
        catch {
            // ignore cleanup errors
        }
    }
}
async function compressFiles(itemIndex) {
    const filesToCompress = this.getNodeParameter('filesToCompress.files', itemIndex, []);
    const archiveName = this.getNodeParameter('archiveName', itemIndex);
    const password = this.getNodeParameter('password', itemIndex);
    const custom7zPath = (this.getNodeParameter('custom7zPath', itemIndex, '') || '').trim();
    const item = this.getInputData()[itemIndex];
    if (!filesToCompress.length) {
        throw new Error('No files specified for compression');
    }
    const tempDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), '7z-compress-'));
    const archivePath = (0, path_1.join)(tempDir, archiveName);
    const filesDir = (0, path_1.join)(tempDir, 'files');
    try {
        (0, fs_1.mkdirSync)(filesDir, { recursive: true });
        for (const fileConfig of filesToCompress) {
            const { fileName, dataProperty } = fileConfig;
            let fileData;
            if (item.binary && item.binary[dataProperty]) {
                fileData = Buffer.from(item.binary[dataProperty].data, 'base64');
            }
            else if (item.json && item.json[dataProperty]) {
                fileData = Buffer.from(item.json[dataProperty], 'utf8');
            }
            else {
                throw new Error(`No data found in property "${dataProperty}"`);
            }
            const filePath = (0, path_1.join)(filesDir, fileName);
            const fileDir = (0, path_1.dirname)(filePath);
            if (fileDir !== filesDir) {
                (0, fs_1.mkdirSync)(fileDir, { recursive: true });
            }
            (0, fs_1.writeFileSync)(filePath, fileData);
        }
        const binCandidates = build7zCandidates(custom7zPath);
        const runAdd = (binPath) => new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('7z compression timeout after 30 seconds')), 30000);
            const stream = (0, node_7z_1.add)(archivePath, `${filesDir}${path_1.sep}*`, {
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
        let lastError;
        for (const bin of binCandidates) {
            try {
                await runAdd(bin);
                lastError = undefined;
                break;
            }
            catch (err) {
                lastError = err;
            }
        }
        if (lastError) {
            throw lastError;
        }
        const compressedData = (0, fs_1.readFileSync)(archivePath);
        const preparedBinary = await this.helpers.prepareBinaryData(compressedData, archiveName, 'application/x-7z-compressed');
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
    }
    catch (error) {
        throw new Error(`Failed to create 7z archive: ${error.message}`);
    }
    finally {
        try {
            (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
        catch {
            // ignore cleanup errors
        }
    }
}
function getMimeType(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes = {
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
function build7zCandidates(customPath) {
    const candidates = [
        customPath || '',
        _7zip_bin_1.default.path7za,
        '7z',
        '/usr/bin/7z',
        '/usr/bin/7za',
    ].filter(Boolean);
    return Array.from(new Set(candidates));
}
