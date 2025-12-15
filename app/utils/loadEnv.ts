import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../../', '.env') })
