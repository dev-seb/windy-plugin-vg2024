import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from 'basic-ftp';

import { reportsHistoryExcelDir } from './config.js';

dotenv.config();

const syncFtp = async () => {
    const client = new Client();
    //client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: false,
        });
        const remoteExcelDir = 'reports/history/excel/';
        const excelFiles = await client.list(remoteExcelDir);
        for (const excelFile of excelFiles) {
            const localFilePath = path.join(reportsHistoryExcelDir, excelFile.name);
            if (fs.existsSync(path.dirname(localFilePath))) {
                fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
            }
            if (!fs.existsSync(localFilePath)) {
                const remoteFilePath = path.join(remoteExcelDir, excelFile.name);
                console.log(`download ${remoteFilePath} to ${localFilePath}`);
                const response = await client.downloadTo(localFilePath, remoteFilePath);
                console.log(response);
            }
        }
    } catch (err) {
        console.log(err);
    }
    client.close();
};

(async () => {
    await syncFtp();
})();
