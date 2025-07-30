"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHybridAuthState = void 0;

const promises_1 = require("fs/promises");
const path_1 = require("path");
const WAProto_1 = require("../../WAProto");
const auth_utils_1 = require("./auth-utils");
const generics_1 = require("./generics");

const useHybridAuthState = async (folder) => {
    const memoryStore = new Map();

    const fixFileName = (file) => {
        return file?.replace(/\//g, '__')?.replace(/:/g, '-');
    };

    const writeData = (data, file) => {
        return (0, promises_1.writeFile)((0, path_1.join)(folder, fixFileName(file)), JSON.stringify(data, generics_1.BufferJSON.replacer));
    };

    const readData = async (file) => {
        try {
            const data = await (0, promises_1.readFile)((0, path_1.join)(folder, fixFileName(file)), { encoding: 'utf-8' });
            return JSON.parse(data, generics_1.BufferJSON.reviver);
        } catch (error) {
            return null;
        }
    };

    const folderInfo = await (0, promises_1.stat)(folder).catch(() => { });
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
        }
    } else {
        await (0, promises_1.mkdir)(folder, { recursive: true });
    }

    const creds = await readData('creds.json') || (0, auth_utils_1.initAuthCreds)();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = memoryStore.get(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value || null;
                    }
                    return data;
                },
                set: async (dataObj) => {
                    for (const category in dataObj) {
                        for (const id in dataObj[category]) {
                            const value = dataObj[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                memoryStore.set(key, value);
                            } else {
                                memoryStore.delete(key);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds.json');
        }
    };
};

exports.useHybridAuthState = useHybridAuthState;
