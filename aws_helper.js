import path from 'path';
import AWS from 'aws-sdk';
import axios from "axios";
import unzipper from 'unzipper';

const listS3Files = async (environment, s3Bucket, remotePath) => {
  AWS.config.update({ region: environment.aws.region });

  const S3 = new AWS.S3({ apiVersion: environment.aws.apiVersion });

  const params = {
    Bucket: s3Bucket,
    Delimiter: '/',
    Prefix: remotePath,
  };

  const objects = await S3.listObjects(params).promise();

  return objects.Contents;
}

export const isFileOnS3 = async (environment, bucket, key) => {
  const thisMonthS3Bak = await listS3Files(
    environment,
    bucket,
    key
  );

  return thisMonthS3Bak?.length > 0;
}

export const urlToS3 = async ({
  environment,
  url,
  bucket,
  key
}) => {
  try {
    const {
      data
    } = await axios.get(url, {
      responseType: "stream"
    });

    const stream = data
      .on("error", (e) => console.log(`Error extracting file: `, e))
      .pipe(
        unzipper.ParseOne()
      );

    await transferToS3(environment, bucket, '', key, stream);
  } catch (error) {
    console.error(error);
  }
};

export const transferToS3 = async (environment, bucket, keyPath, fileName, stream, ssEncryption = null) => {
  AWS.config.update({ region: environment.aws.region }); // Config AWS region

  const S3 = new AWS.S3({ apiVersion: environment.aws.apiVersion });

  const putParams = {
    Bucket: bucket,
    Key: path.join(keyPath, fileName),
    Body: stream,
  };

  if (ssEncryption) {
    putParams.ServerSideEncryption = ssEncryption;
  }

  await new Promise((resolve, reject) => {
    S3.upload(putParams, err => {
      if (err) reject(err);

      resolve();
    });
  });
}