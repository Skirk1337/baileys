const fs = require('fs/promises')
const path = require('path')
const { proto } = require('@whiskeysockets/baileys')
const { initAuthCreds } = require('@whiskeysockets/baileys/lib/Utils/auth-utils')
const { BufferJSON } = require('@whiskeysockets/baileys/lib/Utils/generics')

const useHybridAuthState = async (folder) => {
    const memoryStore = new Map()

    const fixFileName = (file) =>
        file?.replace(/\//g, '__')?.replace(/:/g, '-')

    const credsPath = path.join(folder, fixFileName('creds.json'))

    const writeCreds = async (data) => {
        await fs.mkdir(folder, { recursive: true })
        await fs.writeFile(credsPath, JSON.stringify(data, BufferJSON.replacer))
    }

    const readCreds = async () => {
        try {
            const data = await fs.readFile(credsPath, 'utf-8')
            return JSON.parse(data, BufferJSON.reviver)
        } catch {
            return null
        }
    }

    const creds = (await readCreds()) || initAuthCreds()

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    for (const id of ids) {
                        let val = memoryStore.get(`${type}-${id}`)
                        if (type === 'app-state-sync-key' && val) {
                            val = proto.Message.AppStateSyncKeyData.fromObject(val)
                        }
                        data[id] = val
                    }
                    return data
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id]
                            const key = `${category}-${id}`
                            if (value) memoryStore.set(key, value)
                            else memoryStore.delete(key)
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await writeCreds(creds)
        }
    }
}

module.exports = { useHybridAuthState }
