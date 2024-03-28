
import cheerio from 'cheerio';
import axios from 'axios';

export const getLatestNhtsaFilePath = async (nhtsaHost) => {
  const res = await axios.get(`${nhtsaHost}/api`);
  const $ = cheerio.load(res.data);

  const filePath = $('a.btn.btn-info').attr('href');
  return `${nhtsaHost}${filePath}`;
}

export async function getBakFileFromNhtsa(url) {
  const options = {
    method: 'HEAD',
  };

  try {
    const res = await axios.head(url);

    const contentType = res.headers['content-type'];
    const contentLength = res.headers['content-length'];

    if (contentType === 'application/x-zip-compressed' && contentLength > 0) {
      console.log('file found!');
      // save it to s3
      return {
        url: url,
        found: true,
      }
    }
  } catch (err) {
    console.log('file not found!');
    return {
      url: url,
      found: false
    }
  }
}