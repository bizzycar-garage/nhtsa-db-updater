import { isFileOnS3, urlToS3 } from './aws_helper.js';
import { getMsSqlPool, restoreDatabase, dropDatabase } from './db_helper.js';
import { getLatestNhtsaFilePath, getBakFileFromNhtsa } from './nhtsa_helper.js';
import aws from 'aws-sdk';

import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

const s3 = new aws.S3();

const environment = {
  aws: {
    region: process.env.aws_region,
    apiVersion: process.env.aws_api_version
  },
  mssql: {
    user: process.env.mssql_user,
    host: process.env.mssql_host,
    database: process.env.mssql_database,
    password: process.env.mssql_password,
    port: Number(process.env.mssql_port),
    connectionTimeoutMillis: Number(process.env.mssql_connection_timeout_millis),
    lambdaLogRetentionDays: Number(process.env.mssql_lambda_log_retention_days)
  },
  nhtsa_host: 'https://vpic.nhtsa.dot.gov'
};

const nhtsaS3Bucket = 'nhtsa-db-backups';

export async function handler(event) {

  try {

    const downloadPath = await getLatestNhtsaFilePath(environment.nhtsa_host);

    const fileName = downloadPath.split('/').slice(-1)[0].replace('.zip', '');

    const latestBakFile = await getBakFileFromNhtsa(downloadPath);
    const isOnS3 = await isFileOnS3(environment, nhtsaS3Bucket, fileName);

    let response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'No new file found' }),
    };

    if (latestBakFile.found && !isOnS3) {
      try {
        await urlToS3({
          environment,
          url: latestBakFile.url,
          bucket: nhtsaS3Bucket,
          key: fileName
        });
      } catch (e) {
        console.log(e);
      }

      // Restore db now
      const msSqlPool = await getMsSqlPool(environment);

      await dropDatabase(msSqlPool);

      const result = await restoreDatabase(msSqlPool, fileName);

      response.body = JSON.stringify(result)
    };

    return response;
  } catch (e) {
    console.log(e);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error occurred' }),
    };
  } finally {
    msSqlPool.close();
  }

};